// Script para ajustar la tabla "User" en PostgreSQL según el schema de Prisma
// Ejecuta: node prisma/fix_user_table.js

const { Pool } = require('pg');
require('dotenv').config();

async function main() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    console.error('❌ DATABASE_URL no está definida en el archivo .env');
    process.exit(1);
  }

  const pool = new Pool({ connectionString });

  try {
    console.log('🔄 Conectando a la base de datos...');

    // Asegurar columna "name" en tabla "User"
    await pool.query(
      'ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "name" TEXT;'
    );

    console.log('✅ Columna "name" verificada/creada en tabla "User"');
  } catch (err) {
    console.error('❌ Error ajustando la tabla "User":', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error('❌ Error inesperado:', err);
  process.exit(1);
});

// Script para ajustar la tabla "User" en PostgreSQL según el schema de Prisma
// Ejecuta: node prisma/fix_user_table.js

const { Pool } = require('pg');
require('dotenv').config();

async function main() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    console.error('❌ DATABASE_URL no está definida en el archivo .env');
    process.exit(1);
  }

  const pool = new Pool({ connectionString });

  try {
    console.log('🔄 Conectando a la base de datos...');

    // Asegurar columna "name" en tabla "User"
    await pool.query(
      'ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "name" TEXT;'
    );

    console.log('✅ Columna "name" verificada/creada en tabla "User"');
  } catch (err) {
    console.error('❌ Error ajustando la tabla "User":', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error('❌ Error inesperado:', err);
  process.exit(1);
});

