CREATE TABLE IF NOT EXISTS custom_orders (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  market TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new',
  specification_json TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_custom_orders_created_at ON custom_orders(created_at DESC);
