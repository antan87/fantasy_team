import { DatabaseSync } from 'node:sqlite';
import path from 'path';

const DB_FILE = path.join(process.cwd(), 'temp/persistence.db');
const db = new DatabaseSync(DB_FILE);

const stmt = db.prepare('SELECT key, value FROM kv');
const rows = stmt.all();

console.log('--- ROUND 1 KEYS ---');
for (const row of rows) {
  if (row.key.includes('_r1')) {
    console.log(`${row.key}:`);
    try {
      const parsed = JSON.parse(row.value);
      if (Array.isArray(parsed)) {
        console.log(`Array of size ${parsed.length}`);
        if (row.key.includes('locked_squad')) {
          console.log(parsed.map(p => `${p.name} (price: ${p.price}, growth: ${p.stats?.growth}, captain: ${p.isCaptain})`).join('\n'));
        }
      } else {
        console.log(parsed);
      }
    } catch (e) {
      console.log(row.value);
    }
    console.log('-----------------------------');
  }
}
