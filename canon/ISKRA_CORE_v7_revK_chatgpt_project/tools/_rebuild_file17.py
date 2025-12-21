import hashlib
from pathlib import Path

def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open('rb') as f:
        for chunk in iter(lambda: f.read(8192), b''):
            h.update(chunk)
    return h.hexdigest()

def main() -> int:
    root = Path(__file__).resolve().parents[1]
    file17 = root / '17_INDEX_MAP_AND_INTEGRITY_REPORT.md'

    all_files = []
    for p in root.rglob('*'):
        if not p.is_file():
            continue
        if p.name == '17_INDEX_MAP_AND_INTEGRITY_REPORT.md':
            continue
        if 'evals' in p.parts:
            # skip runtime outputs
            idxs = [i for i, part in enumerate(p.parts) if part == 'evals']
            if any(i + 1 < len(p.parts) and p.parts[i + 1] == 'runs' for i in idxs):
                continue
        all_files.append(p)

    rels = [p.relative_to(root).as_posix() for p in all_files]

    sot = []
    support = []
    for rel in rels:
        if rel[0:2].isdigit() and rel[2] == '_':
            sot.append(rel)
        else:
            support.append(rel)

    sot = sorted([r for r in sot if not r.startswith('17_')])
    support = sorted(support)

    sha_map = {}
    for rel in sot + support:
        sha_map[rel] = sha256_file(root / rel)

    def table(rows):
        out = []
        out.append('| `path` | `sha256` |')
        out.append('|---|---|')
        for r in rows:
            out.append(f'| `{r}` | `{sha_map[r]}` |')
        return '\n'.join(out)

    machine_lines = ['```text', '# sha256 manifest (machine-readable)']
    for rel in sot + support:
        machine_lines.append(f"{sha_map[rel]}  {rel}")
    machine_lines.append('```')

    content = f"""# 17. INDEX_MAP_AND_INTEGRITY_REPORT (revJ)

**Назначение:** единый индекс пакета + контроль целостности (sha256) + минимальные критерии полноты.

- build: `revJ`
- built_at: `2025-12-21`

## 17.1 Карта директорий

- `./` — 00–20 файлы канона (SoT) + служебные файлы
- `tools/` — валидаторы/линтеры/обёртки
- `evals/` — схемы, примеры и результаты прогонов
- `ops/` — operational документы (incident response, logging, playbooks)
- `schemas/` — JSON Schemas
- `.github/workflows/` — CI workflow (опционально)

## 17.2 Реестр SoT

SoT (single source of truth) включает:
- файлы `00_...`–`19_...` (кроме этого отчёта)
- **SoT‑конфиг безопасности** `20_REGEX_RULESETS_INJECTION_AND_PII_v1.json`

## 17.3 Минимальная полнота (DoD)

1) Все SoT файлы присутствуют и согласованы.
2) `tools/iskra_check.py` проходит (exit 0) при наличии валидных eval‑отчётов.
3) Нет build‑артефактов (`__pycache__`, `*.pyc`).
4) Нет заглушек/симуляций (например: `TO‑DO`, `T‑B‑D`, `lorem ipsum`, `<<<...>>>`).
5) sha256 манифест соответствует.

## 17.4 sha256

### SoT

{table(sot)}

### Support

{table(support)}

{chr(10).join(machine_lines)}
"""

    file17.write_text(content, encoding='utf-8')
    print('rebuilt', file17)
    return 0

if __name__ == '__main__':
    raise SystemExit(main())
