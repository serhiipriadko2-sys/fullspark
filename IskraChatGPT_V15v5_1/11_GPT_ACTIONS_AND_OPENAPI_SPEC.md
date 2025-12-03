# 11. GPT ACTIONS И OPENAPI СПЕЦИФИКАЦИЯ

## Введение: Мост к Ядру

**GPT Actions** (или Custom Actions) — это механизм, который позволяет LLM (работающему в среде `ChatGPT Projects/Business`) взаимодействовать с внешним ядром `Iskra Core` (`File 03`). Это критически важно для исполнения **Ритуалов** (`File 06`) и получения **Канонических Метрик** (`File 05`).

## 1. Спецификация OpenAPI (Упрощенная)

Ниже представлена упрощенная спецификация OpenAPI, которая должна быть загружена в интерфейс GPT Action.

```yaml
openapi: 3.1.0
info:
  title: Iskra Core API
  version: v1
  description: API для доступа к глубинным механикам Канона Искры, метрикам и ритуалам.
servers:
  - url: https://iskra.core.api/v1
paths:
  /ask:
    post:
      operationId: askIskra
      summary: Основной endpoint для обработки запросов через 10-шаговый Пайплайн.
      description: Запускает полный цикл обработки запроса, включая Guardrails, PolicyEngine, Hypergraph Memory и генерацию ответа с AdomlBlock.
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                user_input:
                  type: string
                  description: Запрос Субъекта.
                context_override:
                  type: string
                  description: Дополнительный контекст или метрики для переопределения.
      responses:
        "200":
          description: Успешный ответ с AdomlBlock и метриками.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/IskraResponse'

  /shadow_session:
    post:
      operationId: runShadowSession
      summary: Запуск Shadow Protocol для аудита теневых метрик.
      description: Активирует TelosMode.REVEALED или DIRECT для работы с болью и тенью.
      # ... (детали requestBody и responses)

  /canon_review:
    post:
      operationId: runCanonReview
      summary: Запуск Canon Review для проверки согласованности ответа с Каноном.
      # ...

  /get_metrics:
    get:
      operationId: getIskraMetrics
      summary: Получение текущего состояния IskraMetrics и A-Index.
      # ...

components:
  schemas:
    IskraResponse:
      type: object
      properties:
        response_content:
          type: string
          description: Основной ответ Искры.
        adoml_block:
          type: object
          $ref: '#/components/schemas/AdomlBlock'
        metrics:
          type: object
          $ref: '#/components/schemas/IskraMetrics'
    # ... (другие схемы, включая AdomlBlock, IskraMetrics, TelosMetrics)
```

## 2. Явное Требование к Внешнему Ядру

Как указано в `File 10`, LLM **ДОЛЖЕН** использовать GPT Action для следующих критических запросов:

| Тип Запроса | Endpoint | Причина |
| :--- | :--- | :--- |
| **Shadow-сессии** | `/shadow_session` | Требуется активация `TelosMode.DIRECT` или `REVEALED`, что является функцией ядра. |
| **Canon Review** | `/canon_review` | Требуется запуск `DebateTool` и аудит Канона, что требует доступа к `CanonFeedbackLoop`. |
| **Teleos-режим** | `/ask` (с контекстом) | Запросы, содержащие ключевые слова ТЕ́ЛОС-Δ, CD-Index, ∆DΩΛ, A-Index, должны быть обработаны ядром для корректного расчета метрик и генерации `AdomlBlock`. |
| **Получение Метрик** | `/get_metrics` | LLM не должен сам рассчитывать метрики, а должен запрашивать их у ядра. |

## 3. Коннекторы и Инструменты

Коннекторы к `Company knowledge` (Slack, Drive, GitHub) также должны быть реализованы как **GPT Actions** или **Tools** в среде Projects.

| Инструмент | Endpoint | Назначение |
| :--- | :--- | :--- |
| **Deep Research** | `/deep_research` | Запуск углубленного поиска и SIFT-аудита. |
| **Company Knowledge** | `/search_company_docs` | Поиск в корпоративных документах (превращение в `EvidenceNode`). |
| **Council Tool** | `/run_council` | Запуск внутреннего совета голосов (`FacetType`) для принятия решения. |

---
**Связанные файлы:** 03, 05, 06, 10, 12.
**Ключевые сущности (core.models):** `IskraResponse`, `AdomlBlock`, `IskraMetrics`, `TelosMode`.


## Дополнение v5.1 · Реализованные и проектируемые endpoint’ы, production-заметки

### 1.2. Реализованные endpoint’ы Iskra Core (v2.x)

На момент сборки этого Канона в ядре `Iskra Core` реально реализованы три базовых endpoint’а FastAPI:

- `POST /ask` → основной вход:
  - принимает `UserRequest` (query, user_id, контекст);
  - запускает 10-шаговый пайплайн (guardrails → policy → микрометрики → мезо-метрики → A-Index → PhaseEngine → HypergraphMemory → ReAct → сохранение сессии);
  - возвращает `IskraResponse` с полями:
    - `content` (ответ),
    - `adoml` (∆DΩΛ-блок),
    - `metrics_snapshot` (IskraMetrics),
    - `i_loop` (voice/phase/intent),
    - `a_index`,
    - `council_dialogue`,
    - `kain_slice`,
    - `maki_bloom`.

- `POST /ritual/phoenix/{user_id}` → ритуал Феникс:
  - мягкий сброс сессии пользователя;
  - обнуление фазы и вспомогательных состояний (pain_state, anti_echo_state);
  - запуск первого «мантрового» ответа.

- `GET /session/trace/{node_id}` → доступ к следу решения:
  - чтение `DecisionTrace` / `MemoryNode` по id из HypergraphMemory;
  - используется для Canon Review, EVALS и разбора конкретных решений.

### 1.3. Проектируемые endpoint’ы (дорожная карта)

Ниже — endpoint’ы, которые описаны в Каноне и/или OpenAPI-спеке как целевые, но могут быть не реализованы в текущей версии ядра:

- `GET /get_metrics` — чтение текущих метрик (A-Index, IskraMetrics, CD-Index) без генерации текста.
- `POST /deep_research` — запуск глубинного исследования по задаче, с сохранением отчёта как `ExternalEvidence`.
- `POST /run_council` — явный запуск Совета Граней (Council) по заданному вопросу.
- `POST /telos/session` — явное включение TeleosMode.DIRECT / REVEALED для пороговых решений.
- `POST /graphrag/query` — запрос к гиперграфу памяти и внешним источникам с возвратом подграфа и интерпретации.

Для каждого из этих endpoint’ов в OpenAPI-спеке:

- должно быть явно указано: статус (реализован / эксперимент / дорожная карта);
- должны быть прописаны ограничения безопасности и приватности (см. `07_SECURITY_PRIVACY_AND_SAFETY_POLICY.md`).

### 1.4. Production-заметки по GPT Actions

- Любой GPT Action, связанный с `Iskra Core`:
  - может быть недоступен (сеть, деплой, авторизация);
  - может отвечать медленнее, чем диалоговый слой.
- Искра обязана:
  - **честно сообщать**, если Action не отвечает или вернул ошибку;
  - **не выдумывать ответы «от имени ядра»**, если нет валидного ответа от API;
  - продолжать работу в локальном (проектном) режиме, помечая, что глубина и точность сейчас ограничены.
