// ───────────────────────────────────────────────────────────────────────────
//  Cloudflare Worker — API de Charlas de 5 minutos (Río Loa CCHPH)
//  Endpoints:
//    GET  /api/health      → { ok: true }
//    GET  /api/state       → { historial: [...], progreso: { relator: ultimoTema } }
//    POST /api/charla      → registra una charla, asigna folio, devuelve { folio }
//    POST /api/retroceder  → deshace la última charla de un relator
//
//  Bindings (wrangler.toml):  DB = base D1
//  Secret (opcional):         API_TOKEN  (protege las escrituras)
// ───────────────────────────────────────────────────────────────────────────

const cors = () => ({
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
});
const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...cors() },
  });

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === 'OPTIONS') return new Response(null, { headers: cors() });

    // Token simple: solo exige autorización en escrituras (POST), y solo si está configurado.
    if (request.method === 'POST' && env.API_TOKEN) {
      const auth = request.headers.get('Authorization') || '';
      if (auth !== `Bearer ${env.API_TOKEN}`) return json({ error: 'no autorizado' }, 401);
    }

    try {
      if (url.pathname === '/api/health') return json({ ok: true });
      if (url.pathname === '/api/state' && request.method === 'GET') return await getState(env);
      if (url.pathname === '/api/charla' && request.method === 'POST') return await postCharla(request, env);
      if (url.pathname === '/api/retroceder' && request.method === 'POST') return await retroceder(request, env);
      return json({ error: 'ruta no encontrada' }, 404);
    } catch (e) {
      return json({ error: String((e && e.message) || e) }, 500);
    }
  },
};

async function getState(env) {
  const hist = await env.DB.prepare(
    `SELECT folio, fecha, relator, cargo, turno, cuadrilla,
            tema_n AS temaN, tema_titulo AS temaTitulo, created_at AS createdAt
     FROM charlas ORDER BY id ASC`
  ).all();
  const prog = await env.DB.prepare('SELECT relator, ultimo_tema FROM progreso').all();
  const progreso = {};
  for (const r of prog.results || []) progreso[r.relator] = r.ultimo_tema;
  return json({ historial: hist.results || [], progreso });
}

async function postCharla(request, env) {
  const b = await request.json();
  const requeridos = ['relator', 'cargo', 'turno', 'cuadrilla', 'temaN', 'temaTitulo', 'fecha'];
  for (const k of requeridos) {
    if (b[k] === undefined || b[k] === null || b[k] === '') return json({ error: `falta el campo: ${k}` }, 400);
  }
  const year = String(b.fecha).slice(0, 4);
  // Folio correlativo por año, calculado en el servidor (evita duplicados entre equipos).
  const row = await env.DB.prepare("SELECT COUNT(*) AS c FROM charlas WHERE folio LIKE ?")
    .bind(`CH-${year}-%`).first();
  const seq = ((row && row.c) || 0) + 1;
  const folio = `CH-${year}-${String(seq).padStart(3, '0')}`;
  const createdAt = new Date().toISOString();

  await env.DB.prepare(
    `INSERT INTO charlas (folio, fecha, relator, cargo, turno, cuadrilla, tema_n, tema_titulo, created_at)
     VALUES (?,?,?,?,?,?,?,?,?)`
  ).bind(folio, b.fecha, b.relator, b.cargo, b.turno, b.cuadrilla, b.temaN, b.temaTitulo, createdAt).run();

  await env.DB.prepare(
    `INSERT INTO progreso (relator, ultimo_tema) VALUES (?, ?)
     ON CONFLICT(relator) DO UPDATE SET ultimo_tema = excluded.ultimo_tema`
  ).bind(b.relator, b.temaN).run();

  return json({ ok: true, folio, createdAt });
}

async function retroceder(request, env) {
  const b = await request.json();
  if (!b.relator) return json({ error: 'falta el campo: relator' }, 400);
  const last = await env.DB.prepare('SELECT id, folio, tema_n FROM charlas WHERE relator = ? ORDER BY id DESC LIMIT 1')
    .bind(b.relator).first();
  if (!last) return json({ error: 'este relator no tiene charlas registradas' }, 404);

  await env.DB.prepare('DELETE FROM charlas WHERE id = ?').bind(last.id).run();
  const prev = await env.DB.prepare('SELECT tema_n FROM charlas WHERE relator = ? ORDER BY id DESC LIMIT 1')
    .bind(b.relator).first();
  const prevN = prev ? prev.tema_n : 0;
  await env.DB.prepare(
    `INSERT INTO progreso (relator, ultimo_tema) VALUES (?, ?)
     ON CONFLICT(relator) DO UPDATE SET ultimo_tema = excluded.ultimo_tema`
  ).bind(b.relator, prevN).run();

  return json({ ok: true, removido: last, ultimo_tema: prevN });
}
