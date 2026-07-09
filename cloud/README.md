# Backend en la nube — Charlas de 5 minutos (Río Loa CCHPH)

API en **Cloudflare Workers + D1** que centraliza la memoria de las charlas:
historial de todas las charlas dictadas y el avance secuencial de cada relator.
Así cualquier equipo ve el mismo estado y el panel se actualiza en vivo.

Todo corre en el **plan gratuito** de Cloudflare a esta escala.

---

## Archivos
- `schema.sql` — tablas de la base D1 (`charlas`, `progreso`).
- `worker.js` — la API (un solo archivo, sin build).
- `wrangler.toml` — configuración del Worker y el binding a D1.

## Endpoints
| Método | Ruta | Para qué |
|---|---|---|
| GET  | `/api/health` | Probar que responde |
| GET  | `/api/state` | Devuelve `{ historial, progreso }` (lo que lee la app y el panel) |
| POST | `/api/charla` | Registra una charla, asigna el folio y avanza el progreso |
| POST | `/api/retroceder` | Deshace la última charla de un relator |

---

## Despliegue por CLI (recomendado)

Requisitos: Node instalado. No necesitas instalar nada global; usa `npx`.

```bash
cd cloud

# 1. Iniciar sesión en tu cuenta Cloudflare
npx wrangler login

# 2. Crear la base D1 → copia el "database_id" que imprime y pégalo en wrangler.toml
npx wrangler d1 create charlas-rioloa

# 3. Crear las tablas (en la base remota)
npx wrangler d1 execute charlas-rioloa --file=schema.sql --remote

# 4. Definir el token que protege las escrituras (te lo pedirá por consola)
npx wrangler secret put API_TOKEN

# 5. Publicar el Worker
npx wrangler deploy
```

Al final te entrega una URL tipo:
`https://charlas-rioloa-api.<tu-subdominio>.workers.dev`

Pruébala:
```bash
curl https://charlas-rioloa-api.<tu-subdominio>.workers.dev/api/health
# → {"ok":true}
```

## Alternativa por panel (sin CLI)
1. Cloudflare Dashboard → **Workers & Pages → D1 → Create database** → nombre `charlas-rioloa`.
2. En la pestaña **Console** de la base, pega y ejecuta el contenido de `schema.sql`.
3. **Workers & Pages → Create → Worker** → pega el contenido de `worker.js` en el editor → Deploy.
4. En el Worker → **Settings → Variables → D1 Database bindings** → binding `DB` → la base `charlas-rioloa`.
5. En **Settings → Variables → Secrets** → agrega `API_TOKEN` con un valor que tú elijas.

---

## Siguiente paso (lo hace Claude)
Cuando tengas la **URL del Worker** y el **API_TOKEN**, se enchufa la app:
en `index.html` se completa un bloque `CLOUD = { url, token }`. Si está vacío, la app
sigue funcionando 100% local (offline) como hasta ahora; si está configurado, usa la
nube y el panel muestra las charlas en tiempo real.

## Nota de seguridad (honesta)
El `API_TOKEN` viaja en la app del navegador, así que es un **candado liviano**, no
seguridad fuerte: evita escrituras casuales, pero alguien con acceso al código podría
leerlo. Para uso interno está bien. Si más adelante quieres control de acceso real,
se antepone **Cloudflare Access** delante del Worker (login por correo), sin tocar el código.
