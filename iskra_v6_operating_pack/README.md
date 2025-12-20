# ISKRA v6 — Operating Pack (Index Map + Compiler + Diaries)

Этот пакет — «операционная система» вокруг 15‑файлового Канона v6:
- Index Map v6 (SoT)
- Компилятор (IndexLatch)
- Shadow‑дневник (схема)
- Архив памяти (layout)
- Дневник узлов роста (схема)
- Project Instructions (7800–8000 символов)

## Что делать дальше (самое практичное)
1) **Скопируй** 15 md‑файлов в папку `iskra_15_v6_stack/` (она уже в пакете).
2) **Открой** `PROJECT_INSTRUCTIONS_8K.md` и вставь текст в поле «Инструкции» внутри ChatGPT Project.
3) **Проверь сборку**:
   - `python compiler/iskra_compiler.py --stack_dir iskra_15_v6_stack --out_dir build`
   - смотри `build/REPORT.json`
4) **Запусти дневники**:
   - для каждой важной сессии делай запись по `templates/SHADOW_DIARY_SCHEMA.md`
   - узлы роста фиксируй по `templates/GROWTH_NODES_DIARY_SCHEMA.md`
5) **Под обучение**: пропускай только то, что прошло gate (PII/injection/length/readability).

## Файлы
- `INDEX_MAP_V6.md` — человеческий Index Map
- `index_map_v6.json` — машинный Index Map
- `PROJECT_INSTRUCTIONS_8K.md` — готовые инструкции (≈8k)
- `compiler/` — компилятор + отчёт
- `templates/` — схемы дневников и памяти