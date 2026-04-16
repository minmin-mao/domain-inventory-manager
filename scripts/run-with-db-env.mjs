import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { config as loadEnv } from "dotenv";

const [, , target, ...command] = process.argv;

if (!target || command.length === 0) {
  console.error(
    "Usage: node scripts/run-with-db-env.mjs <local|production> <command...>"
  );
  process.exit(1);
}

const rootDir = process.cwd();

const loadIfExists = (file) => {
  const fullPath = path.join(rootDir, file);
  if (fs.existsSync(fullPath)) {
    loadEnv({ path: fullPath, override: true });
  }
};

loadIfExists(".env");
loadIfExists(".env.local");
loadIfExists(".env.production.local");

const getDatabaseUrl = () => {
  if (target === "local") {
    return process.env.LOCAL_DATABASE_URL || process.env.DATABASE_URL;
  }

  if (target === "production") {
    return (
      process.env.PRODUCTION_DATABASE_URL ||
      process.env.PRODUCTION_POSTGRES_URL
    );
  }

  console.error(`Unknown target "${target}". Use "local" or "production".`);
  process.exit(1);
};

const databaseUrl = getDatabaseUrl();

if (!databaseUrl) {
  console.error(`No database URL configured for target "${target}".`);
  console.error(
    target === "production"
      ? "Set PRODUCTION_DATABASE_URL in .env.production.local."
      : "Set LOCAL_DATABASE_URL in .env.local."
  );
  process.exit(1);
}

const child = spawn(command[0], command.slice(1), {
  stdio: "inherit",
  shell: true,
  cwd: rootDir,
  env: {
    ...process.env,
    PRISMA_DATABASE_URL: databaseUrl,
    DATABASE_URL: databaseUrl,
    LOCAL_DATABASE_URL: target === "local" ? databaseUrl : "",
  },
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 1);
});
