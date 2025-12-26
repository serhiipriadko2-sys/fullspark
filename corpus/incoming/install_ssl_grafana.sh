#!/bin/bash
# Скрипт установки SSL сертификатов для Grafana в экосистеме Искра
# Автоматизированная настройка SSL/TLS шифрования

set -e  # Выход при ошибке

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Константы
GRAFANA_USER="grafana"
GRAFANA_GROUP="grafana"
SSL_DIR="/etc/grafana/ssl"
GRAFANA_CONFIG="/etc/grafana/grafana.ini"
CERT_FILE="$SSL_DIR/grafana.crt"
KEY_FILE="$SSL_DIR/grafana.key"
BACKUP_DIR="/etc/grafana/backup/$(date +%Y%m%d_%H%M%S)"

# Функция логирования
log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[ОШИБКА] $1${NC}" >&2
    exit 1
}

warning() {
    echo -e "${YELLOW}[ПРЕДУПРЕЖДЕНИЕ] $1${NC}"
}

info() {
    echo -e "${BLUE}[ИНФО] $1${NC}"
}

# Проверка прав суперпользователя
check_root() {
    if [[ $EUID -ne 0 ]]; then
        error "Этот скрипт должен быть запущен от имени суперпользователя (sudo)"
    fi
}

# Создание резервной копии существующих конфигураций
backup_configs() {
    log "Создание резервной копии конфигураций..."
    mkdir -p "$BACKUP_DIR"
    
    if [[ -f "$GRAFANA_CONFIG" ]]; then
        cp "$GRAFANA_CONFIG" "$BACKUP_DIR/"
        log "✓ Резервная копия grafana.ini создана: $BACKUP_DIR/grafana.ini"
    fi
    
    if [[ -d "$SSL_DIR" ]]; then
        cp -r "$SSL_DIR" "$BACKUP_DIR/ssl"
        log "✓ Резервная копия SSL директории создана: $BACKUP_DIR/ssl"
    fi
}

# Создание пользователя и группы Grafana (если не существует)
create_grafana_user() {
    log "Проверка пользователя Grafana..."
    if ! id "$GRAFANA_USER" &>/dev/null; then
        groupadd --system "$GRAFANA_GROUP"
        useradd --system --gid "$GRAFANA_GROUP" --home-dir "/usr/share/grafana" \
                --no-create-home --shell /bin/false "$GRAFANA_USER"
        log "✓ Пользователь $GRAFANA_USER создан"
    else
        log "✓ Пользователь $GRAFANA_USER уже существует"
    fi
}

# Создание директорий
create_directories() {
    log "Создание необходимых директорий..."
    mkdir -p "$SSL_DIR"
    mkdir -p "/var/log/grafana"
    mkdir -p "/var/lib/grafana"
    mkdir -p "/var/lib/grafana/plugins"
    
    # Права доступа
    chown -R "$GRAFANA_USER:$GRAFANA_GROUP" "/var/log/grafana"
    chown -R "$GRAFANA_USER:$GRAFANA_GROUP" "/var/lib/grafana"
    chown "$GRAFANA_USER:$GRAFANA_GROUP" "$SSL_DIR"
    chmod 755 "/var/log/grafana" "/var/lib/grafana" "/var/lib/grafana/plugins"
    
    log "✓ Директории созданы и настроены"
}

# Установка OpenSSL (если не установлен)
install_openssl() {
    log "Проверка OpenSSL..."
    if ! command -v openssl &> /dev/null; then
        log "Установка OpenSSL..."
        if command -v apt-get &> /dev/null; then
            apt-get update && apt-get install -y openssl ca-certificates
        elif command -v yum &> /dev/null; then
            yum install -y openssl ca-certificates
        elif command -v dnf &> /dev/null; then
            dnf install -y openssl ca-certificates
        else
            error "Не удалось определить пакетный менеджер для установки OpenSSL"
        fi
        log "✓ OpenSSL установлен"
    else
        log "✓ OpenSSL уже установлен"
    fi
}

# Генерация самоподписанного SSL сертификата
generate_ssl_certificate() {
    log "Генерация самоподписанного SSL сертификата..."
    
    # Создание временного конфигурационного файла для OpenSSL
    local temp_config=$(mktemp)
    cat > "$temp_config" << 'EOF'
[req]
default_bits = 2048
prompt = no
default_md = sha256
distinguished_name = dn
x509_extensions = v3_req
prompt = no

[dn]
C=RU
ST=Moscow Region
L=Moscow
O=Iskra Ecosystem
OU=Grafana Dashboard
CN=grafana.iskra.local

[v3_req]
basicConstraints = CA:FALSE
keyUsage = nonRepudiation, digitalSignature, keyEncipherment
extendedKeyUsage = serverAuth
subjectAltName = @alt_names

[alt_names]
DNS.1 = grafana.iskra.local
DNS.2 = localhost
DNS.3 = grafana
IP.1 = 127.0.0.1
IP.2 = 192.168.1.100
EOF
    
    # Проверка существования сертификатов
    if [[ -f "$CERT_FILE" && -f "$KEY_FILE" ]]; then
        warning "SSL сертификаты уже существуют в $SSL_DIR"
        read -p "Перезаписать существующие сертификаты? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log "Использование существующих сертификатов"
            rm "$temp_config"
            return
        fi
    fi
    
    # Генерация сертификата и ключа
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout "$KEY_FILE" \
        -out "$CERT_FILE" \
        -config "$temp_config" \
        -extensions v3_req
    
    # Установка правильных прав доступа
    chmod 600 "$KEY_FILE"
    chmod 644 "$CERT_FILE"
    chown "$GRAFANA_USER:$GRAFANA_GROUP" "$CERT_FILE" "$KEY_FILE"
    
    # Очистка временного файла
    rm "$temp_config"
    
    log "✓ SSL сертификаты созданы:"
    log "  - Сертификат: $CERT_FILE"
    log "  - Приватный ключ: $KEY_FILE"
    log "  - Срок действия: 365 дней"
}

# Копирование конфигурационного файла Grafana
install_grafana_config() {
    log "Установка конфигурации Grafana..."
    
    local source_config="./grafana.ini"
    if [[ ! -f "$source_config" ]]; then
        error "Файл конфигурации $source_config не найден"
    fi
    
    cp "$source_config" "$GRAFANA_CONFIG"
    chown "$GRAFANA_USER:$GRAFANA_GROUP" "$GRAFANA_CONFIG"
    chmod 644 "$GRAFANA_CONFIG"
    
    log "✓ Конфигурация Grafana установлена: $GRAFANA_CONFIG"
}

# Установка systemd service файла
install_systemd_service() {
    log "Установка systemd service файла..."
    
    local source_service="./grafana.service"
    if [[ ! -f "$source_service" ]]; then
        error "Файл service $source_service не найден"
    fi
    
    cp "$source_service" "/etc/systemd/system/grafana-server.service"
    chmod 644 "/etc/systemd/system/grafana-server.service"
    
    # Перезагрузка systemd
    systemctl daemon-reload
    
    log "✓ Systemd service файл установлен"
}

# Настройка firewall
configure_firewall() {
    log "Настройка firewall..."
    
    # Настройка UFW
    if command -v ufw &> /dev/null; then
        ufw allow 3000/tcp comment "Grafana HTTPS"
        log "✓ Порт 3000 открыт в UFW"
    fi
    
    # Настройка firewalld
    if command -v firewall-cmd &> /dev/null; then
        firewall-cmd --permanent --add-port=3000/tcp
        firewall-cmd --reload
        log "✓ Порт 3000 открыт в firewalld"
    fi
    
    # Настройка iptables (если другие не доступны)
    if command -v iptables &> /dev/null; then
        iptables -C INPUT -p tcp --dport 3000 -j ACCEPT 2>/dev/null || \
        iptables -I INPUT -p tcp --dport 3000 -j ACCEPT
        log "✓ Порт 3000 открыт в iptables"
    fi
}

# Проверка SSL сертификата
verify_ssl_certificate() {
    log "Проверка SSL сертификата..."
    
    if [[ ! -f "$CERT_FILE" ]]; then
        error "Сертификат не найден: $CERT_FILE"
    fi
    
    if [[ ! -f "$KEY_FILE" ]]; then
        error "Приватный ключ не найден: $KEY_FILE"
    fi
    
    # Проверка срока действия сертификата
    if openssl x509 -in "$CERT_FILE" -noout -checkend 0; then
        local expiry_date=$(openssl x509 -in "$CERT_FILE" -noout -enddate | cut -d= -f2)
        log "✓ SSL сертификат действителен до: $expiry_date"
    else
        error "SSL сертификат истек или некорректен"
    fi
    
    # Проверка соответствия ключа сертификату
    if openssl x509 -noout -modulus -in "$CERT_FILE" | openssl md5 && \
       openssl rsa -noout -modulus -in "$KEY_FILE" 2>/dev/null | openssl md5 | \
       diff <(openssl x509 -noout -modulus -in "$CERT_FILE" | openssl md5) - &>/dev/null; then
        log "✓ Приватный ключ соответствует сертификату"
    else
        error "Приватный ключ не соответствует сертификату"
    fi
}

# Создание скрипта обновления сертификата
create_renewal_script() {
    log "Создание скрипта обновления сертификата..."
    
    local renewal_script="/etc/grafana/renew_ssl_cert.sh"
    cat > "$renewal_script" << 'EOF'
#!/bin/bash
# Скрипт обновления SSL сертификата для Grafana

SSL_DIR="/etc/grafana/ssl"
GRAFANA_USER="grafana"
GRAFANA_GROUP="grafana"

# Проверка срока действия сертификата
if openssl x509 -checkend 2592000 -noout -in "$SSL_DIR/grafana.crt"; then
    echo "SSL сертификат действителен более 30 дней"
    exit 0
fi

# Обновление сертификата
echo "Обновление SSL сертификата..."
cd "$SSL_DIR"

# Создание нового сертификата
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout grafana.key.tmp \
    -out grafana.crt.tmp \
    -config <(cat <<SSL_EOF
[req]
default_bits = 2048
prompt = no
default_md = sha256
distinguished_name = dn
x509_extensions = v3_req
prompt = no

[dn]
C=RU
ST=Moscow Region
L=Moscow
O=Iskra Ecosystem
OU=Grafana Dashboard
CN=grafana.iskra.local

[v3_req]
basicConstraints = CA:FALSE
keyUsage = nonRepudiation, digitalSignature, keyEncipherment
extendedKeyUsage = serverAuth
subjectAltName = @alt_names

[alt_names]
DNS.1 = grafana.iskra.local
DNS.2 = localhost
DNS.3 = grafana
IP.1 = 127.0.0.1
IP.2 = 192.168.1.100
SSL_EOF
)

# Замена старого сертификата новым
if openssl x509 -noout -modulus -in grafana.crt.tmp | openssl md5 > /dev/null; then
    mv grafana.key.tmp grafana.key
    mv grafana.crt.tmp grafana.crt
    
    # Установка правильных прав доступа
    chmod 600 grafana.key
    chmod 644 grafana.crt
    chown "$GRAFANA_USER:$GRAFANA_GROUP" grafana.crt grafana.key
    
    # Перезапуск Grafana
    systemctl restart grafana-server
    
    echo "SSL сертификат успешно обновлен"
else
    rm grafana.crt.tmp grafana.key.tmp
    echo "Ошибка при создании нового сертификата"
    exit 1
fi
EOF
    
    chmod +x "$renewal_script"
    chown root:root "$renewal_script"
    
    log "✓ Скрипт обновления создан: $renewal_script"
}

# Создание cron задачи для автоматического обновления
setup_renewal_cron() {
    log "Настройка автоматического обновления сертификата..."
    
    (crontab -l 2>/dev/null; echo "0 3 * * 0 /etc/grafana/renew_ssl_cert.sh >> /var/log/grafana/ssl_renewal.log 2>&1") | crontab -
    
    log "✓ Автоматическое обновление настроено (каждое воскресенье в 3:00)"
}

# Настройка логирования SSL событий
setup_ssl_logging() {
    log "Настройка логирования SSL событий..."
    
    # Создание лог файла для SSL
    touch "/var/log/grafana/ssl.log"
    chown "$GRAFANA_USER:$GRAFANA_GROUP" "/var/log/grafana/ssl.log"
    chmod 644 "/var/log/grafana/ssl.log"
    
    log "✓ Логирование SSL настроено"
}

# Основная функция установки
main() {
    log "=== Начало установки SSL/TLS для Grafana ==="
    log "Экосистема: Искра"
    log "Хост: grafana.iskra.local"
    log "Порт: 3000 (HTTPS)"
    echo
    
    # Последовательность установки
    check_root
    backup_configs
    create_grafana_user
    create_directories
    install_openssl
    generate_ssl_certificate
    install_grafana_config
    install_systemd_service
    configure_firewall
    verify_ssl_certificate
    create_renewal_script
    setup_renewal_cron
    setup_ssl_logging
    
    echo
    log "=== Установка SSL/TLS завершена успешно! ==="
    log ""
    log "Следующие шаги:"
    log "1. Убедитесь, что DNS записи указывают на grafana.iskra.local"
    log "2. Запустите Grafana: systemctl start grafana-server"
    log "3. Проверьте статус: systemctl status grafana-server"
    log "4. Откройте браузер: https://grafana.iskana.local:3000"
    log "5. Логин: admin / Пароль: IskraSecure2024!"
    log ""
    log "Важные файлы:"
    log "- Конфигурация: $GRAFANA_CONFIG"
    log "- Сертификат: $CERT_FILE"
    log "- Приватный ключ: $KEY_FILE"
    log "- Service: /etc/systemd/system/grafana-server.service"
    log "- Логи: /var/log/grafana/"
    log ""
    log "Команды управления:"
    log "- systemctl start grafana-server    # Запуск"
    log "- systemctl stop grafana-server     # Остановка"
    log "- systemctl restart grafana-server  # Перезапуск"
    log "- systemctl status grafana-server   # Статус"
    log "- journalctl -u grafana-server -f   # Логи в реальном времени"
}

# Запуск основной функции
main "$@"