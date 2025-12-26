#!/bin/bash
# Скрипт мониторинга SSL/TLS производительности Grafana
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
LOG_DIR="/var/log/grafana"
PERF_LOG="$LOG_DIR/ssl_performance.log"
MONITOR_LOG="$LOG_DIR/ssl_monitor.log"
CERTS_DIR="/etc/grafana/ssl"

# Функции логирования
log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] $1${NC}"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$PERF_LOG"
}

error() {
    echo -e "${RED}[ОШИБКА] $1${NC}"
    echo "[ОШИБКА] $1" >> "$MONITOR_LOG"
}

warning() {
    echo -e "${YELLOW}[ПРЕДУПРЕЖДЕНИЕ] $1${NC}"
    echo "[ПРЕДУПРЕЖДЕНИЕ] $1" >> "$MONITOR_LOG"
}

info() {
    echo -e "${BLUE}[ИНФО] $1${NC}"
    echo "[ИНФО] $1" >> "$MONITOR_LOG"
}

# Заголовок мониторинга
print_header() {
    echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║            МОНИТОРИНГ SSL/TLS ПРОИЗВОДИТЕЛЬНОСТИ              ║${NC}"
    echo -e "${BLUE}║                   Экосистема Искра                            ║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
    echo
}

# Мониторинг SSL соединений
monitor_ssl_connections() {
    log "=== МОНИТОРИНГ SSL СОЕДИНЕНИЙ ==="
    
    # Количество активных соединений
    local active_connections=$(netstat -an 2>/dev/null | grep ":$GRAFANA_PORT.*ESTABLISHED" | wc -l)
    info "Активные SSL соединения: $active_connections"
    
    # Время ожидания соединений
    local listening_socket=$(netstat -tlnp 2>/dev/null | grep ":$GRAFANA_PORT " | head -1)
    if [[ -n "$listening_socket" ]]; then
        info "Слушающий сокет: $listening_socket"
    else
        warning "Не найден слушающий сокет на порту $GRAFANA_PORT"
    fi
    
    # Статистика соединений
    local connection_stats=$(ss -s 2>/dev/null | grep -A5 "TCP:" | head -6)
    info "Статистика соединений:\n$connection_stats"
}

# Тест времени отклика SSL
test_ssl_response_time() {
    log "=== ТЕСТ ВРЕМЕНИ ОТКЛИКА SSL ==="
    
    if command -v curl &> /dev/null; then
        local curl_format="./curl-format.txt"
        if [[ ! -f "$curl_format" ]]; then
            warning "Файл формата curl не найден, создаем базовый..."
            cat > "$curl_format" << 'EOF'
     time_total:  %{time_total}\n
          time_ssl:    %{time_appconnect}\n
            size_download:  %{size_download}\n
             speed_download:  %{speed_download}\n
                    http_code:  %{http_code}\n
              ssl_verify_result:  %{ssl_verify_result}\n
EOF
        fi
        
        # Несколько тестов
        for i in {1..3}; do
            log "Тест $i/3..."
            
            local response=$(curl -w "@$curl_format" -o /dev/null -s -k \
                --max-time 10 \
                --resolve "$GRAFANA_HOST:$GRAFANA_PORT:127.0.0.1" \
                "https://$GRAFANA_HOST:$GRAFANA_PORT" 2>/dev/null || echo "FAILED")
            
            if [[ "$response" != "FAILED" ]]; then
                echo "$response" | while IFS= read -r line; do
                    log "Результат $i: $line"
                done
            else
                warning "Тест $i не удался"
            fi
            
            sleep 2
        done
    else
        warning "curl не установлен, пропускаем тест времени отклика"
    fi
}

# Анализ SSL сертификатов
analyze_ssl_certificates() {
    log "=== АНАЛИЗ SSL СЕРТИФИКАТОВ ==="
    
    local cert_file="$CERTS_DIR/grafana.crt"
    
    if [[ ! -f "$cert_file" ]]; then
        error "Сертификат не найден: $cert_file"
        return 1
    fi
    
    # Получение информации о сертификате
    local subject=$(openssl x509 -in "$cert_file" -noout -subject 2>/dev/null | sed 's/subject=//')
    local issuer=$(openssl x509 -in "$cert_file" -noout -issuer 2>/dev/null | sed 's/issuer=//')
    local start_date=$(openssl x509 -in "$cert_file" -noout -startdate 2>/dev/null | cut -d= -f2)
    local end_date=$(openssl x509 -in "$cert_file" -noout -enddate 2>/dev/null | cut -d= -f2)
    local days_left=$(openssl x509 -checkend 0 -noout -in "$cert_file" 2>/dev/null && echo "0" || {
        local expiry_epoch=$(date -d "$end_date" +%s 2>/dev/null || echo "0")
        local now_epoch=$(date +%s)
        local diff=$((expiry_epoch - now_epoch))
        echo $((diff / 86400))
    })
    
    info "Субъект сертификата: $subject"
    info "Издатель: $issuer"
    info "Дата начала: $start_date"
    info "Дата окончания: $end_date"
    info "Осталось дней: $days_left"
    
    # Предупреждения о скором истечении
    if [[ $days_left -lt 30 ]]; then
        warning "Сертификат истекает менее чем через 30 дней!"
        
        if [[ $days_left -lt 7 ]]; then
            error "КРИТИЧНО: Сертификат истекает менее чем через 7 дней!"
        fi
    fi
    
    # Проверка алгоритма подписи
    local sig_algorithm=$(openssl x509 -in "$cert_file" -noout -text 2>/dev/null | grep "Signature Algorithm" | head -1 | awk '{print $3}')
    info "Алгоритм подписи: $sig_algorithm"
    
    # Проверка ключа
    local key_size=$(openssl rsa -in "$CERTS_DIR/grafana.key" -text -noout 2>/dev/null | grep "Private-Key:" | awk '{print $2}' | sed 's/(//')
    if [[ -n "$key_size" ]]; then
        info "Размер ключа: $key_size бит"
    fi
}

# Мониторинг производительности SSL
monitor_ssl_performance() {
    log "=== МОНИТОРИНГ ПРОИЗВОДИТЕЛЬНОСТИ SSL ==="
    
    # Загрузка CPU от SSL операций
    local cpu_info=$(top -b -n 1 -p $(pgrep -f grafana-server 2>/dev/null | head -1) 2>/dev/null | tail -1)
    if [[ -n "$cpu_info" ]]; then
        info "Загрузка CPU Grafana: $cpu_info"
    fi
    
    # Использование памяти
    local mem_info=$(ps -p $(pgrep -f grafana-server 2>/dev/null | head -1) -o pid,user,pcpu,pmem,vsz,rss 2>/dev/null)
    if [[ -n "$mem_info" ]]; then
        info "Использование памяти:\n$mem_info"
    fi
    
    # Проверка производительности шифров
    log "Тестирование скорости шифров..."
    if command -v openssl &> /dev/null; then
        # Тест RSA
        local rsa_speed=$(timeout 10 openssl speed rsa2048 2>/dev/null | tail -3 | head -1 | awk '{print $4}')
        if [[ -n "$rsa_speed" ]]; then
            info "Скорость RSA-2048: $rsa_speed подписей/сек"
        fi
        
        # Тест AES
        local aes_gcm_speed=$(timeout 10 openssl speed aes-128-gcm 2>/dev/null | tail -1 | awk '{print $5}')
        if [[ -n "$aes_gcm_speed" ]]; then
            info "Скорость AES-128-GCM: $aes_gcm_speed кбайт/сек"
        fi
    fi
}

# Проверка SSL конфигурации безопасности
check_ssl_security_config() {
    log "=== ПРОВЕРКА КОНФИГУРАЦИИ БЕЗОПАСНОСТИ ==="
    
    local config_file="/etc/grafana/grafana.ini"
    
    if [[ ! -f "$config_file" ]]; then
        warning "Конфигурационный файл не найден"
        return 1
    fi
    
    # Проверка минимальной версии TLS
    local ssl_version=$(grep "ssl_min_version" "$config_file" | head -1 | cut -d= -f2 | tr -d ' ')
    if [[ "$ssl_version" == "TLSv1.2" ]]; then
        log "✓ Минимальная версия TLS: $ssl_version"
    else
        warning "Рекомендуется использовать TLSv1.2 или выше (текущая: $ssl_version)"
    fi
    
    # Проверка принудительного SSL
    if grep -q "force_ssl.*true" "$config_file"; then
        log "✓ Принудительный SSL включен"
    else
        warning "Принудительный SSL не включен"
    fi
    
    # Проверка безопасных куки
    local cookie_secure=$(grep "cookie_secure" "$config_file" | head -1 | cut -d= -f2 | tr -d ' ')
    if [[ "$cookie_secure" == "true" ]]; then
        log "✓ Secure куки включены"
    else
        warning "Secure куки не включены"
    fi
    
    # Проверка SameSite
    local cookie_samesite=$(grep "cookie_samesite" "$config_file" | head -1 | cut -d= -f2 | tr -d ' ')
    if [[ "$cookie_samesite" == "strict" ]]; then
        log "✓ SameSite куки настроены строго"
    else
        warning "Рекомендуется установить SameSite в strict (текущее: $cookie_samesite)"
    fi
}

# Проверка сетевой безопасности
check_network_security() {
    log "=== ПРОВЕРКА СЕТЕВОЙ БЕЗОПАСНОСТИ ==="
    
    # Проверка открытых портов
    local open_ports=$(netstat -tlnp 2>/dev/null | grep LISTEN | grep ":$GRAFANA_PORT ")
    if [[ -n "$open_ports" ]]; then
        log "✓ Порт $GRAFANA_PORT открыт и слушает"
    else
        error "Порт $GRAFANA_PORT не слушает!"
        return 1
    fi
    
    # Проверка firewall
    local firewall_check=""
    
    if command -v ufw &> /dev/null; then
        if ufw status | grep "3000" &> /dev/null; then
            firewall_check="UFW"
        fi
    fi
    
    if command -v firewall-cmd &> /dev/null; then
        if firewall-cmd --list-ports | grep "3000/tcp" &> /dev/null; then
            firewall_check="${firewall_check:+$firewall_check, }firewalld"
        fi
    fi
    
    if [[ -n "$firewall_check" ]]; then
        log "✓ Firewall настроен: $firewall_check"
    else
        warning "Проверьте настройки firewall для порта $GRAFANA_PORT"
    fi
    
    # Проверка SSL/TLS уязвимостей
    log "Базовые проверки безопасности..."
    
    # Проверка Heartbleed (если nmap доступен)
    if command -v nmap &> /dev/null; then
        local heartbleed_check=$(timeout 10 nmap --script ssl-heartbleed -p $GRAFANA_PORT $GRAFANA_HOST 2>/dev/null | grep -i "vulnerable\|safe")
        if [[ -n "$heartbleed_check" ]]; then
            info "Heartbleed проверка: $heartbleed_check"
        fi
    fi
    
    # Проверка поддерживаемых шифров
    if command -v nmap &> /dev/null; then
        local cipher_info=$(timeout 10 nmap --script ssl-enum-ciphers -p $GRAFANA_PORT $GRAFANA_HOST 2>/dev/null | grep -E "(TLS|SSL)" | head -5)
        if [[ -n "$cipher_info" ]]; then
            info "Поддерживаемые протоколы:\n$cipher_info"
        fi
    fi
}

# Генерация отчета о производительности
generate_performance_report() {
    log "=== ГЕНЕРАЦИЯ ОТЧЕТА О ПРОИЗВОДИТЕЛЬНОСТИ ==="
    
    local report_file="$LOG_DIR/ssl_performance_report_$(date +%Y%m%d_%H%M%S).txt"
    
    cat > "$report_file" << EOF
╔════════════════════════════════════════════════════════════════╗
║                ОТЧЕТ О ПРОИЗВОДИТЕЛЬНОСТИ SSL/TLS              ║
║                   Экосистема Искра                            ║
╚════════════════════════════════════════════════════════════════╝

Дата создания отчета: $(date '+%Y-%m-%d %H:%M:%S')
Хост: $GRAFANA_HOST
Порт: $GRAFANA_PORT

СОСТОЯНИЕ СЛУЖБЫ
===============
Grafana статус: $(systemctl is-active grafana-server 2>/dev/null || echo "неопределен")
Процессы: $(pgrep -f grafana-server 2>/dev/null | wc -l)
PID основного процесса: $(pgrep -f grafana-server 2>/dev/null | head -1)

СЕТЕВАЯ АКТИВНОСТЬ
=================
Слушающие соединения: $(netstat -tlnp 2>/dev/null | grep ":$GRAFANA_PORT " | wc -l)
Активные соединения: $(netstat -an 2>/dev/null | grep ":$GRAFANA_PORT.*ESTABLISHED" | wc -l)

SSL СЕРТИФИКАТ
=============
Файл: $CERTS_DIR/grafana.crt
Статус: $(openssl x509 -checkend 0 -noout -in "$CERTS_DIR/grafana.crt" 2>/dev/null && echo "действителен" || echo "истек или недействителен")
Алгоритм: $(openssl x509 -in "$CERTS_DIR/grafana.crt" -noout -text 2>/dev/null | grep "Signature Algorithm" | head -1 | awk '{print $3}')

ПРОИЗВОДИТЕЛЬНОСТЬ
=================
Системное время: $(date)
Загрузка системы: $(uptime | awk '{print $10 $11 $12}')
Использование памяти Grafana: $(ps -p $(pgrep -f grafana-server 2>/dev/null | head -1) -o pmem 2>/dev/null | tail -1)% CPU: $(ps -p $(pgrep -f grafana-server 2>/dev/null | head -1) -o pcpu 2>/dev/null | tail -1)%

РЕКОМЕНДАЦИИ
===========
1. Регулярно мониторьте время отклика SSL
2. Следите за сроком действия сертификатов
3. Проверяйте производительность шифров
4. Мониторьте использование ресурсов
5. Обновляйте SSL конфигурацию при необходимости

Создано: $(date '+%Y-%m-%d %H:%M:%S')
EOF
    
    log "✓ Отчет о производительности сохранен: $report_file"
}

# Основная функция мониторинга
main() {
    # Создание необходимых директорий
    mkdir -p "$LOG_DIR"
    touch "$PERF_LOG" "$MONITOR_LOG"
    
    print_header
    
    # Последовательность мониторинга
    monitor_ssl_connections
    echo
    test_ssl_response_time
    echo
    analyze_ssl_certificates
    echo
    monitor_ssl_performance
    echo
    check_ssl_security_config
    echo
    check_network_security
    echo
    
    # Генерация отчета
    generate_performance_report
    
    echo
    log "=== МОНИТОРИНГ ЗАВЕРШЕН ==="
    log "Логи сохранены в: $LOG_DIR"
    log "Для непрерывного мониторинга используйте: watch -n 30 $0"
}

# Обработка сигналов
trap 'echo -e "\n${RED}Мониторинг прерван пользователем${NC}"; exit 130' INT TERM

# Проверка прав
if [[ $EUID -eq 0 ]]; then
    main "$@"
else
    echo -e "${YELLOW}Рекомендуется запускать скрипт от имени суперпользователя${NC}"
    read -p "Продолжить? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        main "$@"
    else
        exit 0
    fi
fi