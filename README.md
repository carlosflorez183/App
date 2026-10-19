# UniPlataforma

Plataforma académica y administrativa para una institución universitaria: portal del
estudiante y el docente, más los módulos de Admisiones, Administración, Rectoría,
Talento Humano y Contabilidad.

El frontend es una SPA en **React 19 + Vite 8**; el backend es una API en
**Fastify 5 + Prisma 6** sobre **PostgreSQL 16**. Todo el stack se levanta con
Docker Compose.

## Stack

| Capa      | Tecnología                                   |
| --------- | -------------------------------------------- |
| Frontend  | React 19, Vite 8, React Router 7 (SPA)        |
| Backend   | Node 20+, Fastify 5, Prisma 6                 |
| Base datos| PostgreSQL 16                                 |
| Servidor  | nginx (sirve la SPA y hace proxy de `/api`)   |
| Pruebas   | `node --test` (API), smoke y acciones (E2E)   |

## Requisitos

- Docker Desktop (para el stack completo) **o** Node.js 20+ y PostgreSQL 16 (desarrollo local).
- Puertos libres: `8080` (interfaz), `3000` (API) y `5432` (PostgreSQL).

## Puesta en marcha (Docker)

```bash
docker compose up -d --build
```

Servicios que quedan arriba:

| Servicio | Descripción                          | URL                     |
| -------- | ------------------------------------ | ----------------------- |
| app      | Interfaz web (nginx)                 | http://localhost:8080   |
| api      | API Fastify + Prisma                 | http://localhost:3000   |
| db       | PostgreSQL 16                        | localhost:5432          |

La API no arranca hasta que la base está sana, las **migraciones** se aplicaron y el
**seed** terminó. El servicio `seed` es de un solo uso y corre automáticamente.

> El seed reemplaza los datos de demostración. Requiere `SEED_FORCE=1` (ya fijado en
> `docker-compose.yml`); sin esa bandera el seed **no** borra una base con datos.

Comandos útiles:

```bash
docker compose logs -f api     # seguir los logs de la API
docker compose ps              # estado de los servicios
docker compose down            # detener (conserva el volumen de datos)
docker compose down -v         # detener y borrar la base
```

## Cuentas

Las credenciales **no viven en el código**: solo en la base de datos y en el
`.env` (que está fuera del control de versiones). El login se valida siempre
contra la base.

| Rol             | Usuario   |
| --------------- | --------- |
| Estudiante      | `EST001`  |
| Docente         | `PROF001` |
| Admisiones      | `ADMI`    |
| Administración  | `ADMIN`   |
| Rectoría        | `RECTOR`  |
| Talento Humano  | `TALENTO` |
| Contabilidad    | `CONTA`   |

- Con `SEED_DEMO=1`, todas las cuentas anteriores toman la clave de
  `DEMO_PASSWORD`.
- `ADMIN_USUARIO` / `ADMIN_PASSWORD` garantizan un administrador aunque
  `SEED_DEMO=0` (bootstrap de una base nueva).
- Con `DEMO_QUICK_LOGIN=1`, el login muestra botones de **acceso rápido**: la
  lista y el ingreso los sirve el backend desde la base de datos, así que la
  contraseña nunca viaja al navegador. Déjalo en `0` en producción.

## Desarrollo local (sin Docker)

```bash
# 1. Base de datos
#    (o usa el contenedor db: docker compose up -d db)

# 2. API
cd server
npm install
#   crea server/.env con, al menos:
#     DATABASE_URL=postgresql://uni:uni_dev_password@localhost:5432/uni_plataforma
#     JWT_SECRET=cambiar-en-produccion
npm run prisma:migrate         # aplica migraciones  (o prisma:push)
SEED_DEMO=1 DEMO_PASSWORD=tu-clave npm run prisma:seed   # datos de demostración
npm run dev                    # API en http://localhost:3000

# 3. Frontend (otra terminal, en la raíz)
npm install
npm run dev                    # http://localhost:5173 (proxy /api hacia :3000)
```

## Variables de entorno

| Variable               | Uso                                              | Default en compose |
| ---------------------- | ------------------------------------------------ | ------------------ |
| `DB_PASSWORD`          | Contraseña de PostgreSQL                         | `uni_dev_password` |
| `JWT_SECRET`           | Firma de los tokens de sesión                    | (dev; **cambiar en producción**) |
| `RATE_LIMIT_LOGIN_MAX` | Intentos de login por cuenta antes del 429       | `30` en demo, `5` en producción |
| `CORS_ORIGIN`          | Orígenes permitidos                              | `http://localhost:8080,http://localhost:5173` |
| `SEED_DEMO`            | `1` crea las cuentas de demostración            | `0` (ponlo en `1` para el demo) |
| `DEMO_PASSWORD`        | Clave común de las cuentas de demostración      | (sin valor)        |
| `ADMIN_USUARIO`        | Usuario del administrador de arranque           | `ADMIN`            |
| `ADMIN_PASSWORD`       | Clave del administrador de arranque             | (sin valor)        |
| `DEMO_QUICK_LOGIN`     | `1` muestra el acceso rápido en el login         | `0` (ponlo en `1` para el demo) |
| `VITE_API_URL`         | API a la que apunta el frontend                  | `/api` (relativo)  |

## Scripts

En la raíz del proyecto:

| Script            | Qué hace                                                        |
| ----------------- | -------------------------------------------------------------- |
| `npm run dev`     | Sirve el frontend en modo desarrollo (Vite).                    |
| `npm run build`   | Compila la SPA a `dist/`.                                       |
| `npm run lint`    | Análisis estático con oxlint.                                   |
| `npm run smoke`   | Recorrido E2E de las vistas principales por rol.                |
| `npm run acciones`| E2E de acciones (crear, editar, exportar) por rol.              |
| `npm run backup`  | Respalda la base PostgreSQL (`scripts/backup-db.sh`).           |
| `npm test` (en `server/`) | Pruebas de la API con `node --test`.                    |

`smoke` y `acciones` necesitan una sesión de Chrome y la API arriba; consulta los
encabezados de `scripts/smoke.mjs` y `scripts/acciones.mjs` para las variables
`SMOKE_BROWSER`, `ACCIONES_BROWSER` y `TMPDIR`.

## Base de datos: migraciones, seed y respaldos

- **Migraciones** en `server/prisma/migrations/`; se aplican con `npx prisma migrate deploy`.
- **Seed** en `server/prisma/seed.js`; reemplaza los datos solo con `SEED_FORCE=1`.
  Las cuentas salen del entorno: `SEED_DEMO=1` + `DEMO_PASSWORD` crean las de
  demostración, y `ADMIN_USUARIO`/`ADMIN_PASSWORD` aseguran un administrador.
- **Respaldo**:

  ```bash
  npm run backup                         # crea backups/uni_plataforma-<sello>.sql.gz
  scripts/backup-db.sh /ruta/destino     # directorio a medida
  ```

- **Restaurar** (¡sobrescribe la base actual!):

  ```bash
  gunzip -c backups/uni_plataforma-<sello>.sql.gz \
    | docker exec -i uni-db psql -U uni -d uni_plataforma
  ```

## Estructura

```
src/                 SPA (páginas por módulo, componentes, cliente de API)
server/              API Fastify + Prisma
  src/routes/        Rutas por dominio (auth, admin, matricula, ...)
  prisma/            Esquema, migraciones y seed
scripts/             Utilidades (smoke, acciones, backup)
docker-compose.yml   Stack completo
```

## Solución de problemas

- **La API no arranca:** revisa `docker compose logs api`. Si el esquema no existe,
  vuelve a correr `docker compose up seed` para aplicar migraciones y sembrar.
- **429 al iniciar sesión:** es el límite de intentos; súbelo con `RATE_LIMIT_LOGIN_MAX`
  o espera un minuto.
- **Cambios en el backend no se reflejan:** la imagen `uni-plataforma-api` es la que usan
  `api` y `seed`; reconstruye con `docker compose up -d --build`.
