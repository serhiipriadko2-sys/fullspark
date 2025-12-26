-- =====================================================
-- ТЕСТ HOT/WARM/COLD STORAGE TIERS В TIMESCALEDB
-- =====================================================

-- 1. Создание таблицы с многоуровневым хранением
CREATE TABLE IF NOT EXISTS multi_tier_metrics (
    time TIMESTAMPTZ NOT NULL,
    metric_name VARCHAR(50) NOT NULL,
    metric_value DOUBLE PRECISION NOT NULL,
    tier VARCHAR(10) NOT NULL, -- HOT, WARM, COLD
    data_importance INTEGER,   -- 1-10 (важность данных)
    retention_category VARCHAR(20) -- short, medium, long
);

SELECT create_hypertable('multi_tier_metrics', 'time', chunk_time_interval => INTERVAL '1 hour');

-- 2. Создание отдельных политик хранения по уровням
-- HOT Tier (последние 24 часа) - активные данные
SELECT add_compression_policy('multi_tier_metrics', INTERVAL '7 days', if_not_exists => true);

-- WARM Tier (1-7 дней) - сжатые данные
SELECT add_retention_policy('multi_tier_metrics', INTERVAL '30 days', if_not_exists => true);

-- 3. Настройка автоматической категоризации данных
CREATE OR REPLACE FUNCTION assign_storage_tier()
RETURNS TRIGGER AS $$
BEGIN
    -- Автоматическое определение tier на основе времени и важности
    IF NEW.time >= NOW() - INTERVAL '24 hours' THEN
        NEW.tier := 'HOT';
        NEW.retention_category := 'short';
    ELSIF NEW.time >= NOW() - INTERVAL '7 days' THEN
        NEW.tier := 'WARM';
        NEW.retention_category := 'medium';
    ELSE
        NEW.tier := 'COLD';
        NEW.retention_category := 'long';
    END IF;
    
    -- Настройка важности данных
    IF NEW.metric_name IN ('trust', 'pain') THEN
        NEW.data_importance := 10; -- Критически важные метрики
    ELSIF NEW.metric_name IN ('clarity') THEN
        NEW.data_importance := 8;  -- Важные метрики
    ELSE
        NEW.data_importance := 5;  -- Обычные метрики
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_assign_storage_tier
    BEFORE INSERT ON multi_tier_metrics
    FOR EACH ROW
    EXECUTE FUNCTION assign_storage_tier();

-- 4. Заполнение тестовыми данными разных уровней
INSERT INTO multi_tier_metrics (time, metric_name, metric_value) VALUES
-- HOT данные (последние 24 часа)
('2025-11-06 15:00:00+00', 'clarity', 0.78),
('2025-11-06 14:30:00+00', 'chaos', 0.45),
('2025-11-06 14:00:00+00', 'trust', 0.85),
('2025-11-06 13:30:00+00', 'pain', 0.32),
('2025-11-06 13:00:00+00', 'clarity', 0.82),
('2025-11-06 12:30:00+00', 'chaos', 0.38),

-- WARM данные (1-7 дней назад)
('2025-11-05 15:00:00+00', 'clarity', 0.75),
('2025-11-04 15:00:00+00', 'chaos', 0.52),
('2025-11-03 15:00:00+00', 'trust', 0.88),
('2025-11-02 15:00:00+00', 'pain', 0.28),
('2025-11-01 15:00:00+00', 'clarity', 0.79),

-- COLD данные (старше 7 дней)
('2025-10-30 15:00:00+00', 'clarity', 0.73),
('2025-10-28 15:00:00+00', 'chaos', 0.41),
('2025-10-25 15:00:00+00', 'trust', 0.82),
('2025-10-20 15:00:00+00', 'pain', 0.35),
('2025-10-15 15:00:00+00', 'clarity', 0.76);

-- 5. Создание представлений для анализа по уровням
CREATE OR REPLACE VIEW hot_tier_view AS
SELECT 
    metric_name,
    AVG(metric_value) AS avg_value,
    MIN(metric_value) AS min_value,
    MAX(metric_value) AS max_value,
    COUNT(*) AS sample_count,
    AVG(data_importance) AS avg_importance
FROM multi_tier_metrics
WHERE tier = 'HOT'
    AND time >= NOW() - INTERVAL '24 hours'
GROUP BY metric_name;

CREATE OR REPLACE VIEW warm_tier_view AS
SELECT 
    metric_name,
    AVG(metric_value) AS avg_value,
    stddev(metric_value) AS volatility,
    COUNT(*) AS sample_count,
    AVG(data_importance) AS avg_importance,
    MIN(time) AS earliest_date,
    MAX(time) AS latest_date
FROM multi_tier_metrics
WHERE tier = 'WARM'
    AND time >= NOW() - INTERVAL '7 days'
    AND time < NOW() - INTERVAL '24 hours'
GROUP BY metric_name;

CREATE OR REPLACE VIEW cold_tier_view AS
SELECT 
    metric_name,
    AVG(metric_value) AS historical_avg,
    COUNT(*) AS total_samples,
    MIN(time) AS data_start,
    MAX(time) AS data_end,
    AVG(data_importance) AS historical_importance
FROM multi_tier_metrics
WHERE tier = 'COLD'
    AND time < NOW() - INTERVAL '7 days'
GROUP BY metric_name;

-- 6. Анализ производительности по уровням
\timing on
-- Быстрые запросы к HOT tier
SELECT * FROM hot_tier_view ORDER BY avg_value DESC LIMIT 5;
\timing off

\timing on
-- Запросы к WARM tier (сжатые данные)
SELECT * FROM warm_tier_view ORDER BY volatility DESC LIMIT 5;
\timing off

\timing on
-- Исторические запросы к COLD tier
SELECT * FROM cold_tier_view ORDER BY historical_avg DESC LIMIT 5;
\timing off

-- 7. Мониторинг размера данных по уровням
SELECT 
    tier,
    COUNT(*) AS total_records,
    pg_size_pretty(
        SUM(CASE 
            WHEN tier = 'HOT' THEN 1024 * 1024 * 2  -- ~2MB per 1000 records
            WHEN tier = 'WARM' THEN 1024 * 1024 * 0.5  -- ~0.5MB per 1000 records (compressed)
            ELSE 1024 * 1024 * 0.1  -- ~0.1MB per 1000 records (highly compressed)
        END)
    ) AS estimated_size,
    AVG(data_importance) AS avg_importance,
    MIN(time) AS tier_start,
    MAX(time) AS tier_end
FROM multi_tier_metrics
GROUP BY tier
ORDER BY tier;

-- 8. Тест миграции между уровнями
CREATE OR REPLACE FUNCTION check_and_migrate_data()
RETURNS INTEGER AS $$
DECLARE
    records_moved INTEGER;
BEGIN
    -- Автоматическое перемещение данных между уровнями
    UPDATE multi_tier_metrics 
    SET tier = 'COLD',
        retention_category = 'long'
    WHERE tier != 'COLD' 
        AND time < NOW() - INTERVAL '7 days';
    
    GET DIAGNOSTICS records_moved = ROW_COUNT;
    
    RETURN records_moved;
END;
$$ LANGUAGE plpgsql;

-- Выполнение миграции
SELECT check_and_migrate_data() AS migrated_records;

-- 9. Анализ compression ratio
SELECT 
    metric_name,
    tier,
    COUNT(*) AS record_count,
    CASE 
        WHEN tier = 'HOT' THEN 'Не сжато'
        WHEN tier = 'WARM' THEN 'Умеренно сжато'
        ELSE 'Сильно сжато'
    END AS compression_status,
    AVG(data_importance) AS avg_importance
FROM multi_tier_metrics
GROUP BY metric_name, tier
ORDER BY metric_name, tier;

-- 10. Проверка готовности к архивации
SELECT 
    metric_name,
    tier,
    MIN(time) AS oldest_data,
    MAX(time) AS newest_data,
    COUNT(*) AS record_count,
    CASE 
        WHEN tier = 'COLD' AND MIN(time) < NOW() - INTERVAL '365 days' THEN 'ГОТОВО К АРХИВАЦИИ'
        ELSE 'ХРАНИТСЯ'
    END AS archive_status
FROM multi_tier_metrics
GROUP BY metric_name, tier
ORDER BY metric_name, tier;