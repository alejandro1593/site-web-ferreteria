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
- **Base de datos:** MySQL (mysql2)
- **Autenticación:** JWT (jsonwebtoken) + bcrypt
- **Seguridad:** helmet, express-rate-limit
- **Frontend:** HTML/CSS/JS vanilla (sin framework), jsPDF para PDFs
- **Testing:** Jest + Supertest

## 📋 Requisitos previos

- [Node.js](https://nodejs.org) v18 o superior
- [MySQL](https://www.mysql.com) corriendo localmente (o [XAMPP](https://www.apachefriends.org))
- La base de datos `db_ferreteria` importada (dump SQL del proyecto)

## ⚙️ Instalación

```bash
# 1. Instalar dependencias
npm install

# 2. Crear el archivo .env en la raíz (ver sección siguiente)

# 3. Ejecutar la migración (crea tablas faltantes y columnas nuevas)
npm run migrate

# 4. Iniciar en modo desarrollo
npm run dev
```

El sistema queda disponible en `http://localhost:3000`

### Variables de entorno (`.env`)

```env
# Database Configuration
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=tu_contraseña_mysql
DB_NAME=db_ferreteria

# Server Configuration
PORT=3000

# JWT Configuration
JWT_SECRET=cadena_aleatoria_larga_y_secreta
JWT_EXPIRES_IN=24h
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
| `npm test` | Ejecuta los tests de seguridad (requiere MySQL corriendo) |
| `npm run migrate` | Migración idempotente de la base de datos |
| `npm run backup` | Backup de la BD a `backups/` (borra respaldos >30 días) |

## 📁 Estructura del proyecto

```
├── src/
│   ├── app.js                  # Servidor Express (helmet, rate-limit, rutas)
│   ├── config/
│   │   └── db_mysql.js         # Conexión MySQL (pool compartido)
│   ├── models/                 # Consultas SQL (Producto, Venta, Compra, Ajuste...)
│   ├── controllers/            # Lógica de negocio por módulo
│   ├── routes/                 # Endpoints API + index.js que los monta
│   ├── routeViews/             # Rutas que sirven las vistas HTML
│   ├── utils/
│   │   └── audit.js            # Registro de auditoría (log_acciones)
│   ├── views/                  # Interfaces HTML
│   └── static/js/              # JavaScript del frontend por vista
├── scripts/
│   ├── migracion_v2.js         # Migración de BD (idempotente)
│   ├── backup_db.js            # Backup automático con mysqldump
│   ├── rotar_passwords.js      # Rotación masiva de claves (gitignored)
│   └── auditar_accesos.js      # Auditoría de cuentas (gitignored)
└── tests/
    └── auth.test.js            # Tests de autenticación, roles y seguridad
```

## 🔐 Roles y permisos

| Rol | Puede |
|---|---|
| `admin` | Todo (usuarios, auditoría, anular compras, eliminar registros) |
| `gerente` | Casi todo; sin gestión de usuarios ni logs |
| `supervisor` / `cajero` / `vendedor` / `almacen` | Operaciones según módulo |

Las escrituras críticas (crear/editar/eliminar productos, ventas, usuarios,
compras) requieren token con rol `admin` o `gerente`. El registro de usuarios es
privado (solo un admin autenticado puede crear cuentas).

## 🛡️ Seguridad implementada

- Contraseñas hasheadas con **bcrypt**
- Tokens **JWT** firmados con secreto rotable
- **Rate limiting**: login máx. 10 intentos/15 min · API 300 req/min
- **Helmet** para cabeceras HTTP seguras
- Sanitización anti-XSS en todas las vistas
- Control de roles por endpoint (no confía en el cliente)
- Auditoría de operaciones sensibles (`log_acciones`)
- Tests automatizados de escalada de privilegios y acceso

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

Genera `backups/backup_AAAA-MM-DD-HH-MM-SS.sql` usando `mysqldump`
(auto-detectado en XAMPP). Se recomienda programarlo diariamente y guardar una
copia fuera de la máquina.

## 🧪 Tests

```bash
npm test
```

Los tests crean sus propias cuentas efímeras (`test_admin_seg`,
`test_vendedor_seg`) y las eliminan al terminar — no tocan usuarios reales.
Requieren MySQL corriendo con la BD migrada.
