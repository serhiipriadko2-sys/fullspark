#!/bin/bash

# ∆DΩΛ CI/CD Validation Test Script
# Тестирование функциональности CI/CD пайплайна

set -e

echo "🔧 CI/CD ∆DΩΛ VALIDATION TEST"
echo "=================================="
echo "Начало тестирования: $(date)"
echo ""

# Функция для валидации JSON файла
validate_json_structure() {
    local file=$1
    echo "📋 Проверка JSON структуры: $file"
    
    if [[ ! -f "$file" ]]; then
        echo "❌ ФАЙЛ НЕ НАЙДЕН: $file"
        return 1
    fi
    
    # Проверка валидности JSON
    if ! python3 -c "import json; json.load(open('$file'))" 2>/dev/null; then
        echo "❌ НЕВАЛИДНЫЙ JSON: $file"
        return 1
    fi
    
    echo "✅ JSON структура валидна"
    return 0
}

# Функция для проверки обязательных полей
check_required_fields() {
    local file=$1
    echo "🔍 Проверка обязательных полей в: $file"
    
    local required_fields=("delta" "dimension" "omega" "lambda" "sift")
    local missing_fields=()
    
    for field in "${required_fields[@]}"; do
        if ! python3 -c "
import json
with open('$file', 'r') as f:
    data = json.load(f)
if '$field' not in data:
    exit(1)
" 2>/dev/null; then
            missing_fields+=("$field")
        fi
    done
    
    if [ ${#missing_fields[@]} -eq 0 ]; then
        echo "✅ Все обязательные поля присутствуют"
        return 0
    else
        echo "❌ Отсутствующие поля: ${missing_fields[*]}"
        return 1
    fi
}

# Функция для проверки статуса валидации
check_validation_status() {
    local file=$1
    echo "🎯 Проверка статуса валидации в: $file"
    
    local status=$(python3 -c "
import json
with open('$file', 'r') as f:
    data = json.load(f)
print(data.get('validation', {}).get('status', 'NOT_FOUND'))
" 2>/dev/null)
    
    echo "📊 Статус валидации: $status"
    
    case $status in
        "OK")
            echo "✅ Статус OK - артефакт прошел валидацию"
            return 0
            ;;
        "WARN")
            echo "⚠️ Статус WARN - артефакт требует внимания"
            return 0
            ;;
        "BLOCK")
            echo "🚫 Статус BLOCK - артефакт заблокирован"
            return 1
            ;;
        "INVALID")
            echo "❌ Статус INVALID - критическая ошибка"
            return 1
            ;;
        *)
            echo "❓ Неизвестный статус: $status"
            return 1
            ;;
    esac
}

# Функция для проверки диапазонов значений
check_value_ranges() {
    local file=$1
    echo "📏 Проверка диапазонов значений в: $file"
    
    python3 -c "
import json
import sys

try:
    with open('$file', 'r') as f:
        data = json.load(f)
    
    errors = []
    
    # Проверка Delta поля
    if 'delta' in data:
        delta = data['delta']
        if 'additions' in delta and 'entropy' in delta['additions']:
            entropy = delta['additions']['entropy']
            if not (0.0 <= entropy <= 1.0):
                errors.append(f\"Delta additions entropy {entropy} вне диапазона [0.0, 1.0]\")
    
    # Проверка Dimension поля  
    if 'dimension' in data:
        dim = data['dimension']
        if 'complexity' in dim:
            complexity = dim['complexity']
            if not (1.0 <= complexity <= 4.0):
                errors.append(f\"Dimension complexity {complexity} вне диапазона [1.0, 4.0]\")
    
    # Проверка Omega поля
    if 'omega' in data:
        omega = data['omega']
        for field in ['completeness', 'coverage_density', 'coherence_level']:
            if field in omega:
                value = omega[field]
                if not (0.0 <= value <= 1.0):
                    errors.append(f\"Omega {field} {value} вне диапазона [0.0, 1.0]\")
    
    # Проверка Lambda поля
    if 'lambda' in data:
        lambda_data = data['lambda']
        if 'status' in lambda_data:
            status = lambda_data['status']
            valid_statuses = ['OK', 'WARN', 'BLOCK', 'INVALID']
            if status not in valid_statuses:
                errors.append(f\"Lambda status '{status}' не является допустимым ({valid_statuses})\")
    
    if errors:
        for error in errors:
            print(f\"❌ {error}\")
        sys.exit(1)
    else:
        print(\"✅ Все значения в допустимых диапазонах\")
        sys.exit(0)
        
except Exception as e:
    print(f\"❌ Ошибка при проверке диапазонов: {e}\")
    sys.exit(1)
"
    
    return $?
}

# Функция для эмуляции GitHub Actions CI/CD pipeline
simulate_cicd_pipeline() {
    local file=$1
    local test_name=$2
    echo "🚀 ЭМУЛЯЦИЯ CI/CD PIPELINE для: $test_name"
    
    echo "📝 Шаг 1: Поиск ∆DΩΛ артефактов..."
    if [[ -f "$file" ]]; then
        echo "✅ Найден артефакт: $file"
        echo "📊 Количество артефактов: 1"
    else
        echo "❌ ∆DΩΛ артефакты не найдены"
        echo "🚫 ПРИМЕНЕНО ПРАВИЛО: No ∆DΩΛ — No Merge"
        echo "❌ PIPELINE ЗАБЛОКИРОВАН"
        return 1
    fi
    
    echo ""
    echo "📋 Шаг 2: Валидация структуры ∆DΩΛ..."
    if validate_json_structure "$file" && \
       check_required_fields "$file" && \
       check_value_ranges "$file"; then
        echo "✅ Структура ∆DΩΛ валидна"
    else
        echo "❌ Структура ∆DΩΛ невалидна"
        echo "❌ PIPELINE ЗАБЛОКИРОВАН"
        return 1
    fi
    
    echo ""
    echo "🎯 Шаг 3: Проверка статуса валидации..."
    local validation_result=0
    if ! check_validation_status "$file"; then
        echo "❌ Статус валидации: FAIL"
        echo "❌ PIPELINE ЗАБЛОКИРОВАН"
        validation_result=1
    else
        echo "✅ Статус валидации: PASS"
        echo "✅ PIPELINE УСПЕШЕН"
    fi
    
    echo ""
    echo "📊 Итог CI/CD тестирования для $test_name:"
    if [ $validation_result -eq 0 ]; then
        echo "✅ УСПЕШНО - Merge разрешен"
    else
        echo "❌ ПРОВАЛ - Merge заблокирован"
    fi
    
    return $validation_result
}

# Основная функция тестирования
run_functional_tests() {
    echo "🧪 ЗАПУСК ФУНКЦИОНАЛЬНЫХ ТЕСТОВ"
    echo "=================================="
    
    local test_results=()
    
    # Тест 1: Валидный артефакт
    echo ""
    echo "🧪 ТЕСТ 1: Валидный ∆DΩΛ артефакт"
    echo "=========================================="
    simulate_cicd_pipeline "/workspace/test_delta_omega_lambda_valid.json" "Валидный артефакт"
    test_results+=($?)
    
    # Тест 2: Невалидный артефакт
    echo ""
    echo "🧪 ТЕСТ 2: Невалидный ∆DΩΛ артефакт (ожидается блокировка)"
    echo "=========================================================="
    simulate_cicd_pipeline "/workspace/test_delta_omega_lambda_invalid.json" "Невалидный артефакт"
    test_results+=($?)
    
    # Тест 3: Предупреждающий артефакт
    echo ""
    echo "🧪 ТЕСТ 3: Предупреждающий ∆DΩΛ артефакт"
    echo "=========================================="
    simulate_cicd_pipeline "/workspace/test_delta_omega_lambda_warn.json" "Предупреждающий артефакт"
    test_results+=($?)
    
    # Тест 4: Отсутствующий артефакт
    echo ""
    echo "🧪 ТЕСТ 4: Отсутствующий ∆DΩΛ артефакт (правило 'No ∆DΩΛ — No Merge')"
    echo "====================================================================="
    simulate_cicd_pipeline "/workspace/nonexistent_delta_omega_lambda.json" "Отсутствующий артефакт"
    test_results+=($?)
    
    # Подведение итогов
    echo ""
    echo "📊 ИТОГОВЫЙ ОТЧЕТ ПО ТЕСТИРОВАНИЮ"
    echo "================================="
    
    local passed=0
    local failed=0
    
    for result in "${test_results[@]}"; do
        if [ $result -eq 0 ]; then
            ((passed++))
        else
            ((failed++))
        fi
    done
    
    echo "✅ Успешных тестов: $passed"
    echo "❌ Провальных тестов: $failed"
    echo "📈 Процент успеха: $(( passed * 100 / (passed + failed) ))%"
    
    if [ $failed -eq 0 ]; then
        echo "🎉 ВСЕ ТЕСТЫ ПРОЙДЕНЫ УСПЕШНО!"
        echo "✅ CI/CD пайплайн функционирует корректно"
        return 0
    else
        echo "⚠️ ОБНАРУЖЕНЫ ПРОБЛЕМЫ В CI/CD пайплайне"
        echo "❌ Требуется дополнительная настройка"
        return 1
    fi
}

# Запуск тестов
echo "🎯 НАЧАЛО ФУНКЦИОНАЛЬНОГО ТЕСТИРОВАНИЯ CI/CD"
echo "Время запуска: $(date)"
echo ""

if run_functional_tests; then
    echo ""
    echo "🏆 ФУНКЦИОНАЛЬНОЕ ТЕСТИРОВАНИЕ ЗАВЕРШЕНО УСПЕШНО"
    exit 0
else
    echo ""
    echo "💥 ФУНКЦИОНАЛЬНОЕ ТЕСТИРОВАНИЕ ЗАВЕРШЕНО С ОШИБКАМИ"
    exit 1
fi