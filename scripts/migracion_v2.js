const { migrate } = require('./postgres_schema');

migrate().catch((error) => {
  console.error('Error de migración PostgreSQL:', error.code || error.message);
  process.exit(1);
});
