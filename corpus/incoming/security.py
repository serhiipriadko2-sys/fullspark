"""
Модуль шифрования для 2FA системы
"""

import base64
import os
from typing import Optional
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
import structlog

logger = structlog.get_logger("iskra.2fa.encryption")

class TwoFAEncryption:
    """
    Класс для безопасного шифрования и дешифрования 2FA секретов
    Использует Fernet (AES 128 в режиме CBC) с PBKDF2 для генерации ключа
    """
    
    def __init__(self, master_key: str, iterations: int = 100000):
        """
        Инициализация шифрования
        
        Args:
            master_key: Мастер-ключ для шифрования
            iterations: Количество итераций PBKDF2
        """
        self.master_key = master_key.encode('utf-8')
        self.iterations = iterations
        self._fernet = self._create_fernet()
    
    def _create_fernet(self) -> Fernet:
        """
        Создание Fernet объекта с производным ключом
        Использует мастер-ключ для генерации уникального ключа шифрования
        """
        try:
            # Генерация случайной соли
            salt = os.urandom(16)
            
            # Создание PBKDF2 генератора ключей
            kdf = PBKDF2HMAC(
                algorithm=hashes.SHA256(),
                length=32,  # 256 бит для Fernet
                salt=salt,
                iterations=self.iterations,
            )
            
            # Генерация ключа
            key = base64.urlsafe_b64encode(kdf.derive(self.master_key))
            
            # Создание Fernet объекта
            return Fernet(key)
            
        except Exception as e:
            logger.error("Error creating Fernet instance", error=str(e))
            raise EncryptionError(f"Ошибка создания шифратора: {str(e)}")
    
    def encrypt_secret(self, secret: str) -> str:
        """
        Шифрование секрета
        
        Args:
            secret: Секрет для шифрования (обычно base32 TOTP секрет)
            
        Returns:
            Зашифрованная строка в формате base64
            
        Raises:
            EncryptionError: При ошибке шифрования
        """
        try:
            if not secret:
                raise ValueError("Секрет не может быть пустым")
            
            # Шифрование секрета
            encrypted_bytes = self._fernet.encrypt(secret.encode('utf-8'))
            
            # Кодирование в base64 для хранения в БД
            encrypted_base64 = base64.urlsafe_b64encode(encrypted_bytes).decode('utf-8')
            
            logger.debug("Secret encrypted successfully", secret_length=len(secret))
            return encrypted_base64
            
        except Exception as e:
            logger.error("Error encrypting secret", error=str(e))
            raise EncryptionError(f"Ошибка шифрования секрета: {str(e)}")
    
    def decrypt_secret(self, encrypted_secret: str) -> str:
        """
        Дешифрование секрета
        
        Args:
            encrypted_secret: Зашифрованный секрет в формате base64
            
        Returns:
            Расшифрованный секрет
            
        Raises:
            EncryptionError: При ошибке дешифрования
            DecryptionError: При неверном зашифрованном данных
        """
        try:
            if not encrypted_secret:
                raise ValueError("Зашифрованный секрет не может быть пустым")
            
            # Декодирование из base64
            encrypted_bytes = base64.urlsafe_b64decode(encrypted_secret.encode('utf-8'))
            
            # Дешифрование
            decrypted_bytes = self._fernet.decrypt(encrypted_bytes)
            
            # Преобразование в строку
            secret = decrypted_bytes.decode('utf-8')
            
            logger.debug("Secret decrypted successfully", secret_length=len(secret))
            return secret
            
        except Exception as e:
            if "timestamp" in str(e).lower() or "expired" in str(e).lower():
                logger.error("Error decrypting secret - possibly expired or corrupted", error=str(e))
                raise DecryptionError("Секрет истек или поврежден")
            else:
                logger.error("Error decrypting secret", error=str(e))
                raise EncryptionError(f"Ошибка дешифрования секрета: {str(e)}")
    
    def generate_encryption_key(self) -> str:
        """
        Генерация нового мастер-ключа шифрования
        
        Returns:
            Hex строка мастер-ключа
        """
        try:
            # Генерация 32 байт (256 бит) случайных данных
            key_bytes = os.urandom(32)
            
            # Преобразование в hex строку
            key_hex = key_bytes.hex()
            
            logger.info("New encryption key generated", key_length=len(key_hex))
            return key_hex
            
        except Exception as e:
            logger.error("Error generating encryption key", error=str(e))
            raise EncryptionError(f"Ошибка генерации ключа шифрования: {str(e)}")
    
    def verify_key_format(self, key: str) -> bool:
        """
        Проверка формата мастер-ключа
        
        Args:
            key: Ключ для проверки
            
        Returns:
            True если ключ в корректном формате
        """
        try:
            # Проверка длины (64 hex символа для 32 байт)
            if len(key) != 64:
                return False
            
            # Проверка что это hex строка
            int(key, 16)
            
            return True
            
        except (ValueError, TypeError):
            return False
    
    def rotate_encryption_key(self, new_master_key: str) -> bool:
        """
        Смена мастер-ключа шифрования (ротация ключей)
        
        Args:
            new_master_key: Новый мастер-ключ
            
        Returns:
            True если ротация успешна
            
        Raises:
            ValueError: При неверном формате нового ключа
        """
        try:
            if not self.verify_key_format(new_master_key):
                raise ValueError("Новый ключ должен быть в формате hex (64 символа)")
            
            # Создание нового шифратора
            old_fernet = self._fernet
            
            # Создание нового Fernet объекта
            self.master_key = new_master_key.encode('utf-8')
            self._fernet = self._create_fernet()
            
            logger.info("Encryption key rotated successfully")
            return True
            
        except Exception as e:
            logger.error("Error rotating encryption key", error=str(e))
            # Восстановление старого ключа при ошибке
            self._fernet = old_fernet
            raise EncryptionError(f"Ошибка ротации ключа: {str(e)}")
    
    def hash_backup_code(self, backup_code: str) -> str:
        """
        Хеширование backup кода для безопасного хранения
        
        Args:
            backup_code: Backup код для хеширования
            
        Returns:
            SHA256 хеш кода
        """
        try:
            import hashlib
            
            if not backup_code:
                raise ValueError("Backup код не может быть пустым")
            
            # SHA256 хеширование
            hash_object = hashlib.sha256(backup_code.encode('utf-8'))
            code_hash = hash_object.hexdigest()
            
            logger.debug("Backup code hashed", code_prefix=code_hash[:8])
            return code_hash
            
        except Exception as e:
            logger.error("Error hashing backup code", error=str(e))
            raise EncryptionError(f"Ошибка хеширования backup кода: {str(e)}")
    
    def verify_backup_code(self, backup_code: str, stored_hash: str) -> bool:
        """
        Проверка backup кода с сохраненным хешем
        
        Args:
            backup_code: Код для проверки
            stored_hash: Сохраненный хеш
            
        Returns:
            True если код корректен
        """
        try:
            # Хеширование предоставленного кода
            provided_hash = self.hash_backup_code(backup_code)
            
            # Сравнение хешей
            is_valid = provided_hash == stored_hash
            
            logger.debug("Backup code verification", valid=is_valid, code_prefix=backup_code[:4])
            return is_valid
            
        except Exception as e:
            logger.error("Error verifying backup code", error=str(e))
            return False
    
    def encrypt_sensitive_data(self, data: dict) -> str:
        """
        Шифрование чувствительных данных
        
        Args:
            data: Словарь с данными для шифрования
            
        Returns:
            Зашифрованная строка в формате base64
        """
        try:
            import json
            
            if not isinstance(data, dict):
                raise ValueError("Данные должны быть словарем")
            
            # Преобразование в JSON строку
            json_string = json.dumps(data, ensure_ascii=False, separators=(',', ':'))
            
            # Шифрование
            return self.encrypt_secret(json_string)
            
        except Exception as e:
            logger.error("Error encrypting sensitive data", error=str(e))
            raise EncryptionError(f"Ошибка шифрования данных: {str(e)}")
    
    def decrypt_sensitive_data(self, encrypted_data: str) -> dict:
        """
        Дешифрование чувствительных данных
        
        Args:
            encrypted_data: Зашифрованные данные
            
        Returns:
            Расшифрованный словарь
        """
        try:
            import json
            
            # Дешифрование
            json_string = self.decrypt_secret(encrypted_data)
            
            # Преобразование в словарь
            data = json.loads(json_string)
            
            if not isinstance(data, dict):
                raise ValueError("Расшифрованные данные не являются словарем")
            
            return data
            
        except Exception as e:
            logger.error("Error decrypting sensitive data", error=str(e))
            raise EncryptionError(f"Ошибка дешифрования данных: {str(e)}")


class EncryptionError(Exception):
    """Исключение для ошибок шифрования"""
    pass


class DecryptionError(Exception):
    """Исключение для ошибок дешифрования"""
    pass
