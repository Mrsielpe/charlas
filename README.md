# Programa de Charlas de 5 minutos — Río Loa (CT Padre Hurtado)

Panel **personal** de programación de charlas de 5 minutos. Lo usa solo el APR
(Braulio): programa el año, imprime las hojas individuales, las entrega a los
supervisores y luego registra qué se cumplió y qué no.

Frontend: **un solo archivo** (`index.html`, sin build). Guarda los datos en el
navegador (`localStorage`) y, si se configura, los **sincroniza a Cloudflare D1**
para tener la misma información desde cualquier equipo. Sin D1 configurada, la app
funciona igual en modo local.

```
index.html              → la aplicación (frontend)
functions/api/estado.js → API que lee/escribe el estado en D1 (Pages Function)
schema.sql              → crea la tabla en D1 (una fila con todo el estado en JSON)
wrangler.toml           → configuración (binding D1) para pruebas locales
```

## Flujo de trabajo

1. **Programa** → generar el programa anual (desde la semana que elijas; asigna
   las charlas activas en orden a cada semana, para cada supervisor).
2. **Semanas** → imprimir. Dos formas: **individual** (la hoja de un supervisor)
   o **el mes completo** (un solo PDF con todas las hojas del mes, una por
   supervisor y semana — como se entregan). Al imprimir se asigna folio y la(s)
   hoja(s) quedan **ENTREGADAS** (con fecha de entrega).
3. Cuando el supervisor devuelve la hoja firmada → marcarla **CUMPLIDA**
   (con la fecha real de la charla) o **NO CUMPLIDA**.
4. **Tablero** → semáforo semanal, resumen mensual contra la meta y avance anual.
   El botón **Exportar CSV** genera el insumo para el informe mensual.
5. **Reemplazos**: en Programa, sustituir la charla de una semana (para todos o
   para un supervisor) con motivo; la original queda guardada y se puede
   restaurar. Las hojas ya impresas nunca se modifican.
6. **Charlas** → catálogo base de **64 charlas** (más que un año, sin repetición
   dentro del año). Orden: N°1–20 charlas de planta (vidrio, sílice, soda,
   molienda, hornos), N°21–32 específicas del rubro (materias primas y molienda;
   movimiento de materiales y bodega), N°33–64 de seguridad general. La secuencia
   anual empieza por las de planta y las del rubro. Crear/editar/archivar charlas,
   y botón "Reponer charlas base" para incorporar las del catálogo que falten sin
   tocar el programa. Cada charla tiene **duración editable** y hasta **5 temas
   tratados**; las 64 charlas base traen los 5 temas llenos.
7. **Evaluación** (en cada tarjeta de Semanas, separada del registro): cada charla
   tiene una **evaluación de 7 preguntas** (opción múltiple, formato oficial estilo
   REG-RRHH-002 con marca Río Loa, aprueba con **5/7**). Botón **"Imprimir (1 por
   trabajador)"** = versión **sin respuestas** (se imprime 1 por trabajador);
   **"Pauta"** = versión **con respuestas** para corregir. Además, la hoja de apoyo
   del relator incluye las 7 preguntas con su respuesta correcta marcada.

## Publicar en Cloudflare Pages vía GitHub

1. Subir al repositorio **todo** el proyecto: `index.html`, la carpeta
   `functions/`, `schema.sql`, `wrangler.toml`, `.gitignore` y este README.
2. En el panel de Cloudflare: **Workers & Pages → Create → Pages →
   Connect to Git** → elegir el repo.
3. Configuración de build: *Framework preset* = **None**, *Build command* =
   (vacío), *Build output directory* = `/`. La carpeta `functions/` se detecta y
   despliega sola (ahí vive la API `/api/estado`).
4. Cada push a la rama publicará automáticamente.
5. Para la memoria central, configura D1 una vez (ver más abajo).

## Probar en local

```bash
cd ~/Desktop/Charlas-Programa-RioLoa
python3 -m http.server 8792
# abrir http://localhost:8792
```

## Memoria central con Cloudflare D1 (una vez, desde el panel — sin instalar nada)

Para que los datos vivan en la nube y estén disponibles desde cualquier equipo,
configura la base de datos D1 en el panel de Cloudflare. Es gratis y se hace una
sola vez; después basta con `git push` como siempre.

1. **Crear la base**: en Cloudflare, **Workers & Pages → D1 → Create database**,
   nómbrala `charlas-rioloa`.
2. **Crear la tabla**: entra a esa base → pestaña **Console** y pega el contenido
   de `schema.sql`, luego **Execute**.
3. **Vincular la base al sitio**: en tu proyecto de Pages → **Settings →
   Functions → D1 database bindings → Add binding**. Nombre de la variable:
   `DB`. Base de datos: `charlas-rioloa`. Guarda.
4. **Clave de acceso** (recomendado, para que no cualquiera escriba): en
   **Settings → Environment variables → Add variable**, nombre `APP_CLAVE`,
   valor una clave a tu gusto (márcala como *Secret* si aparece la opción).
5. **Redeploy**: vuelve a desplegar (o haz un `git push`) para que tome los cambios.
6. En la app, arriba a la derecha, clic en el ícono de nube → ingresa la misma
   clave `APP_CLAVE`. Debe quedar **"Cargado de la nube"** en verde.

Si NO configuras D1, la app sigue funcionando en modo **local** (los datos quedan
en el navegador de ese equipo; exporta el respaldo JSON de vez en cuando).

> El estado completo se guarda como **un solo JSON** en D1 (una fila). Pensado para
> un solo usuario: el último cambio manda. Si editas desde dos equipos a la vez,
> gana el último en guardar.

### Probar la nube en tu PC (opcional, requiere Node)

```bash
cd ~/Desktop/Charlas-Programa-RioLoa
npx wrangler d1 execute charlas-rioloa --local --file=schema.sql   # crea la tabla local
npx wrangler pages dev --port 8793                                 # sirve app + API + D1 local
```

## Notas

- El **logo de la empresa** se sube en Ajustes → Documento (PNG/JPG). Aparece en
  la cabecera de la hoja impresa; si no hay logo, usa el texto "RIO LOA".
- El ícono de **nube** (arriba a la derecha) muestra el estado de sincronización
  y sirve para ingresar la clave. En Ajustes → Sincronización hay más detalle.
- Aunque uses la nube, exportar el **respaldo JSON** de vez en cuando no está de más.
- El PDF replica el formato oficial **REG-RRHH-002 (Registro de Actividad)**:
  página 1 = registro para firmas (tipo de actividad marcado en "Otro: Charla
  de 5 minutos", tabla de 22 participantes, Comité PHS); página 2 = material
  de apoyo del relator con el desarrollo de la charla (no forma parte del
  registro firmado). El folio y la semana van discretos arriba a la derecha.
- Estados de cada hoja: `Por imprimir → Entregada → Cumplida / No cumplida`
  (con "Corregir" para volver atrás).
