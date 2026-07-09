# HANDOFF — App "Programa de Charlas de 5 minutos" (Río Loa)

Documento de traspaso para continuar el trabajo en otra sesión. Fecha: 2026-07-03.
Usuario: Braulio Sielpe (APR, Río Loa — CT Padre Hurtado). Idioma: español (Chile).

---

## 1. Qué es

Panel **personal** de un solo usuario (Braulio) para gestionar el programa anual de
**charlas de seguridad de 5 minutos** de los supervisores de la empresa contratista
**Maquinarias y Construcciones Río Loa S.A.**, que presta servicios en una planta de
vidrio (CT Padre Hurtado). Braulio **programa, imprime y entrega** las hojas a los
supervisores y luego **registra qué se cumplió**.

Carpeta: `~/Desktop/Charlas-Programa-RioLoa/`
Repo GitHub: `github.com/Mrsielpe/charlas`
Publicada en Cloudflare Pages (ver sección Despliegue).

---

## 2. Arquitectura y archivos

Frontend = **un solo `index.html`** (React 18 vía CDN + Babel standalone con runtime
CLÁSICO — imprescindible, ver más abajo — + jsPDF). Sin build. El código React vive
dentro de `<script type="text/plain" id="app-source">` y se compila en el navegador.

```
index.html                 -> toda la app (frontend, ~330 KB)
functions/api/estado.js    -> API (Cloudflare Pages Function) para memoria en nube D1
schema.sql                 -> crea tabla `estado` en D1 (1 fila con todo el estado en JSON)
wrangler.toml              -> config Pages; bloque D1 HOY COMENTADO (ver Despliegue)
.gitignore                 -> ignora .wrangler/, .dev.vars, node_modules
README.md                  -> guía de uso y despliegue
HANDOFF.md                 -> este archivo
```

**Gotcha crítico (Babel):** el bootstrap al final del HTML compila con
`Babel.transform(src, { presets: [['react', { runtime: 'classic' }]] })`. Si se usa el
runtime automático, la app NO renderiza (ver memoria `babel-standalone-classic-runtime`).
No cambiar esto.

---

## 3. Funcionalidades implementadas (TODO listo y verificado)

- **Catálogo de 64 charlas** (`TEMAS` en index.html), en este orden por diseño:
  - N°1–20: charlas de planta de vidrio (sílice, soda, molienda, hornos, etc.)
  - N°21–32: específicas del rubro (materias primas/molienda; movimiento de materiales/bodega)
  - N°33–64: seguridad general (herramientas, eléctrico, fuego, ergonomía, Ley Karin, etc.)
  - Cada charla: `{ id, numero, titulo, desarrollo, puntos:[5], duracion, estado, preguntas, compromiso, ampliado }`.
  - `puntos` = 5 "temas tratados" por charla (todas llenas).
  - `duracion` editable por charla (default "5 minutos").
- **Programa anual semanal**: `Generar programa` asigna las charlas activas en orden a
  cada semana ISO, para cada supervisor, desde la semana que se elija.
  IMPORTANTE: `generarPrograma` usa el ORDEN DEL ARRAY de charlas activas, no ordena por
  número. Por eso el orden en `TEMAS` = secuencia del año.
- **Impresión de la hoja** (registro de asistencia + hoja de apoyo del relator), formato
  oficial **REG-RRHH-002** con marca Río Loa. Individual o **mes completo** (un PDF con
  todas las hojas del mes). Al imprimir se asigna folio `CH-AAAA-NNN` y la semana queda
  ESTADO=`entregada`.
- **Estados por semana**: `programada -> entregada -> cumplida | no_cumplida` (con "Corregir").
- **Reemplazos** por semana (todos o un supervisor, con motivo; guarda la charla original,
  restaurable; no toca hojas ya impresas). "Completar semanas faltantes".
- **Tablero**: semáforo semana actual, resumen mensual vs meta (4/mes), avance anual,
  export **CSV** (insumo del informe mensual CCHPH).
- **Evaluaciones (7 preguntas) por charla** — LAS 64 COMPLETAS:
  - Formato réplica del DOCX modelo (`~/Downloads/Evaluacion_PREXOR_GoodFood (2).docx`)
    pero con marca Río Loa (teal #2A5C6E / azul #4A90B8 en vez del verde GoodFood).
  - Estructura: identificación + instrucciones + 7 preguntas A/B/C + pauta + resultado
    (aprueba **5/7 = 71%**) + compromiso adaptado + firmas + pie "Documento controlado".
  - En cada tarjeta de Semanas, fila "Evaluación" SEPARADA del registro:
    "Imprimir (1 por trabajador)" = versión SIN respuestas; "Pauta" = versión CON respuestas.
  - La **hoja de apoyo del relator** también incluye las 7 preguntas con la respuesta
    correcta marcada (sección "PAUTA DE EVALUACIÓN", con salto de página `ensureApoyo`).
  - Distribución de respuestas correctas rebalanceada a A/B/C = 149/149/150.
- **Logo** cargable (Ajustes → Documento) que aparece en hojas y evaluaciones.
- **Memoria en nube (Cloudflare D1)** implementada pero HOY DESACTIVADA en producción
  (ver Despliegue). Funciona offline-first: si no hay D1, va en modo local (localStorage).

---

## 4. Modelo de datos (store)

`localStorage` key = `rioloa_programa_v1`. Forma del store (`defaultStore()` en index.html):
```
{ supervisores:[{id,nombre,cargo}], charlas:[...64...], programa:{ [anio]:[filas] },
  folioSeq, logo, codigo:'REG-RRHH-002', version, metaMensual }
```
Fila de programa: `{ semana, supervisorId, charlaId, charlaOriginalId, motivo, estado,
folio, fechaEntrega, fechaCharla }`. Clave única por semana+supervisor (`keyDe`).

Las evaluaciones viven en el objeto `EVALUACIONES` (keyed por número de charla) y se
adjuntan a cada charla en `defaultStore` (`preguntas`, `compromiso`, `ampliado`).
Charla 1 está escrita a mano (estilo JS); charlas 2–64 se insertaron como entradas JSON
(generadas por un workflow de 63 agentes sonnet en paralelo).

---

## 5. Funciones clave (en index.html) y dónde tocar

- `TEMAS` = array de 64 charlas. `EVALUACIONES` = objeto con las evaluaciones.
- `defaultStore()` — arma el store inicial (mapea TEMAS + EVALUACIONES).
- `buildDoc(items, config)` — genera el PDF de la(s) hoja(s): `dibujarRegistro` (firmas)
  + `dibujarApoyo` (desarrollo + puntos + PAUTA para el relator). `buildPDF(item)` y
  `buildPDFMes(items,config)` lo usan.
- `buildEvaluacion(charla, config, {conClave})` — PDF de la evaluación (conClave=false =
  trabajador; true = pauta).
- Componente `App` — estado global, sincronización nube (`NUBE`, `enlazarNube`, `pushNube`),
  `imprimirFila`, `vistaPrevia`, `imprimirMes`, `abrirEval`, `marcar`, `generarPrograma`,
  `reemplazar`, `restaurar`.
- Pestañas: `TabSemanas`, `TabTablero`, `TabPrograma`, `TabCharlas`, `TabAjustes`.

---

## 6. Despliegue (estado actual)

- Repo en GitHub conectado a **Cloudflare Pages** (Framework preset: None; build command:
  vacío; output dir: `/`). La carpeta `functions/` se despliega sola.
- **Hubo un error de deploy**: Cloudflare lee `wrangler.toml` y el bloque D1 tenía un
  `database_id` de relleno (`00000000-...`) => "Invalid database UUID". Se **comentó el
  bloque D1** en wrangler.toml para desbloquear. HOY la app publica en **MODO LOCAL**
  (datos en el navegador de cada equipo). El usuario ya re-subió el wrangler.toml.
- **Para activar la nube D1** (el usuario SÍ la quiere, pero lo dejamos para después porque
  se abrumó con los pasos): en Cloudflare crear base D1 `charlas-rioloa`, copiar su
  Database ID, descomentar las 4 líneas del bloque D1 en wrangler.toml y pegar el ID real,
  correr `schema.sql` en la consola D1, crear variable de entorno `APP_CLAVE`, push, y en
  la app: ícono de nube → ingresar APP_CLAVE (debe quedar "Cargado de la nube" verde).
  Nota: cuando hay wrangler.toml, Cloudflare Pages IGNORA los bindings del dashboard;
  el binding D1 debe ir en wrangler.toml.

---

## 7. PENDIENTE INMEDIATO (lo que preguntó el usuario, sin resolver)

El usuario preguntó: **"una vez que genero un programa, no puedo volver atrás,
modificarlo o algo... no puedo modificarlo".**

Estado actual: SÍ se puede reemplazar la charla de una semana (pestaña Programa →
"Reemplazar la charla de una semana", por semana, a todos o a un supervisor, restaurable)
y "Completar semanas faltantes". Pero NO hay forma clara/descubrible de:
  - **Borrar o regenerar** el programa completo del año (empezar de nuevo, cambiar la
    semana de inicio, correr toda la secuencia). `generarPrograma` NO sobrescribe semanas
    existentes (INSERT-OR-IGNORE), así que re-generar no cambia lo ya creado.
  - Editar rápido la charla de una semana puntual sin pasar por "Reemplazar".
  - Deshacer la generación.
Además, "Borrar todo" (Ajustes) borra TODO (programa + charlas propias + ajustes), no solo
el programa del año.

**Propuesta para la próxima sesión** (confirmar con el usuario antes de construir):
1. Botón **"Borrar / regenerar el programa de este año"** en la pestaña Programa (borra
   solo `programa[anio]` tras confirmación, para volver a generarlo desde otra semana).
2. Hacer más descubrible el reemplazo por semana (quizá desde la propia tarjeta de Semanas:
   un botón "Cambiar charla de esta semana").
3. Opcional: permitir arrastrar/mover la charla de una semana a otra.
Primero MOSTRARLE cómo modificar hoy (pestaña Programa) y preguntar qué le falta, antes de
codificar.

---

## 8. Cómo desarrollar y verificar en local

- Servidor de preview con nube (para probar D1): en `~/Desktop/.claude/launch.json` existe
  el server **`charlas-nube`** = `npx wrangler pages dev --port 8793` (sirve app + API + D1
  local). También `charlas-programa` = python http.server 8792 (estático, sin API).
- Aplicar esquema a D1 local: `npx wrangler d1 execute charlas-rioloa --local --file=schema.sql`
- Limpiar datos de prueba entre pruebas: `npx wrangler d1 execute charlas-rioloa --local
  --command "DELETE FROM estado;"` **y** en el navegador `localStorage.clear()` + reload
  (el catálogo se reconstruye desde defaultStore).
- OJO: como la nube manda sobre el local, si el D1 local tiene un store viejo, la app carga
  ESE (no el catálogo nuevo del código). Por eso, tras cambios en TEMAS/EVALUACIONES, hay
  que borrar D1 estado + localStorage y recargar para ver lo nuevo.
- Verificación de PDFs: se abrió `window.open` interceptado para capturar el blob, se
  contó `/Type /Page` en los bytes y se decodificó el contenido de texto del PDF. Para
  render visual: script Python con Quartz (macOS) en el scratchpad (no hay LibreOffice ni
  poppler; usar `textutil`/`qlmanage`/Quartz).

---

## 9. Convenciones y reglas del proyecto

- Alcance EXCLUSIVO **CT Padre Hurtado (CCHPH)**. No incluir Llay-Llay.
- **Nunca exponer al mandante** (CCH — Cristalería de Chile) en documentos externos; en las
  charlas/evaluaciones se dice "empresa mandante" de forma genérica.
- Modelo preferido del proyecto: `claude-sonnet-4-6` (por eso el workflow usó sonnet).
- Colores marca Río Loa: teal `#2A5C6E`, azul `#4A90B8`.
- En strings dentro del literal JS de TEMAS/EVALUACIONES escritos a mano: evitar apóstrofes
  (`'`) porque rompen el string; las entradas JSON (comillas dobles) sí los admiten.
- El workflow de evaluaciones quedó guardado en:
  `~/.claude/projects/-Users-bsiel1-Desktop/0a9d4da9-.../workflows/scripts/evaluaciones-charlas-wf_a8c899c7-b3d.js`
  (bug corregido: `args` llega como string → `JSON.parse`). Reusar con `scriptPath` si se
  quieren regenerar preguntas.

---

## 10. Historial de decisiones (resumen)

Primero se hizo una versión multiusuario con API/D1/PINs; el usuario la descartó (la usa
él solo). Luego versión estática 1-HTML. Después se sumó: 12 charlas del rubro (→64),
5 temas por charla, duración editable, impresión mensual, logo cargable, memoria D1
offline-first, y las 64 evaluaciones de 7 preguntas con su pauta. El usuario tiende a
abrumarse con pasos técnicos: explicar SIMPLE, un paso a la vez, y ofrecer hacerlo por él.
