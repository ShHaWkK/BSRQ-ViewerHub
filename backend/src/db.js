import pg from 'pg';
import fs from 'fs';
import path from 'path';

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DB_URL });

// Exécute les migrations simples
export async function migrate() {
  const migrationsDir = path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'migrations');
  const migrationFiles = fs.readdirSync(migrationsDir)
    .filter(file => file.endsWith('.sql'))
    .sort(); // Trier par nom de fichier pour exécuter dans l'ordre
  
  for (const file of migrationFiles) {
    const filePath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(filePath, 'utf8');
    console.log(`Exécution de la migration: ${file}`);
    await pool.query(sql);
  }
}

export default pool;
