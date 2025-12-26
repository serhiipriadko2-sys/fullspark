#!/bin/bash
# Скрипт генерации ключей шифрования для 2FA системы

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

# Проверка Python и необходимых библиотек
check_python() {
    if ! command -v python3 &> /dev/null; then
        log_error "Python 3 не найден"
        exit 1
    fi
    
    python3 -c "
import secrets
import base64
import os
print('Все необходимые модули Python доступны')
" || {
        log_error "Не удалось импортировать необходимые модули Python"
        exit 1
    }
}

# Генерация мастер-ключа шифрования
generate_encryption_key() {
    log_info "Генерация мастер-ключа шифрования..."
    
    local key=$(python3 -c "
import secrets
import base64
import os

# Генерация 32 байт (256 бит) случайных данных
key_bytes = secrets.token_bytes(32)

# Преобразование в hex строку для удобного хранения
key_hex = key_bytes.hex()

print(key_hex)
")
    
    echo "2FA_ENCRYPTION_KEY=$key"
}

# Генерация JWT секрета
generate_jwt_secret() {
    log_info "Генерация JWT секрета..."
    
    local secret=$(python3 -c "
import secrets
import base64

# Генерация 32 байт случайных данных
secret_bytes = secrets.token_bytes(32)

# Кодирование в base64 для JWT
secret_b64 = base64.urlsafe_b64encode(secret_bytes).decode('utf-8')

print(secret_b64)
")
    
    echo "2FA_JWT_SECRET=$secret"
}

# Генерация Redis пароля
generate_redis_password() {
    log_info "Генерация пароля Redis..."
    
    local password=$(python3 -c "
import secrets
import string

# Генерация пароля из букв и цифр
alphabet = string.ascii_letters + string.digits
password = ''.join(secrets.choice(alphabet) for _ in range(16))

print(password)
")
    
    echo "REDIS_PASSWORD=$password"
}

# Генерация пароля PostgreSQL
generate_postgres_password() {
    log_info "Генерация пароля PostgreSQL..."
    
    local password=$(python3 -c "
import secrets
import string

# Генерация безопасного пароля
alphabet = string.ascii_letters + string.digits + '!@#$%^&*'
password = ''.join(secrets.choice(alphabet) for _ in range(20))

print(password)
")
    
    echo "POSTGRES_PASSWORD=$password"
}

# Создание .env файла
create_env_file() {
    local output_file="${1:-.env}"
    
    log_info "Создание файла окружения: $output_file"
    
    {
        echo "# Конфигурация 2FA системы экосистемы Искра"
        echo "# Сгенерировано: $(date)"
        echo ""
        echo "# ВНИМАНИЕ: Сохраните эти ключи в безопасном месте!"
        echo "# НИКОГДА не коммитьте .env файл в репозиторий"
        echo ""
        
        generate_encryption_key
        generate_jwt_secret
        generate_redis_password
        generate_postgres_password
        
        echo ""
        echo "# Дополнительные настройки"
        echo "2FA_DATABASE_URL=postgresql://iskra2fa:POSTGRES_PASSWORD@localhost:5432/iskra_2fa"
        echo "REDIS_URL=redis://localhost:6379"
        echo "SMTP_SERVER=smtp.gmail.com"
        echo "SMTP_USERNAME=your_email@gmail.com"
        echo "SMTP_PASSWORD=your_app_password"
        echo "SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK"
        echo "ALERT_WEBHOOK_URL=https://alerts.yourcompany.com/webhook"
        echo "GRAFANA_PASSWORD=admin123"
        echo ""
        echo "# Настройки Искры"
        echo "CHAOS_MAKI_ENDPOINT=http://localhost:8080"
        echo "META_DELTA_OMEGA_ENDPOINT=http://localhost:8080"
        
    } > "$output_file"
    
    # Установка безопасных прав доступа
    chmod 600 "$output_file"
    
    log_success "Файл окружения создан: $output_file"
    log_warning "Установите переменные окружения из файла $output_file"
}

# Создание всех ключей
create_all_keys() {
    log_info "Создание всех ключей и настроек..."
    
    generate_encryption_key
    echo ""
    generate_jwt_secret
    echo ""
    generate_redis_password
    echo ""
    generate_postgres_password
    echo ""
    
    log_success "Все ключи созданы"
}

# Создание backup ключей
backup_keys() {
    local backup_dir="keys_backup_$(date +%Y%m%d_%H%M%S)"
    
    log_info "Создание backup ключей в директории: $backup_dir"
    
    mkdir -p "$backup_dir"
    
    # Генерация всех ключей в backup директорию
    {
        generate_encryption_key
        generate_jwt_secret
        generate_redis_password
        generate_postgres_password
    } > "$backup_dir/keys.txt"
    
    # Создание скрипта для загрузки ключей
    cat > "$backup_dir/load_keys.sh" << 'EOF'
#!/bin/bash
# Скрипт для загрузки ключей в переменные окружения

echo "Загружаем ключи из backup..."

# Импорт ключей
source keys.txt

# Экспорт для текущей сессии
export 2FA_ENCRYPTION_KEY
export 2FA_JWT_SECRET
export REDIS_PASSWORD
export POSTGRES_PASSWORD

echo "Ключи загружены в текущую сессию"
echo "Установите их в вашем окружении:"
cat keys.txt
EOF
    
    chmod +x "$backup_dir/load_keys.sh"
    
    log_success "Backup создан в директории: $backup_dir"
    log_warning "Сохраните эту директорию в безопасном месте!"
}

# Создание certificate
create_self_signed_cert() {
    local domain="${1:-2fa.local}"
    local cert_dir="${2:-./certs}"
    
    log_info "Создание самоподписанного сертификата для: $domain"
    
    mkdir -p "$cert_dir"
    
    # Создание приватного ключа
    openssl genrsa -out "$cert_dir/$domain.key" 2048 2>/dev/null
    
    # Создание CSR (Certificate Signing Request)
    openssl req -new -key "$cert_dir/$domain.key" -out "$cert_dir/$domain.csr" -subj "/C=RU/ST=Moscow/L=Moscow/O=Искра Экосистема/OU=Безопасность/CN=$domain" 2>/dev/null
    
    # Создание самоподписанного сертификата
    openssl x509 -req -days 365 -in "$cert_dir/$domain.csr" -signkey "$cert_dir/$domain.key" -out "$cert_dir/$domain.crt" 2>/dev/null
    
    # Удаление CSR
    rm "$cert_dir/$domain.csr"
    
    log_success "Сертификат создан в $cert_dir"
    log_info "Файлы: $cert_dir/$domain.crt и $cert_dir/$domain.key"
}

# Проверка безопасности сгенерированных ключей
security_check() {
    log_info "Проверка безопасности ключей..."
    
    # Проверка длины ключей
    local encryption_key="${2FA_ENCRYPTION_KEY:-}"
    local jwt_secret="${2FA_JWT_SECRET:-}"
    
    if [[ ${#encryption_key} -eq 64 ]]; then
        log_success "Ключ шифрования: корректная длина (64 символа)"
    else
        log_warning "Ключ шифрования: неверная длина (${#encryption_key} символов, ожидается 64)"
    fi
    
    if [[ ${#jwt_secret} -ge 32 ]]; then
        log_success "JWT секрет: корректная длина (${#jwt_secret} символов)"
    else
        log_warning "JWT секрет: короткий (${#jwt_secret} символов, рекомендуется минимум 32)"
    fi
    
    # Проверка энтропии (простая проверка)
    if [[ $encryption_key =~ ^[a-f0-9]{64}$ ]]; then
        log_success "Ключ шифрования: корректный hex формат"
    else
        log_warning "Ключ шифрования: неверный формат"
    fi
}

# Функция помощи
show_help() {
    echo "Скрипт генерации ключей для 2FA системы экосистемы Искра"
    echo ""
    echo "Использование: $0 [КОМАНДА] [ОПЦИИ]"
    echo ""
    echo "Команды:"
    echo "  all              Создать все ключи и вывести в консоль"
    echo "  env [файл]       Создать .env файл с настройками"
    echo "  backup           Создать backup всех ключей"
    echo "  cert [домен]     Создать самоподписанный SSL сертификат"
    echo "  check            Проверить безопасность ключей"
    echo "  help             Показать эту справку"
    echo ""
    echo "Примеры:"
    echo "  $0 all"
    echo "  $0 env .env.production"
    echo "  $0 backup"
    echo "  $0 cert 2fa.example.com"
}

# Основная функция
main() {
    local command="${1:-help}"
    
    case $command in
        "all")
            check_python
            create_all_keys
            ;;
        "env")
            check_python
            create_env_file "${2:-.env}"
            ;;
        "backup")
            check_python
            backup_keys
            ;;
        "cert")
            check_python
            create_self_signed_cert "${2:-2fa.local}" "${3:-./certs}"
            ;;
        "check")
            check_python
            security_check
            ;;
        "help"|"--help"|"-h")
            show_help
            ;;
        *)
            log_error "Неизвестная команда: $command"
            echo ""
            show_help
            exit 1
            ;;
    esac
}

# Запуск
main "$@"
