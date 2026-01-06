const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env');
const envContent = `# Database Configuration
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=db_ferreteria

# Server Configuration
PORT=3000

# JWT Configuration
JWT_SECRET=tu_clave_secreta_super_segura_cambiala_en_produccion_2024
JWT_EXPIRES_IN=24h
`;

fs.writeFileSync(envPath, envContent);
console.log('✅ Archivo .env actualizado con nombre correcto de base de datos');
console.log('📝 Nombre de la base de datos: db_ferreteria');
