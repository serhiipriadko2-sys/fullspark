"""
Исключения для 2FA системы экосистемы Искра
"""

class TwoFAError(Exception):
    """Базовый класс для всех исключений 2FA"""
    pass


class InvalidTOTPError(TwoFAError):
    """Исключение для неверного TOTP кода"""
    pass


class UserNotFoundError(TwoFAError):
    """Исключение для не найденного пользователя"""
    pass


class TwoFANotEnabledError(TwoFAError):
    """Исключение когда 2FA не включен"""
    pass


class AccountLockedError(TwoFAError):
    """Исключение для заблокированного аккаунта"""
    def __init__(self, message, locked_until=None):
        super().__init__(message)
        self.locked_until = locked_until


class BackupCodeAlreadyUsedError(TwoFAError):
    """Исключение для уже использованного backup кода"""
    pass


class InvalidBackupCodeError(TwoFAError):
    """Исключение для неверного backup кода"""
    pass


class RecoveryTokenExpiredError(TwoFAError):
    """Исключение для истекшего токена восстановления"""
    pass


class RecoveryTokenMaxAttemptsError(TwoFAError):
    """Исключение для превышения лимита попыток восстановления"""
    pass


class EncryptionError(TwoFAError):
    """Исключение для ошибок шифрования"""
    pass


class DecryptionError(TwoFAError):
    """Исключение для ошибок дешифрования"""
    pass


class SecurityViolationError(TwoFAError):
    """Исключение для нарушений безопасности"""
    pass


class RateLimitError(TwoFAError):
    """Исключение для превышения лимита запросов"""
    pass


class ConfigurationError(TwoFAError):
    """Исключение для ошибок конфигурации"""
    pass
