# 🛠️ Sistema de Gestión para Ferretería

Sistema web completo para administrar una ferretería: punto de venta, inventario,
compras a proveedores, ventas a crédito (fiados), cotizaciones, caja, reportes de
ganancias y auditoría de acciones.

---

## ✨ Funcionalidades

| Módulo | Descripción |
|---|---|
| 🧾 **Punto de venta** | Ventas rápidas con escáner de código de barras, múltiples métodos de pago |
| 💳 **Fiados (crédito)** | Venta a crédito con saldo pendiente y abonos parciales |
| 📦 **Inventario** | Productos, categorías, proveedores, stock mínimo y ajustes con motivo |
| 🛍️ **Compras** | Registro de mercadería que aumenta stock y actualiza costo (transaccional) |
| 📊 **Reportes** | Ganancias por período (ingreso vs costo), historial de ventas, fiados pendientes |
| 💰 **Caja** | Apertura/cierre de caja por usuario |
| ↩️ **Devoluciones** | Registro de devoluciones de productos |
| 📋 **Cotizaciones** | Cotizaciones convertibles a venta |
| 👥 **Usuarios y roles** | Control de acceso por rol en cada endpoint |
| 🔍 **Auditoría** | Log de acciones críticas (quién creó/eliminó/abonó qué) |

## 🧰 Tecnologías

- **Backend:** Node.js + Express 5
- **Base de datos:** PostgreSQL (pg) con pool de conexiones
- **Autenticación:** JWT (jsonwebtoken) + bcryptjs
- **Seguridad:** helmet, express-rate-limit
- **Frontend:** HTML/CSS/JS vanilla (sin framework), jsPDF para PDFs
- **Testing:** Jest + Supertest

## 📋 Requisitos previos

- [Node.js](https://nodejs.org) v18 o superior
- [PostgreSQL](https://www.postgresql.org/) 14 o superior, o una base Neon PostgreSQL
- La base de datos migrada y el esquema aplicado

## ⚙️ Instalación

```bash
# 1. Instalar dependencias
npm install

# 2. Copiar la configuración de ejemplo y completar DATABASE_URL
cp .env.example .env

# 3. Aplicar el esquema PostgreSQL
npm run migrate:postgres

# 4. Iniciar en modo desarrollo
npm run dev
```

El sistema queda disponible en `http://localhost:3000`

### Variables de entorno (`.env`)

```env
# PostgreSQL / Neon
DATABASE_URL=postgresql://usuario:password@host:5432/db_ferreteria?sslmode=verify-full
DB_POOL_MAX=10
DB_CONNECTION_TIMEOUT_MS=10000
DB_IDLE_TIMEOUT_MS=30000
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000

# Server Configuration
PORT=3000

# JWT Configuration
JWT_SECRET=cadena_aleatoria_larga_y_secreta
JWT_EXPIRES_IN=8h
JWT_ISSUER=ferreteria-api
JWT_AUDIENCE=ferreteria-web
```

> 💡 Para generar un `JWT_SECRET` seguro:
> ```bash
> node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
> ```

## 📜 Scripts disponibles

| Comando | Acción |
|---|---|
| `npm run dev` | Servidor de desarrollo con recarga automática (nodemon) |
| `npm start` | Servidor en producción |
| `npm run migrate:postgres` | Aplica el esquema PostgreSQL versionado |
| `npm run import:mysql -- <archivo.sql>` | Importa un dump MariaDB/MySQL en una base PostgreSQL vacía; exige asociaciones de ventas y bloquea el destino durante la carga |
| `npm run import:mysql:dry-run -- <archivo.sql>` | Valida el dump sin escribir en PostgreSQL |
| `npm test` | Ejecuta los tests contra `TEST_DATABASE_URL` |
| `npm run lint` | Verifica la sintaxis de todos los archivos JavaScript |
| `npm run backup` | Genera un respaldo PostgreSQL local; usa `pg_dump` cuando está disponible |
| `npm run restore:postgres -- --file <respaldo>` | Restaura un respaldo únicamente en una base de prueba, con `RESTORE_ALLOW=true` |
| `npm run check:integrity` | Revisa asociaciones de ventas, cajas, stock y cuadres financieros |

## 📁 Estructura del proyecto

```
├── src/
│   ├── app.js                  # Servidor Express (helmet, rate-limit, rutas)
│   ├── config/
│   │   ├── auth_config.js      # Configuración y validación JWT
│   │   └── db_postgres.js      # Pool PostgreSQL y transacciones
│   ├── models/                 # Consultas SQL (Producto, Venta, Compra, Ajuste...)
│   ├── controllers/            # Lógica de negocio por módulo
│   ├── routes/                 # Endpoints API + index.js que los monta
│   ├── routeViews/             # Rutas que sirven las vistas HTML
│   ├── utils/
│   │   └── audit.js            # Registro de auditoría (log_acciones)
│   ├── views/                  # Interfaces HTML
│   └── static/js/              # JavaScript del frontend por vista
├── scripts/
│   ├── postgres_schema.js      # Esquema PostgreSQL versionado
│   ├── import_mysql_dump.js    # Importador controlado MariaDB/MySQL → PostgreSQL
│   ├── migracion_v2.js         # Alias compatible de la migración PostgreSQL
│   ├── backup_db.js            # Respaldo local de PostgreSQL
│   ├── check_integrity.js      # Auditoría de integridad de datos
│   ├── rotar_passwords.js      # Rotación masiva de claves (gitignored)
│   └── auditar_accesos.js      # Auditoría de cuentas (gitignored)
└── tests/
    ├── auth.test.js            # Tests de autenticación, roles y seguridad
    └── caja.test.js           # Tests de caja, ventas y cierre
```

## 🔐 Roles y permisos

| Rol | Puede |
|---|---|
| `admin` | Todo (usuarios, auditoría, anular compras, eliminar registros) |
| `gerente` | Casi todo; sin gestión de usuarios ni logs |
| `supervisor` / `cajero` / `vendedor` / `almacen` | Operaciones según módulo |

Las escrituras de productos, compras, usuarios y eliminación de ventas requieren
un rol autorizado. Las ventas, clientes, cotizaciones y devoluciones operativas
se validan también en el backend. El registro de usuarios es privado (solo un
admin autenticado puede crear cuentas).

## 🛡️ Seguridad implementada

- Contraseñas hasheadas con **bcryptjs**
- Tokens **JWT** firmados con algoritmo, issuer y audience validados; revocados mediante `token_version`
- Contraseñas de al menos 10 caracteres con letras y números
- **Rate limiting**: login máx. 10 intentos/15 min · API 300 req/min
- **Helmet** y CSP para cabeceras HTTP seguras
- Sanitización anti-XSS en las vistas
- Control de roles por endpoint (no confía en el cliente)
- Transacciones y bloqueos de inventario/caja para ventas, compras, abonos y devoluciones
- Auditoría transaccional de operaciones sensibles (`log_acciones`)
- Health check en `GET /health` y verificación de integridad financiera
- Tests automatizados de escalada de privilegios, caja y acceso

## 🔑 Contraseñas

Las contraseñas de los usuarios **nunca se suben al repositorio**. Se gestionan
localmente en `scripts/.passwords_local.txt` (ignorado por git). Para rotarlas:

```bash
node scripts/rotar_passwords.js   # genera claves fuertes nuevas para todos
```

## 🗄️ Backup de la base de datos

```bash
npm run backup
```

Genera un respaldo local usando la configuración `DATABASE_URL`; cuando `pg_dump`
está disponible crea un dump PostgreSQL restoreable y, si no, conserva un snapshot
JSON. Para restaurarlo se requiere una base cuyo nombre incluya `test`, `restore` o
`staging` y confirmación explícita:

```bash
RESTORE_ALLOW=true RESTORE_TARGET_DATABASE=neondb_test npm run restore:postgres -- --file backups/backup_<timestamp>.dump
```

El restaurador exige una base vacía, un bloqueo de destino y verifica el
checksum SHA-256 cuando existe el archivo `.sha256` acompañante.

Los respaldos contienen datos personales y deben guardarse cifrados y fuera del
repositorio. Nunca se debe usar `RESTORE_ALLOW=true` contra producción.

## 🧪 Tests

```bash
npm test
```

Los tests crean sus propias cuentas efímeras (`test_admin_seg`,
`test_vendedor_seg`) y las eliminan al terminar.
Requieren `TEST_DATABASE_URL` apuntando a una base PostgreSQL cuyo nombre incluya
`test` y distinta de `DATABASE_URL`; nunca deben apuntar a producción.
