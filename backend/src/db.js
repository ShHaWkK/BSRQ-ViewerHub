import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DB_URL });

// Exécute les migrations
export async function migrate() {
  const dirname = path.dirname(fileURLToPath(import.meta.url));
  const migrationsDir = path.join(dirname, '..', 'migrations');
  const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    const { rows } = await client.query('SELECT filename FROM schema_migrations');
    const applied = new Set(rows.map(r => r.filename));
    for (const file of files) {
      if (applied.has(file)) continue;
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf8');
      console.log(`Exécution de la migration: ${file}`);
      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations(filename) VALUES($1)', [file]);
        await client.query('COMMIT');
      } catch (e) {
        await client.query('ROLLBACK');
        throw e;
      }
    }
  } finally {
    client.release();
  }
}

export default pool;
