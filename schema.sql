-- Memoria central del Programa de Charlas — Río Loa (Cloudflare D1)
-- Una sola fila con todo el estado de la app en JSON.
-- Aplicar en el panel de Cloudflare (D1 → consola) o por CLI:
--   npx wrangler d1 execute charlas-rioloa --remote --file=schema.sql

CREATE TABLE IF NOT EXISTS estado (
    id      TEXT PRIMARY KEY,
    json    TEXT NOT NULL,
    updated TEXT
);
