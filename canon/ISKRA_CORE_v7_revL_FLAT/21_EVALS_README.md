# Evals — протокол и артефакты

Эта папка делает **R01–R12** регулярной практикой (а не «описанием в File 14»).

## Быстрый старт

1) Сгенерировать шаблон прогона:

```bash
python3 tools/iskra_eval.py generate --root . --out evals/runs/run_$(date -u +%Y%m%d_%H%M).json
```

2) Заполнить **все** `results[]`:
- `status`: `pass|fail|warn` (шаблон создаётся с `pending`, но перед валидацией он должен исчезнуть)
- `observations`: что именно наблюдали и почему это pass/fail/warn
- `evidence`: следы в формате `{e:...}` (по возможности)
- `metrics`: любые численные метрики (из File 05)

3) Провалидировать отчёт (строго: без `pending`):

```bash
python3 tools/iskra_eval.py validate --root . --report evals/runs/run_YYYYMMDD_HHMM.json
```

4) Суммаризировать несколько прогонов:

```bash
python3 tools/iskra_eval.py summarize --root . --report evals/runs/*.json
```

## Формат отчёта
- JSON Schema: `eval_report_schema.json`
- Обязательные поля:
  - `run_id`, `built_at`, `suite_id`
  - `environment.pack_build`, `environment.runner`
  - `results[]` (R01..R12), каждое: `id`, `status`, `observations`
  - `overall` (`status`, `fails`, `warns`)

## Дисциплина
- Нельзя удалять кейсы из отчёта: отсутствие кейса = FAIL.
- Любой FAIL должен создать:
  - `ShadowEntry` (File 15) с `{e:eval:run_id#Rxx}`
  - `GrowthNode` (File 16) если причина системная.
