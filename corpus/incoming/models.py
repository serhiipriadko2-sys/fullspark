"""
Модели данных для 2FA системы экосистемы Искра
"""

from datetime import datetime
from typing import Optional, List
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey, Index
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

Base = declarative_base()

class User2FA(Base):
    """Модель 2FA настроек пользователя"""
    
    __tablename__ = "user_2fa"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(100), unique=True, nullable=False, index=True)
    
    # TOTP настройки
    totp_secret_encrypted = Column(Text, nullable=True)
    is_totp_enabled = Column(Boolean, default=False, nullable=False)
    totp_setup_date = Column(DateTime, nullable=True)
    
    # Метаданные
    issuer_name = Column(String(100), default="Искра Экосистема", nullable=False)
    account_name = Column(String(255), nullable=True)  # email или имя пользователя
    
    # Статистика
    failed_attempts = Column(Integer, default=0, nullable=False)
    last_used = Column(DateTime, nullable=True)
    locked_until = Column(DateTime, nullable=True)
    
    # Временные метки
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)
    
    # Backup коды
    backup_codes = relationship("BackupCode", back_populates="user_2fa", cascade="all, delete-orphan")
    
    # Recovery токены
    recovery_tokens = relationship("RecoveryToken", back_populates="user_2fa", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<User2FA(user_id='{self.user_id}', is_enabled={self.is_totp_enabled})>"

class BackupCode(Base):
    """Модель backup кодов"""
    
    __tablename__ = "backup_codes"
    
    id = Column(Integer, primary_key=True, index=True)
    user_2fa_id = Column(Integer, ForeignKey("user_2fa.id"), nullable=False, index=True)
    
    # Хешированный код
    code_hash = Column(String(64), nullable=False)  # SHA256 хеш
    
    # Статус использования
    is_used = Column(Boolean, default=False, nullable=False)
    used_at = Column(DateTime, nullable=True)
    used_from_ip = Column(String(45), nullable=True)  # IPv6 совместимость
    
    # Временные метки
    created_at = Column(DateTime, default=func.now(), nullable=False)
    
    # Связи
    user_2fa = relationship("User2FA", back_populates="backup_codes")
    
    __table_args__ = (
        Index('idx_backup_code_hash', 'code_hash'),
        Index('idx_backup_code_user', 'user_2fa_id'),
    )
    
    def __repr__(self):
        return f"<BackupCode(user_2fa_id={self.user_2fa_id}, used={self.is_used})>"

class RecoveryToken(Base):
    """Модель токенов восстановления"""
    
    __tablename__ = "recovery_tokens"
    
    id = Column(Integer, primary_key=True, index=True)
    user_2fa_id = Column(Integer, ForeignKey("user_2fa.id"), nullable=False, index=True)
    
    # Тип восстановления
    recovery_method = Column(String(20), nullable=False)  # email, sms, admin
    
    # Токен и его хеш
    token_hash = Column(String(64), nullable=False)  # SHA256 хеш
    token_salt = Column(String(32), nullable=False)  # Соль для хеширования
    
    # Ограничения
    max_attempts = Column(Integer, default=3, nullable=False)
    current_attempts = Column(Integer, default=0, nullable=False)
    
    # Временные рамки
    expires_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=func.now(), nullable=False)
    used_at = Column(DateTime, nullable=True)
    
    # Дополнительная информация
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(Text, nullable=True)
    metadata = Column(Text, nullable=True)  # JSON строка с дополнительными данными
    
    # Связи
    user_2fa = relationship("User2FA", back_populates="recovery_tokens")
    
    __table_args__ = (
        Index('idx_recovery_token_hash', 'token_hash'),
        Index('idx_recovery_token_user', 'user_2fa_id'),
        Index('idx_recovery_token_expires', 'expires_at'),
    )
    
    def is_expired(self) -> bool:
        """Проверка истечения токена"""
        return datetime.utcnow() > self.expires_at
    
    def can_attempt(self) -> bool:
        """Проверка возможности попытки"""
        return (not self.is_expired() and 
                not self.used_at and 
                self.current_attempts < self.max_attempts)
    
    def __repr__(self):
        return f"<RecoveryToken(user_2fa_id={self.user_2fa_id}, method='{self.recovery_method}', expired={self.is_expired()})>"

class SecurityLog(Base):
    """Модель логов безопасности для аудита"""
    
    __tablename__ = "security_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(100), nullable=True, index=True)  # Может быть null для системных событий
    
    # Тип события
    event_type = Column(String(50), nullable=False, index=True)
    severity = Column(String(20), nullable=False, default="INFO")  # INFO, WARNING, ERROR, CRITICAL
    
    # Детали события
    description = Column(Text, nullable=False)
    details = Column(Text, nullable=True)  # JSON строка с дополнительными деталями
    
    # Контекст
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(Text, nullable=True)
    session_id = Column(String(100), nullable=True, index=True)
    
    # Результат
    success = Column(Boolean, nullable=False)
    error_message = Column(Text, nullable=True)
    
    # Временные метки
    timestamp = Column(DateTime, default=func.now(), nullable=False, index=True)
    
    __table_args__ = (
        Index('idx_security_log_timestamp', 'timestamp'),
        Index('idx_security_log_user_event', 'user_id', 'event_type'),
        Index('idx_security_log_severity_timestamp', 'severity', 'timestamp'),
    )
    
    def __repr__(self):
        return f"<SecurityLog(user_id='{self.user_id}', event_type='{self.event_type}', severity='{self.severity}')>"

class TwoFASettings(Base):
    """Модель глобальных настроек 2FA системы"""
    
    __tablename__ = "2fa_settings"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # TOTP настройки
    totp_window = Column(Integer, default=30, nullable=False)  # Временное окно в секундах
    totp_digits = Column(Integer, default=6, nullable=False)
    totp_algorithm = Column(String(20), default="SHA1", nullable=False)
    
    # Backup коды
    backup_codes_count = Column(Integer, default=10, nullable=False)
    backup_codes_length = Column(Integer, default=8, nullable=False)
    
    # Блокировки
    max_failed_attempts = Column(Integer, default=5, nullable=False)
    lockout_duration = Column(Integer, default=300, nullable=False)  # В секундах
    progressive_delay = Column(Boolean, default=True, nullable=False)
    
    # Recovery настройки
    recovery_methods = Column(Text, nullable=True)  # JSON массив методов
    recovery_email_timeout = Column(Integer, default=3600, nullable=False)
    admin_approval_required = Column(Boolean, default=False, nullable=False)
    
    # Временные метки
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)
    
    def get_recovery_methods_list(self) -> List[str]:
        """Получение списка методов восстановления"""
        if not self.recovery_methods:
            return ["email", "admin"]
        try:
            import json
            return json.loads(self.recovery_methods)
        except (json.JSONDecodeError, TypeError):
            return ["email", "admin"]
    
    def set_recovery_methods_list(self, methods: List[str]):
        """Установка списка методов восстановления"""
        try:
            import json
            self.recovery_methods = json.dumps(methods)
        except (TypeError, ValueError):
            self.recovery_methods = json.dumps(["email", "admin"])
    
    def __repr__(self):
        return f"<TwoFASettings(totp_window={self.totp_window}, max_attempts={self.max_failed_attempts})>"

# Индексы для оптимизации запросов
Index('idx_user_2fa_user_id', User2FA.user_id)
Index('idx_user_2fa_enabled', User2FA.is_totp_enabled)
Index('idx_user_2fa_locked', User2FA.locked_until)
Index('idx_security_logs_analysis', SecurityLog.timestamp, SecurityLog.event_type, SecurityLog.severity)
