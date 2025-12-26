-- Инициализация базы данных 2FA системы экосистемы Искра
-- Дата создания: 2025-11-06

-- Создание расширений PostgreSQL
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Создание схемы для 2FA (опционально)
-- CREATE SCHEMA IF NOT EXISTS iskra_2fa;
-- SET search_path TO iskra_2fa, public;

-- Создание последовательности для первичных ключей
CREATE SEQUENCE IF NOT EXISTS seq_2fa_user_2fa_id START 1;
CREATE SEQUENCE IF NOT EXISTS seq_2fa_backup_codes_id START 1;
CREATE SEQUENCE IF NOT EXISTS seq_2fa_recovery_tokens_id START 1;
CREATE SEQUENCE IF NOT EXISTS seq_2fa_security_logs_id START 1;
CREATE SEQUENCE IF NOT EXISTS seq_2fa_settings_id START 1;

-- Таблица настроек 2FA системы
CREATE TABLE IF NOT EXISTS "2fa_settings" (
    id INTEGER DEFAULT nextval('seq_2fa_settings_id') PRIMARY KEY,
    
    -- TOTP настройки
    totp_window INTEGER NOT NULL DEFAULT 30,
    totp_digits INTEGER NOT NULL DEFAULT 6,
    totp_algorithm VARCHAR(20) NOT NULL DEFAULT 'SHA1',
    
    -- Backup коды
    backup_codes_count INTEGER NOT NULL DEFAULT 10,
    backup_codes_length INTEGER NOT NULL DEFAULT 8,
    
    -- Блокировки
    max_failed_attempts INTEGER NOT NULL DEFAULT 5,
    lockout_duration INTEGER NOT NULL DEFAULT 300,
    progressive_delay BOOLEAN NOT NULL DEFAULT true,
    
    -- Recovery настройки
    recovery_methods TEXT,
    recovery_email_timeout INTEGER NOT NULL DEFAULT 3600,
    admin_approval_required BOOLEAN NOT NULL DEFAULT false,
    
    -- Временные метки
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    -- Ограничения
    CONSTRAINT chk_totp_window CHECK (totp_window > 0 AND totp_window <= 300),
    CONSTRAINT chk_totp_digits CHECK (totp_digits >= 6 AND totp_digits <= 8),
    CONSTRAINT chk_backup_codes_count CHECK (backup_codes_count >= 1 AND backup_codes_count <= 20),
    CONSTRAINT chk_backup_codes_length CHECK (backup_codes_length >= 6 AND backup_codes_length <= 16),
    CONSTRAINT chk_max_attempts CHECK (max_failed_attempts >= 1 AND max_failed_attempts <= 20),
    CONSTRAINT chk_lockout_duration CHECK (lockout_duration >= 60 AND lockout_duration <= 86400),
    CONSTRAINT chk_recovery_timeout CHECK (recovery_email_timeout >= 300 AND recovery_email_timeout <= 86400)
);

-- Таблица пользователей 2FA
CREATE TABLE IF NOT EXISTS user_2fa (
    id INTEGER DEFAULT nextval('seq_2fa_user_2fa_id') PRIMARY KEY,
    user_id VARCHAR(100) NOT NULL UNIQUE,
    
    -- TOTP настройки
    totp_secret_encrypted TEXT,
    is_totp_enabled BOOLEAN NOT NULL DEFAULT false,
    totp_setup_date TIMESTAMPTZ,
    
    -- Метаданные
    issuer_name VARCHAR(100) NOT NULL DEFAULT 'Искра Экосистема',
    account_name VARCHAR(255),
    
    -- Статистика
    failed_attempts INTEGER NOT NULL DEFAULT 0,
    last_used TIMESTAMPTZ,
    locked_until TIMESTAMPTZ,
    
    -- Временные метки
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    -- Ограничения
    CONSTRAINT chk_user_id_not_empty CHECK (length(trim(user_id)) > 0),
    CONSTRAINT chk_account_name_length CHECK (account_name IS NULL OR length(account_name) <= 255),
    CONSTRAINT chk_failed_attempts CHECK (failed_attempts >= 0),
    
    -- Уникальные ограничения
    CONSTRAINT uk_user_2fa_user_id UNIQUE (user_id)
);

-- Таблица backup кодов
CREATE TABLE IF NOT EXISTS backup_codes (
    id INTEGER DEFAULT nextval('seq_2fa_backup_codes_id') PRIMARY KEY,
    user_2fa_id INTEGER NOT NULL,
    
    -- Хешированный код
    code_hash VARCHAR(64) NOT NULL,
    
    -- Статус использования
    is_used BOOLEAN NOT NULL DEFAULT false,
    used_at TIMESTAMPTZ,
    used_from_ip VARCHAR(45),
    
    -- Временные метки
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    -- Внешний ключ
    CONSTRAINT fk_backup_codes_user_2fa 
        FOREIGN KEY (user_2fa_id) 
        REFERENCES user_2fa(id) 
        ON DELETE CASCADE,
    
    -- Ограничения
    CONSTRAINT chk_code_hash_not_empty CHECK (length(code_hash) = 64),
    CONSTRAINT chk_used_ip_length CHECK (used_from_ip IS NULL OR length(used_from_ip) <= 45),
    
    -- Уникальные ограничения
    CONSTRAINT uk_backup_codes_hash UNIQUE (code_hash)
);

-- Таблица токенов восстановления
CREATE TABLE IF NOT EXISTS recovery_tokens (
    id INTEGER DEFAULT nextval('seq_2fa_recovery_tokens_id') PRIMARY KEY,
    user_2fa_id INTEGER NOT NULL,
    
    -- Тип восстановления
    recovery_method VARCHAR(20) NOT NULL,
    
    -- Токен и его хеш
    token_hash VARCHAR(64) NOT NULL,
    token_salt VARCHAR(32) NOT NULL,
    
    -- Ограничения
    max_attempts INTEGER NOT NULL DEFAULT 3,
    current_attempts INTEGER NOT NULL DEFAULT 0,
    
    -- Временные рамки
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    used_at TIMESTAMPTZ,
    
    -- Дополнительная информация
    ip_address VARCHAR(45),
    user_agent TEXT,
    metadata TEXT,
    
    -- Внешний ключ
    CONSTRAINT fk_recovery_tokens_user_2fa 
        FOREIGN KEY (user_2fa_id) 
        REFERENCES user_2fa(id) 
        ON DELETE CASCADE,
    
    -- Ограничения
    CONSTRAINT chk_recovery_method CHECK (recovery_method IN ('email', 'sms', 'admin', 'trusted_device')),
    CONSTRAINT chk_token_hash_length CHECK (length(token_hash) = 64),
    CONSTRAINT chk_token_salt_length CHECK (length(token_salt) = 32),
    CONSTRAINT chk_max_attempts_recovery CHECK (max_attempts >= 1 AND max_attempts <= 10),
    CONSTRAINT chk_current_attempts CHECK (current_attempts >= 0 AND current_attempts <= max_attempts),
    CONSTRAINT chk_ip_address_length CHECK (ip_address IS NULL OR length(ip_address) <= 45),
    CONSTRAINT chk_expires_after_created CHECK (expires_at > created_at),
    
    -- Уникальные ограничения
    CONSTRAINT uk_recovery_tokens_hash UNIQUE (token_hash)
);

-- Таблица логов безопасности
CREATE TABLE IF NOT EXISTS security_logs (
    id INTEGER DEFAULT nextval('seq_2fa_security_logs_id') PRIMARY KEY,
    user_id VARCHAR(100),
    
    -- Тип события
    event_type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL DEFAULT 'INFO',
    
    -- Детали события
    description TEXT NOT NULL,
    details TEXT,
    
    -- Контекст
    ip_address VARCHAR(45),
    user_agent TEXT,
    session_id VARCHAR(100),
    
    -- Результат
    success BOOLEAN NOT NULL,
    error_message TEXT,
    
    -- Временные метки
    timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    -- Ограничения
    CONSTRAINT chk_user_id_length CHECK (user_id IS NULL OR length(user_id) <= 100),
    CONSTRAINT chk_event_type_not_empty CHECK (length(trim(event_type)) > 0),
    CONSTRAINT chk_severity CHECK (severity IN ('INFO', 'WARNING', 'ERROR', 'CRITICAL')),
    CONSTRAINT chk_description_not_empty CHECK (length(trim(description)) > 0),
    CONSTRAINT chk_ip_address_security_length CHECK (ip_address IS NULL OR length(ip_address) <= 45),
    CONSTRAINT chk_session_id_length CHECK (session_id IS NULL OR length(session_id) <= 100),
    CONSTRAINT chk_error_message_length CHECK (error_message IS NULL OR length(error_message) <= 1000)
);

-- Создание индексов для оптимизации производительности

-- Индексы для user_2fa
CREATE INDEX IF NOT EXISTS idx_user_2fa_user_id ON user_2fa(user_id);
CREATE INDEX IF NOT EXISTS idx_user_2fa_enabled ON user_2fa(is_totp_enabled);
CREATE INDEX IF NOT EXISTS idx_user_2fa_locked ON user_2fa(locked_until) WHERE locked_until IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_2fa_setup_date ON user_2fa(totp_setup_date);

-- Индексы для backup_codes
CREATE INDEX IF NOT EXISTS idx_backup_code_user ON backup_codes(user_2fa_id);
CREATE INDEX IF NOT EXISTS idx_backup_code_hash ON backup_codes(code_hash);
CREATE INDEX IF NOT EXISTS idx_backup_code_used ON backup_codes(is_used, used_at);

-- Индексы для recovery_tokens
CREATE INDEX IF NOT EXISTS idx_recovery_token_user ON recovery_tokens(user_2fa_id);
CREATE INDEX IF NOT EXISTS idx_recovery_token_hash ON recovery_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_recovery_token_expires ON recovery_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_recovery_token_method ON recovery_tokens(recovery_method);
CREATE INDEX IF NOT EXISTS idx_recovery_token_active ON recovery_tokens(used_at, expires_at) WHERE used_at IS NULL;

-- Индексы для security_logs
CREATE INDEX IF NOT EXISTS idx_security_log_timestamp ON security_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_security_log_user_event ON security_logs(user_id, event_type);
CREATE INDEX IF NOT EXISTS idx_security_log_severity ON security_logs(severity, timestamp);
CREATE INDEX IF NOT EXISTS idx_security_log_type ON security_logs(event_type, timestamp);

-- Частичные индексы для улучшения производительности
CREATE INDEX IF NOT EXISTS idx_backup_codes_unused ON backup_codes(user_2fa_id, code_hash) WHERE is_used = false;
CREATE INDEX IF NOT EXISTS idx_recovery_tokens_active ON recovery_tokens(user_2fa_id, recovery_method) WHERE used_at IS NULL AND expires_at > CURRENT_TIMESTAMP;
CREATE INDEX IF NOT EXISTS idx_security_logs_failed ON security_logs(timestamp, event_type) WHERE success = false;

-- Функция для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Триггеры для автоматического обновления updated_at
CREATE TRIGGER update_user_2fa_updated_at 
    BEFORE UPDATE ON user_2fa 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_2fa_settings_updated_at 
    BEFORE UPDATE ON "2fa_settings" 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Функция для очистки истекших токенов восстановления
CREATE OR REPLACE FUNCTION cleanup_expired_recovery_tokens()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM recovery_tokens 
    WHERE expires_at < CURRENT_TIMESTAMP;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Функция для получения статистики 2FA
CREATE OR REPLACE FUNCTION get_2fa_stats()
RETURNS TABLE(
    total_users BIGINT,
    users_with_2fa BIGINT,
    success_rate DECIMAL,
    backup_codes_used BIGINT,
    recovery_attempts BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::BIGINT as total_users,
        COUNT(CASE WHEN is_totp_enabled THEN 1 END)::BIGINT as users_with_2fa,
        CASE 
            WHEN COUNT(*) > 0 
            THEN (COUNT(CASE WHEN is_totp_enabled THEN 1 END)::DECIMAL / COUNT(*)::DECIMAL * 100)
            ELSE 0 
        END as success_rate,
        (SELECT COUNT(*) FROM backup_codes WHERE is_used = true)::BIGINT as backup_codes_used,
        (SELECT COUNT(*) FROM recovery_tokens)::BIGINT as recovery_attempts
    FROM user_2fa;
END;
$$ LANGUAGE plpgsql;

-- Функция для логирования событий безопасности
CREATE OR REPLACE FUNCTION log_security_event(
    p_user_id VARCHAR(100),
    p_event_type VARCHAR(50),
    p_severity VARCHAR(20),
    p_description TEXT,
    p_success BOOLEAN DEFAULT true,
    p_details TEXT DEFAULT NULL,
    p_ip_address VARCHAR(45) DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_session_id VARCHAR(100) DEFAULT NULL,
    p_error_message TEXT DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
    log_id INTEGER;
BEGIN
    INSERT INTO security_logs (
        user_id, event_type, severity, description, 
        success, details, ip_address, user_agent, session_id, error_message
    ) VALUES (
        p_user_id, p_event_type, p_severity, p_description,
        p_success, p_details, p_ip_address, p_user_agent, p_session_id, p_error_message
    ) RETURNING id INTO log_id;
    
    RETURN log_id;
END;
$$ LANGUAGE plpgsql;

-- Создание представлений для удобства

-- Представление активных пользователей 2FA
CREATE OR REPLACE VIEW v_active_2fa_users AS
SELECT 
    u.user_id,
    u.is_totp_enabled,
    u.totp_setup_date,
    u.last_used,
    u.failed_attempts,
    u.locked_until,
    (SELECT COUNT(*) FROM backup_codes WHERE user_2fa_id = u.id AND is_used = false) as unused_backup_codes
FROM user_2fa u
WHERE u.is_totp_enabled = true;

-- Представление статистики безопасности
CREATE OR REPLACE VIEW v_security_stats AS
SELECT 
    DATE_TRUNC('hour', timestamp) as hour,
    event_type,
    severity,
    COUNT(*) as event_count,
    SUM(CASE WHEN success THEN 1 ELSE 0 END) as success_count,
    SUM(CASE WHEN NOT success THEN 1 ELSE 0 END) as failure_count
FROM security_logs
WHERE timestamp >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE_TRUNC('hour', timestamp), event_type, severity
ORDER BY hour DESC, event_type, severity;

-- Представление восстановлений доступа
CREATE OR REPLACE VIEW v_recovery_activities AS
SELECT 
    rt.id,
    rt.recovery_method,
    rt.created_at,
    rt.expires_at,
    rt.used_at,
    rt.current_attempts,
    rt.max_attempts,
    u.user_id,
    CASE 
        WHEN rt.used_at IS NOT NULL THEN 'SUCCESS'
        WHEN rt.expires_at < CURRENT_TIMESTAMP THEN 'EXPIRED'
        ELSE 'PENDING'
    END as status
FROM recovery_tokens rt
JOIN user_2fa u ON rt.user_2fa_id = u.id
ORDER BY rt.created_at DESC;

-- Вставка настроек по умолчанию
INSERT INTO "2fa_settings" (
    totp_window, totp_digits, totp_algorithm,
    backup_codes_count, backup_codes_length,
    max_failed_attempts, lockout_duration, progressive_delay,
    recovery_methods, recovery_email_timeout, admin_approval_required
) VALUES (
    30, 6, 'SHA1',
    10, 8,
    5, 300, true,
    '["email", "sms", "admin"]', 3600, false
) ON CONFLICT DO NOTHING;

-- Комментарии к таблицам
COMMENT ON TABLE "2fa_settings" IS 'Глобальные настройки 2FA системы';
COMMENT ON TABLE user_2fa IS 'Пользователи и их 2FA настройки';
COMMENT ON TABLE backup_codes IS 'Backup коды для восстановления доступа';
COMMENT ON TABLE recovery_tokens IS 'Токены восстановления доступа';
COMMENT ON TABLE security_logs IS 'Логи всех событий безопасности';

-- Комментарии к столбцам
COMMENT ON COLUMN "2fa_settings".totp_window IS 'Временное окно в секундах для проверки TOTP';
COMMENT ON COLUMN user_2fa.totp_secret_encrypted IS 'Зашифрованный TOTP секрет пользователя';
COMMENT ON COLUMN backup_codes.code_hash IS 'SHA256 хеш backup кода';
COMMENT ON COLUMN recovery_tokens.token_hash IS 'SHA256 хеш токена восстановления';
COMMENT ON COLUMN security_logs.details IS 'Дополнительные данные события в формате JSON';

-- Вывод информации о созданных объектах
SELECT '2FA Database initialization completed successfully' as status;

-- Проверка созданных объектов
DO $$
DECLARE
    table_count INTEGER;
    index_count INTEGER;
    function_count INTEGER;
    view_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables
    WHERE table_schema = 'public' 
    AND table_name IN ('2fa_settings', 'user_2fa', 'backup_codes', 'recovery_tokens', 'security_logs');
    
    SELECT COUNT(*) INTO index_count
    FROM pg_indexes
    WHERE schemaname = 'public' 
    AND tablename IN ('2fa_settings', 'user_2fa', 'backup_codes', 'recovery_tokens', 'security_logs');
    
    SELECT COUNT(*) INTO function_count
    FROM information_schema.routines
    WHERE routine_schema = 'public' 
    AND routine_name IN ('update_updated_at_column', 'cleanup_expired_recovery_tokens', 'get_2fa_stats', 'log_security_event');
    
    SELECT COUNT(*) INTO view_count
    FROM information_schema.views
    WHERE table_schema = 'public'
    AND table_name IN ('v_active_2fa_users', 'v_security_stats', 'v_recovery_activities');
    
    RAISE NOTICE 'Created objects:';
    RAISE NOTICE '  Tables: %', table_count;
    RAISE NOTICE '  Indexes: %', index_count;
    RAISE NOTICE '  Functions: %', function_count;
    RAISE NOTICE '  Views: %', view_count;
    RAISE NOTICE '2FA database initialization completed successfully!';
END
$$;
