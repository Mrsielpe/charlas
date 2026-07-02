// ═══════════════════════════════════════════════════════════════════
//  Cloudflare Pages Function — /api/estado
//  Memoria central: guarda TODO el estado de la app como un único JSON
//  en D1 (una sola fila). Diseñado para un solo usuario (Braulio).
// ═══════════════════════════════════════════════════════════════════

const json = (data, status = 200) =>
    new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8' } });

export async function onRequest(context) {
    const { request, env } = context;

    // Sin base de datos vinculada, respondemos 503 y la app sigue en modo local.
    if (!env.DB) return json({ error: 'D1 no configurada' }, 503);

    // Puerta simple: si existe el secreto APP_CLAVE, se exige el header X-Clave.
    const clave = request.headers.get('X-Clave') || '';
    if (env.APP_CLAVE && clave !== env.APP_CLAVE) return json({ error: 'Clave incorrecta' }, 401);

    try {
        if (request.method === 'GET') {
            const row = await env.DB.prepare("SELECT json, updated FROM estado WHERE id = 'principal'").first();
            return json({ json: row ? JSON.parse(row.json) : null, updated: row ? row.updated : null });
        }
        if (request.method === 'PUT') {
            const body = await request.json();
            if (!body || typeof body.json !== 'object' || body.json === null) return json({ error: 'Estado no válido' }, 400);
            const now = new Date().toISOString();
            await env.DB.prepare(
                "INSERT INTO estado (id, json, updated) VALUES ('principal', ?, ?) " +
                "ON CONFLICT(id) DO UPDATE SET json = excluded.json, updated = excluded.updated"
            ).bind(JSON.stringify(body.json), now).run();
            return json({ ok: true, updated: now });
        }
        return json({ error: 'Método no permitido' }, 405);
    } catch (e) {
        return json({ error: 'Error interno: ' + (e && e.message) }, 500);
    }
}
