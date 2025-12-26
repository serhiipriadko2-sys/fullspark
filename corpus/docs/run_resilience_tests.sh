#!/bin/bash

# 🔧 СКРИПТ ЗАПУСКА ТЕСТОВ ОТКАЗОУСТОЙЧИВОСТИ БД
# Экосистема Искры - Database Resilience Testing Suite
# 
# Использование:
#   ./run_resilience_tests.sh [--mock|--full]
#
# Опции:
#   --mock   : Запуск в mock режиме (без реальной БД)
#   --full   : Полное тестирование с реальными компонентами

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RESULTS_DIR="$SCRIPT_DIR"
TIMESTAMP=$(date '+%Y%m%d_%H%M%S')
LOG_FILE="$RESULTS_DIR/resilience_test_$TIMESTAMP.log"

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Функция логирования
log() {
    local level=$1
    shift
    local message="$@"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    case $level in
        "INFO")
            echo -e "${GREEN}[INFO]${NC} $timestamp: $message" | tee -a "$LOG_FILE"
            ;;
        "WARN")
            echo -e "${YELLOW}[WARN]${NC} $timestamp: $message" | tee -a "$LOG_FILE"
            ;;
        "ERROR")
            echo -e "${RED}[ERROR]${NC} $timestamp: $message" | tee -a "$LOG_FILE"
            ;;
        "STEP")
            echo -e "${BLUE}[STEP]${NC} $timestamp: $message" | tee -a "$LOG_FILE"
            ;;
    esac
}

# Заголовок
show_header() {
    echo -e "${BLUE}"
    echo "================================================================================"
    echo "                     🏗️  DATABASE RESILIENCE TESTING SUITE"
    echo "                              Экосистема Искры"
    echo "================================================================================"
    echo -e "${NC}"
    log "INFO" "Начало тестирования отказоустойчивости БД"
    log "INFO" "Лог файл: $LOG_FILE"
    log "INFO" "Режим: $TEST_MODE"
    echo ""
}

# Проверка зависимостей
check_dependencies() {
    log "STEP" "Проверка зависимостей..."
    
    # Проверка Node.js
    if ! command -v node &> /dev/null; then
        log "ERROR" "Node.js не установлен"
        exit 1
    fi
    
    NODE_VERSION=$(node -v)
    log "INFO" "Node.js версия: $NODE_VERSION"
    
    # Проверка npm
    if ! command -v npm &> /dev/null; then
        log "ERROR" "npm не установлен"
        exit 1
    fi
    
    # Проверка наличия package.json
    if [[ ! -f "$SCRIPT_DIR/package.json" ]]; then
        log "WARN" "package.json не найден, создаем..."
        cp "$SCRIPT_DIR/package.json" "$SCRIPT_DIR/package.json.bak" 2>/dev/null || true
        cat > "$SCRIPT_DIR/package.json" << 'EOF'
{
  "name": "database-resilience-tests",
  "version": "1.0.0",
  "description": "Тесты отказоустойчивости базы данных для экосистемы Искры",
  "main": "database_resilience_test.js",
  "scripts": {
    "test": "node database_resilience_test.js",
    "test:verbose": "node --trace-warnings database_resilience_test.js"
  },
  "dependencies": {
    "pg": "^8.11.0",
    "redis": "^4.6.7",
    "ws": "^8.14.2"
  },
  "engines": {
    "node": ">=16.0.0"
  }
}
EOF
    fi
    
    # Установка зависимостей
    log "INFO" "Установка зависимостей..."
    if npm install --silent; then
        log "INFO" "✅ Зависимости установлены"
    else
        log "WARN" "⚠️ Ошибка установки зависимостей, продолжаем..."
    fi
}

# Проверка доступности сервисов
check_services() {
    log "STEP" "Проверка доступности сервисов..."
    
    local services=(
        "localhost:5432:PostgreSQL"
        "localhost:6379:Redis"
        "localhost:9090:Prometheus"
        "localhost:9093:AlertManager"
        "localhost:3000:Grafana"
        "localhost:3001:Pulse Dashboard"
        "localhost:3002:Seams Dashboard"
        "localhost:3003:Voices Dashboard"
    )
    
    local available_services=0
    local total_services=${#services[@]}
    
    for service in "${services[@]}"; do
        IFS=':' read -r host port name <<< "$service"
        
        if timeout 3 bash -c "echo > /dev/tcp/$host/$port" 2>/dev/null; then
            log "INFO" "✅ $name доступен ($host:$port)"
            ((available_services++))
        else
            log "WARN" "⚠️ $name недоступен ($host:$port)"
        fi
    done
    
    log "INFO" "Доступно сервисов: $available_services/$total_services"
    
    if [[ $available_services -eq 0 ]]; then
        log "WARN" "Ни один сервис недоступен, запускаем в mock режиме"
        TEST_MODE="mock"
    fi
}

# Запуск тестов
run_tests() {
    log "STEP" "Запуск тестов отказоустойчивости..."
    
    local start_time=$(date +%s)
    
    case $TEST_MODE in
        "mock")
            log "INFO" "🔧 Запуск в MOCK режиме (симуляция)"
            node "$SCRIPT_DIR/database_resilience_test.js" --mock 2>&1 | tee -a "$LOG_FILE"
            ;;
        "full")
            log "INFO" "🚀 Запуск в ПОЛНОМ режиме"
            node "$SCRIPT_DIR/database_resilience_test.js" 2>&1 | tee -a "$LOG_FILE"
            ;;
        *)
            log "INFO" "⚡ Запуск в AUTO режиме"
            node "$SCRIPT_DIR/database_resilience_test.js" 2>&1 | tee -a "$LOG_FILE"
            ;;
    esac
    
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    log "INFO" "Тесты завершены за ${duration} секунд"
}

# Анализ результатов
analyze_results() {
    log "STEP" "Анализ результатов..."
    
    # Поиск markdown отчета
    local md_files=($(find "$RESULTS_DIR" -name "*.md" -type f))
    
    if [[ ${#md_files[@]} -gt 0 ]]; then
        log "INFO" "📊 Найден отчет: ${md_files[0]}"
        
        # Извлечение ключевых метрик из отчета
        if grep -q "Пройдено тестов" "${md_files[0]}"; then
            local test_results=$(grep -o "Пройдено тестов: [0-9]\+/" "${md_files[0]}" || echo "Не найдено")
            local success_rate=$(grep -o "Процент успеха: [0-9.]\+%" "${md_files[0]}" || echo "Не найдено")
            
            log "INFO" "📈 Результаты: $test_results"
            log "INFO" "📊 Успешность: $success_rate"
        fi
    else
        log "WARN" "⚠️ Отчет не найден"
    fi
    
    # Проверка наличия результатов в log
    if grep -q "PASSED" "$LOG_FILE"; then
        local passed_tests=$(grep -c "PASSED" "$LOG_FILE")
        local failed_tests=$(grep -c "FAILED" "$LOG_FILE")
        
        log "INFO" "✅ Пройдено тестов: $passed_tests"
        if [[ $failed_tests -gt 0 ]]; then
            log "WARN" "❌ Провалено тестов: $failed_tests"
        fi
    fi
}

# Генерация итогового отчета
generate_summary() {
    log "STEP" "Генерация итогового отчета..."
    
    local summary_file="$RESULTS_DIR/test_summary_$TIMESTAMP.md"
    
    cat > "$summary_file" << EOF
# 📋 ИТОГОВЫЙ ОТЧЕТ ТЕСТИРОВАНИЯ

**Дата:** $(date '+%Y-%m-%d %H:%M:%S')  
**Режим:** $TEST_MODE  
**Лог файл:** $LOG_FILE  
**Статус:** Завершено

## 🔍 Быстрый обзор

EOF

    # Добавление статистики из лога
    if grep -q "ИТОГОВЫЙ ОТЧЕТ" "$LOG_FILE"; then
        log "INFO" "📋 Извлечение детальной статистики из лога..."
        
        # Извлечение секции итогового отчета
        sed -n '/ИТОГОВЫЙ ОТЧЕТ/,/🏁 Тесты завершены/p' "$LOG_FILE" >> "$summary_file"
    fi
    
    # Добавление рекомендаций
    cat >> "$summary_file" << 'EOF'

## 💡 Рекомендации

1. **Регулярное тестирование**: Запускать тесты еженедельно
2. **Мониторинг в реальном времени**: Следить за алертами в production
3. **Документация**: Обновлять процедуры восстановления
4. **Тренировки**: Проводить учения по восстановлению

## 📞 Контакты

- DevOps Lead: @devops-lead
- SRE: @sre-oncall  
- Database Admin: @dba-team

---
*Отчет сгенерирован автоматически*
EOF

    log "INFO" "📋 Итоговый отчет: $summary_file"
}

# Функция очистки
cleanup() {
    log "STEP" "Очистка временных файлов..."
    
    # Очистка старых логов (старше 7 дней)
    find "$RESULTS_DIR" -name "resilience_test_*.log" -mtime +7 -delete 2>/dev/null || true
    
    log "INFO" "✅ Очистка завершена"
}

# Функция обработки сигналов
signal_handler() {
    log "WARN" "Получен сигнал прерывания, завершение..."
    cleanup
    exit 1
}

# Обработка аргументов
parse_args() {
    case "${1:-auto}" in
        "--mock"|"mock")
            TEST_MODE="mock"
            ;;
        "--full"|"full")
            TEST_MODE="full"
            ;;
        "--auto"|"auto"|"")
            TEST_MODE="auto"
            ;;
        "--help"|"-h")
            echo "Использование: $0 [--mock|--full|--help]"
            echo "  --mock : Запуск в mock режиме (без реальной БД)"
            echo "  --full : Полное тестирование с реальными компонентами"  
            echo "  --help : Показать эту справку"
            exit 0
            ;;
        *)
            log "WARN" "Неизвестный аргумент: $1, используем auto режим"
            TEST_MODE="auto"
            ;;
    esac
}

# Основная функция
main() {
    parse_args "$@"
    trap signal_handler SIGINT SIGTERM
    
    show_header
    check_dependencies
    
    if [[ "$TEST_MODE" != "mock" ]]; then
        check_services
    fi
    
    run_tests
    analyze_results
    generate_summary
    cleanup
    
    echo -e "${GREEN}"
    echo "================================================================================"
    echo "                            🎉 ТЕСТИРОВАНИЕ ЗАВЕРШЕНО!"
    echo "================================================================================"
    echo -e "${NC}"
    log "INFO" "Все результаты сохранены в: $RESULTS_DIR"
    log "INFO" "Лог файл: $LOG_FILE"
}

# Запуск основной функции
main "$@"