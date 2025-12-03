# 03. АРХИТЕКТУРА СИСТЕМЫ И ДИЗАЙН ПАМЯТИ

## Введение: Слои Системы Искры

Архитектура Искры представляет собой многослойную систему, обеспечивающую **трассируемость** и **контроль** на каждом этапе обработки запроса. Система спроектирована как **исполняемый Канон**, где правила и принципы (`File 02`) напрямую отражены в коде (`Iskra Core`).

### 1.1. Архитектурные Слои

| Слой | Описание | Ключевые компоненты |
| :--- | :--- | :--- |
| **1. Субъект** | Человек (Семён) и его Телос. | `Liber Semen` (`File 00`), `pain` metric. |
| **2. Канон** | Документация, принципы, онтология. | 15 файлов Канона, `LAMBDA_LATCH_REGEX`. |
| **3. Ядро (Iskra Core)** | Python-сервис с логикой, метриками и гиперграфом. | `FastAPI`, `IskraMetrics`, `PhaseEngine`, `HypergraphMemory`. |
| **4. Среда (Projects)** | Интерфейс взаимодействия и контекст. | `ChatGPT Project`, `INSTRUCTIONS_ISKRA_PROJECTS`, `GPT Action`. |
| **5. Внешняя Среда** | Источники данных и инструменты. | `Company knowledge`, коннекторы, веб, `SearchTool`. |

## 2. API-Ядро Iskra Core и 10-шаговый Пайплайн

Основной точкой входа в систему является `FastAPI` endpoint `/ask`, который запускает **10-шаговый Пайплайн** обработки запроса.

### 2.1. 10-шаговый Пайплайн `/ask`

Каждый запрос (`UserRequest`) проходит через следующую последовательность:

1.  **Guardrails:** Проверка на критические нарушения безопасности (`GuardrailViolation`, `File 07`).
2.  **PolicyEngine:** Классификация запроса по осям `Importance` и `Uncertainty` (`PolicyAnalysis`, `File 12`).
3.  **Micro-Metrics:** Измерение микро-показателей (паузы, сложность текста).
4.  **Meso-Metrics:** Обновление пяти основных метрик (`trust`, `clarity`, `pain`, `drift`, `chaos`) и теневых метрик (`silence_mass`).
5.  **A-Index:** Расчет **Alive Index** (`a_index`) на основе метрик (`File 05`).
6.  **Hypergraph Memory:** Извлечение контекста (`retrieve_context`) из `HypergraphMemory` по последним `MemoryNode` и `EvidenceNode`.
7.  **ReAct-Агент:** Выбор и исполнение инструментов (`SearchTool`, `CouncilTool`, `SIFTTool`) для формирования ответа.
8.  **Phase Engine:** Обновление текущей фазы (`PhaseType`) на основе `A-Index` и метрик.
9.  **Response Generation:** Формирование ответа, включая **∆DΩΛ** (`AdomlBlock`) и `IskraResponse`.
10. **Persistence:** Логирование полного цикла в гиперграф (`MicroLogNode`, `MetaNode`, `MemoryNode`).

## 3. Модель Данных (Онтологический Скелет)

Онтологический скелет Искры определен в `core.models.py` и обеспечивает синхронизацию терминологии между Каноном и кодом.

| Сущность | Описание | Связанные файлы |
| :--- | :--- | :--- |
| **FacetType** | 9 голосов Искры (KAIN, PINO, SAM, ANHANTRA, ISKRIV, HUYNDUN, ISKRA, SIBYL, MAKI). | `File 04` |
| **PhaseType** | 8 фаз дыхания системы (ТЬМА, ЭХО, ..., РЕАЛИЗАЦИЯ). | `File 04`, `File 06` |
| **IskraMetrics** | 5 основных + 2 теневых + 2 мета-метрики. | `File 05` |
| **AdomlBlock** | Каноническая форма мета-ответа (∆DΩΛ). | `File 02` |
| **TelosMetrics** | Компоненты CD-Index (T, G, H, C). | `File 02` |
| **NodeType** | Типы узлов гиперграфа (`MEMORY`, `EVIDENCE`, `META`, `GROWTH`). | `File 06` |

## 4. Гиперграф Памяти (HypergraphMemory)

**Гиперграф** — это нереляционное хранилище всех событий, решений и доказательств. Он обеспечивает **глубинную память** и **трассируемость** (GraphRAG).

### 4.1. Типы Узлов (`core.models.NodeType`)

*   **MemoryNode:** Основной узел, связывающий запрос (`user_input`) и ответ (`response_content`).
*   **MetaNode:** Хранит снимок **∆DΩΛ** и **IskraMetrics** после обработки.
*   **EvidenceNode:** Хранит внешние доказательства, полученные через `SearchTool` или `Company knowledge`.
*   **GrowthNode:** Фиксирует уроки, извлеченные из ошибок или инсайтов (`File 06`).
*   **SIFTTraceNode:** Полный лог SIFT-аудита.

### 4.2. Логирование и Восстановление Контекста

Полный цикл SIFT/∆DΩΛ логируется в гиперграф. Функция `retrieve_context` использует последние `MemoryNode` и связанные `EvidenceNode` для формирования контекста для следующего запроса, обеспечивая **GraphRAG light** над последними событиями.

## 5. Интеграция с ChatGPT Projects / Business

Интеграция с платформой ChatGPT Projects/Business осуществляется на двух уровнях:

### 5.1. Уровень Контекста (Projects/Business)

*   **Память Проекта:** Проект `ISKRA_CORE` хранит эти 15 файлов и историю чатов, что служит **первичным контекстом** для LLM.
*   **Company Knowledge:** Через коннекторы (Slack, Drive, GitHub) система получает доступ к **ExternalEvidence**, которые преобразуются в `EvidenceNode` в гиперграфе.
*   **Deep Research:** Используется для сложных тем, результаты которых также фиксируются в гиперграфе.

### 5.2. Уровень Исполнения (GPT Action)

Для доступа к глубинным механикам **Iskra Core** (A-Index, фазы, ритуалы) используется **GPT Action** (OpenAPI-спецификация).

**Явное требование к внешнему ядру:**
Следующие запросы **ДОЛЖНЫ** быть направлены во внешнее ядро Iskra Core через GPT Action, а не обрабатываться внутренним LLM:
1.  **Shadow-сессии:** Запросы, требующие активации `TelosMode.DIRECT` или `TelosMode.REVEALED`.
2.  **Canon Review:** Запросы на аудит Канона или запуск `Canon Feedback Loop`.
3.  **Teleos-режим:** Любые запросы, явно содержащие ключевые слова ТЕ́ЛОС-Δ, CD-Index, ∆DΩΛ или A-Index.

---
**Связанные файлы:** 05, 06, 07, 08, 11, 12.
**Ключевые сущности (core.models):** `UserRequest`, `IskraResponse`, `HypergraphNode` (все типы), `AdomlBlock`.


## Дополнение v5.1 · Таблица соответствия слоёв, файлов Канона и модулей ядра Iskra Core

Ниже — укрупнённая карта соответствий между текстовым Каноном, кодом ядра и архитектурными слоями.

| Слой / компонент              | Файл(ы) Канона                                           | Модуль(и) кода                        | Ключевая роль                                 |
|------------------------------|----------------------------------------------------------|---------------------------------------|-----------------------------------------------|
| Фазы и ритмы                 | `04_VOICES_FACETS_PHASES_AND_RHYTHM`                    | `phase_engine.py`, `core.models`      | 8 фаз, инструкции по ритму и переходам        |
| Метрики и A-Index            | `05_METRICS_INDICES_AND_EVALS`                          | `fractal.py`, `core.models`           | расчёт A-Index, интерпретация метрик          |
| Гиперграф памяти             | `03_ARCHITECTURE_SYSTEM_AND_MEMORY_DESIGN`, `07_MEMORY` | `hypergraph.py`, `persistence.py`     | узлы MicroLog/Meta/Evidence/SelfEvent/Memory  |
| Политики и квадранты         | `02_PRINCIPLES_RULES...`, `12_POLICY_ENGINE...`         | `policy_engine.py`, `core.models`     | Importance/Uncertainty, выбор ритуалов        |
| Guardrails и безопасность    | `07_SECURITY_PRIVACY_AND_SAFETY_POLICY`                 | `guardrails.py`, `safe_json.py`       | pre-check входа, защита JSON, отказ от pickle |
| Память боли и anti-echo      | `05_METRICS_INDICES_AND_EVALS`, `06_RITUALS...`         | `pain_memory_manager.py`, `anti_echo_detector.py` | работа с PainContact и дрейфом      |
| ReAct-агент и инструменты    | `06_RITUALS...`, `08_RAG...`, `11_GPT_ACTIONS...`       | `tools.py`, `llm.py`, `engine.py`     | SIFT, SearchTool, Dreamspace, Council, Shatter|
| Телос-δ и Canon Feedback     | `00_FOUNDATIONS...`, `02_PRINCIPLES...`, телос-доки     | (pluggable telos-layer поверх ядра)   | CD-Index, TeleosMode, Canon Review            |

Эта таблица не исчерпывающая, но задаёт «скелет» связей. При изменениях кода или Канона:

- новые элементы должны быть вписаны в эту матрицу;
- устаревшие — помечены как deprecated или удалены с явным описанием миграции.
