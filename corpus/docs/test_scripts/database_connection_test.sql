-- =====================================================
-- ТЕСТ ПОДКЛЮЧЕНИЯ К БАЗЕ ДАННЫХ POSTGRESQL + TIMESCALEDB
-- =====================================================

-- 1. Тест подключения и базовой информации
SELECT 
    version() as postgres_version,
    current_database() as current_database,
    current_user as current_user,
    inet_server_addr() as server_ip,
    inet_server_port() as server_port,
    current_timestamp as connection_time;

-- 2. Проверка TimescaleDB версии и возможностей
SELECT 
    extname as extension_name,
    extversion as extension_version,
    pg_catalog.pg_is_in_recovery() as is_replica
FROM pg_extension 
WHERE extname = 'timescaledb';

-- 3. Проверка настроек TimescaleDB
SHOW max_worker_processes;
SHOW timescaledb.max_background_workers;
SHOW timescaledb.bgw_policy;

-- 4. Проверка табличного пространства
SELECT 
    datname as database_name,
    pg_size_pretty(pg_database_size('iskra_ecosystem')) as database_size;

-- 5. Тест производительности подключения
\timing on
SELECT 1 as connection_test;
\timing off

-- Ожидаемый результат: время выполнения < 10ms (цель: 8ms)