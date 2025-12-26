"""
Модуль восстановления доступа для 2FA системы
"""

import secrets
import hashlib
import json
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from enum import Enum
import structlog
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, desc

from .models import User2FA, RecoveryToken, SecurityLog, TwoFASettings
from .exceptions import (
    TwoFAError, UserNotFoundError, RecoveryTokenExpiredError, 
    RecoveryTokenMaxAttemptsError, TwoFANotEnabledError
)

logger = structlog.get_logger("iskra.2fa.recovery")

class RecoveryMethod(Enum):
    """Методы восстановления доступа"""
    EMAIL = "email"
    SMS = "sms"
    ADMIN = "admin"
    TRUSTED_DEVICE = "trusted_device"

class RecoveryManager:
    """Менеджер восстановления доступа для 2FA"""
    
    def __init__(self, db_session: Session, encryption_key: str, totp_manager):
        self.db = db_session
        self.encryption_key = encryption_key
        self.totp_manager = totp_manager
        self._settings = None
        
    @property
    def settings(self) -> TwoFASettings:
        """Получение настроек 2FA"""
        if self._settings is None:
            self._settings = self.db.query(TwoFASettings).first()
        return self._settings
    
    async def initiate_recovery(self, user_id: str, method: RecoveryMethod, 
                              contact_info: str = None, ip_address: str = None,
                              user_agent: str = None) -> Dict[str, Any]:
        """
        Инициация процедуры восстановления
        
        Args:
            user_id: Идентификатор пользователя
            method: Метод восстановления
            contact_info: Контактная информация (email, телефон)
            ip_address: IP адрес запроса
            user_agent: User agent браузера
            
        Returns:
            Словарь с информацией о токене восстановления
            
        Raises:
            UserNotFoundError: Если пользователь не найден
            TwoFANotEnabledError: Если 2FA не включен
        """
        try:
            # Проверка пользователя
            user_2fa = self.db.query(User2FA).filter(User2FA.user_id == user_id).first()
            
            if not user_2fa:
                raise UserNotFoundError(f"Пользователь {user_id} не найден")
            
            if not user_2fa.is_totp_enabled:
                raise TwoFANotEnabledError("2FA не включен для этого пользователя")
            
            # Проверка метода восстановления
            if method.value not in self.settings.get_recovery_methods_list():
                raise TwoFAError(f"Метод восстановления {method.value} не поддерживается")
            
            # Генерация токена восстановления
            recovery_token = secrets.token_urlsafe(32)
            token_salt = secrets.token_hex(16)
            
            # Создание хеша токена
            token_hash = self._hash_recovery_token(recovery_token, token_salt)
            
            # Создание записи о токене
            recovery_token_record = RecoveryToken(
                user_2fa_id=user_2fa.id,
                recovery_method=method.value,
                token_hash=token_hash,
                token_salt=token_salt,
                max_attempts=3,
                expires_at=datetime.utcnow() + timedelta(seconds=self.settings.recovery_email_timeout),
                ip_address=ip_address,
                user_agent=user_agent,
                metadata=json.dumps({
                    "contact_info": contact_info,
                    "initiated_at": datetime.utcnow().isoformat()
                })
            )
            
            self.db.add(recovery_token_record)
            self.db.commit()
            
            # Логирование инициации восстановления
            await self._log_security_event(
                user_id=user_id,
                event_type="recovery_initiated",
                severity="INFO",
                description=f"Инициация восстановления через {method.value}",
                details={
                    "method": method.value,
                    "token_id": token_hash[:8],
                    "expires_at": recovery_token_record.expires_at.isoformat()
                }
            )
            
            # Подготовка ответа
            result = {
                "recovery_token": recovery_token,
                "token_id": token_hash[:8],  # Частичный ID для пользователя
                "method": method.value,
                "expires_at": recovery_token_record.expires_at.isoformat(),
                "max_attempts": 3,
                "instructions": self._get_recovery_instructions(method)
            }
            
            # Отправка уведомления в зависимости от метода
            if method == RecoveryMethod.EMAIL:
                await self._send_recovery_email(contact_info, recovery_token, user_id)
            elif method == RecoveryMethod.SMS:
                await self._send_recovery_sms(contact_info, recovery_token, user_id)
            
            return result
            
        except (UserNotFoundError, TwoFANotEnabledError, TwoFAError):
            raise
        except Exception as e:
            logger.error("Error initiating recovery", user_id=user_id, method=method.value, error=str(e))
            raise TwoFAError(f"Ошибка инициации восстановления: {str(e)}")
    
    async def complete_recovery(self, user_id: str, recovery_token: str, 
                              new_totp_secret: str = None) -> Dict[str, Any]:
        """
        Завершение восстановления доступа
        
        Args:
            user_id: Идентификатор пользователя
            recovery_token: Токен восстановления
            new_totp_secret: Новый TOTP секрет (опционально)
            
        Returns:
            Информация о успешном восстановлении
        """
        try:
            # Поиск пользователя
            user_2fa = self.db.query(User2FA).filter(User2FA.user_id == user_id).first()
            
            if not user_2fa:
                raise UserNotFoundError(f"Пользователь {user_id} не найден")
            
            # Поиск валидного токена
            token_hash = self._hash_recovery_token_with_salt(recovery_token)
            recovery_token_record = self.db.query(RecoveryToken).filter(
                and_(
                    RecoveryToken.user_2fa_id == user_2fa.id,
                    RecoveryToken.token_hash == token_hash,
                    RecoveryToken.used_at == None,
                    RecoveryToken.expires_at > datetime.utcnow()
                )
            ).first()
            
            if not recovery_token_record:
                await self._log_security_event(
                    user_id=user_id,
                    event_type="recovery_failed_invalid_token",
                    severity="WARNING",
                    description="Попытка восстановления с неверным токеном"
                )
                raise TwoFAError("Неверный или истекший токен восстановления")
            
            # Проверка лимита попыток
            if not recovery_token_record.can_attempt():
                if recovery_token_record.is_expired():
                    raise RecoveryTokenExpiredError("Токен восстановления истек")
                else:
                    raise RecoveryTokenMaxAttemptsError("Превышен лимит попыток восстановления")
            
            # Проверка токена
            if not self._verify_recovery_token(recovery_token, recovery_token_record):
                recovery_token_record.current_attempts += 1
                self.db.commit()
                
                await self._log_security_event(
                    user_id=user_id,
                    event_type="recovery_failed_invalid_token",
                    severity="WARNING", 
                    description=f"Неверный токен восстановления. Попытка {recovery_token_record.current_attempts}",
                    details={"attempts": recovery_token_record.current_attempts}
                )
                
                raise TwoFAError("Неверный токен восстановления")
            
            # Успешная проверка токена
            recovery_token_record.used_at = datetime.utcnow()
            
            # Генерация нового TOTP секрета, если не предоставлен
            if not new_totp_secret:
                new_totp_secret = self.totp_manager.generate_secret()
            
            # Инвалидация старого секрета
            old_secret_hash = user_2fa.totp_secret_encrypted
            user_2fa.totp_secret_encrypted = self.totp_manager.encryption.encrypt_secret(new_totp_secret)
            user_2fa.is_totp_enabled = True  # Повторное включение
            user_2fa.failed_attempts = 0
            user_2fa.locked_until = None
            user_2fa.totp_setup_date = datetime.utcnow()
            
            # Генерация новых backup кодов
            backup_codes = await self.totp_manager._generate_backup_codes(user_2fa.id)
            
            self.db.commit()
            
            # Логирование успешного восстановления
            await self._log_security_event(
                user_id=user_id,
                event_type="recovery_successful",
                severity="INFO",
                description=f"Успешное восстановление через {recovery_token_record.recovery_method}",
                details={
                    "method": recovery_token_record.recovery_method,
                    "new_backup_codes_count": len(backup_codes),
                    "old_secret_invalidated": old_secret_hash is not None
                }
            )
            
            return {
                "success": True,
                "message": "Восстановление доступа успешно завершено",
                "new_backup_codes": backup_codes,
                "requires_setup_verification": True,
                "account_secured": True
            }
            
        except (UserNotFoundError, TwoFAError, RecoveryTokenExpiredError, RecoveryTokenMaxAttemptsError):
            raise
        except Exception as e:
            logger.error("Error completing recovery", user_id=user_id, error=str(e))
            raise TwoFAError(f"Ошибка завершения восстановления: {str(e)}")
    
    async def cancel_recovery(self, user_id: str, recovery_token: str) -> bool:
        """
        Отмена процедуры восстановления
        
        Args:
            user_id: Идентификатор пользователя
            recovery_token: Токен восстановления
            
        Returns:
            True если отмена успешна
        """
        try:
            token_hash = self._hash_recovery_token_with_salt(recovery_token)
            
            # Поиск и отмена токена
            recovery_token_record = self.db.query(RecoveryToken).filter(
                and_(
                    RecoveryToken.user_2fa_id == User2FA.id,
                    RecoveryToken.token_hash == token_hash,
                    User2FA.user_id == user_id,
                    RecoveryToken.used_at == None
                )
            ).first()
            
            if recovery_token_record:
                recovery_token_record.used_at = datetime.utcnow()
                self.db.commit()
                
                await self._log_security_event(
                    user_id=user_id,
                    event_type="recovery_cancelled",
                    severity="INFO",
                    description="Процедура восстановления отменена пользователем"
                )
                
                return True
            
            return False
            
        except Exception as e:
            logger.error("Error cancelling recovery", user_id=user_id, error=str(e))
            return False
    
    def _hash_recovery_token(self, token: str, salt: str) -> str:
        """Хеширование токена восстановления"""
        return hashlib.sha256((token + salt).encode()).hexdigest()
    
    def _hash_recovery_token_with_salt(self, token: str, salt: str = None) -> str:
        """Хеширование токена с известной солью"""
        if salt is None:
            # Поиск токена в БД для получения соли
            raise ValueError("Соль не предоставлена")
        return self._hash_recovery_token(token, salt)
    
    def _verify_recovery_token(self, token: str, token_record: RecoveryToken) -> bool:
        """Проверка токена восстановления"""
        expected_hash = self._hash_recovery_token(token, token_record.token_salt)
        return expected_hash == token_record.token_hash
    
    def _get_recovery_instructions(self, method: RecoveryMethod) -> str:
        """Получение инструкций для метода восстановления"""
        instructions = {
            RecoveryMethod.EMAIL: 
                "На вашу электронную почту отправлены инструкции по восстановлению доступа. "
                "Следуйте ссылке в письме для завершения процедуры.",
            
            RecoveryMethod.SMS: 
                "На ваш телефон отправлен код подтверждения. "
                "Введите код на странице восстановления доступа.",
                
            RecoveryMethod.ADMIN: 
                "Обратитесь к администратору системы для восстановления доступа. "
                "Потребуется подтверждение личности.",
                
            RecoveryMethod.TRUSTED_DEVICE: 
                "Используйте доверенное устройство для входа в систему. "
                "Токен будет отправлен на зарегистрированное устройство."
        }
        return instructions.get(method, "Следуйте инструкциям для выбранного метода восстановления.")
    
    async def _send_recovery_email(self, email: str, token: str, user_id: str):
        """Отправка email с токеном восстановления (заглушка)"""
        # TODO: Реализовать отправку email
        logger.info("Recovery email would be sent", email=email, user_id=user_id, token_prefix=token[:8])
    
    async def _send_recovery_sms(self, phone: str, token: str, user_id: str):
        """Отправка SMS с токеном восстановления (заглушка)"""
        # TODO: Реализовать отправку SMS
        logger.info("Recovery SMS would be sent", phone=phone, user_id=user_id, token_prefix=token[:8])
    
    async def _log_security_event(self, user_id: str, event_type: str, 
                                 severity: str, description: str, details: Dict[str, Any] = None):
        """Логирование события безопасности"""
        try:
            log_entry = SecurityLog(
                user_id=user_id,
                event_type=event_type,
                severity=severity,
                description=description,
                details=str(details) if details else None,
                success="failed" not in event_type,
                timestamp=datetime.utcnow()
            )
            
            self.db.add(log_entry)
            self.db.commit()
            
        except Exception as e:
            logger.error("Error logging security event", event_type=event_type, error=str(e))


class AdminRecoveryManager:
    """Административный менеджер восстановления"""
    
    def __init__(self, db_session: Session, admin_authenticator, recovery_manager: RecoveryManager):
        self.db = db_session
        self.admin_auth = admin_authenticator
        self.recovery_manager = recovery_manager
        self.logger = structlog.get_logger("iskra.2fa.admin_recovery")
    
    async def admin_reset_2fa(self, user_id: str, admin_id: str, reason: str, 
                            ip_address: str = None) -> Dict[str, Any]:
        """
        Административный сброс 2FA (требует аудита)
        
        Args:
            user_id: Идентификатор пользователя
            admin_id: Идентификатор администратора
            reason: Причина сброса
            ip_address: IP адрес запроса
            
        Returns:
            Информация о созданном портале восстановления
            
        Raises:
            SecurityViolationError: При нарушении процедур безопасности
        """
        try:
            # Проверка административных прав
            if not await self.admin_auth.verify_admin(admin_id):
                await self._log_admin_action(admin_id, "2fa_reset_failed", "Неверные учетные данные администратора")
                raise SecurityViolationError("Неверные учетные данные администратора")
            
            # Проверка пользователя
            user_2fa = self.db.query(User2FA).filter(User2FA.user_id == user_id).first()
            
            if not user_2fa:
                await self._log_admin_action(admin_id, "2fa_reset_failed", f"Пользователь {user_id} не найден")
                raise UserNotFoundError(f"Пользователь {user_id} не найден")
            
            # Генерация служебного токена
            service_token = secrets.token_urlsafe(64)
            service_token_salt = secrets.token_hex(16)
            service_token_hash = self.recovery_manager._hash_recovery_token(service_token, service_token_salt)
            
            # Создание административного токена восстановления
            admin_recovery_token = RecoveryToken(
                user_2fa_id=user_2fa.id,
                recovery_method="admin",
                token_hash=service_token_hash,
                token_salt=service_token_salt,
                max_attempts=1,  # Одноразовый токен
                expires_at=datetime.utcnow() + timedelta(hours=2),  # 2 часа
                ip_address=ip_address,
                user_agent="AdminPanel",
                metadata=json.dumps({
                    "admin_id": admin_id,
                    "reason": reason,
                    "service_token": True,
                    "created_at": datetime.utcnow().isoformat()
                })
            )
            
            self.db.add(admin_recovery_token)
            self.db.commit()
            
            # Логирование административного действия
            await self._log_admin_action(
                admin_id=admin_id,
                action="2fa_reset_initiated",
                details=f"Сброс 2FA для пользователя {user_id}. Причина: {reason}",
                target_user=user_id,
                service_token_id=service_token_hash[:8]
            )
            
            # Создание служебного портала (заглушка)
            portal_url = await self._create_recovery_portal(
                user_id=user_id,
                service_token=service_token,
                admin_id=admin_id,
                reason=reason
            )
            
            return {
                "recovery_portal": portal_url,
                "service_token": service_token,
                "expires_in": 7200,  # 2 часа
                "requires_user_verification": True,
                "admin_audit_trail": True
            }
            
        except Exception as e:
            logger.error("Error in admin 2FA reset", admin_id=admin_id, user_id=user_id, error=str(e))
            raise SecurityViolationError(f"Ошибка административного сброса: {str(e)}")
    
    async def view_recovery_log(self, user_id: str, admin_id: str, 
                              time_range_days: int = 30) -> List[Dict[str, Any]]:
        """
        Просмотр логов восстановления пользователя
        
        Args:
            user_id: Идентификатор пользователя
            admin_id: Идентификатор администратора
            time_range_days: Диапазон в днях
            
        Returns:
            Список логов восстановления
        """
        try:
            # Проверка административных прав
            if not await self.admin_auth.verify_admin(admin_id):
                raise SecurityViolationError("Недостаточно прав для просмотра логов")
            
            # Получение логов
            start_date = datetime.utcnow() - timedelta(days=time_range_days)
            
            recovery_logs = self.db.query(SecurityLog).filter(
                and_(
                    SecurityLog.user_id == user_id,
                    SecurityLog.timestamp >= start_date,
                    SecurityLog.event_type.like("%recovery%")
                )
            ).order_by(desc(SecurityLog.timestamp)).all()
            
            # Форматирование логов с маскировкой чувствительных данных
            formatted_logs = []
            for log in recovery_logs:
                log_data = {
                    "timestamp": log.timestamp.isoformat(),
                    "event_type": log.event_type,
                    "severity": log.severity,
                    "description": log.description,
                    "success": log.success
                }
                
                # Маскировка чувствительных данных
                if log.details:
                    try:
                        details = json.loads(log.details)
                        if "token_id" in details:
                            details["token_id"] = details["token_id"][:8] + "..."
                        log_data["details"] = details
                    except json.JSONDecodeError:
                        log_data["details"] = log.details
                
                formatted_logs.append(log_data)
            
            return formatted_logs
            
        except Exception as e:
            logger.error("Error viewing recovery log", admin_id=admin_id, user_id=user_id, error=str(e))
            raise SecurityViolationError(f"Ошибка просмотра логов: {str(e)}")
    
    async def _create_recovery_portal(self, user_id: str, service_token: str, 
                                    admin_id: str, reason: str) -> str:
        """Создание служебного портала восстановления (заглушка)"""
        # TODO: Реализовать создание портала
        portal_url = f"/recovery/admin/{service_token[:16]}"
        self.logger.info("Admin recovery portal created", 
                        user_id=user_id, admin_id=admin_id, reason=reason, portal_url=portal_url)
        return portal_url
    
    async def _log_admin_action(self, admin_id: str, action: str, details: str, 
                              target_user: str = None, service_token_id: str = None):
        """Логирование административных действий"""
        try:
            log_entry = SecurityLog(
                user_id=target_user,
                event_type=f"admin_{action}",
                severity="INFO",
                description=f"Административное действие: {details}",
                success=True,
                timestamp=datetime.utcnow()
            )
            
            # Добавление дополнительной информации в details
            details_data = {
                "admin_id": admin_id,
                "action": action,
                "service_token_id": service_token_id
            }
            log_entry.details = json.dumps(details_data)
            
            self.db.add(log_entry)
            self.db.commit()
            
        except Exception as e:
            self.logger.error("Error logging admin action", admin_id=admin_id, action=action, error=str(e))
