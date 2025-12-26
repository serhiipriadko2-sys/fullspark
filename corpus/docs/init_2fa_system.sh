#!/bin/bash
# Скрипт инициализации 2FA системы

set -euo pipefail

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Логирование
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Проверка переменных окружения
check_environment() {
    log_info "Проверка переменных окружения..."
    
    if [[ -z "${2FA_ENCRYPTION_KEY:-}" ]]; then
        log_error "Переменная 2FA_ENCRYPTION_KEY не установлена"
        exit 1
    fi
    
    if [[ -z "${2FA_JWT_SECRET:-}" ]]; then
        log_error "Переменная 2FA_JWT_SECRET не установлена"
        exit 1
    fi
    
    if [[ -z "${2FA_DATABASE_URL:-}" ]]; then
        log_error "Переменная 2FA_DATABASE_URL не установлена"
        exit 1
    fi
    
    log_success "Переменные окружения проверены"
}

# Ожидание готовности базы данных
wait_for_database() {
    log_info "Ожидание готовности базы данных..."
    
    local max_attempts=30
    local attempt=1
    
    while [[ $attempt -le $max_attempts ]]; do
        if python -c "
import os
from sqlalchemy import create_engine, text
try:
    engine = create_engine(os.environ['2FA_DATABASE_URL'])
    with engine.connect() as conn:
        conn.execute(text('SELECT 1'))
    print('Database is ready')
    exit(0)
except Exception as e:
    print(f'Database not ready: {e}')
    exit(1)
"; then
            log_success "База данных готова"
            return 0
        fi
        
        log_info "Попытка подключения к БД $attempt/$max_attempts..."
        sleep 2
        ((attempt++))
    done
    
    log_error "Не удалось подключиться к базе данных после $max_attempts попыток"
    exit 1
}

# Инициализация базы данных
init_database() {
    log_info "Инициализация базы данных..."
    
    python -c "
import os
import sys
sys.path.append('/app')

from iskra_2fa.models import Base, engine
from iskra_2fa.database import create_tables

try:
    # Создание всех таблиц
    Base.metadata.create_all(bind=engine)
    
    # Создание настроек по умолчанию
    from iskra_2fa.models import TwoFASettings
    from sqlalchemy.orm import sessionmaker
    
    Session = sessionmaker(bind=engine)
    session = Session()
    
    # Проверка наличия настроек
    settings = session.query(TwoFASettings).first()
    if not settings:
        settings = TwoFASettings()
        session.add(settings)
        session.commit()
        print('Default 2FA settings created')
    else:
        print('2FA settings already exist')
    
    print('Database initialized successfully')
    
except Exception as e:
    print(f'Database initialization failed: {e}')
    sys.exit(1)
"
    
    if [[ $? -eq 0 ]]; then
        log_success "База данных инициализирована"
    else
        log_error "Ошибка инициализации базы данных"
        exit 1
    fi
}

# Создание SSL сертификатов (если не существуют)
create_ssl_certificates() {
    if [[ ! -f "/app/ssl/2fa.crt" ]] || [[ ! -f "/app/ssl/2fa.key" ]]; then
        log_info "Создание самоподписанных SSL сертификатов..."
        
        openssl req -x509 -newkey rsa:4096 -keyout /app/ssl/2fa.key -out /app/ssl/2fa.crt -days 365 -nodes \
            -subj "/C=RU/ST=Moscow/L=Moscow/O=Искра Экосистема/OU=Безопасность/CN=2FA"
        
        log_success "SSL сертификаты созданы"
    else
        log_info "SSL сертификаты уже существуют"
    fi
}

# Настройка логирования
setup_logging() {
    log_info "Настройка логирования..."
    
    # Создание директории для логов
    mkdir -p /app/logs/2fa
    mkdir -p /app/logs/nginx
    
    # Настройка прав доступа
    chown -R iskra2fa:iskra2fa /app/logs
    
    log_success "Логирование настроено"
}

# Проверка конфигурации
validate_config() {
    log_info "Проверка конфигурации..."
    
    if [[ ! -f "/app/config/2fa_config.yaml" ]]; then
        log_error "Конфигурационный файл /app/config/2fa_config.yaml не найден"
        exit 1
    fi
    
    # Проверка синтаксиса YAML
    if ! python -c "import yaml; yaml.safe_load(open('/app/config/2fa_config.yaml'))"; then
        log_error "Ошибка синтаксиса в конфигурационном файле"
        exit 1
    fi
    
    log_success "Конфигурация проверена"
}

# Создание администратора по умолчанию (если нужно)
create_default_admin() {
    log_info "Проверка администратора по умолчанию..."
    
    # Здесь можно добавить логику создания администратора
    # Пока пропускаем, так как это может быть сделано через API
    
    log_info "Администратор будет создан через API"
}

# Основная функция
main() {
    log_info "Начало инициализации 2FA системы экосистемы Искра"
    
    # Проверка и настройка окружения
    check_environment
    validate_config
    
    # Создание необходимых директорий
    mkdir -p /app/logs
    mkdir -p /app/data
    mkdir -p /app/ssl
    
    # Создание SSL сертификатов
    create_ssl_certificates
    
    # Настройка логирования
    setup_logging
    
    # Ожидание и инициализация базы данных
    wait_for_database
    init_database
    
    # Создание администратора (через API)
    create_default_admin
    
    log_success "Инициализация 2FA системы завершена успешно"
    log_info "Система готова к запуску"
    
    # Запуск основного приложения
    if [[ "${1:-}" == "server" ]]; then
        log_info "Запуск сервера..."
        exec uvicorn iskra_2fa.main:app --host 0.0.0.0 --port 8000 --reload
    else
        log_info "Ожидание команд..."
        exec "$@"
    fi
}

# Обработка сигналов
trap 'log_error "Получен сигнал завершения, останавливаемся..."; exit 130' INT TERM

# Запуск основной функции
main "$@"
