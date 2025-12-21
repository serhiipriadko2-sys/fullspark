#!/usr/bin/env python3
"""
convert_chatgpt_export.py

Конвертация официального экспорта ChatGPT (conversations.json) в базу ISKRA (sessions/messages JSONL + SQLite).

Использование:
  python convert_chatgpt_export.py --input conversations.json --out out_dir
  python convert_chatgpt_export.py --zip conversations.zip --out out_dir
  python convert_chatgpt_export.py --zip conversations.zip --out out_dir --filter-title "искра|kain|телос"

Что делает:
- Стрим-парсит большой conversations.json (не грузит весь файл в память).
- Восстанавливает основную ветку диалога по current_node (без ветвлений).
- Выкидывает system/tool/hidden сообщения и user_editable_context.
- Сохраняет user/assistant сообщения в messages.jsonl + sessions.jsonl и собирает SQLite (с FTS5).

Примечание:
- Для очень больших файлов может занять время. Работает последовательно и безопасно по памяти.
"""

import argparse, json, re, os, zipfile, sqlite3, hashlib
from pathlib import Path

try:
    import orjson
    loads = orjson.loads
    dumps = orjson.dumps
except Exception:
    import json as _json
    loads = _json.loads
    dumps = lambda x: _json.dumps(x, ensure_ascii=False).encode("utf-8")

def iter_json_objects_from_array(stream, chunk_size=1024*1024):
    in_str = False
    esc = False
    depth = 0
    started = False
    buf = bytearray()
    while True:
        chunk = stream.read(chunk_size)
        if not chunk:
            break
        for b in chunk:
            if not started:
                if b == 123:  # {
                    started = True
                    depth = 1
                    buf.append(b)
                else:
                    continue
            else:
                buf.append(b)
                if in_str:
                    if esc:
                        esc = False
                    elif b == 92:
                        esc = True
                    elif b == 34:
                        in_str = False
                else:
                    if b == 34:
                        in_str = True
                    elif b == 123:
                        depth += 1
                    elif b == 125:
                        depth -= 1
                        if depth == 0:
                            yield bytes(buf)
                            buf.clear()
                            started = False
                            in_str = False
                            esc = False

def extract_text(msg):
    content = msg.get("content") or {}
    ctype = content.get("content_type") or "unknown"
    parts = content.get("parts")
    text = ""
    if ctype in ("text","assistant_text","multimodal_text"):
        if isinstance(parts, list):
            text = "\n".join([p for p in parts if isinstance(p, str)])
    elif ctype == "user_editable_context":
        text = ""
    else:
        if isinstance(parts, list):
            text = "\n".join([p for p in parts if isinstance(p, str)])
        elif isinstance(parts, str):
            text = parts
    return text.strip(), ctype

def should_keep(msg):
    author = (msg.get("author") or {}).get("role")
    if author not in ("user","assistant"):
        return False
    md = msg.get("metadata") or {}
    if md.get("is_visually_hidden_from_conversation"):
        return False
    ctype = (msg.get("content") or {}).get("content_type")
    if ctype == "user_editable_context":
        return False
    text, _ = extract_text(msg)
    return bool(text)

def linearize(conv):
    mapping = conv.get("mapping") or {}
    node_id = conv.get("current_node")
    path = []
    seen=set()
    while node_id and node_id not in seen:
        seen.add(node_id)
        path.append(node_id)
        node = mapping.get(node_id)
        if not node:
            break
        node_id = node.get("parent")
    path.reverse()
    for nid in path:
        node = mapping.get(nid) or {}
        msg = node.get("message")
        if msg:
            yield nid, msg

SCHEMA_SQL = """
PRAGMA journal_mode=WAL;

CREATE TABLE IF NOT EXISTS sessions (
  session_id TEXT PRIMARY KEY,
  title TEXT,
  create_time REAL,
  update_time REAL,
  n_messages_user INTEGER,
  n_messages_assistant INTEGER,
  n_messages_total INTEGER
);

CREATE TABLE IF NOT EXISTS messages (
  message_id TEXT PRIMARY KEY,
  session_id TEXT,
  role TEXT,
  create_time REAL,
  content_type TEXT,
  text TEXT,
  order_in_session INTEGER,
  FOREIGN KEY(session_id) REFERENCES sessions(session_id)
);

CREATE VIRTUAL TABLE IF NOT EXISTS messages_fts USING fts5(
  message_id, session_id, role, text, content=''
);
"""

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--input", help="conversations.json")
    ap.add_argument("--zip", dest="zip_path", help="conversations.zip (с conversations.json внутри)")
    ap.add_argument("--out", required=True, help="директория вывода")
    ap.add_argument("--filter-title", default="", help="regex по title (например: 'искра|kain|телос')")
    args = ap.parse_args()

    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)
    msg_path = out_dir/"messages.jsonl"
    sess_path = out_dir/"sessions.jsonl"
    sqlite_path = out_dir/"iskra_export.sqlite"

    title_re = re.compile(args.filter_title, re.I) if args.filter_title else None

    msg_f = open(msg_path, "wb")
    sess_f = open(sess_path, "wb")

    conn = sqlite3.connect(sqlite_path)
    cur = conn.cursor()
    cur.executescript(SCHEMA_SQL)

    def process_stream(stream):
        total=0
        kept=0
        for obj_bytes in iter_json_objects_from_array(stream):
            total += 1
            try:
                conv = loads(obj_bytes)
            except Exception:
                continue
            title = conv.get("title") or ""
            if title_re and not title_re.search(title):
                continue
            kept += 1
            sid = conv.get("id") or hashlib.sha1((title+str(conv.get("create_time"))).encode()).hexdigest()

            n_user=n_asst=n_total=0
            for i,(mid,msg) in enumerate(linearize(conv)):
                if not should_keep(msg):
                    continue
                role = msg.get("author",{}).get("role")
                text, ctype = extract_text(msg)
                rec = {
                    "message_id": mid,
                    "session_id": sid,
                    "role": role,
                    "create_time": msg.get("create_time"),
                    "content_type": ctype,
                    "text": text,
                    "order_in_session": n_total,
                }
                msg_f.write(dumps(rec)); msg_f.write(b"\n")
                cur.execute("INSERT OR REPLACE INTO messages VALUES (?,?,?,?,?,?,?)",
                            (mid, sid, role, msg.get("create_time"), ctype, text, n_total))
                cur.execute("INSERT INTO messages_fts(message_id, session_id, role, text) VALUES (?,?,?,?)",
                            (mid, sid, role, text))
                n_total += 1
                if role=="user": n_user += 1
                elif role=="assistant": n_asst += 1

            srec = {
                "session_id": sid,
                "title": title,
                "create_time": conv.get("create_time"),
                "update_time": conv.get("update_time"),
                "n_messages_user": n_user,
                "n_messages_assistant": n_asst,
                "n_messages_total": n_total,
            }
            sess_f.write(dumps(srec)); sess_f.write(b"\n")
            cur.execute("INSERT OR REPLACE INTO sessions VALUES (?,?,?,?,?,?,?)",
                        (sid, title, conv.get("create_time"), conv.get("update_time"), n_user, n_asst, n_total))
            if kept % 200 == 0:
                conn.commit()
        conn.commit()
        return total, kept

    if args.zip_path:
        with zipfile.ZipFile(args.zip_path) as z:
            with z.open("conversations.json") as stream:
                total, kept = process_stream(stream)
    else:
        if not args.input:
            raise SystemExit("Нужно указать --input или --zip")
        with open(args.input, "rb") as stream:
            total, kept = process_stream(stream)

    msg_f.close()
    sess_f.close()
    conn.close()
    print(f"done. conversations seen={total}, selected={kept}")
    print(f"wrote: {msg_path}")
    print(f"sqlite: {sqlite_path}")

if __name__ == "__main__":
    main()
