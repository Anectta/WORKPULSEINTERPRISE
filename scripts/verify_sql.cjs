const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'supabase', 'MIGRATION_UNICA_COMPLETA.sql');
let sql = fs.readFileSync(filePath, 'utf8');

const cp = (sql.match(/CREATE POLICY/gi) || []).length;
const dp = (sql.match(/DROP POLICY IF EXISTS/gi) || []).length;
const ct = (sql.match(/CREATE TRIGGER/gi) || []).length;
const dt = (sql.match(/DROP TRIGGER IF EXISTS/gi) || []).length;

console.log(JSON.stringify({ createPolicies: cp, dropPolicies: dp, createTriggers: ct, dropTriggers: dt }, null, 2));
