-- =====================================================
-- ТЕСТ СОЗДАНИЯ TIME-SERIES ТАБЛИЦ В TIMESCALEDB
-- =====================================================

-- 1. Создание гипертаблицы для метрик Clarity, Chaos, Trust, Pain
CREATE TABLE IF NOT EXISTS system_metrics (
    time TIMESTAMPTZ NOT NULL,
    metric_name VARCHAR(50) NOT NULL,
    metric_value DOUBLE PRECISION NOT NULL,
    voice_id VARCHAR(50),
    context JSONB,
    PRIMARY KEY (metric_name, time)
);

-- Преобразование в гипертаблицу
SELECT create_hypertable('system_metrics', 'time', chunk_time_interval => INTERVAL '1 hour');

-- 2. Создание таблицы для SLO событий
CREATE TABLE IF NOT EXISTS slo_events (
    time TIMESTAMPTZ NOT NULL,
    metric_name VARCHAR(50) NOT NULL,
    threshold_type VARCHAR(20) NOT NULL, -- 'warning', 'critical', 'recovery'
    threshold_value DOUBLE PRECISION NOT NULL,
    actual_value DOUBLE PRECISION NOT NULL,
    voice_affected VARCHAR(50),
    symbol_triggered VARCHAR(10),
    alert_level VARCHAR(10),
    recommendation TEXT,
    PRIMARY KEY (time, metric_name)
);

SELECT create_hypertable('slo_events', 'time', chunk_time_interval => INTERVAL '1 hour');

-- 3. Создание таблицы для голосов системы
CREATE TABLE IF NOT EXISTS voice_states (
    time TIMESTAMPTZ NOT NULL,
    voice_id VARCHAR(50) NOT NULL,
    voice_name VARCHAR(100) NOT NULL,
    activity_level DOUBLE PRECISION,
    energy_level DOUBLE PRECISION,
    mood VARCHAR(30),
    conflicts TEXT[],
    synergies TEXT[],
    state_data JSONB,
    PRIMARY KEY (voice_id, time)
);

SELECT create_hypertable('voice_states', 'time', chunk_time_interval => INTERVAL '1 hour');

-- 4. Создание таблицы для хранения ретроспективных данных
CREATE TABLE IF NOT EXISTS time_series_data (
    time TIMESTAMPTZ NOT NULL,
    series_name VARCHAR(100) NOT NULL,
    data_value DOUBLE PRECISION NOT NULL,
    tags JSONB, -- для фильтрации и группировки
    metadata JSONB
);

SELECT create_hypertable('time_series_data', 'time', chunk_time_interval => INTERVAL '1 day');

-- 5. Создание индексов для оптимизации запросов
CREATE INDEX IF NOT EXISTS idx_system_metrics_name_time ON system_metrics (metric_name, time DESC);
CREATE INDEX IF NOT EXISTS idx_system_metrics_voice ON system_metrics (voice_id, time DESC);
CREATE INDEX IF NOT EXISTS idx_slo_events_level_time ON slo_events (alert_level, time DESC);
CREATE INDEX IF NOT EXISTS idx_voice_states_voice_time ON voice_states (voice_id, time DESC);
CREATE INDEX IF NOT EXISTS idx_timeseries_series_time ON time_series_data (series_name, time DESC);

-- 6. Создание compression policy (холодное хранение)
SELECT add_compression_policy('system_metrics', INTERVAL '7 days');
SELECT add_compression_policy('slo_events', INTERVAL '7 days');
SELECT add_compression_policy('voice_states', INTERVAL '7 days');

-- 7. Создание retention policy (удаление старых данных)
SELECT add_retention_policy('system_metrics', INTERVAL '365 days');
SELECT add_retention_policy('slo_events', INTERVAL '90 days');
SELECT add_retention_policy('voice_states', INTERVAL '180 days');
SELECT add_retention_policy('time_series_data', INTERVAL '730 days');

-- 8. Проверка созданных таблиц и политик
SELECT 
    schemaname,
    tablename,
    tableowner,
    hasindexes,
    hasrules,
    hastriggers
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('system_metrics', 'slo_events', 'voice_states', 'time_series_data');

-- 9. Проверка TimescaleDB политик
SELECT 
    hypertable_name,
    compression_enabled,
    retention_enabled
FROM timescaledb_information.hypertables;