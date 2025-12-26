#!/bin/bash

# WebSocket Error Handler Setup Script
# Автоматическая установка и настройка системы мониторинга WebSocket

set -euo pipefail

# Константы
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
LOG_FILE="/var/log/websocket-setup.log"
CONFIG_DIR="$PROJECT_ROOT/config"
SCRIPTS_DIR="$PROJECT_ROOT/scripts"
DOCS_DIR="$PROJECT_ROOT/docs"

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Логирование
log() {
    local level="$1"
    shift
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [$level] $*" | tee -a "$LOG_FILE"
}

info() { log "INFO" "$@"; }
warn() { log "WARN" "$@"; }
error() { log "ERROR" "$@"; }
success() { log "SUCCESS" "$@"; }

print_banner() {
    echo -e "${BLUE}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║         WebSocket Error Handler Setup for Iskra            ║"
    echo "║              Ecosystem - Production Ready                   ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

# Проверка зависимостей
check_dependencies() {
    info "Проверка зависимостей..."
    
    local missing_deps=()
    
    # Проверяем Node.js
    if ! command -v node >/dev/null 2>&1; then
        missing_deps+=("nodejs")
    fi
    
    # Проверяем npm
    if ! command -v npm >/dev/null 2>&1; then
        missing_deps+=("npm")
    fi
    
    # Проверяем jq
    if ! command -v jq >/dev/null 2>&1; then
        missing_deps+=("jq")
    fi
    
    # Проверяем curl
    if ! command -v curl >/dev/null 2>&1; then
        missing_deps+=("curl")
    fi
    
    # Проверяем websocat (опционально)
    if ! command -v websocat >/dev/null 2>&1; then
        warn "websocat не установлен - некоторые тесты могут быть недоступны"
    fi
    
    if [ ${#missing_deps[@]} -ne 0 ]; then
        error "Отсутствуют зависимости: ${missing_deps[*]}"
        echo -e "${YELLOW}Установите зависимости и запустите скрипт снова${NC}"
        exit 1
    fi
    
    success "Все зависимости установлены"
}

# Создание директорий
create_directories() {
    info "Создание необходимых директорий..."
    
    local dirs=(
        "$PROJECT_ROOT/logs"
        "$PROJECT_ROOT/test_reports"
        "$PROJECT_ROOT/monitoring"
        "$PROJECT_ROOT/chaos_tests"
        "$PROJECT_ROOT/prometheus_data"
        "$PROJECT_ROOT/grafana_data"
    )
    
    for dir in "${dirs[@]}"; do
        if [ ! -d "$dir" ]; then
            mkdir -p "$dir"
            info "Создана директория: $dir"
        fi
    done
    
    success "Директории созданы"
}

# Установка npm пакетов
install_npm_packages() {
    info "Установка npm пакетов..."
    
    cd "$PROJECT_ROOT"
    
    # Создаем package.json если не существует
    if [ ! -f "package.json" ]; then
        cat > package.json << 'EOF'
{
  "name": "iskra-websocket-error-handler",
  "version": "1.0.0",
  "description": "WebSocket Error Handling System for Iskra Ecosystem",
  "main": "websocket_error_handler.js",
  "scripts": {
    "test": "node websocket_test_scenarios.js",
    "monitor": "node monitoring/websocket_monitor.js",
    "chaos": "node chaos_tests/websocket_chaos_test.js",
    "setup": "bash scripts/setup_websocket_monitoring.sh"
  },
  "dependencies": {
    "ws": "^8.14.2",
    "dotenv": "^16.3.1",
    "pino": "^8.16.0"
  },
  "devDependencies": {
    "jest": "^29.7.0"
  }
}
EOF
    fi
    
    # Устанавливаем пакеты
    npm install --silent
    
    success "npm пакеты установлены"
}

# Создание environment файлов
create_env_files() {
    info "Создание environment файлов..."
    
    # Основной .env файл
    cat > "$PROJECT_ROOT/.env" << 'EOF'
# WebSocket Configuration
WEBSOCKET_PULSE_URL=ws://localhost:3001
WEBSOCKET_SEAMS_URL=ws://localhost:3002
WEBSOCKET_VOICES_URL=ws://localhost:3003

# Connection Settings
WEBSOCKET_MAX_RECONNECT=10
WEBSOCKET_HEARTBEAT_INTERVAL=30000
WEBSOCKET_REQUEST_TIMEOUT=5000

# Monitoring
WEBSOCKET_LOG_LEVEL=info
WEBSOCKET_ENABLE_METRICS=true
WEBSOCKET_ENABLE_ALERTS=true

# Fallback
WEBSOCKET_ENABLE_FALLBACK=true
WEBSOCKET_BUFFER_SIZE=1000
WEBSOCKET_FALLBACK_TIMEOUT=30000

# Integration with Iskra Ecosystem
FRACTAL_LOGGING_ENABLED=true
SLO_MONITORING_ENABLED=true
VOICE_SYSTEM_ENABLED=true

# External Services (замените на реальные значения)
SLACK_WEBHOOK_URL=https://hooks.slack.com/your-webhook
EMAIL_SMTP_HOST=smtp.iskra.local
EMAIL_SMTP_PORT=587
EMAIL_SMTP_USER=alerts@iskra.local
PAGERDUTY_API_KEY=your-pagerduty-key

# Grafana
GRAFANA_DASHBOARD_URL=http://localhost:3000/d/websocket-monitor
GRAFANA_API_KEY=your-grafana-api-key
EOF

    # Development .env файл
    cat > "$PROJECT_ROOT/.env.development" << 'EOF'
# Development Environment
WEBSOCKET_LOG_LEVEL=debug
WEBSOCKET_ENABLE_METRICS=true
WEBSOCKET_ENABLE_ALERTS=false
EOF

    # Production .env файл  
    cat > "$PROJECT_ROOT/.env.production" << 'EOF'
# Production Environment
WEBSOCKET_LOG_LEVEL=info
WEBSOCKET_ENABLE_METRICS=true
WEBSOCKET_ENABLE_ALERTS=true
EOF

    success "Environment файлы созданы"
}

# Создание systemd сервисов
create_systemd_services() {
    info "Создание systemd сервисов..."
    
    local service_dir="/etc/systemd/system"
    
    # WebSocket Monitor Service
    cat > "$service_dir/iskra-websocket-monitor.service" << EOF
[Unit]
Description=Iskra WebSocket Error Handler Monitor
After=network.target
Wants=network.target

[Service]
Type=simple
User=iskra
Group=iskra
WorkingDirectory=$PROJECT_ROOT
ExecStart=/usr/bin/node monitoring/websocket_monitor.js
ExecReload=/bin/kill -HUP \$MAINPID
Restart=always
RestartSec=5
Environment=NODE_ENV=production
EnvironmentFile=$PROJECT_ROOT/.env

# Security settings
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=$PROJECT_ROOT

# Logging
StandardOutput=journal
StandardError=journal
SyslogIdentifier=iskra-websocket-monitor

[Install]
WantedBy=multi-user.target
EOF

    # WebSocket Health Check Service
    cat > "$service_dir/iskra-websocket-health-check.service" << EOF
[Unit]
Description=Iskra WebSocket Health Check
After=network.target
Wants=network.target

[Service]
Type=oneshot
User=iskra
Group=iskra
WorkingDirectory=$PROJECT_ROOT
ExecStart=/bin/bash scripts/websocket_health_check.sh
Environment=NODE_ENV=production
EnvironmentFile=$PROJECT_ROOT/.env

[Install]
WantedBy=multi-user.target
EOF

    # Health Check Timer
    cat > "$service_dir/iskra-websocket-health-check.timer" << 'EOF'
[Unit]
Description=Run WebSocket Health Check every 5 minutes
Requires=iskra-websocket-health-check.service

[Timer]
OnCalendar=*:0/5
Persistent=true

[Install]
WantedBy=timers.target
EOF

    success "Systemd сервисы созданы"
    echo -e "${YELLOW}Не забудьте выполнить: sudo systemctl daemon-reload${NC}"
}

# Настройка логирования
setup_logging() {
    info "Настройка системы логирования..."
    
    # Logrotate configuration
    cat > "/etc/logrotate.d/iskra-websocket" << EOF
$PROJECT_ROOT/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 0644 iskra iskra
    postrotate
        systemctl reload iskra-websocket-monitor.service
    endscript
}
EOF

    # Настройка системного логирования
    cat > "/etc/rsyslog.d/50-iskra-websocket.conf" << 'EOF'
# WebSocket Error Handler logs
if $programname == 'iskra-websocket-monitor' then {
    /var/log/iskra-websocket/app.log
    stop
}
EOF

    success "Система логирования настроена"
    echo -e "${YELLOW}Перезапустите rsyslog: sudo systemctl restart rsyslog${NC}"
}

# Создание Docker Compose
create_docker_compose() {
    info "Создание Docker Compose конфигурации..."
    
    cat > "$PROJECT_ROOT/docker-compose.websocket.yml" << 'EOF'
version: '3.8'

services:
  websocket-monitor:
    build: .
    container_name: iskra-websocket-monitor
    restart: unless-stopped
    environment:
      - NODE_ENV=production
    env_file:
      - .env
    volumes:
      - ./logs:/app/logs
      - ./config:/app/config
    networks:
      - iskra-network
    depends_on:
      - prometheus
      - grafana

  prometheus:
    image: prom/prometheus:latest
    container_name: iskra-prometheus
    restart: unless-stopped
    ports:
      - "9090:9090"
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
      - ./prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/etc/prometheus/console_libraries'
      - '--web.console.templates=/etc/prometheus/consoles'
      - '--storage.tsdb.retention.time=200h'
      - '--web.enable-lifecycle'
    networks:
      - iskra-network

  grafana:
    image: grafana/grafana:latest
    container_name: iskra-grafana
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin123
    volumes:
      - ./grafana_data:/var/lib/grafana
      - ./monitoring/grafana-dashboard.json:/etc/grafana/provisioning/dashboards/dashboard.json
    networks:
      - iskra-network

  alertmanager:
    image: prom/alertmanager:latest
    container_name: iskra-alertmanager
    restart: unless-stopped
    ports:
      - "9093:9093"
    volumes:
      - ./monitoring/alertmanager.yml:/etc/alertmanager/alertmanager.yml
    networks:
      - iskra-network

networks:
  iskra-network:
    driver: bridge

volumes:
  prometheus_data:
  grafana_data:
EOF

    success "Docker Compose файл создан"
}

# Создание скриптов управления
create_management_scripts() {
    info "Создание скриптов управления..."
    
    # Скрипт запуска мониторинга
    cat > "$PROJECT_ROOT/scripts/start_websocket_monitoring.sh" << 'EOF'
#!/bin/bash
set -euo pipefail

echo "🚀 Запуск WebSocket мониторинга..."

# Проверка зависимостей
if ! command -v node >/dev/null 2>&1; then
    echo "❌ Node.js не установлен"
    exit 1
fi

# Запуск мониторинга
cd "$(dirname "$0")/.."
node monitoring/websocket_monitor.js &
MONITOR_PID=$!

echo "✅ WebSocket мониторинг запущен (PID: $MONITOR_PID)"

# Запуск health check в фоне
while true; do
    sleep 300  # каждые 5 минут
    bash scripts/websocket_health_check.sh || true
done &
HEALTH_CHECK_PID=$!

echo "✅ Health check запущен (PID: $HEALTH_CHECK_PID)"

# Сохранение PID для завершения
echo $MONITOR_PID > .websocket_monitor.pid
echo $HEALTH_CHECK_PID > .health_check.pid

echo "📊 Мониторинг активен. Для остановки используйте scripts/stop_websocket_monitoring.sh"
EOF

    # Скрипт остановки мониторинга
    cat > "$PROJECT_ROOT/scripts/stop_websocket_monitoring.sh" << 'EOF'
#!/bin/bash
set -euo pipefail

echo "🛑 Остановка WebSocket мониторинга..."

if [ -f .websocket_monitor.pid ]; then
    MONITOR_PID=$(cat .websocket_monitor.pid)
    if kill -0 $MONITOR_PID 2>/dev/null; then
        kill $MONITOR_PID
        echo "✅ WebSocket мониторинг остановлен (PID: $MONITOR_PID)"
    else
        echo "⚠️ Процесс мониторинга не найден"
    fi
    rm -f .websocket_monitor.pid
fi

if [ -f .health_check.pid ]; then
    HEALTH_CHECK_PID=$(cat .health_check.pid)
    if kill -0 $HEALTH_CHECK_PID 2>/dev/null; then
        kill $HEALTH_CHECK_PID
        echo "✅ Health check остановлен (PID: $HEALTH_CHECK_PID)"
    else
        echo "⚠️ Процесс health check не найден"
    fi
    rm -f .health_check.pid
fi

echo "🏁 Все процессы мониторинга остановлены"
EOF

    # Скрипт тестирования отказоустойчивости
    cat > "$PROJECT_ROOT/scripts/test_websocket_resilience.sh" << 'EOF'
#!/bin/bash
set -euo pipefail

echo "🧪 Запуск тестов отказоустойчивости WebSocket..."

cd "$(dirname "$0")/.."

# Запуск chaos engineering тестов
if [ -f chaos_tests/websocket_chaos_test.js ]; then
    echo "💥 Запуск Chaos Engineering тестов..."
    node chaos_tests/websocket_chaos_test.js
else
    echo "⚠️ Chaos тесты не найдены"
fi

# Запуск функциональных тестов
if [ -f websocket_test_scenarios.js ]; then
    echo "✅ Запуск функциональных тестов..."
    node websocket_test_scenarios.js
else
    echo "⚠️ Функциональные тесты не найдены"
fi

echo "🎯 Тесты отказоустойчивости завершены"
echo "📄 Результаты сохранены в test_reports/"
EOF

    chmod +x "$PROJECT_ROOT/scripts"/*.sh
    
    success "Скрипты управления созданы"
}

# Создание Prometheus конфигурации
create_prometheus_config() {
    info "Создание Prometheus конфигурации..."
    
    mkdir -p "$PROJECT_ROOT/monitoring"
    
    cat > "$PROJECT_ROOT/monitoring/prometheus.yml" << 'EOF'
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "websocket_rules.yml"

alerting:
  alertmanagers:
    - static_configs:
        - targets:
          - alertmanager:9093

scrape_configs:
  - job_name: 'websocket-monitor'
    static_configs:
      - targets: ['localhost:8080']
    metrics_path: '/metrics'
    scrape_interval: 5s

  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']
EOF

    # Правила алертинга для WebSocket
    cat > "$PROJECT_ROOT/monitoring/websocket_rules.yml" << 'EOF'
groups:
- name: websocket_alerts
  rules:
  - alert: WebSocketConnectionFailure
    expr: rate(websocket_connection_failures_total[5m]) > 0.1
    for: 1m
    labels:
      severity: critical
    annotations:
      summary: "WebSocket соединения часто падают"
      description: "Частота ошибок соединений {{ $value }} за последние 5 минут"

  - alert: WebSocketHighLatency
    expr: websocket_avg_latency_seconds > 0.5
    for: 2m
    labels:
      severity: warning
    annotations:
      summary: "Высокая latency WebSocket"
      description: "Средняя latency составляет {{ $value }} секунд"

  - alert: WebSocketHeartbeatFailure
    expr: rate(websocket_heartbeat_failures_total[5m]) > 0.05
    for: 1m
    labels:
      severity: warning
    annotations:
      summary: "Проблемы с heartbeat"
      description: "Частота ошибок heartbeat {{ $value }} за последние 5 минут"

  - alert: WebSocketFallbackActivated
    expr: increase(websocket_fallback_activations_total[1h]) > 0
    for: 0s
    labels:
      severity: critical
    annotations:
      summary: "Активирован fallback режим"
      description: "Fallback режим был активирован {{ $value }} раз за час"
EOF

    success "Prometheus конфигурация создана"
}

# Основная функция установки
main() {
    print_banner
    
    info "Начало установки WebSocket Error Handler..."
    
    # Выполняем все этапы установки
    check_dependencies
    create_directories
    install_npm_packages
    create_env_files
    create_systemd_services
    setup_logging
    create_docker_compose
    create_management_scripts
    create_prometheus_config
    
    success "🎉 Установка WebSocket Error Handler завершена!"
    
    echo -e "\n${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                    СЛЕДУЮЩИЕ ШАГИ:                           ║${NC}"
    echo -e "${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}"
    echo
    echo -e "${YELLOW}1. Настройте внешние сервисы:${NC}"
    echo "   - SLACK_WEBHOOK_URL"
    echo "   - PAGERDUTY_API_KEY"
    echo "   - EMAIL_SMTP настройки"
    echo
    echo -e "${YELLOW}2. Запустите мониторинг:${NC}"
    echo "   cd $PROJECT_ROOT"
    echo "   ./scripts/start_websocket_monitoring.sh"
    echo
    echo -e "${YELLOW}3. Активируйте systemd сервисы (опционально):${NC}"
    echo "   sudo systemctl daemon-reload"
    echo "   sudo systemctl enable iskra-websocket-monitor"
    echo "   sudo systemctl start iskra-websocket-monitor"
    echo "   sudo systemctl enable iskra-websocket-health-check.timer"
    echo "   sudo systemctl start iskra-websocket-health-check.timer"
    echo
    echo -e "${YELLOW}4. Запустите Docker сервисы (опционально):${NC}"
    echo "   docker-compose -f docker-compose.websocket.yml up -d"
    echo
    echo -e "${YELLOW}5. Протестируйте систему:${NC}"
    echo "   ./scripts/test_websocket_resilience.sh"
    echo
    echo -e "${GREEN}📚 Документация: docs/websocket_error_handling_optimization.md${NC}"
    echo -e "${GREEN}⚙️  Конфигурация: config/websocket-error-handler-config.json${NC}"
    echo
}

# Запуск
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi