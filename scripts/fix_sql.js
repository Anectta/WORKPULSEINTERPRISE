const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'supabase', 'MIGRATION_UNICA_COMPLETA.sql');
let sql = fs.readFileSync(filePath, 'utf8');

// Replace CREATE POLICY "name" ON table with DROP POLICY IF EXISTS "name" ON table; CREATE POLICY "name" ON table
sql = sql.replace(/CREATE\s+POLICY\s+("[^"]+"|[a-zA-Z0-9_]+)\s+ON\s+([a-zA-Z0-9_.]+)/gi, (match, pName, tbl) => {
  return `DROP POLICY IF EXISTS ${pName} ON ${tbl};\n${match}`;
});

// Replace CREATE TRIGGER name ... ON table with DROP TRIGGER IF EXISTS name ON table; CREATE TRIGGER name ... ON table
sql = sql.replace(/CREATE\s+TRIGGER\s+("[^"]+"|[a-zA-Z0-9_]+)\s+(BEFORE|AFTER)\s+([a-zA-Z0-9_\s]+)\s+ON\s+([a-zA-Z0-9_.]+)/gi, (match, trgName, timing, events, tbl) => {
  return `DROP TRIGGER IF EXISTS ${trgName} ON ${tbl};\n${match}`;
});

fs.writeFileSync(filePath, sql, 'utf8');
console.log('Script MIGRATION_UNICA_COMPLETA.sql atualizado com sucesso com DROP IF EXISTS!');
