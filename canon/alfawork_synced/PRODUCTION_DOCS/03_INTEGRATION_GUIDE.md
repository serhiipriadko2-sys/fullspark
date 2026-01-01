# 03_INTEGRATION_GUIDE.md — Руководство по интеграции

**Назначение:** Инструкция для разработчиков `iskraspaceappMain` и `iskraSA` по использованию файлов канона в коде.

---

## 1. Принцип "Knowledge-First"

Приложение не должно хардкодить логику поведения ИИ (промпты), если она описана в Каноне. Вместо этого приложение должно загружать соответствующие файлы из `CURRENT_SOT_FLAT19`.

### Пример: Загрузка Манифеста
Вместо:
```typescript
const systemPrompt = "Ты Искра, твой закон честность...";
```
Должно быть (псевдокод):
```typescript
const file01 = await CanonLoader.load("01_CANON_MANTRA_FOUNDATIONS.md");
const systemPrompt = ExtractSection(file01, "Манифест");
```

## 2. Механизм Маршрутизации (Router)

Для реализации RAG (Retrieval Augmented Generation) используйте файл `00_INDEX_AND_ROUTING.md`.

1.  **Шаг 1:** При старте сессии загрузить `00_INDEX_AND_ROUTING.md`.
2.  **Шаг 2:** Извлечь секцию `## P0: Router`.
3.  **Шаг 3:** Использовать эту секцию как System Prompt для "Router-агента", который решает, какой файл загрузить в контекст.

## 3. Маппинг Типов (Code <-> Canon)

Файлы канона определяют терминологию, которая должна совпадать с Enums в коде.

| Canon Term | TypeScript Enum | Файл определения |
| :--- | :--- | :--- |
| **Golos / Facet** | `FacetType` | `src/types/facets.ts` |
| **Maki** | `FacetType.Maki` | *ensure it exists* |
| **Phase** | `PhaseType` | `src/types/phases.ts` |
| **Trust/Pain** | `IskraMetrics` | `src/types/metrics.ts` |

**Правило:** Если вы меняете название метрики в `04_METRICS_INDICES.md`, вы **обязаны** обновить `src/types/metrics.ts`.

## 4. Сборка для продакшена

В продакшене мы не читаем файлы с диска напрямую каждый раз.
Рекомендуемый пайплайн:
1.  **Build Time:** Скрипт `build_corpus.py` (планируется) собирает все MD файлы в единый JSON (`canon_bundle.json`).
2.  **Runtime:** Приложение импортирует этот JSON.

```json
// canon_bundle.json structure proposal
{
  "version": "flat19_v2_4",
  "files": {
    "01_CANON_MANTRA_FOUNDATIONS": {
      "keywords": ["maki", "law-0"],
      "content": "..."
    }
  }
}
```

## 5. Обновление Канона

1.  Внесите правки в Markdown файлы в `CURRENT_SOT_FLAT19`.
2.  Запустите `python3 canon/tools/validate_canon.py`.
3.  Если успешно, закоммитьте изменения.
4.  CI/CD пайплайн должен пересобрать `canon_bundle.json`.
