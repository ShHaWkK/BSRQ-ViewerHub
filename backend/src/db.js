import pg from 'pg';
import fs from 'fs';
import path from 'path';

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DB_URL });

// Exécute les migrations simples
export async function migrate() {
  const file = path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'migrations', '001_init.sql');
  const sql = fs.readFileSync(file, 'utf8');
  await pool.query(sql);
}

export default pool;
