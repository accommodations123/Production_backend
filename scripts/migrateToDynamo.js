/**
 * Batch Migration Script — Replaces ALL remaining Sequelize patterns in controllers
 * 
 * Run: node scripts/migrateToDynamo.js
 * 
 * This script:
 * 1. Scans all .js files under controllers/ and scripts/
 * 2. Replaces Sequelize patterns with Dynamoose equivalents
 * 3. Reports files modified
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
  path.join(rootDir, "scripts"),
  path.join(rootDir, "services"),
];

function getAllJsFiles(dir) {
  let files = [];
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...getAllJsFiles(fullPath));
    } else if (entry.name.endsWith(".js")) {
      files.push(fullPath);
    }
  }
  return files;
}

const replacements = [
  // ── Import replacements ───────────────────────────────────────────────
  [/import\s*{\s*DataTypes\s*}\s*from\s*["']sequelize["'];?\s*\r?\n?/g, ""],
  [/import\s*{\s*Op\s*}\s*from\s*["']sequelize["'];?\s*\r?\n?/g, ""],
  [/import\s*{\s*DataTypes\s*,\s*Op\s*}\s*from\s*["']sequelize["'];?\s*\r?\n?/g, ""],
  [/import\s*{\s*Op\s*,\s*DataTypes\s*}\s*from\s*["']sequelize["'];?\s*\r?\n?/g, ""],
  [/import\s+sequelize\s+from\s*["'][^"']*config\/db\.js["'];?\s*\r?\n?/g, ""],
  [/import\s*{\s*Sequelize\s*}\s*from\s*["']sequelize["'];?\s*\r?\n?/g, ""],
  
  // ── findByPk → get ────────────────────────────────────────────────────
  [/(\w+)\.findByPk\(([^,)]+)\s*,\s*\{[^}]*\}\s*\)/g, "$1.get($2)"],
  [/(\w+)\.findByPk\(([^)]+)\)/g, "$1.get($2)"],
  
  // ── findOne({ where: { field: value } }) → query or get ──────────────
  // Simple: findOne({ where: { id: X } }) → get(X)
  [/(\w+)\.findOne\(\s*\{\s*where:\s*\{\s*id:\s*([^}]+)\s*\}\s*\}\s*\)/g, "$1.get($2)"],
  
  // ── findAndCountAll → scan (DynamoDB doesn't have SQL-style count) ───
  [/(\w+)\.findAndCountAll\(\{[^}]*\}\)/g, "$1.scan().exec()"],
  
  // ── .save() → Model.update({ id: X }, changes) ───────────────────────
  // This is complex so we do a simpler pattern
  // [/await\s+(\w+)\.save\(\)/g, "// TODO: use Model.update({ id: $1.id }, changes)"],
  
  // ── Number() casts (IDs are now UUID strings) ─────────────────────────
  [/Number\(req\.params\.id\)/g, "req.params.id"],
  [/Number\(req\.user\.id\)/g, "req.user.id"],
  [/Number\(req\.params\.(\w+)\)/g, "req.params.$1"],
  
  // ── unscoped() — not needed in DynamoDB ───────────────────────────────
  [/(\w+)\.unscoped\(\)\./g, "$1."],
  [/(\w+)\.scope\([^)]*\)\./g, "$1."],
];

let modifiedCount = 0;

for (const dir of DIRS_TO_SCAN) {
  const files = getAllJsFiles(dir);
  
  for (const filePath of files) {
    let content = fs.readFileSync(filePath, "utf-8");
    let original = content;
    
    for (const [pattern, replacement] of replacements) {
      content = content.replace(pattern, replacement);
    }
    
    if (content !== original) {
      fs.writeFileSync(filePath, content, "utf-8");
      console.log(`✅ Modified: ${path.relative(rootDir, filePath)}`);
      modifiedCount++;
    }
  }
}

console.log(`\n🎉 Done! Modified ${modifiedCount} file(s).`);
console.log("⚠️  Please manually review each modified file for:");
console.log("   - findAll/findOne with complex where clauses → use scan().filter() or query()");
console.log("   - Sequelize Op operators (Op.gt, Op.like, etc.) → use Dynamoose filter conditions");
console.log("   - .create() calls → should work as-is");
console.log("   - .update() instance calls → convert to Model.update({ id }, changes)");
console.log("   - .destroy() calls → convert to Model.delete(id)");
console.log("   - .save() calls → convert to Model.update({ id: item.id }, changes)");
