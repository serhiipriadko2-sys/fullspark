#!/bin/bash
# Скрипт диагностики SSL/TLS конфигурации Grafana
# Экосистема Искра

set -e

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Константы
GRAFANA_HOST="grafana.iskra.local"
GRAFANA_PORT="3000"
SSL_DIR="/etc/grafana/ssl"
CERT_FILE="$SSL_DIR/grafana.crt"
KEY_FILE="$SSL_DIR/grafana.key"
GRAFANA_CONFIG="/etc/grafana/grafana.ini"
LOG_FILE="/var/log/grafana/ssl_diagnosis.log"

# Функции логирования
log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] $1${NC}"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

error() {
    echo -e "${RED}[ОШИБКА] $1${NC}"
    echo "[ОШИБКА] $1" >> "$LOG_FILE"
}

warning() {
    echo -e "${YELLOW}[ПРЕДУПРЕЖДЕНИЕ] $1${NC}"
    echo "[ПРЕДУПРЕЖДЕНИЕ] $1" >> "$LOG_FILE"
}

info() {
    echo -e "${BLUE}[ИНФО] $1${NC}"
    echo "[ИНФО] $1" >> "$LOG_FILE"
}

# Заголовок диагностики
print_header() {
    echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║                  ДИАГНОСТИКА SSL/TLS GRAFANA                  ║${NC}"
    echo -e "${BLUE}║                   Экосистема Искра                            ║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
    echo
}

# Проверка системных требований
check_system_requirements() {
    log "=== ПРОВЕРКА СИСТЕМНЫХ ТРЕБОВАНИЙ ==="
    
    # Проверка OpenSSL
    if command -v openssl &> /dev/null; then
        local openssl_version=$(openssl version)
        log "✓ OpenSSL установлен: $openssl_version"
        
        # Проверка минимальной версии
        if openssl version | grep -E "(1\.1\.1|3\.)" &> /dev/null; then
            log "✓ Версия OpenSSL соответствует требованиям"
        else
            warning "Рекомендуется обновить OpenSSL до версии 1.1.1+"
        fi
    else
        error "OpenSSL не установлен!"
        return 1
    fi
    
    # Проверка системных лимитов
    local nofile_limit=$(ulimit -n)
    if [[ $nofile_limit -ge 10000 ]]; then
        log "✓ Лимит открытых файлов достаточный: $nofile_limit"
    else
        warning "Рекомендуется увеличить лимит открытых файлов (текущий: $nofile_limit)"
    fi
    
    # Проверка доступности порта
    if netstat -tlnp 2>/dev/null | grep ":$GRAFANA_PORT " &> /dev/null; then
        log "✓ Порт $GRAFANA_PORT используется"
    else
        warning "Порт $GRAFANA_PORT не используется"
    fi
}

# Проверка SSL сертификатов
check_ssl_certificates() {
    log "=== ПРОВЕРКА SSL СЕРТИФИКАТОВ ==="
    
    # Проверка существования файлов
    if [[ ! -f "$CERT_FILE" ]]; then
        error "Сертификат не найден: $CERT_FILE"
        return 1
    fi
    
    if [[ ! -f "$KEY_FILE" ]]; then
        error "Приватный ключ не найден: $KEY_FILE"
        return 1
    fi
    
    log "✓ SSL файлы найдены"
    
    # Проверка прав доступа
    local cert_perms=$(stat -c "%a" "$CERT_FILE")
    local key_perms=$(stat -c "%a" "$KEY_FILE")
    
    if [[ "$cert_perms" == "644" ]]; then
        log "✓ Права доступа к сертификату корректные: $cert_perms"
    else
        warning "Неоптимальные права доступа к сертификату: $cert_perms (рекомендуется: 644)"
    fi
    
    if [[ "$key_perms" == "600" ]]; then
        log "✓ Права доступа к приватному ключу корректные: $key_perms"
    else
        warning "Небезопасные права доступа к приватному ключу: $key_perms (рекомендуется: 600)"
    fi
    
    # Проверка целостности сертификата
    if openssl x509 -in "$CERT_FILE" -noout -text &> /dev/null; then
        log "✓ Сертификат корректный"
        
        # Проверка срока действия
        if openssl x509 -checkend 2592000 -noout -in "$CERT_FILE" &> /dev/null; then
            log "✓ Сертификат действителен более 30 дней"
        else
            warning "Сертификат истекает в течение 30 дней!"
            
            local expiry_date=$(openssl x509 -in "$CERT_FILE" -noout -enddate | cut -d= -f2)
            log "Дата истечения: $expiry_date"
        fi
        
        # Информация о сертификате
        local subject=$(openssl x509 -in "$CERT_FILE" -noout -subject | sed 's/subject=//')
        local issuer=$(openssl x509 -in "$CERT_FILE" -noout -issuer | sed 's/issuer=//')
        
        info "Субъект: $subject"
        info "Издатель: $issuer"
        
    else
        error "Сертификат поврежден или некорректен!"
        return 1
    fi
    
    # Проверка соответствия ключа сертификату
    if openssl x509 -noout -modulus -in "$CERT_FILE" 2>/dev/null | openssl md5 && \
       openssl rsa -noout -modulus -in "$KEY_FILE" 2>/dev/null | openssl md5 | \
       diff <(openssl x509 -noout -modulus -in "$CERT_FILE" | openssl md5) - &>/dev/null; then
        log "✓ Приватный ключ соответствует сертификату"
    else
        error "Приватный ключ не соответствует сертификату!"
        return 1
    fi
}

# Проверка конфигурации Grafana
check_grafana_config() {
    log "=== ПРОВЕРКА КОНФИГУРАЦИИ GRAFANA ==="
    
    if [[ ! -f "$GRAFANA_CONFIG" ]]; then
        error "Конфигурационный файл не найден: $GRAFANA_CONFIG"
        return 1
    fi
    
    log "✓ Конфигурационный файл найден"
    
    # Проверка SSL настроек в конфигурации
    local ssl_settings=(
        "protocol.*https"
        "cert_file.*$CERT_FILE"
        "cert_key.*$KEY_FILE"
        "ssl_min_version.*TLSv1\.2"
        "ssl_prefer_server_ciphers.*true"
        "force_ssl.*true"
        "cookie_secure.*true"
        "cookie_samesite.*strict"
    )
    
    for setting in "${ssl_settings[@]}"; do
        if grep -E "$setting" "$GRAFANA_CONFIG" &> /dev/null; then
            log "✓ Найдена настройка: $setting"
        else
            warning "Отсутствует настройка: $setting"
        fi
    done
}

# Проверка состояния службы Grafana
check_grafana_service() {
    log "=== ПРОВЕРКА СЛУЖБЫ GRAFANA ==="
    
    # Проверка статуса службы
    if systemctl is-active --quiet grafana-server; then
        log "✓ Служба Grafana запущена"
    else
        warning "Служба Grafana не запущена"
        
        if systemctl is-enabled --quiet grafana-server; then
            log "✓ Служба настроена на автозапуск"
        else
            warning "Служба не настроена на автозапуск"
        fi
        return 1
    fi
    
    # Проверка процессов
    if pgrep -f "grafana-server" &> /dev/null; then
        local grafana_pid=$(pgrep -f "grafana-server")
        log "✓ Процесс Grafana запущен (PID: $grafana_pid)"
        
        # Информация о процессе
        local proc_info=$(ps -p "$grafana_pid" -o pid,user,cpu,mem,etime,cmd)
        info "Информация о процессе:\n$proc_info"
    else
        error "Процесс Grafana не найден!"
        return 1
    fi
}

# Проверка сетевых подключений
check_network_connectivity() {
    log "=== ПРОВЕРКА СЕТЕВЫХ ПОДКЛЮЧЕНИЙ ==="
    
    # Проверка порта
    if netstat -tlnp 2>/dev/null | grep ":$GRAFANA_PORT " &> /dev/null; then
        local port_info=$(netstat -tlnp | grep ":$GRAFANA_PORT ")
        log "✓ Порт $GRAFANA_PORT открыт: $port_info"
    else
        error "Порт $GRAFANA_PORT не открыт!"
        return 1
    fi
    
    # Проверка firewall
    if command -v ufw &> /dev/null; then
        if ufw status | grep "3000" &> /dev/null; then
            log "✓ Firewall настроен для порта 3000 (UFW)"
        else
            warning "UFW firewall может блокировать порт 3000"
        fi
    fi
    
    if command -v firewall-cmd &> /dev/null; then
        if firewall-cmd --list-ports | grep "3000/tcp" &> /dev/null; then
            log "✓ Firewall настроен для порта 3000 (firewalld)"
        else
            warning "Firewalld может блокировать порт 3000"
        fi
    fi
}

# Тест SSL соединения
test_ssl_connection() {
    log "=== ТЕСТ SSL СОЕДИНЕНИЯ ==="
    
    # Локальный тест
    if command -v curl &> /dev/null; then
        if curl -k -s --max-time 10 "https://localhost:$GRAFANA_PORT" &> /dev/null; then
            log "✓ Локальное SSL соединение успешно"
        else
            error "Не удалось установить локальное SSL соединение"
        fi
        
        # Тест с указанием хоста
        if curl -k -s --max-time 10 --resolve "$GRAFANA_HOST:$GRAFANA_PORT:127.0.0.1" "https://$GRAFANA_HOST:$GRAFANA_PORT" &> /dev/null; then
            log "✓ SSL соединение с указанием хоста успешно"
        else
            warning "Проблемы с SSL соединением при указании хоста"
        fi
    fi
    
    # Тест с OpenSSL
    if command -v timeout &> /dev/null; then
        if timeout 10 openssl s_client -connect localhost:$GRAFANA_PORT -servername "$GRAFANA_HOST" </dev/null &> /tmp/openssl_test.log; then
            log "✓ OpenSSL клиент успешно подключился"
            
            # Анализ результатов
            local cipher=$(grep "Cipher is" /tmp/openssl_test.log | head -1)
            local protocol=$(grep "Protocol" /tmp/openssl_test.log | head -1)
            
            info "Протокол: $protocol"
            info "Шифр: $cipher"
        else
            error "OpenSSL клиент не смог подключиться"
        fi
    fi
}

# Проверка SSL метрик
check_ssl_metrics() {
    log "=== АНАЛИЗ SSL МЕТРИК ==="
    
    # Статистика соединений
    local ssl_connections=$(netstat -an 2>/dev/null | grep ":$GRAFANA_PORT.*ESTABLISHED" | wc -l)
    info "Активные SSL соединения: $ssl_connections"
    
    # Анализ SSL трафика (если tcpdump доступен)
    if command -v tcpdump &> /dev/null; then
        log "Анализ SSL трафика (5 секунд)..."
        if timeout 5 tcpdump -i any -n port $GRAFANA_PORT &> /tmp/tcpdump_ssl.log; then
            local packet_count=$(wc -l < /tmp/tcpdump_ssl.log)
            log "Перехвачено пакетов: $packet_count"
        else
            info "tcpdump недоступен или недостаточно прав"
        fi
    fi
    
    # Проверка производительности шифров
    log "Тестирование производительности шифров..."
    if command -v openssl &> /dev/null; then
        local cipher_speed=$(timeout 30 openssl speed aes-128-gcm 2>/dev/null | tail -1 | awk '{print $5}')
        if [[ -n "$cipher_speed" ]]; then
            info "Скорость AES-128-GCM: $cipher_speed"
        fi
    fi
}

# Проверка логов
check_logs() {
    log "=== АНАЛИЗ ЛОГОВ ==="
    
    # Проверка основного лога
    if [[ -f "/var/log/grafana/grafana.log" ]]; then
        local error_count=$(grep -i "error\|fail" /var/log/grafana/grafana.log 2>/dev/null | wc -l)
        local ssl_error_count=$(grep -i "ssl\|tls\|cert" /var/log/grafana/grafana.log 2>/dev/null | wc -l)
        
        info "Общее количество ошибок в логе: $error_count"
        info "SSL/TLS ошибки: $ssl_error_count"
        
        if [[ $ssl_error_count -gt 0 ]]; then
            warning "Обнаружены SSL/TLS ошибки в логах"
            grep -i "ssl\|tls\|cert" /var/log/grafana/grafana.log | tail -5
        fi
    else
        warning "Лог файл не найден: /var/log/grafana/grafana.log"
    fi
    
    # Проверка systemd журнала
    local recent_errors=$(journalctl -u grafana-server --since "1 hour ago" | grep -i "error\|fail" | wc -l)
    if [[ $recent_errors -gt 0 ]]; then
        warning "Обнаружены ошибки в systemd журнале за последний час: $recent_errors"
    else
        log "В systemd журнале нет недавних ошибок"
    fi
}

# Генерация отчета
generate_report() {
    log "=== ГЕНЕРАЦИЯ ОТЧЕТА ==="
    
    local report_file="/var/log/grafana/ssl_diagnosis_report_$(date +%Y%m%d_%H%M%S).txt"
    
    cat > "$report_file" << EOF
╔════════════════════════════════════════════════════════════════╗
║                  ОТЧЕТ ДИАГНОСТИКИ SSL/TLS                    ║
║                   Экосистема Искра                            ║
╚════════════════════════════════════════════════════════════════╝

Дата: $(date '+%Y-%m-%d %H:%M:%S')
Хост: $GRAFANA_HOST
Порт: $GRAFANA_PORT

СИСТЕМНАЯ ИНФОРМАЦИЯ
-------------------
ОС: $(uname -a)
OpenSSL: $(openssl version 2>/dev/null || echo "не установлен")
Grafana версия: $(grafana-server -v 2>/dev/null | head -1 || echo "не определена")

SSL СЕРТИФИКАТЫ
--------------
Файл сертификата: $CERT_FILE
Файл ключа: $KEY_FILE
Дата создания: $(openssl x509 -in "$CERT_FILE" -noout -startdate 2>/dev/null | cut -d= -f2)
Дата истечения: $(openssl x509 -in "$CERT_FILE" -noout -enddate 2>/dev/null | cut -d= -f2)
Субъект: $(openssl x509 -in "$CERT_FILE" -noout -subject 2>/dev/null | sed 's/subject=//')

СОСТОЯНИЕ СЛУЖБЫ
---------------
Статус: $(systemctl is-active grafana-server 2>/dev/null || echo "не определен")
Автозапуск: $(systemctl is-enabled grafana-server 2>/dev/null || echo "не определен")
PID: $(pgrep -f "grafana-server" 2>/dev/null || echo "не найден")

СЕТЕВЫЕ ПОДКЛЮЧЕНИЯ
------------------
Слушает порт: $(netstat -tlnp 2>/dev/null | grep ":$GRAFANA_PORT " || echo "не слушает")
Активные соединения: $(netstat -an 2>/dev/null | grep ":$GRAFANA_PORT.*ESTABLISHED" | wc -l)

РЕКОМЕНДАЦИИ
-----------
1. Регулярно обновляйте SSL сертификаты
2. Мониторьте логи на предмет SSL ошибок
3. Проверяйте срок действия сертификатов
4. Обновляйте OpenSSL до последней версии
5. Настройте автоматическое обновление сертификатов

Для получения подробной диагностики обратитесь к системному администратору.

Создано: $(date '+%Y-%m-%d %H:%M:%S')
EOF
    
    log "✓ Отчет сохранен: $report_file"
}

# Основная функция диагностики
main() {
    # Создание директории для логов
    mkdir -p "$(dirname "$LOG_FILE")"
    touch "$LOG_FILE"
    
    print_header
    
    # Последовательность проверок
    check_system_requirements
    echo
    check_ssl_certificates
    echo
    check_grafana_config
    echo
    check_grafana_service
    echo
    check_network_connectivity
    echo
    test_ssl_connection
    echo
    check_ssl_metrics
    echo
    check_logs
    echo
    
    # Генерация отчета
    generate_report
    
    echo
    log "=== ДИАГНОСТИКА ЗАВЕРШЕНА ==="
    log "Подробный отчет сохранен в: $LOG_FILE"
    log "Для получения помощи обратитесь к системному администратору"
}

# Обработка сигналов
trap 'echo -e "\n${RED}Диагностика прервана пользователем${NC}"; exit 130' INT TERM

# Проверка прав
if [[ $EUID -eq 0 ]]; then
    main "$@"
else
    echo -e "${YELLOW}Рекомендуется запускать скрипт от имени суперпользователя для полной диагностики${NC}"
    read -p "Продолжить? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        main "$@"
    else
        exit 0
    fi
fi