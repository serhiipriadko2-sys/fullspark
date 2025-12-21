# ISKRA Dialogs DB — Анализ и подготовка
## Что обработано
- Источник: `INGEST_SPLITS/dialogs/*.md` внутри `ISKRA_Project_Package_v0.1`
- Дата диапазон: **2025-04-03 → 2025-08-17**
- Файлов дней: **76**
- Сессий (автосегментация по разрыву > 2 часа): **151**
- Сообщений (очищенных): **11738**
- Роли: user **4747**, assistant **6991**
- Вложения (image_asset_pointer и др. мета-блоки): **769**

## Как очищалось
- Блоки `{'content_type': 'image_asset_pointer', ...}` удалены из текста сообщения, но сохранены в поле `attachments`.
- Сохраняется исходная разметка (абзацы/маркированные списки) и язык.
- `time_iso` строится из имени файла-даты и заголовка блока `### role — HH:MM:SS TZ`.
- Если TZ известна (MSK/CEST/CET/UTC) — добавляется смещение, иначе время остаётся **naive**.

## Что лежит в DIALOGS_DB
- `messages.jsonl` — 1 строка = 1 сообщение.
- `sessions.jsonl` — 1 строка = 1 сессия.
- `sessions.csv` — быстрый индекс сессий.
- `shards/messages_shard_01..05.jsonl` — те же сообщения, но порциями.
- `iskra_dialogs.sqlite` — готовая БД SQLite + FTS5 (полнотекстовый поиск).
- `schema.sql` — схема таблиц.

## Быстрые запросы (SQLite)
```sql
-- поиск по словам
SELECT session_id, message_id, role, substr(text,1,200) AS snippet
FROM messages_fts
WHERE messages_fts MATCH 'телос OR канон'
LIMIT 20;

-- самые плотные дни
SELECT date, COUNT(*) AS n
FROM messages
GROUP BY date
ORDER BY n DESC
LIMIT 10;

-- сообщения одной сессии
SELECT time_iso, role, text
FROM messages
WHERE session_id = 'dlg_2025-07-17_s01'
ORDER BY order_in_session;
```

## Топ дней по объёму
| День | Сообщений |
|---|---:|
| 2025-07-17 | 671 |
| 2025-07-24 | 596 |
| 2025-07-27 | 560 |
| 2025-07-08 | 514 |
| 2025-08-14 | 492 |
| 2025-07-02 | 484 |
| 2025-07-06 | 457 |
| 2025-06-29 | 430 |
| 2025-07-23 | 417 |
| 2025-07-31 | 377 |
| 2025-08-13 | 348 |
| 2025-06-30 | 347 |
| 2025-08-17 | 317 |
| 2025-08-15 | 306 |
| 2025-06-26 | 272 |
