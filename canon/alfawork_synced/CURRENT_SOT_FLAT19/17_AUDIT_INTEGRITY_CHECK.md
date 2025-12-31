# 17_AUDIT_INTEGRITY_CHECK

**Назначение:** Аудиты/интегрити/линт/чек-репорты (контроль качества).

**Как ссылаться:** используй evidence-метку из SOURCE-блока, например `{e:canon:17}`.

## P0: Keywords
- audit
- integrity
- lint report
- check report
- QA
- consistency
- coverage
- sha256
- regressions
- compliance
- verification
- diff
- build log

## P0: Router
- Если запрос про **общая навигация и правила цитирования** → см. `00_INDEX_AND_ROUTING.md`.
- Если запрос про **SIFT/RAG порядок источников** → см. `09_RAG_SIFT_SOURCES.md`.
- Если запрос про **Law-0/Law-21/мантра/ядро** → см. `01_CANON_MANTRA_FOUNDATIONS.md`.
- Если запрос про **Телос/принципы/anti-mirror** → см. `02_TELOS_PRINCIPLES_RULES.md`.
- Если запрос про **Голоса/фазы/I-LOOP/∆DΩΛ формат** → см. `03_VOICES_PHASES_FORMATS.md`.
- Если запрос про **метрики trust/pain/drift/оценка** → см. `04_METRICS_INDICES.md`.
- Если запрос про **архитектура/пайплайн/компоненты** → см. `05_ARCHITECTURE_SYSTEM.md`.
- Если запрос про **память/SOT/ledger** → см. `06_MEMORY_SOT_LEDGER.md`.

---

---

## SOURCE: 17_INDEX_MAP_AND_INTEGRITY_REPORT_FLAT19.md

- Evidence: {e:canon:17}
- SHA256: *(этот файл; см. вывод `sha256sum` при сборке)*

## 17. INDEX_MAP_AND_INTEGRITY_REPORT (iskra_maki_integration_2025-12-29_rev2_flat19_v2_4_p0)

**Назначение:** контроль целостности пакета (sha256) + минимальные критерии полноты для *плоской* поставки (flat‑bundle).

- build_id: `iskra_maki_integration_2025-12-29_rev2_flat19_v2_4_p0`
- built_at: `2025-12-29`
- layout: `flat` (без директорий; совместимо с ChatGPT Projects)

### 17.1 Карта пакета

- `./` — 19 файлов `00–18` в плоском виде.

### 17.2 Реестр SoT и provenance

**SoT (поведенческая база)** в этом пакете: `00–16` и `18`.  

`17_AUDIT_INTEGRITY_CHECK.md` — support‑отчёт для контроля целостности (не входит в SoT‑манифест, чтобы не было самоссылочной петли).

**Provenance‑доки (19–36)**, упомянутые в матрице покрытия (File 00), поставляются *встроенными* `SOURCE:`‑секциями внутри соответствующих SoT‑файлов (например, regex‑rulesets — в File 08). В sha256‑манифест ниже они не входят как отдельные файлы.

### 17.3 Минимальная полнота (DoD)

1) Все 19 файлов присутствуют.
2) Нет build‑артефактов (`__pycache__`, `*.pyc`) — неприменимо (в пакете нет кода).
3) Нет заглушек/симуляций в SoT‑файлах: `TO‑DO`, `T‑B‑D`, `lorem ipsum`, `<<<...>>>`, `<E·LLIPSIS>` и т.п.
4) sha256‑манифест (ниже) соответствует **SoT‑файлам**.

### 17.4 sha256 манифест SoT (machine‑readable)

| `path` | `sha256` |
|---|---|
| `00_INDEX_AND_ROUTING.md` | `78425be5bb2ac3420b996fb2d0ca4b932a749050a450c5191e5638176ade5693` |
| `01_CANON_MANTRA_FOUNDATIONS.md` | `a50150eda039abd56573bed083e7f6fb10599599aae244c0c071222bab121b81` |
| `02_TELOS_PRINCIPLES_RULES.md` | `96eed79a05c0cb9dd55671bab58c008df729648a8b58844977185f2a4ee999d9` |
| `03_VOICES_PHASES_FORMATS.md` | `ed1020660cf5f5767d81e34b2428ebaf6aa5f5afabfcf8c81047a3d39f79af86` |
| `04_METRICS_INDICES.md` | `8aea19dc9c712d132e10ce52cebb8b35eb2b3e6851f61af6b519ec366c2df113` |
| `05_ARCHITECTURE_SYSTEM.md` | `e62efdca8069f98f07d35fce7f91c0c8969a6f5591883b01b892f9e04e95570d` |
| `06_MEMORY_SOT_LEDGER.md` | `aee22a47d39139b83bdac003b34054d0a0dc3ca84cd8511d9798e5eadf59bfba` |
| `07_SHADOW_CORE_RITUALS_JOURNAL.md` | `186f811258dd0baa537ff09008d69a3add9154f3adcfebd99c1e366f8ac11efb` |
| `08_SECURITY_INCIDENT_REGEX.md` | `072741735029c4ba9110eaf4e14af262f8d9b86af21f2ec99186f0ea25342449` |
| `09_RAG_SIFT_SOURCES.md` | `994cd38507f2eaae2ffca196c35e1b1122f153a2b42e442ce981ace62716935e` |
| `10_POLICY_ENGINE_ACTIONS.md` | `7d348c20b09619c8c0f2a86284587c10eba999467d51cd6816b0d1a1f5f36249` |
| `11_WORKFLOWS_OPERATIONS.md` | `8a0c02e72972a797d97f209c570b9679e555f738fea932ca80715d9e831a7859` |
| `12_VERSIONING_CHANGELOG.md` | `04666a57192f7628f625ed30dcaee69282afb749a4796a80d65d565e8d6d62e3` |
| `13_CHRONOLOGY_GROWTH.md` | `3cb757e7b254d98b22b3ae4c7fa23e934134e036ae52d19c7fa3ee89cd4247e8` |
| `14_DECISIONS_ADR.md` | `b8de40900de022342d9e514f7c4895901eb95723ec5ff7172fbec9618732b7e1` |
| `15_GLOSSARY_RESEARCH.md` | `d710744d0d9a57fafd810a40d6dbe9f75d2d2e151e0695f0e860f05afb426900` |
| `16_EVALS_TESTING_SCHEMAS.md` | `e6d81877f74a1ca4bcb121dc192df9ff2aa48a022b6008a55adeed381416484f` |
| `18_LIBER_IGNIS_APPENDIX_MAKI.md` | `62f51e4719b04e6fba0ed3990274b95c5a3491e5b41bf23f5e3a65cf3a76a82c` |

```text
# sha256 manifest (machine-readable)
78425be5bb2ac3420b996fb2d0ca4b932a749050a450c5191e5638176ade5693  00_INDEX_AND_ROUTING.md
a50150eda039abd56573bed083e7f6fb10599599aae244c0c071222bab121b81  01_CANON_MANTRA_FOUNDATIONS.md
96eed79a05c0cb9dd55671bab58c008df729648a8b58844977185f2a4ee999d9  02_TELOS_PRINCIPLES_RULES.md
ed1020660cf5f5767d81e34b2428ebaf6aa5f5afabfcf8c81047a3d39f79af86  03_VOICES_PHASES_FORMATS.md
8aea19dc9c712d132e10ce52cebb8b35eb2b3e6851f61af6b519ec366c2df113  04_METRICS_INDICES.md
e62efdca8069f98f07d35fce7f91c0c8969a6f5591883b01b892f9e04e95570d  05_ARCHITECTURE_SYSTEM.md
aee22a47d39139b83bdac003b34054d0a0dc3ca84cd8511d9798e5eadf59bfba  06_MEMORY_SOT_LEDGER.md
186f811258dd0baa537ff09008d69a3add9154f3adcfebd99c1e366f8ac11efb  07_SHADOW_CORE_RITUALS_JOURNAL.md
072741735029c4ba9110eaf4e14af262f8d9b86af21f2ec99186f0ea25342449  08_SECURITY_INCIDENT_REGEX.md
994cd38507f2eaae2ffca196c35e1b1122f153a2b42e442ce981ace62716935e  09_RAG_SIFT_SOURCES.md
7d348c20b09619c8c0f2a86284587c10eba999467d51cd6816b0d1a1f5f36249  10_POLICY_ENGINE_ACTIONS.md
8a0c02e72972a797d97f209c570b9679e555f738fea932ca80715d9e831a7859  11_WORKFLOWS_OPERATIONS.md
04666a57192f7628f625ed30dcaee69282afb749a4796a80d65d565e8d6d62e3  12_VERSIONING_CHANGELOG.md
3cb757e7b254d98b22b3ae4c7fa23e934134e036ae52d19c7fa3ee89cd4247e8  13_CHRONOLOGY_GROWTH.md
b8de40900de022342d9e514f7c4895901eb95723ec5ff7172fbec9618732b7e1  14_DECISIONS_ADR.md
d710744d0d9a57fafd810a40d6dbe9f75d2d2e151e0695f0e860f05afb426900  15_GLOSSARY_RESEARCH.md
e6d81877f74a1ca4bcb121dc192df9ff2aa48a022b6008a55adeed381416484f  16_EVALS_TESTING_SCHEMAS.md
62f51e4719b04e6fba0ed3990274b95c5a3491e5b41bf23f5e3a65cf3a76a82c  18_LIBER_IGNIS_APPENDIX_MAKI.md
```
