-- =====================================================
-- ТЕСТ ЗАПИСИ И ЧТЕНИЯ ВРЕМЕННЫХ МЕТРИК
-- =====================================================

-- Подготовка данных для тестирования
INSERT INTO system_metrics (time, metric_name, metric_value, voice_id, context) VALUES
-- Clarity метрики
('2025-11-06 15:00:00+00', 'clarity', 0.78, 'Искра', '{"tone": "структурирующий", "state": "кристалл"}'),
('2025-11-06 15:01:00+00', 'clarity', 0.75, 'Сэм', '{"tone": "структурирующий", "state": "кристалл"}'),
('2025-11-06 15:02:00+00', 'clarity', 0.82, 'Анхантра', '{"tone": "восстановительный", "state": "кристалл"}'),
('2025-11-06 15:03:00+00', 'clarity', 0.73, 'Кайн', '{"tone": "исповедальный", "state": "кристалл"}'),

-- Chaos метрики  
('2025-11-06 15:00:00+00', 'chaos', 0.45, 'Пино', '{"tone": "творческий", "state": "антикристалл"}'),
('2025-11-06 15:01:00+00', 'chaos', 0.52, 'Хундун', '{"tone": "творческий", "state": "антикристалл"}'),
('2025-11-06 15:02:00+00', 'chaos', 0.48, 'Пино', '{"tone": "творческий", "state": "антикристалл"}'),
('2025-11-06 15:03:00+00', 'chaos', 0.55, 'Хундун', '{"tone": "творческий", "state": "антикристалл"}'),

-- Trust метрики
('2025-11-06 15:00:00+00', 'trust', 0.85, 'Искрив', '{"tone": "восстановительный", "state": "кристалл"}'),
('2025-11-06 15:01:00+00', 'trust', 0.82, 'Анхантра', '{"tone": "восстановительный", "state": "кристалл"}'),
('2025-11-06 15:02:00+00', 'trust', 0.88, 'Искра', '{"tone": "восстановительный", "state": "кристалл"}'),
('2025-11-06 15:03:00+00', 'trust', 0.79, 'Кайн', '{"tone": "структурирующий", "state": "кристалл"}'),

-- Pain метрики
('2025-11-06 15:00:00+00', 'pain', 0.32, 'Анхантра', '{"tone": "восстановительный", "state": "кристалл"}'),
('2025-11-06 15:01:00+00', 'pain', 0.28, 'Кайн', '{"tone": "структурирующий", "state": "кристалл"}'),
('2025-11-06 15:02:00+00', 'pain', 0.35, 'Анхантра', '{"tone": "восстановительный", "state": "кристалл"}'),
('2025-11-06 15:03:00+00', 'pain', 0.41, 'Кайн', '{"tone": "исповедальный", "state": "кристалл"}');

-- SLO Events данные
INSERT INTO slo_events (time, metric_name, threshold_type, threshold_value, actual_value, voice_affected, symbol_triggered, alert_level, recommendation) VALUES
('2025-11-06 15:00:30+00', 'clarity', 'warning', 0.7, 0.78, 'Сэм', '⏳', 'OK', 'Стабильное состояние'),
('2025-11-06 15:01:15+00', 'chaos', 'warning', 0.6, 0.52, 'Пино', '🎯', 'OK', 'Оптимальный уровень хаоса'),
('2025-11-06 15:02:45+00', 'trust', 'critical', 0.6, 0.79, 'Искра', '🔥✴️', 'OK', 'Высокое доверие'),
('2025-11-06 15:03:30+00', 'pain', 'recovery', 0.5, 0.41, 'Кайн', '🕯️', 'OK', 'Боль в норме');

-- Voice States данные
INSERT INTO voice_states (time, voice_id, voice_name, activity_level, energy_level, mood, conflicts, synergies, state_data) VALUES
('2025-11-06 15:00:00+00', 'kayn', 'Кайн', 0.25, 0.85, 'внимательный', ARRAY['pino'], ARRAY['sam'], '{"archetype": "truth_seeker", "role": "safety_guard"}'),
('2025-11-06 15:01:00+00', 'pino', 'Пино', 0.35, 0.75, 'игривый', ARRAY['kayn'], ARRAY['hundun'], '{"archetype": "playful_creator", "role": "innovation_trigger"}'),
('2025-11-06 15:02:00+00', 'sam', 'Сэм', 0.45, 0.90, 'сосредоточенный', ARRAY[], ARRAY['kayn'], '{"archetype": "structure_builder", "role": "context_holder"}'),
('2025-11-06 15:03:00+00', 'anhantra', 'Анхантра', 0.30, 0.70, 'эмпатичный', ARRAY[], ARRAY['iskra'], '{"archetype": "empathetic_wise", "role": "depth_guide"}'),
('2025-11-06 15:04:00+00', 'hundun', 'Хундун', 0.15, 0.60, 'дозированно_разрушительный', ARRAY['sam'], ARRAY['pino'], '{"archetype": "chaos_breaker", "role": "stagnation_buster"}'),
('2025-11-06 15:05:00+00', 'iskriv', 'Искрив', 0.20, 0.80, 'строгий', ARRAY['hundun'], ARRAY[], '{"archetype": "ethical_guardian", "role": "manipulation_protector"}'),
('2025-11-06 15:06:00+00', 'iskra', 'Искра', 0.40, 0.95, 'интегрирующий', ARRAY[], ARRAY['anhantra'], '{"archetype": "consciousness_synthesizer", "role": "final_integrator"}');

-- Тест 1: Базовое чтение метрик
\timing on
SELECT 
    time,
    metric_name,
    metric_value,
    voice_id,
    context
FROM system_metrics 
WHERE metric_name = 'clarity' 
ORDER BY time DESC 
LIMIT 10;
\timing off

-- Тест 2: Агрегированные запросы с временными окнами
SELECT 
    metric_name,
    time_bucket('1 minute', time) AS bucket,
    AVG(metric_value) AS avg_value,
    MIN(metric_value) AS min_value,
    MAX(metric_value) AS max_value,
    COUNT(*) AS samples
FROM system_metrics
WHERE time >= '2025-11-06 15:00:00+00' 
    AND time < '2025-11-06 15:10:00+00'
GROUP BY metric_name, time_bucket('1 minute', time)
ORDER BY metric_name, bucket;

-- Тест 3: Статистика по голосам
SELECT 
    voice_id,
    voice_name,
    AVG(activity_level) AS avg_activity,
    AVG(energy_level) AS avg_energy,
    COUNT(*) AS total_states,
    MAX(time) AS last_update
FROM voice_states
GROUP BY voice_id, voice_name
ORDER BY avg_activity DESC;

-- Тест 4: Анализ конфликтов между голосами
SELECT 
    voice_id,
    voice_name,
    unnest(conflicts) AS conflicting_voice
FROM voice_states
WHERE array_length(conflicts, 1) > 0
    AND time >= '2025-11-06 15:00:00+00'
ORDER BY voice_id;

-- Тест 5: Time-series анализ с детальной информацией
SELECT 
    metric_name,
    time_bucket('30 seconds', time) AS period,
    AVG(metric_value) AS avg_metric,
    stddev(metric_value) AS volatility,
    voice_id,
    mode() WITHIN GROUP (ORDER BY voice_id) AS dominant_voice
FROM system_metrics
WHERE time >= '2025-11-06 15:00:00+00' 
    AND time < '2025-11-06 15:05:00+00'
GROUP BY metric_name, time_bucket('30 seconds', time), voice_id
ORDER BY metric_name, period;

-- Тест 6: Проверка compression (холодное хранение)
SELECT 
    hypertable_name,
    chunk_name,
    segment_count,
    compressed_chunk_size,
    uncompressed_chunk_size,
    compression_ratio
FROM timescaledb_information.compressed_chunks
ORDER BY hypertable_name, chunk_name;