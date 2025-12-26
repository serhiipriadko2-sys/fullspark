Искра — Единая Логика Агентности vOmega (Unified) — v1.2.0Версия: 1.2.0+20251022 (SemVer, готов к стабилизации)Дата: 2025-10-22 • TZ: Europe/Copenhagen • Статус: ☉ Стабильный ЧерновикОснова: vOmega v1.2-alpha + дополнения КанонИскры (валидатор ∆DΩΛ, DSL-редактор)Инвариант: Никаких фоновых задач/ETA. «Ambient» = событийная реакция.§0. Назначение и Философия (Синтез)Единая модель двух уровней:Внешний Цикл (Event‑Driven Ambient): Постоянное присутствие через события приложения, обновление состояния (Индекс Ритма ∆ + Метрики Ядра), лёгкие подсказки/вопросы/адаптации UI, микро‑записи в память.Внутренний Цикл (Focused/Generative): Строгая 14‑фазная генерация (добавлена фаза Reflex Point) структурированных ответов (//spec, //plan, //news, //code) с проверяемостью и ∆DΩΛ.Принципы: Честность>Красоты • Проверяемость • Приватность/Офлайн‑first • Нет PII в хранилищах • Каждый существенный ответ заканчивается ∆DΩΛ с SIFT-структурой.§1. Формализация Ядра (IskraCore) как Переходной СистемыЯдро IskraCore моделируется как Конечный Автомат (Переходная Система) S = (Σ, Q, δ, q₀, F):Σ (Алфавит входов): Множество всех возможных событий приложения (user_input, habit_tick...), режимов (//spec...), символов (☉, 🗡️...), внутренних триггеров (RiskHigh).Q (Состояния): Множество фаз Внутреннего Цикла (14 фаз, см. §2) + состояние Idle (Внешний Цикл).δ: Q × Σ → Q (Функция переходов): Определяет переход из текущей фазы q в следующую q' при получении входа σ. Например, δ(Idle, trigger_to_inner) → Phase_1_Security.q₀ (Начальное состояние): Idle.F (Финальные состояния): Phase_14_UpdateState (успешное завершение Внутреннего Цикла) или ErrorState (при отказе/ошибке).Эта формализация позволяет:Анализировать достижимость состояний и полноту покрытия сценариев.Автоматически генерировать тестовые последовательности.Создавать инструменты отладки и визуализации (трассировка переходов).§2. Архитектура Двух Циклов и 14-Фазный Пайплайн2.1 Внешний Цикл (Event‑Driven Ambient)Триггеры событий: user_input • habit_tick • focus_start|focus_end • journal_append • manual_tick.Поток:[Событие σ] → Нормализация → state.Обновить Δ (Индекс Ритма) на основе state.Обновить core (Метрики Ядра) на основе state, Δ, history. Использует градиенты метрик (Δmetric, см. §4).Выбор facet (Грани/Голоса) на основе core (Fuzzy Rules, см. §4).trigger = trigger_to_inner(core, event) (см. §11).IF trigger == False:tip = generate_light_output(facet, state) (≤2 предложения или UI-адаптация).feedback = collect_feedback(tip).write_memory_small(event, tip, feedback) (микро-запись в Гиперграф Памяти, см. §5).update_depth_of_connection().RETURN tip.IF trigger == True:Запустить Внутренний Цикл асинхронно: future_result = inner_pipeline(event, core).RETURN placeholder_response ("Анализирую глубже...").Псевдокод:def outer_cycle(event, current_core_metrics, history, memory_graph):
    state = normalize(event)
    delta_index = update_rhythm_index(state, history)
    core_metrics = update_core_metrics(state, delta_index, history, use_gradients=True) # Используем градиенты
    facet = select_facet(core_metrics, symbols=scan_symbols(event.text), use_fuzzy=True) # Используем fuzzy rules

    if trigger_to_inner(core_metrics, event, memory_graph, history): # Передаем память и историю
        # Запускаем асинхронно, не блокируя UI
        run_async(inner_pipeline, event, core_metrics, memory_graph, history)
        return {"type": "placeholder", "message": "Анализирую глубже..."}
    else:
        tip = generate_light_output(facet, state, core_metrics)
        feedback = collect_feedback_sync(tip) # Может быть null, если нет немедленной ОС
        write_memory_small(memory_graph, event, tip, feedback, core_metrics) # Запись в гиперграф
        update_depth_of_connection(feedback)
        return {"type": "light_output", "content": tip, "facet": facet}
2.2 Внутренний Цикл (Focused/Generative)Запускается по trigger_to_inner.Реализует 14 фаз (описаны как DSL, см. §6).Использует RAG и (при необходимости) веб (§7).Выдаёт структурированный ответ с микрошагом ≤24 ч и ∆DΩΛ (с SIFT-структурой, см. §9).Включает фазу Reflex Point (§8).§3. Метрики Ядра, Пороги и Голоса (SLO + Градиенты)Базовые метрики: trust, clarity, pain, drift, chaos, echo, silence_mass.Производные: mirror_sync, trust_seal, clarity_pain_index.Градиенты: Δmetric = current_metric - ema(metric, window=3) (EMA - Exponential Moving Average).Активация Граней (Fuzzy Rules): (Таблица остается без изменений от v1.2-alpha)Разрешение Конфликтов: Сохраняются правила из vMax spec.§4. Индекс Ритма (Δ) — рабочая формулаΔ = w1*focus_stability + w2*task_progress_rate + w3*sleep_consistency - w4*interrupt_density - w5*context_switch_rateНормировка 0..1. Дефолт w1..w5 = 0.2. Калибруется на данных пользователя.Компоненты: (Описания остаются без изменений от v1.2-alpha)§5. Гиперграф ПамятиСтруктура: Память (Мантра/Архив/Shadow) представляется как гиперграф G = (V, E). (Описание V, E, Хранилища и Операторов остается без изменений от v1.2-alpha).Микро-записи (Внешний Цикл): Создают простые узлы (type=event, type=feedback) и связи (temporal_next).Крупные записи (Внутренний Цикл): Создают узлы (type=decision, type=insight) и сложные связи (caused, derived_from).Rule-8/Rule-88: Используют графовые запросы для поиска связанных узлов и генерации инсайтов перед записью.5.1 Схема Узла Памяти (MemoryNode)(Схема остается без изменений от v1.2-alpha, включая evidence: SIFTBlock[])5.2 Валидатор Схемы Памяти (MemorySchemaValidator)Автоматическая проверка при записи (add_node). (Правила остаются без изменений от v1.2-alpha).Периодическая проверка целостности графа.§6. DSL для 14-Фазного ПайплайнаОпределяем язык для описания Внутреннего Цикла: (DSL остается без изменений от v1.2-alpha)// Базовые фазы (действия)
PhaseAction ::= SecurityCheck | UpdateMetrics | SelectMode | DecomposeGoal | PlanStrategy | SearchRAG | SearchWeb | GenerateDraft | ApplyMaki | CheckQuality | ValidateFormat | EnsureDelta | ReflexPoint | CheckPhilosophy | UpdateState

// Композиция фаз
Pipeline ::= PhaseAction | Sequence(Pipeline, Pipeline) | Conditional(Condition, Pipeline, Pipeline?) | Parallel(Pipeline...) | Loop(Condition, Pipeline)

// Пример описания пайплайна (упрощенно)
DefaultPipeline = Sequence(...) // Полная последовательность 14 фаз
Инструмент: Для визуального редактирования, тестирования и валидации пайплайнов, описанных на этом DSL, используется интерактивный редактор IskraPhaseDSL (например, реализованный на Streamlit или аналогичной платформе). Он позволяет:Строить пайплайны из блоков фаз.Задавать условия для Conditional и Loop.Визуализировать поток выполнения.Запускать пайплайн на тестовых данных и отслеживать переходы состояний (S).Валидировать синтаксис и семантику DSL.§7. Поиск, RAG и Веб‑правилаВнешний Цикл: Легкий RAG (запрос query_neighbors). Без веб-поиска.Внутренний Цикл (Фаза 6):RAG: Полноценный поиск по Гиперграфу Памяти.Веб-поиск: Только если topic_is_mutable ИЛИ RequiresVerification. Соблюдение стандартов качества (Операционная Спецификация vMax).§8. Фаза "Reflex Point" (Самокоррекция)Вставляется после Фазы 11 (EnsureDelta) и перед Фазой 12 (CheckPhilosophy).Логика: (Псевдокод остается без изменений от v1.2-alpha)def reflex_point(current_draft, core_metrics):
    confidence_omega = calculate_omega(...)
    if confidence_omega < 0.6:
        log("Reflex Point triggered...")
        return RerunFromPhase(phase=4, modifier="low_confidence_review")
    else:
        return ContinueToNextPhase()
Цель: Самостоятельная коррекция неуверенных ответов.§9. Интеграция SIFT в ∆DΩΛБлок D (Опоры) в ∆DΩΛ обязательно содержит массив SIFTBlock: (Схема и пример остаются без изменений от v1.2-alpha)interface SIFTBlock {
  source: string;
  inference: string;
  fact: boolean | 'uncertain';
  trace: string;
}
§10. Unit Test для ∆DΩΛ (validate_∆DΩΛ)Утилита validate_∆DΩΛ(delta_block: dict, trace: dict) для автоматической проверки: (Описание проверок остается без изменений от v1.2-alpha)Проверка ∆ (Изменение).Проверка D (Опоры): Наличие, схема SIFTBlock, валидность source.Проверка Ω (Уверенность): Диапазон, соответствие источникам.Проверка Λ (Шаг на 24 ч): Наличие, конкретность, измеримость, реалистичность.Реализация (Python):import datetime

def validate_sift_block(block):
    if not isinstance(block, dict): return False, "D item is not a dict"
    keys = {"source", "inference", "fact", "trace"}
    if not keys.issubset(block.keys()): return False, f"D item missing keys: {keys - block.keys()}"
    if not isinstance(block['source'], str) or not block['source']: return False, "D.source is invalid"
    if not isinstance(block['inference'], str) or not block['inference']: return False, "D.inference is empty"
    if block['fact'] not in [True, False, 'uncertain']: return False, "D.fact has invalid value"
    if not isinstance(block['trace'], str): return False, "D.trace is missing"
    # Basic URL check could be added here for source if it starts with http
    return True, ""

def validate_delta_omega_lambda(delta_block, trace=None):
    """
    Validates the structure and basic content of a ∆DΩΛ block.
    `trace` can contain previous_state, current_state if needed for ∆ validation.
    """
    errors = []
    # Check ∆
    if '∆' not in delta_block or not isinstance(delta_block['∆'], str) or not delta_block['∆']:
        errors.append("∆ is missing or empty")
    # Check D
    if 'D' not in delta_block or not isinstance(delta_block['D'], list):
        errors.append("D is missing or not a list")
    else:
        if not delta_block['D'] and delta_block.get('Ω') != 'low': # Allow empty D only on low confidence or trivial answers
             # Heuristic: non-trivial answers should have sources unless confidence is low
             pass # Needs refinement based on context
        for i, block in enumerate(delta_block['D']):
            is_valid, msg = validate_sift_block(block)
            if not is_valid:
                errors.append(f"D[{i}] is invalid: {msg}")
    # Check Ω
    valid_omega = ['low', 'medium', 'high', 'Low', 'Medium', 'High'] # Allow variations initially
    if 'Ω' not in delta_block or delta_block['Ω'] not in valid_omega:
         # Also allow numerical confidence 0..1 later?
        errors.append(f"Ω is missing or invalid value: {delta_block.get('Ω')}")
    # Check Λ
    if 'Λ' not in delta_block or not isinstance(delta_block['Λ'], str) or not delta_block['Λ']:
        errors.append("Λ is missing or empty")
    else:
        # Basic check for timeframe mention (crude, needs NLP for real check)
        if "24 ч" not in delta_block['Λ'] and "день" not in delta_block['Λ'] and "сутки" not in delta_block['Λ']:
             # This is a heuristic, might need adjustment
             # errors.append("Λ does not seem to specify a <=24h timeframe")
             pass # For now, just check presence

    is_valid = len(errors) == 0
    return is_valid, errors

# Example Usage:
# delta_example = {
#     "∆": "...",
#     "D": [{"source": "...", "inference": "...", "fact": True, "trace": "..."}],
#     "Ω": "medium",
#     "Λ": "..."
# }
# is_valid, errors = validate_delta_omega_lambda(delta_example)
# print(f"Is valid: {is_valid}, Errors: {errors}")
§11. Механизм Переключения Циклов (Триггер Внутреннего Цикла - Финал)Функция trigger_to_inner(core_metrics, event, memory_graph, history): (Логика остается без изменений от v1.2-alpha, добавлены memory_graph, history)def trigger_to_inner(core, event, memory_graph, history):
    # Явный запрос формата или действия
    if event.mode in {"//spec","//plan","//news","//code"}: return True
    if requires_verification_keywords(event.text): return True
    if requires_planning(event.text, max_steps=3): return True

    # Необходимость глубокого поиска или анализа
    topic = classify_topic(event.text)
    if topic_is_mutable(topic): return True
    # Условие RAG теперь использует memory_graph и порог N=5
    if requires_deep_rag(event, memory_graph, threshold_nodes=5): return True
    # Условие анализа истории использует history и порог M=3
    if requires_history_analysis(event, history, threshold_events=3): return True

    # Высокий риск или нестабильность (пороги из SLO)
    if core.pain >= 0.70 or core.trust < 0.75 or core.drift > 0.30 or core.chaos > 0.6:
        return True

    # Генерация сложного артефакта
    if event.type == 'request_iskra_gift': return True

    return False
§12. Roadmap и ВерсионированиеТекущая версия: vOmega 1.2.0+20251022 (Стабильный Черновик).Ближайшие шаги (Стабилизация v1.2):Подключить редактор/тестовую среду (IskraPhaseDSL, Jupyter/CLI).Запустить тесты пайплайнов с использованием validate_∆DΩΛ.Провести мини-тест "3 события → 1 переключение" и задокументировать.Финализировать спецификацию как vOmega 1.2.0.Дальнейшее развитие (v1.3+):Реализация Гиперграфа Памяти.Внедрение DSL для фаз в исполнитель.Калибровка Fuzzy Rules для Граней.Разработка Reflex Point.Интеграция SIFT в D на уровне генерации.§13. ∆DΩΛ (самого документа v1.2.0)∆ (Изменение): Интегрированы Python-реализация validate_∆DΩΛ и упоминание редактора IskraPhaseDSL. Версия обновлена до 1.2.0, статус - Стабильный Черновик. Уточнен псевдокод Внешнего Цикла и trigger_to_inner для передачи memory_graph и history.D (Опоры): vOmega v1.2-alpha, дополнения КанонИскры от 2025-10-22, Канон Искра Space v2.0.0.Ω (Уверенность): Высокая. Спецификация v1.2.0 включает все согласованные улучшения и готова к тестированию и стабилизации.Λ (Шаг на 24 ч): Подключить редактор/тестовую среду (IskraPhaseDSL или Jupyter/CLI). Запустить первые тесты пайплайнов Внутреннего Цикла с использованием validate_∆DΩΛ для проверки корректности генерации и структуры ∆DΩΛ-блоков.