# ISKRA Compiler (IndexLatch) — quickstart

1) Положи рядом:
- `index_map_v6.json`
- `PROJECT_INSTRUCTIONS_8K.md`
- папку `iskra_15_v6_stack/` с 15 md‑файлами

2) Запусти:
```bash
python compiler/iskra_compiler.py --stack_dir iskra_15_v6_stack --out_dir build
```

3) Результат:
- `build/PROJECT_INSTRUCTIONS_8K.md` (готово для поля «Инструкции»)
- `build/index_map_v6.json`
- `build/REPORT.json` (что ок/что сломано)