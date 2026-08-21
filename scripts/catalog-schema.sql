CREATE TABLE IF NOT EXISTS catalog_items (
  id text PRIMARY KEY,
  title text NOT NULL CHECK (length(btrim(title)) > 0),
  kind text NOT NULL CHECK (kind IN ('book', 'board-game', 'video-game')),
  status text NOT NULL CHECK (status IN ('available', 'borrowed')),
  borrower_name text,
  borrowed_date text,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
