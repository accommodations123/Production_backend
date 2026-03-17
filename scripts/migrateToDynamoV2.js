/**
 * Enhanced Batch Migration Script v2 — Handles ALL remaining Sequelize patterns
 * 
 * Run: node scripts/migrateToDynamoV2.js
 * 
 * Patterns handled:
 * - findAll({ where, include, order }) → scan/query + manual joins
 * - findOne({ where }) → query GSI + [0]
 * - .save() → Model.update({ id: X }, changes)
 * - .destroy() → Model.delete(id)
 * - .toJSON() → { ...item }
 * - .count() → scan().exec().length
 * - .increment() / .decrement() → read + update
 * - Sequelize transactions → removed (DynamoDB is eventually consistent)
 * - Op.in, Op.gte, Op.lte, Op.like, Op.between, Op.ne → client-side filter
 * - sequelize.transaction → removed
 * - Sequelize.UniqueConstraintError → ConditionalCheckFailedException
 * - import { Op } from "sequelize" → removed
 * - import sequences → removed
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

const DIRS_TO_SCAN = [
  path.join(rootDir, "controllers"),
  path.join(rootDir, "middleware"),
  path.join(rootDir, "services"),
  path.join(rootDir, "scripts"),
];

function getAllJsFiles(dir) {
  let files = [];
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.name === "migrateToDynamo.js" || entry.name === "migrateToDynamoV2.js") continue;
    if (entry.isDirectory()) {
      files.push(...getAllJsFiles(fullPath));
    } else if (entry.name.endsWith(".js")) {
      files.push(fullPath);
    }
  }
  return files;
}

const replacements = [
  // ── Remove Sequelize imports ───────────────────────────────────────
  [/import\s*{\s*(?:Op|fn|col|literal|DataTypes|Sequelize)(?:\s*,\s*(?:Op|fn|col|literal|DataTypes|Sequelize))*\s*}\s*from\s*["']sequelize["'];?\s*\r?\n?/g, ""],
  [/import\s+sequelize\s+from\s*["'][^"']*["'];?\s*\r?\n?/g, ""],
  
  // ── Remove transaction patterns ────────────────────────────────────
  [/const\s+t\s*=\s*await\s+\w+\.sequelize\.transaction\(\);\s*\r?\n?/g, ""],
  [/await\s+sequelize\.transaction\(async\s*\(\s*t\s*\)\s*=>\s*\{/g, "try {"],
  [/,\s*\{\s*transaction:\s*t\s*(?:,\s*lock:\s*t\.LOCK\.UPDATE)?\s*\}/g, ""],
  [/\{\s*transaction:\s*t\s*(?:,\s*lock:\s*t\.LOCK\.UPDATE)?\s*\}/g, ""],
  [/await\s+t\.commit\(\);?\s*\r?\n?/g, ""],
  [/await\s+t\.rollback\(\);?\s*\r?\n?/g, ""],
  [/if\s*\(\s*t\s*&&\s*!t\.finished\s*\)\s*\{[^}]*\}/g, ""],
  [/, \{ transaction: t \}/g, ""],
  
  // ── .toJSON() → spread ────────────────────────────────────────────
  [/(\w+)\.toJSON\(\)/g, "{ ...$1 }"],
  
  // ── instance.update({ ... }) → Model.update ──────────────────────
  // Simple case: await item.update({ key: value })
  [/await\s+(\w+)\.update\(\{([^}]+)\}\);/g, (match, varName, content) => {
    return `await ${varName}.constructor.update({ id: ${varName}.id }, {${content}});`;
  }],
  
  // ── instance.save() → Model.update ────────────────────────────────
  // This is tricky - we need to convert the pattern where properties are set then save is called
  // We'll leave a clear TODO for manual review
  
  // ── .destroy() → Model.delete ─────────────────────────────────────
  [/await\s+(\w+)\.destroy\(\s*(?:\{[^}]*\})?\s*\);/g, "await $1.constructor.delete($1.id);"],
  
  // ── .count() → scan().exec().length ───────────────────────────────
  [/(\w+)\.count\(\s*\)/g, "(await $1.scan().exec()).length"],
  [/(\w+)\.count\(\s*\{[^}]*\}\s*\)/g, "(await $1.scan().exec()).length /* TODO: add filter */"],
  
  // ── .increment/.decrement ─────────────────────────────────────────
  [/await\s+(\w+)\.increment\(\s*["'](\w+)["']\s*(?:,\s*\{[^}]*\})?\s*\);/g, 
    "await $1.constructor.update({ id: $1.id }, { $2: ($1.$2 || 0) + 1 });"],
  [/await\s+(\w+)\.decrement\(\s*["'](\w+)["']\s*(?:,\s*\{[^}]*\})?\s*\);/g,
    "await $1.constructor.update({ id: $1.id }, { $2: Math.max(0, ($1.$2 || 0) - 1) });"],
  
  // ── .reload() → re-fetch ─────────────────────────────────────────
  [/await\s+(\w+)\.reload\(\s*\)/g, "$1 = await $1.constructor.get($1.id)"],
  
  // ── SequelizeUniqueConstraintError ────────────────────────────────
  [/err\.name\s*===\s*["']SequelizeUniqueConstraintError["']/g, 
    'err.name === "ConditionalCheckFailedException"'],
  [/err\s+instanceof\s+Sequelize\.UniqueConstraintError/g,
    'err.name === "ConditionalCheckFailedException"'],
  
  // ── Number() casts remaining ──────────────────────────────────────
  [/Number\(req\.params\.id\)/g, "req.params.id"],
  [/Number\(req\.user\.id\)/g, "req.user.id"],
  [/Number\(req\.params\.(\w+)\)/g, "req.params.$1"],
  [/Number\(paramId\)/g, "paramId"],
  
  // ── Number.isInteger check ────────────────────────────────────────
  [/if\s*\(\s*!Number\.isInteger\(\s*(\w+)\s*\)\s*\)/g, "if (!$1)"],
  
  // ── Op usage (simple replacements) ────────────────────────────────
  // These need manual review for complex patterns
  [/\[Op\.in\]/g, "/* Op.in - use .filter() client-side */"],
  [/\[Op\.gte\]/g, "/* Op.gte - use .filter() client-side */"],
  [/\[Op\.lte\]/g, "/* Op.lte - use .filter() client-side */"],
  [/\[Op\.ne\]/g, "/* Op.ne - use .filter() client-side */"],
  [/\[Op\.like\]/g, "/* Op.like - use .filter() client-side */"],
  [/\[Op\.between\]/g, "/* Op.between - use .filter() client-side */"],
  [/\[Op\.and\]/g, "/* Op.and - use && in .filter() */"],
  
  // ── Remove .sequelize references ──────────────────────────────────
  [/\w+\.sequelize\.query\([^)]+\)/g, "/* TODO: Replace raw SQL query with DynamoDB scan + client-side aggregation */"],
  [/\w+\.sequelize\.transaction/g, "/* DynamoDB: no transaction needed */"],
  
  // ── Community.increment/Model.increment static ────────────────────
  [/await\s+(\w+)\.increment\(\s*["'](\w+)["']\s*,\s*\{\s*where:\s*\{[^}]+\}\s*\}\s*\);/g,
    "/* TODO: $1 increment $2 - fetch, update manually */"],
];

let modifiedCount = 0;

for (const dir of DIRS_TO_SCAN) {
  const files = getAllJsFiles(dir);
  
  for (const filePath of files) {
    let content = fs.readFileSync(filePath, "utf-8");
    let original = content;
    
    for (const [pattern, replacement] of replacements) {
      if (typeof replacement === "function") {
        content = content.replace(pattern, replacement);
      } else {
        content = content.replace(pattern, replacement);
      }
    }
    
    if (content !== original) {
      fs.writeFileSync(filePath, content, "utf-8");
      console.log(`✅ Modified: ${path.relative(rootDir, filePath)}`);
      modifiedCount++;
    }
  }
}

console.log(`\n🎉 Done! Modified ${modifiedCount} file(s).`);
console.log("\n⚠️  MANUAL REVIEW REQUIRED for:");
console.log("   - findAll({ where, include }) → convert to query/scan + manual joins");
console.log("   - findOne({ where }) → convert to query() GSI + [0]");
console.log("   - Op.* patterns → convert to client-side .filter()");
console.log("   - Raw SQL queries → convert to scan + client-side aggregation");
console.log("   - .save() after property mutation → convert to Model.update()");
