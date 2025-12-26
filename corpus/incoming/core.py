"""
Основной менеджер TOTP аутентификации для экосистемы Искра
"""

import pyotp
import secrets
import base64
import hashlib
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
import structlog
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, desc

from .models import User2FA, BackupCode, SecurityLog, TwoFASettings
from .security import TwoFAEncryption
from .exceptions import (
    TwoFAError, 
    InvalidTOTPError, 
    UserNotFoundError, 
    TwoFANotEnabledError,
    AccountLockedError,
    BackupCodeAlreadyUsedError,
    InvalidBackupCodeError
)

logger = structlog.get_logger("iskra.2fa.core")

class TOTPManager:
    """Основной менеджер TOTP аутентификации"""
    
    def __init__(self, db_session: Session, encryption_key: str):
        self.db = db_session
        self.encryption = TwoFAEncryption(encryption_key)
        self._settings = None
        
    @property
    def settings(self) -> TwoFASettings:
        """Получение настроек 2FA (lazy loading)"""
        if self._settings is None:
            self._settings = self.db.query(TwoFASettings).first()
            if self._settings is None:
                # Создание настроек по умолчанию
                self._settings = TwoFASettings()
                self.db.add(self._settings)
                self.db.commit()
        return self._settings
    
    def generate_secret(self) -> str:
        """Генерация нового TOTP секрета"""
        return pyotp.random_base32()
    
    def create_totp_object(self, secret: str) -> pyotp.TOTP:
        """Создание TOTP объекта с настройками системы"""
        return pyotp.TOTP(
            secret,
            digits=self.settings.totp_digits,
            algorithm=self.settings.totp_algorithm,
            interval=self.settings.totp_window
        )
    
    def generate_provisioning_uri(self, secret: str, account_name: str, issuer: str = "Искра Экосистема") -> str:
        """Генерация provisioning URI для QR кода"""
        totp = self.create_totp_object(secret)
        return totp.provisioning_uri(
            name=account_name,
            issuer_name=issuer
        )
    
    async def setup_totp(self, user_id: str, account_name: str, issuer: str = "Искра Экосистема") -> Dict[str, Any]:
        """Настройка TOTP для пользователя"""
        
        try:
            # Проверка, есть ли уже настройки 2FA
            user_2fa = self.db.query(User2FA).filter(User2FA.user_id == user_id).first()
            
            if user_2fa and user_2fa.is_totp_enabled:
                raise TwoFAError("2FA уже настроен для этого пользователя")
            
            # Генерация нового секрета
            secret = self.generate_secret()
            
            if user_2fa:
                # Обновление существующих настроек
                user_2fa.totp_secret_encrypted = self.encryption.encrypt_secret(secret)
                user_2fa.account_name = account_name
                user_2fa.issuer_name = issuer
                user_2fa.is_totp_enabled = False  # Будет включен после подтверждения
                user_2fa.totp_setup_date = None
                user_2fa.failed_attempts = 0
                user_2fa.locked_until = None
            else:
                # Создание новой записи
                user_2fa = User2FA(
                    user_id=user_id,
                    totp_secret_encrypted=self.encryption.encrypt_secret(secret),
                    account_name=account_name,
                    issuer_name=issuer,
                    is_totp_enabled=False
                )
                self.db.add(user_2fa)
            
            self.db.commit()
            
            # Генерация backup кодов
            backup_codes = await self._generate_backup_codes(user_2fa.id)
            
            # Логирование события
            await self._log_security_event(
                user_id=user_id,
                event_type="2fa_setup_initiated",
                severity="INFO",
                description="Инициация настройки 2FA",
                details={"account_name": account_name, "issuer": issuer}
            )
            
            return {
                "setup_id": f"setup_{user_id}_{int(datetime.utcnow().timestamp())}",
                "secret": secret,
                "provisioning_uri": self.generate_provisioning_uri(secret, account_name, issuer),
                "backup_codes": backup_codes,
                "account_name": account_name,
                "issuer": issuer
            }
            
        except Exception as e:
            logger.error("Error setting up TOTP", user_id=user_id, error=str(e))
            await self._log_security_event(
                user_id=user_id,
                event_type="2fa_setup_failed",
                severity="ERROR", 
                description=f"Ошибка настройки 2FA: {str(e)}"
            )
            raise TwoFAError(f"Ошибка настройки 2FA: {str(e)}")
    
    async def verify_setup(self, user_id: str, totp_code: str) -> bool:
        """Подтверждение настройки TOTP"""
        
        try:
            user_2fa = self.db.query(User2FA).filter(User2FA.user_id == user_id).first()
            
            if not user_2fa:
                raise UserNotFoundError(f"Пользователь {user_id} не найден")
            
            if not user_2fa.totp_secret_encrypted:
                raise TwoFAError("TOTP секрет не найден")
            
            # Дешифрация секрета
            secret = self.encryption.decrypt_secret(user_2fa.totp_secret_encrypted)
            totp = self.create_totp_object(secret)
            
            # Проверка кода
            if not totp.verify(totp_code, valid_window=1):
                await self._log_security_event(
                    user_id=user_id,
                    event_type="2fa_setup_verification_failed",
                    severity="WARNING",
                    description="Неверный TOTP код при подтверждении настройки"
                )
                return False
            
            # Включение 2FA
            user_2fa.is_totp_enabled = True
            user_2fa.totp_setup_date = datetime.utcnow()
            user_2fa.failed_attempts = 0
            user_2fa.locked_until = None
            
            self.db.commit()
            
            await self._log_security_event(
                user_id=user_id,
                event_type="2fa_setup_completed",
                severity="INFO",
                description="2FA успешно настроен и включен"
            )
            
            return True
            
        except Exception as e:
            logger.error("Error verifying TOTP setup", user_id=user_id, error=str(e))
            raise TwoFAError(f"Ошибка подтверждения настройки: {str(e)}")
    
    async def authenticate(self, user_id: str, totp_code: Optional[str] = None, 
                          backup_code: Optional[str] = None) -> Dict[str, Any]:
        """Аутентификация с 2FA"""
        
        try:
            user_2fa = self.db.query(User2FA).filter(User2FA.user_id == user_id).first()
            
            if not user_2fa:
                raise UserNotFoundError(f"Пользователь {user_id} не найден")
            
            if not user_2fa.is_totp_enabled:
                raise TwoFANotEnabledError("2FA не включен для этого пользователя")
            
            # Проверка блокировки
            if self._is_account_locked(user_2fa):
                raise AccountLockedError("Аккаунт заблокирован из-за превышения лимита попыток")
            
            success = False
            auth_method = None
            
            # Проверка TOTP кода
            if totp_code:
                success = await self._verify_totp_code(user_2fa, totp_code)
                auth_method = "totp"
            
            # Проверка backup кода
            elif backup_code:
                success = await self._verify_backup_code(user_2fa, backup_code)
                auth_method = "backup_code"
            
            else:
                raise TwoFAError("Не указан код аутентификации")
            
            if success:
                # Успешная аутентификация
                user_2fa.last_used = datetime.utcnow()
                user_2fa.failed_attempts = 0
                user_2fa.locked_until = None
                
                self.db.commit()
                
                await self._log_security_event(
                    user_id=user_id,
                    event_type="2fa_authentication_success",
                    severity="INFO",
                    description=f"Успешная аутентификация через {auth_method}",
                    success=True
                )
                
                return {
                    "success": True,
                    "auth_method": auth_method,
                    "user_id": user_id,
                    "expires_at": (datetime.utcnow() + timedelta(hours=24)).isoformat()
                }
            else:
                # Неудачная аутентификация
                user_2fa.failed_attempts += 1
                
                # Проверка необходимости блокировки
                if user_2fa.failed_attempts >= self.settings.max_failed_attempts:
                    user_2fa.locked_until = datetime.utcnow() + timedelta(seconds=self.settings.lockout_duration)
                    lock_status = f"Заблокирован до {user_2fa.locked_until.isoformat()}"
                else:
                    lock_status = f"Попыток осталось: {self.settings.max_failed_attempts - user_2fa.failed_attempts}"
                
                self.db.commit()
                
                await self._log_security_event(
                    user_id=user_id,
                    event_type="2fa_authentication_failed",
                    severity="WARNING",
                    description=f"Неудачная аутентификация через {auth_method}. {lock_status}",
                    success=False,
                    details={"failed_attempts": user_2fa.failed_attempts, "auth_method": auth_method}
                )
                
                return {
                    "success": False,
                    "error": "Неверный код аутентификации",
                    "remaining_attempts": max(0, self.settings.max_failed_attempts - user_2fa.failed_attempts),
                    "locked_until": user_2fa.locked_until.isoformat() if user_2fa.locked_until else None
                }
                
        except (AccountLockedError, UserNotFoundError, TwoFANotEnabledError):
            raise
        except Exception as e:
            logger.error("Error during 2FA authentication", user_id=user_id, error=str(e))
            await self._log_security_event(
                user_id=user_id,
                event_type="2fa_authentication_error",
                severity="ERROR",
                description=f"Ошибка аутентификации: {str(e)}",
                success=False
            )
            raise TwoFAError(f"Ошибка аутентификации: {str(e)}")
    
    def is_enabled(self, user_id: str) -> bool:
        """Проверка включен ли 2FA для пользователя"""
        user_2fa = self.db.query(User2FA).filter(User2FA.user_id == user_id).first()
        return user_2fa.is_totp_enabled if user_2fa else False
    
    def get_backup_codes_remaining(self, user_id: str) -> int:
        """Получение количества оставшихся backup кодов"""
        user_2fa = self.db.query(User2FA).filter(User2FA.user_id == user_id).first()
        if not user_2fa:
            return 0
        
        return self.db.query(BackupCode).filter(
            and_(
                BackupCode.user_2fa_id == user_2fa.id,
                BackupCode.is_used == False
            )
        ).count()
    
    async def disable_2fa(self, user_id: str, verification_code: str) -> bool:
        """Отключение 2FA (требует подтверждения кодом)"""
        
        try:
            user_2fa = self.db.query(User2FA).filter(User2FA.user_id == user_id).first()
            
            if not user_2fa or not user_2fa.is_totp_enabled:
                raise TwoFAError("2FA не включен")
            
            # Проверка кода
            secret = self.encryption.decrypt_secret(user_2fa.totp_secret_encrypted)
            totp = self.create_totp_object(secret)
            
            if not totp.verify(verification_code, valid_window=1):
                await self._log_security_event(
                    user_id=user_id,
                    event_type="2fa_disable_failed",
                    severity="WARNING",
                    description="Неверный код при отключении 2FA"
                )
                return False
            
            # Отключение 2FA
            user_2fa.is_totp_enabled = False
            user_2fa.totp_secret_encrypted = None
            user_2fa.failed_attempts = 0
            user_2fa.locked_until = None
            
            # Удаление backup кодов
            self.db.query(BackupCode).filter(BackupCode.user_2fa_id == user_2fa.id).delete()
            
            self.db.commit()
            
            await self._log_security_event(
                user_id=user_id,
                event_type="2fa_disabled",
                severity="INFO",
                description="2FA отключен пользователем"
            )
            
            return True
            
        except Exception as e:
            logger.error("Error disabling 2FA", user_id=user_id, error=str(e))
            raise TwoFAError(f"Ошибка отключения 2FA: {str(e)}")
    
    def _is_account_locked(self, user_2fa: User2FA) -> bool:
        """Проверка блокировки аккаунта"""
        return (user_2fa.locked_until and 
                datetime.utcnow() < user_2fa.locked_until)
    
    async def _verify_totp_code(self, user_2fa: User2FA, totp_code: str) -> bool:
        """Проверка TOTP кода"""
        try:
            secret = self.encryption.decrypt_secret(user_2fa.totp_secret_encrypted)
            totp = self.create_totp_object(secret)
            return totp.verify(totp_code, valid_window=1)
        except Exception as e:
            logger.error("Error verifying TOTP code", error=str(e))
            return False
    
    async def _verify_backup_code(self, user_2fa: User2FA, backup_code: str) -> bool:
        """Проверка backup кода"""
        # Хеширование предоставленного кода
        code_hash = hashlib.sha256(backup_code.encode()).hexdigest()
        
        # Поиск неиспользованного кода
        backup_code_record = self.db.query(BackupCode).filter(
            and_(
                BackupCode.user_2fa_id == user_2fa.id,
                BackupCode.code_hash == code_hash,
                BackupCode.is_used == False
            )
        ).first()
        
        if backup_code_record:
            # Помечаем код как использованный
            backup_code_record.is_used = True
            backup_code_record.used_at = datetime.utcnow()
            self.db.commit()
            return True
        
        return False
    
    async def _generate_backup_codes(self, user_2fa_id: int) -> List[str]:
        """Генерация backup кодов для пользователя"""
        codes = []
        
        for _ in range(self.settings.backup_codes_count):
            # Генерация кода
            code = ''.join(secrets.choice('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ') 
                          for _ in range(self.settings.backup_codes_length))
            codes.append(code)
            
            # Сохранение в БД
            code_hash = hashlib.sha256(code.encode()).hexdigest()
            backup_code = BackupCode(
                user_2fa_id=user_2fa_id,
                code_hash=code_hash
            )
            self.db.add(backup_code)
        
        self.db.commit()
        return codes
    
    async def _log_security_event(self, user_id: str, event_type: str, 
                                 severity: str, description: str, 
                                 success: bool = None, details: Dict[str, Any] = None):
        """Логирование события безопасности"""
        try:
            log_entry = SecurityLog(
                user_id=user_id,
                event_type=event_type,
                severity=severity,
                description=description,
                details=str(details) if details else None,
                success=success if success is not None else True,
                timestamp=datetime.utcnow()
            )
            
            self.db.add(log_entry)
            self.db.commit()
            
        except Exception as e:
            logger.error("Error logging security event", event_type=event_type, error=str(e))
