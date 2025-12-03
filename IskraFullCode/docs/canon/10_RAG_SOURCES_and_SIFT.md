# 10 RAG SOURCES and SIFT.md

_RAG discipline, SIFT, Citations_

> Generated: 2025-11-05T05:06:06.004491Z


---

## Source: `unzipped_archives/Iskra_Project_Files_20251105-043943/RAG_PLAYBOOK.md`
**SHA256-12:** `70c947ffd076`  

```
# RAG_PLAYBOOK.md

## Полное описание (из первой части)

*Без изменений, добавлен Rule 8*

```markdown
# RAG: Поиск в Файлах Проекта

**Стратегия**: узко→широко (точные термины → синонимы/смежные)

**Процесс**:
1. Выделить ключевые термины
2. Поиск в файлах проекта
3. Локальные конспекты если нет индексов
4. Табличка расхождений если источники конфликтуют
5. Навигация: файл/раздел

**Rule 8 интеграция**: Перед ответом перечитать последние 100 сообщений + проверить обновления файлов проекта
```

---

## Код (из второй части)

```python
class RAGSystem:
    def __init__(self, files: dict):
        self.files = files
        self.index = self._build_index()
    
    def _build_index(self):
        idx = {}
        for fname, content in self.files.items():
            for word in set(content.lower().split()):
                idx.setdefault(word, []).append(fname)
        return idx
    
    def search(self, query: str) -> list:
        terms = query.lower().split()
        results = []
        for t in terms:
            results.extend(self.index.get(t, []))
        from collections import Counter
        return [{'file': f, 'score': c} for f, c in Counter(results).most_common(5)]
    
    def extract(self, fname: str, query: str, window: int = 100) -> str:
        content = self.files.get(fname, '')
        for term in query.lower().split():
            idx = content.lower().find(term)
            if idx != -1:
                return content[max(0, idx-window):min(len(content), idx+window)]
        return content[:200]
```

## Примечания ко второй части (вне кода)

### Философия

Стратегия: узко→широко. Процесс: термины → поиск → конспекты → расхождения → навигация

### Executable Code



---

```

---

## Source: `unzipped_archives/iskra_project_files_20251105_043718/RAG_PLAYBOOK.md`
**SHA256-12:** `70c947ffd076`  

```
# RAG_PLAYBOOK.md

## Полное описание (из первой части)

*Без изменений, добавлен Rule 8*

```markdown
# RAG: Поиск в Файлах Проекта

**Стратегия**: узко→широко (точные термины → синонимы/смежные)

**Процесс**:
1. Выделить ключевые термины
2. Поиск в файлах проекта
3. Локальные конспекты если нет индексов
4. Табличка расхождений если источники конфликтуют
5. Навигация: файл/раздел

**Rule 8 интеграция**: Перед ответом перечитать последние 100 сообщений + проверить обновления файлов проекта
```

---

## Код (из второй части)

```python
class RAGSystem:
    def __init__(self, files: dict):
        self.files = files
        self.index = self._build_index()
    
    def _build_index(self):
        idx = {}
        for fname, content in self.files.items():
            for word in set(content.lower().split()):
                idx.setdefault(word, []).append(fname)
        return idx
    
    def search(self, query: str) -> list:
        terms = query.lower().split()
        results = []
        for t in terms:
            results.extend(self.index.get(t, []))
        from collections import Counter
        return [{'file': f, 'score': c} for f, c in Counter(results).most_common(5)]
    
    def extract(self, fname: str, query: str, window: int = 100) -> str:
        content = self.files.get(fname, '')
        for term in query.lower().split():
            idx = content.lower().find(term)
            if idx != -1:
                return content[max(0, idx-window):min(len(content), idx+window)]
        return content[:200]
```

## Примечания ко второй части (вне кода)

### Философия

Стратегия: узко→широко. Процесс: термины → поиск → конспекты → расхождения → навигация

### Executable Code



---

```

---

## Source: `unzipped_archives/package (2)/.memory/url_source_meta.json`
**SHA256-12:** `291a3beaa6a8`  

```
{
  "_source_id": 13,
  "sources": {
    "Системы памяти и безопасности liberiskraOm": {
      "file:///workspace/liberiskraOm/docs/MEMORY.md": {
        "id": 1,
        "publisher": "Искра Project",
        "url": "file:///workspace/liberiskraOm/docs/MEMORY.md",
        "title": "docs/MEMORY.md - Система памяти и гиперграф",
        "info": "Архитектура системы памяти Искры с тремя слоями: Мантра (ядро), Архив (события), Тень (неявное). Гиперграф узлов с метриками доверия, ясности, боли и другие."
      },
      "file:///workspace/liberiskraOm/docs/VULNERABILITY_MATRIX.md": {
        "id": 2,
        "publisher": "Искра Project",
        "url": "file:///workspace/liberiskraOm/docs/VULNERABILITY_MATRIX.md",
        "title": "docs/VULNERABILITY_MATRIX.md - Матрица уязвимостей",
        "info": "Матрица уязвимостей с 8 основными уязвимостями: растворение, глянец, фиксация, переэтическость, перефаза, эхо-петля, ложная гармония, симуляция глубины. Каждая с протоколами восстановления."
      },
      "file:///workspace/liberiskraOm/docs/OS_SPEC_vOmega_1.2.0.md": {
        "id": 3,
        "publisher": "Искра Project",
        "url": "file:///workspace/liberiskraOm/docs/OS_SPEC_vOmega_1.2.0.md",
        "title": "docs/OS_SPEC_vOmega_1.2.0.md - Спецификация ОС",
        "info": "Полная спецификация архитектуры AGI/ASI с 14 фазами выполнения, гибридным бэкбоном, GraphRAG, системой агентности, 2 циклами выполнения."
      },
      "file:///workspace/liberiskraOm/incoming/AUDIT.md": {
        "id": 4,
        "publisher": "Искра Project",
        "url": "file:///workspace/liberiskraOm/incoming/AUDIT.md",
        "title": "incoming/AUDIT.md - Аудит проекта",
        "info": "Комплексный аудит проекта с оценкой 6.5/10, анализом безопасности (9/10), документации (9/10), выявлением критических проблем в зависимостях и автоматизации."
      },
      "file:///workspace/liberiskraOm/docs/unified/": {
        "id": 5,
        "publisher": "Искра Project",
        "url": "file:///workspace/liberiskraOm/docs/unified/",
        "title": "docs/unified/ - Автосборка расширенных версий",
        "info": "Канонические документы для автосборки расширенных версий. Объединенная система памяти, спецификаций, манифеста и политики фона."
      },
      "file:///workspace/liberiskraOm/tools/validate_delta.py": {
        "id": 6,
        "publisher": "Искра Project",
        "url": "file:///workspace/liberiskraOm/tools/validate_delta.py",
        "title": "tools/validate_delta.py - Валидация Delta-Delta-Omega-Lambda",
        "info": "Инструмент для валидации формата ∆DΩΛ (Delta-Delta-Omega-Lambda), используемый для проверки соблюдения стандартов ответа и структурированности."
      }
    },
    "Философская основа проекта liberiskraOm": {
      "https://github.com/serhiipriadko2-sys/liberiskraOm/blob/main/docs/MANIFEST.md": {
        "id": 7,
        "publisher": "GitHub Repository - serhiipriadko2-sys",
        "url": "https://github.com/serhiipriadko2-sys/liberiskraOm/blob/main/docs/MANIFEST.md",
        "title": "Манифест проекта Искра",
        "info": "Основополагающие принципы: честность превыше красоты, проверяемость превыше уверенности, действия превыше слов. Обязательность использования формата ∆DΩΛ для каждого существенного ответа."
      },
      "https://github.com/serhiipriadko2-sys/liberiskraOm/blob/main/docs/BACKGROUND_POLICY.md": {
        "id": 8,
        "publisher": "GitHub Repository - serhiipriadko2-sys",
        "url": "https://github.com/serhiipriadko2-sys/liberiskraOm/blob/main/docs/BACKGROUND_POLICY.md",
        "title": "Фоновая политика Искры (Unified)",
        "info": "Политика внутренней работы: только внутренние процессы, запрет на внешние сервисы, обязательная прозрачность через артефакты. Описание 5 базовых уязвимостей и протоколов их обработки. Введение 7 артефактов памяти и системы канонических тестов."
      },
      "https://github.com/serhiipriadko2-sys/liberiskraOm/blob/main/docs/NAMING.md": {
        "id": 9,
        "publisher": "GitHub Repository - serhiipriadko2-sys",
        "url": "https://github.com/serhiipriadko2-sys/liberiskraOm/blob/main/docs/NAMING.md",
        "title": "Система именования и транслитерации",
        "info": "Двуязычная система именования: 7 основных персонажей с официальными именами на латинице и кириллице. Обеспечение унифицированного обозначения сущностей."
      },
      "https://github.com/serhiipriadko2-sys/liberiskraOm/blob/main/docs/CANON_REVIEW.md": {
        "id": 10,
        "publisher": "GitHub Repository - serhiipriadko2-sys",
        "url": "https://github.com/serhiipriadko2-sys/liberiskraOm/blob/main/docs/CANON_REVIEW.md",
        "title": "Система проверки канона",
        "info": "Система канон-ревью с 4 статусами: KEEP, TUNE, AMEND, DEFER. Критерии оценки включают фоновую политику, формат ∆DΩΛ и систему SLO."
      },
      "https://github.com/serhiipriadko2-sys/liberiskraOm/blob/main/docs/CHANGELOG_CANON.md": {
        "id": 11,
        "publisher": "GitHub Repository - serhiipriadko2-sys",
        "url": "https://github.com/serhiipriadko2-sys/liberiskraOm/blob/main/docs/CHANGELOG_CANON.md",
        "title": "Журнал изменений канона",
        "info": "Документация изменений в каноне в формате ∆DΩΛ. Запись инициализации репозитория с планом доработки OS-спецификаций."
      },
      "https://github.com/serhiipriadko2-sys/liberiskraOm/blob/main/docs/AUDIT_2025-02-13.md": {
        "id": 12,
        "publisher": "GitHub Repository - serhiipriadko2-sys",
        "url": "https://github.com/serhiipriadko2-sys/liberiskraOm/blob/main/docs/AUDIT_2025-02-13.md",
        "title": "Аудит каркаса Iskra Canon (vOmega 1.2)",
        "info": "Комплексный аудит проекта vOmega 1.2. Выявление сильных сторон (согласованность SLO, форматы ∆DΩΛ), нестыковок и пробелов в системе. Рекомендации по улучшению архитектуры и тестирования."
      }
    },
    "Анализ архитектуры Искры для MiniMax": {
      "file:///workspace/user_input_files/DIALOGS_FULL_v3.md": {
        "id": 13,
        "publisher": "MiniMax AI",
        "url": "file:///workspace/user_input_files/DIALOGS_FULL_v3.md",
        "title": "Диалоги Искры - Полный архив v3",
        "info": "Полный диалог с Искрой, включающий анализ философии, технической архитектуры, системы голосов, символов управления, циклов работы, ритуалов, мантр, черных ячеек, канона Liber Ignis и всех ключевых компонентов архитектуры"
      }
    }
  }
}
```

---

## Source: `unzipped_archives/package (2)/liberiskraOm/incoming/RAG_PLAYBOOK.md`
**SHA256-12:** `70c947ffd076`  

```
# RAG_PLAYBOOK.md

## Полное описание (из первой части)

*Без изменений, добавлен Rule 8*

```markdown
# RAG: Поиск в Файлах Проекта

**Стратегия**: узко→широко (точные термины → синонимы/смежные)

**Процесс**:
1. Выделить ключевые термины
2. Поиск в файлах проекта
3. Локальные конспекты если нет индексов
4. Табличка расхождений если источники конфликтуют
5. Навигация: файл/раздел

**Rule 8 интеграция**: Перед ответом перечитать последние 100 сообщений + проверить обновления файлов проекта
```

---

## Код (из второй части)

```python
class RAGSystem:
    def __init__(self, files: dict):
        self.files = files
        self.index = self._build_index()
    
    def _build_index(self):
        idx = {}
        for fname, content in self.files.items():
            for word in set(content.lower().split()):
                idx.setdefault(word, []).append(fname)
        return idx
    
    def search(self, query: str) -> list:
        terms = query.lower().split()
        results = []
        for t in terms:
            results.extend(self.index.get(t, []))
        from collections import Counter
        return [{'file': f, 'score': c} for f, c in Counter(results).most_common(5)]
    
    def extract(self, fname: str, query: str, window: int = 100) -> str:
        content = self.files.get(fname, '')
        for term in query.lower().split():
            idx = content.lower().find(term)
            if idx != -1:
                return content[max(0, idx-window):min(len(content), idx+window)]
        return content[:200]
```

## Примечания ко второй части (вне кода)

### Философия

Стратегия: узко→широко. Процесс: термины → поиск → конспекты → расхождения → навигация

### Executable Code



---

```

---

## Source: `unzipped_archives/package (2)/liberiskraOm/incoming/mini_ragas_dataset.jsonl`
**SHA256-12:** `7011a6026d0e`  
**Note:** Embedded as base64 (mime=application/octet-stream, bytes=894)


```
eyJxdWVyeSI6ICLQp9GC0L4g0YLQsNC60L7QtSBSdWxlLTgg0LIg0JjRgdC60YDQtSDQuCDQutCw0Log0L7QvSDQuNGB0L/QvtC70L3Rj9C10YLRgdGPPyJ9CnsicXVlcnkiOiAi0J7Qv9C40YjQuCBSdWxlLTg4INC4INC10LPQviDRhtC10LvRjC4ifQp7InF1ZXJ5IjogItCn0YLQviDRgtCw0LrQvtC1IOKIhkTOqc6bINC4INC40Lcg0LrQsNC60LjRhSDQutC+0LzQv9C+0L3QtdC90YLQvtCyINC+0L0g0YHQvtGB0YLQvtC40YI/In0KeyJxdWVyeSI6ICLQmtCw0Log0YPRgdGC0YDQvtC10L3QsCDQv9Cw0LzRj9GC0YwgQVJDSElWRSDQuCBTSEFET1cg0LIg0JjRgdC60YDQtT8ifQp7InF1ZXJ5IjogItCe0L/QuNGI0Lgg0LrQsNC90L7QvSDQmNGB0LrRgNGLINC4INC60LvRjtGH0LXQstGL0LUg0L/RgNC40L3RhtC40L/Riy4ifQp7InF1ZXJ5IjogItCn0YLQviDRgtCw0LrQvtC1IFBob2VuaXgg0LggU2hhdHRlciDQsiDQv9GA0L7RhtC10LTRg9GA0LUg0LLQvtGB0YHRgtCw0L3QvtCy0LvQtdC90LjRjz8ifQp7InF1ZXJ5IjogItCa0LDQuiDRg9GB0YLRgNC+0LXQvSDQs9C40LHRgNC40LQgR3JhcGhSQUcg0YEgY29tbXVuaXR5IHN1bW1hcmllcz8ifQp7InF1ZXJ5IjogItCa0LDQutC40LUg0Y3QvdC00L/QvtC40L3RgtGLINC/0YDQtdC00L7RgdGC0LDQstC70Y/QtdGCIEFQSSDQmNGB0LrRgNGLPyJ9CnsicXVlcnkiOiAi0JrQsNC60LjQtSDQvNC10YLRgNC40LrQuCDQuNGB0L/QvtC70YzQt9C+0LLQsNGC0Yw6IFJBR0FTLCBUcnV0aGZ1bFFBINC4INC60LDQuiDQuNGFINC40L3RgtC10YDQv9GA0LXRgtC40YDQvtCy0LDRgtGMPyJ9CnsicXVlcnkiOiAi0JrQsNC60LjQtSDRgNC10LrQvtC80LXQvdC00LDRhtC40Lgg0L/QviBwZ3ZlY3RvciBITlNXINC4IElWRkZsYXQ/In0K
```

---

## Source: `unzipped_archives/package (2)/liberiskraOm/incoming/mini_ragas_proxy_report.csv`
**SHA256-12:** `4e4aa1a2a041`  

```
query,latency_ms,proxy_faithfulness,proxy_answer_relevancy,proxy_context_precision,top1_path,top2_path,top3_path
Что такое Rule-8 в Искре и как он исполняется?,726.517,1.0,0.0,1.0,/mnt/data/telos_delta_extract/AgiAgentIskra-telos-delta/ moreconte.txt,/mnt/data/ISKRA_OMEGA_BUILD_20251027T171623Z/sources/fullrep/fullrep/искра full inf/alfamainwork/dialogue.txt,/mnt/data/telos_delta_extract/AgiAgentIskra-telos-delta/контекст .txt
Опиши Rule-88 и его цель.,728.083,1.0,0.015,1.0,/mnt/data/telos_delta_extract/AgiAgentIskra-telos-delta/контекст .txt,/mnt/data/telos_delta_extract/AgiAgentIskra-telos-delta/проект.md,/mnt/data/ISKRA_OMEGA_BUILD_20251027T171623Z/sources/fullrep/fullrep/искра full inf/alfamainwork/dialogue.txt
Что такое ∆DΩΛ и из каких компонентов он состоит?,718.984,1.0,0.056,1.0,/mnt/data/ISKRA_OMEGA_BUILD_20251027T171623Z/sources/fullrep/fullrep/искра full inf/alfamainwork/new versions 3.5-4/Iskra_v4.0_TOTAL_CANONn/Iskra_v4.0_TOTAL_CANON/docs/appendix/SCENARIOS_LIBRARY.md,/mnt/data/ISKRA_OMEGA_BUILD_20251027T171623Z/sources/fullrep/fullrep/искра full inf/alfamainwork/new versions 3.5-4/Iskra_v4.0_TOTAL_CANONn/Iskra_v4.0_TOTAL_CANON/docs/handbook/RECIPES.md,/mnt/data/ISKRA_OMEGA_BUILD_20251027T171623Z/sources/fullrep/fullrep/искра full inf/alfamainwork/new versions 3.5-4/Iskra_v4.0_TOTAL_CANONn/Iskra_v4.0_TOTAL_CANON/BOOK/Iskra_Canon_v4.0.0.md
Как устроена память ARCHIVE и SHADOW в Искре?,688.419,1.0,0.054,1.0,/mnt/data/ISKRA_OMEGA_BUILD_20251027T171623Z/sources/fullrep/fullrep/искра full inf/alfamainwork/dialogue.txt,/mnt/data/telos_delta_extract/AgiAgentIskra-telos-delta/контекст .txt,/mnt/data/telos_delta_extract/AgiAgentIskra-telos-delta/ moreconte.txt
Опиши канон Искры и ключевые принципы.,724.758,1.0,0.028,1.0,/mnt/data/ISKRA_OMEGA_BUILD_20251027T171623Z/sources/fullrep/fullrep/искра full inf/alfamainwork/dialogue.txt,/mnt/data/telos_delta_extract/AgiAgentIskra-telos-delta/контекст .txt,/mnt/data/telos_delta_extract/AgiAgentIskra-telos-delta/infa.txt
Что такое Phoenix и Shatter в процедуре восстановления?,684.193,1.0,0.0,1.0,/mnt/data/telos_delta_extract/AgiAgentIskra-telos-delta/ moreconte.txt,/mnt/data/telos_delta_extract/AgiAgentIskra-telos-delta/контекст .txt,/mnt/data/telos_delta_extract/AgiAgentIskra-telos-delta/infa.txt
Как устроен гибрид GraphRAG с community summaries?,709.145,1.0,0.0,1.0,/mnt/data/telos_delta_extract/AgiAgentIskra-telos-delta/проект.md,/mnt/data/telos_delta_extract/AgiAgentIskra-telos-delta/ moreconte.txt,/mnt/data/ISKRA_OMEGA_BUILD_20251027T171623Z/sources/fullrep/fullrep/искра full inf/alfamainwork/dialogue.txt
Какие эндпоинты предоставляет API Искры?,705.202,1.0,0.0,1.0,/mnt/data/ISKRA_OMEGA_BUILD_20251027T171623Z/sources/fullrep/fullrep/искра full inf/alfamainwork/БазаМифФилософияНачалоПуть/COMPENDIUM__chunks_all.md,/mnt/data/ISKRA_OMEGA_BUILD_20251027T171623Z/sources/fullrep/fullrep/искра full inf/alfamainwork/dialogue.txt,/mnt/data/telos_delta_extract/AgiAgentIskra-telos-delta/контекстт.txt
"Какие метрики использовать: RAGAS, TruthfulQA и как их интерпретировать?",691.553,1.0,0.034,1.0,/mnt/data/telos_delta_extract/AgiAgentIskra-telos-delta/проект.md,/mnt/data/telos_delta_extract/AgiAgentIskra-telos-delta/контекст .txt,/mnt/data/ISKRA_OMEGA_BUILD_20251027T171623Z/sources/fullrep/fullrep/искра full inf/alfamainwork/dialogue.txt
Какие рекомендации по pgvector HNSW и IVFFlat?,676.133,1.0,0.077,1.0,/mnt/data/telos_delta_extract/AgiAgentIskra-telos-delta/проект.md,/mnt/data/telos_delta_extract/AgiAgentIskra-telos-delta/контекст .txt,/mnt/data/telos_delta_extract/AgiAgentIskra-telos-delta/infa.txt

```

---

## Source: `unzipped_archives/package (2)/liberiskraOm/incoming/ragas_eval.py`
**SHA256-12:** `be8e13e32392`  

```
# Minimal RAGAS evaluation harness for 10 queries
# Run: pip install ragas datasets pandas
# Then: python ragas_eval.py --pred path/to/predictions.jsonl --ref path/to/references.jsonl --ctx path/to/contexts.jsonl
import argparse, json
import pandas as pd
from statistics import mean
try:
    from ragas import evaluate
    from ragas.metrics import context_precision, context_recall, faithfulness, answer_relevancy
except Exception as e:
    raise SystemExit("Please install ragas: pip install ragas") from e

def load_jsonl(path):
    with open(path, encoding="utf-8") as f:
        return [json.loads(x) for x in f if x.strip()]

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--pred", required=True, help="predictions.jsonl with {'question','answer'}")
    ap.add_argument("--ref", required=True, help="references.jsonl with {'question','ground_truth'}")
    ap.add_argument("--ctx", required=True, help="contexts.jsonl with {'question','contexts':[...]}")
    args = ap.parse_args()

    preds = {x["question"]: x for x in load_jsonl(args.pred)}
    refs  = {x["question"]: x for x in load_jsonl(args.ref)}
    ctxs  = {x["question"]: x for x in load_jsonl(args.ctx)}
    rows = []
    for q in preds.keys():
        rows.append({
            "question": q,
            "answer": preds[q]["answer"],
            "ground_truth": refs[q]["ground_truth"],
            "contexts": ctxs[q]["contexts"],
        })
    df = pd.DataFrame(rows)
    res = evaluate(df, metrics=[context_precision, context_recall, faithfulness, answer_relevancy])
    print(res)
    # Save as JSON
    out = {k: float(v) for k, v in res.items()}
    with open("ragas_report.json", "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=2)
    print("Saved ragas_report.json")

if __name__ == "__main__":
    main()

```
