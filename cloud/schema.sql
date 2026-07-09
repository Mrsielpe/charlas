-- Esquema D1 para la API de Charlas de 5 minutos (Río Loa CCHPH)
-- Aplicar con:  wrangler d1 execute charlas-rioloa --file=schema.sql --remote

CREATE TABLE IF NOT EXISTS charlas (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  folio       TEXT    NOT NULL,
  fecha       TEXT    NOT NULL,        -- YYYY-MM-DD
  relator     TEXT    NOT NULL,
  cargo       TEXT,
  turno       TEXT,
  cuadrilla   TEXT,
  tema_n      INTEGER NOT NULL,
  tema_titulo TEXT,
  created_at  TEXT                     -- ISO timestamp del servidor
);

CREATE TABLE IF NOT EXISTS progreso (
  relator     TEXT PRIMARY KEY,
  ultimo_tema INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_charlas_relator ON charlas(relator);
CREATE INDEX IF NOT EXISTS idx_charlas_folio   ON charlas(folio);
CREATE INDEX IF NOT EXISTS idx_charlas_fecha   ON charlas(fecha);
