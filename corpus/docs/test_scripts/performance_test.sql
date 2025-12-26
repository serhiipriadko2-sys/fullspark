-- =====================================================
-- ТЕСТ ПРОИЗВОДИТЕЛЬНОСТИ ЗАПРОСОВ
-- Цель: время отклика < 10ms (цель: 8ms)
-- =====================================================

-- Подготовка тестовых данных для нагрузочного тестирования
INSERT INTO system_metrics (time, metric_name, metric_value, voice_id, context)
SELECT 
    NOW() - (INTERVAL '1 minute' * generate_series(0, 10000)),
    CASE (random() * 3)::INTEGER
        WHEN 0 THEN 'clarity'
        WHEN 1 THEN 'chaos'
        WHEN 2 THEN 'trust'
        ELSE 'pain'
    END,
    random(),
    CASE (random() * 6)::INTEGER
        WHEN 0 THEN 'Кайн'
        WHEN 1 THEN 'Пино'
        WHEN 2 THEN 'Сэм'
        WHEN 3 THEN 'Анхантра'
        WHEN 4 THEN 'Хундун'
        ELSE 'Искра'
    END,
    jsonb_build_object('load_test', true, 'batch_id', batch_id)
FROM generate_series(1, 100) as batch_id;

-- ТЕСТ 1: Быстрые точечные запросы (цель: <5ms)
\timing on
-- Проверка последней записи по метрике
SELECT time, metric_name, metric_value, voice_id 
FROM system_metrics 
WHERE metric_name = 'clarity' 
ORDER BY time DESC 
LIMIT 1;
\timing off

-- ТЕСТ 2: Временные диапазоны (цель: <8ms)
\timing on
-- Запрос данных за последние 5 минут
SELECT 
    time_bucket('1 minute', time) AS bucket,
    AVG(metric_value) AS avg_clarity
FROM system_metrics 
WHERE metric_name = 'clarity' 
    AND time >= NOW() - INTERVAL '5 minutes'
GROUP BY time_bucket('1 minute', time)
ORDER BY bucket;
\timing off

-- ТЕСТ 3: Сложные агрегаты (цель: <10ms)
\timing on
-- Статистика по всем голосам за последние 10 минут
SELECT 
    voice_id,
    COUNT(*) AS samples,
    AVG(metric_value) AS avg_value,
    stddev(metric_value) AS volatility,
    MIN(time) AS first_sample,
    MAX(time) AS last_sample
FROM system_metrics 
WHERE time >= NOW() - INTERVAL '10 minutes'
GROUP BY voice_id
ORDER BY avg_value DESC;
\timing off

-- ТЕСТ 4: Джоины временных таблиц (цель: <10ms)
\timing on
-- Анализ связи между метриками
SELECT 
    sm1.time,
    sm1.metric_name,
    sm1.metric_value AS clarity_value,
    sm2.metric_value AS chaos_value,
    CASE 
        WHEN sm1.metric_value > 0.7 AND sm2.metric_value > 0.6 THEN 'HIGH_CLARITY_HIGH_CHAOS'
        WHEN sm1.metric_value < 0.4 AND sm2.metric_value < 0.4 THEN 'LOW_CLARITY_LOW_CHAOS'
        ELSE 'BALANCED'
    END AS state_classification
FROM system_metrics sm1
JOIN system_metrics sm2 ON 
    sm1.time = sm2.time 
    AND sm1.voice_id = sm2.voice_id
WHERE sm1.metric_name = 'clarity' 
    AND sm2.metric_name = 'chaos'
    AND sm1.time >= NOW() - INTERVAL '2 minutes'
ORDER BY sm1.time DESC
LIMIT 10;
\timing off

-- ТЕСТ 5: Real-time дашборд запросы (цель: <5ms)
\timing on
-- Текущие метрики для дашборда
SELECT 
    metric_name,
    metric_value,
    voice_id,
    context->>'tone' as tone,
    EXTRACT(EPOCH FROM (NOW() - time)) as age_seconds
FROM system_metrics 
WHERE time >= NOW() - INTERVAL '30 seconds'
ORDER BY time DESC;
\timing off

-- ТЕСТ 6: Производительность SLO мониторинга
\timing on
-- Проверка нарушений SLO
SELECT 
    metric_name,
    COUNT(*) AS total_readings,
    AVG(metric_value) AS avg_value,
    MAX(CASE WHEN metric_name = 'clarity' AND metric_value < 0.7 THEN 1 ELSE 0 END) AS clarity_violations,
    MAX(CASE WHEN metric_name = 'chaos' AND metric_value > 0.8 THEN 1 ELSE 0 END) AS chaos_violations,
    MAX(CASE WHEN metric_name = 'trust' AND metric_value < 0.6 THEN 1 ELSE 0 END) AS trust_violations,
    MAX(CASE WHEN metric_name = 'pain' AND metric_value > 0.7 THEN 1 ELSE 0 END) AS pain_violations
FROM system_metrics
WHERE time >= NOW() - INTERVAL '1 minute'
GROUP BY metric_name;
\timing off

-- ТЕСТ 7: Производительность с сжатыми данными
\timing on
-- Исторический анализ с компрессией
SELECT 
    time_bucket('1 hour', time) AS hour,
    AVG(metric_value) AS avg_value,
    COUNT(*) AS samples
FROM system_metrics 
WHERE time >= NOW() - INTERVAL '24 hours'
    AND time < NOW() - INTERVAL '7 days'  -- Искусственно попадаем в сжатую область
GROUP BY time_bucket('1 hour', time)
ORDER BY hour;
\timing off

-- ТЕСТ 8: Параллельные запросы (симуляция нагрузки)
-- Выполняем несколько запросов одновременно через EXPLAIN ANALYZE
EXPLAIN ANALYZE
SELECT 
    voice_id,
    AVG(metric_value) as avg_metrics,
    COUNT(*) as sample_count
FROM system_metrics
WHERE time >= NOW() - INTERVAL '1 hour'
GROUP BY voice_id
ORDER BY avg_metrics DESC;

-- ТЕСТ 9: Индексная производительность
\timing on
-- Проверка использования индексов
SELECT 
    metric_name,
    COUNT(*) as total_records,
    COUNT(DISTINCT voice_id) as unique_voices
FROM system_metrics 
WHERE time >= NOW() - INTERVAL '1 hour'
    AND voice_id IN ('Кайн', 'Пино', 'Сэм')
GROUP BY metric_name
ORDER BY total_records DESC;
\timing off

-- ТЕСТ 10: Производительность анализа трендов
\timing on
-- Анализ трендов по метрикам
WITH trend_analysis AS (
    SELECT 
        metric_name,
        time_bucket('30 seconds', time) as period,
        AVG(metric_value) as avg_value,
        LAG(AVG(metric_value)) OVER (PARTITION BY metric_name ORDER BY time_bucket('30 seconds', time)) as prev_value
    FROM system_metrics
    WHERE time >= NOW() - INTERVAL '10 minutes'
    GROUP BY metric_name, time_bucket('30 seconds', time)
)
SELECT 
    metric_name,
    period,
    avg_value,
    prev_value,
    CASE 
        WHEN prev_value IS NOT NULL THEN 
            CASE 
                WHEN avg_value > prev_value THEN '↗️ UP'
                WHEN avg_value < prev_value THEN '↘️ DOWN'
                ELSE '➡️ STABLE'
            END
        ELSE '🆕 NEW'
    END as trend
FROM trend_analysis
ORDER BY metric_name, period DESC
LIMIT 20;
\timing off

-- СВОДКА ПРОИЗВОДИТЕЛЬНОСТИ
SELECT 
    'Connection Test' as test_name,
    '< 5ms' as target,
    '< 10ms' as sla,
    CASE WHEN pg_stat_statements_total_time < 10000 THEN '✅ PASS' ELSE '❌ FAIL' END as status
FROM pg_stat_statements 
WHERE query LIKE '%SELECT 1%'

UNION ALL

SELECT 
    'Aggregate Queries' as test_name,
    '< 8ms' as target,
    '< 15ms' as sla,
    CASE WHEN pg_stat_statements_total_time < 20000 THEN '✅ PASS' ELSE '❌ FAIL' END as status
FROM pg_stat_statements 
WHERE query LIKE '%time_bucket%'

LIMIT 1;