import fs from "node:fs";
import path from "node:path";

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;

  const text = fs.readFileSync(filePath, "utf8");
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const m = line.match(/^([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    const key = m[1];
    if (process.env[key]) continue;
    let val = m[2] ?? "";
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    process.env[key] = val;
  }
}

function loadDotEnvIfNeeded() {
  if (process.env.DATABASE_URL) return;

  const cwd = process.cwd();
  loadEnvFile(path.join(cwd, ".env"));
  loadEnvFile(path.join(cwd, ".env.production"));
}

function ensureDatabaseUrl() {
  if (!process.env.DATABASE_URL) {
    process.env.DATABASE_URL = "file:./dev.db";
  }
}

function resolveSchemaPath() {
  const url = process.env.DATABASE_URL ?? "";
  return /^postgres(ql)?:\/\//i.test(url)
    ? path.join(process.cwd(), "prisma", "postgres", "schema.prisma")
    : path.join(process.cwd(), "prisma", "schema.prisma");
}

function ensureSqliteFile() {
  const url = process.env.DATABASE_URL ?? "";
  if (!url.startsWith("file:")) return;

  const fileRef = url.slice("file:".length);
  if (!fileRef || fileRef === ":memory:") return;

  const schemaPath = resolveSchemaPath();
  const schemaDir = path.dirname(schemaPath);
  const dbPath = path.isAbsolute(fileRef)
    ? fileRef
    : path.resolve(schemaDir, fileRef);

  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  if (!fs.existsSync(dbPath)) {
    fs.writeFileSync(dbPath, "");
  }
}

loadDotEnvIfNeeded();
ensureDatabaseUrl();
ensureSqliteFile();