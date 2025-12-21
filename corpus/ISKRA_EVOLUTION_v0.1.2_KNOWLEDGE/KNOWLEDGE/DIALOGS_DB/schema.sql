-- ISKRA dialogs DB schema (SQLite)
PRAGMA journal_mode=WAL;

CREATE TABLE IF NOT EXISTS sessions (
  session_id TEXT PRIMARY KEY,
  date TEXT,
  session_index_in_date INTEGER,
  start_time TEXT,
  end_time TEXT,
  n_messages INTEGER,
  n_user INTEGER,
  n_assistant INTEGER,
  n_attachments INTEGER,
  title_hint TEXT,
  source_file TEXT
);

CREATE TABLE IF NOT EXISTS messages (
  message_id TEXT PRIMARY KEY,
  session_id TEXT,
  date TEXT,
  time_iso TEXT,
  role TEXT,
  text TEXT,
  n_attachments INTEGER,
  attachments_json TEXT,
  order_in_session INTEGER,
  order_global INTEGER,
  source_file TEXT,
  FOREIGN KEY(session_id) REFERENCES sessions(session_id)
);

CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id);
CREATE INDEX IF NOT EXISTS idx_messages_date ON messages(date);
CREATE INDEX IF NOT EXISTS idx_messages_role ON messages(role);

-- Full-text search over message text
CREATE VIRTUAL TABLE IF NOT EXISTS messages_fts USING fts5(
  message_id,
  session_id,
  role,
  text,
  content=''
);
