CREATE TABLE IF NOT EXISTS sync_data (
  key_hash TEXT PRIMARY KEY,
  payload TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);
