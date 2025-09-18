#!/usr/bin/env node
"use strict";

// Ensures required Postgres extensions exist before running migrations
// - pgcrypto: needed for gen_random_bytes()
// - uuid-ossp: commonly used for uuid_generate_v4()

const { Client } = require("pg");

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.log("[ensure-extensions] DATABASE_URL is not set; skipping.");
    return;
  }

  const opts = { connectionString: url };
  // Best-effort SSL enable if querystring suggests it or env enforces it
  const wantsSsl = /[?&](ssl|sslmode)=/i.test(url) || process.env.PGSSL || process.env.PGSSLMODE;
  if (wantsSsl) {
    opts.ssl = { rejectUnauthorized: false };
  }

  const client = new Client(opts);
  try {
    await client.connect();
    await client.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto";');
    await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');
    console.log("[ensure-extensions] Ensured extensions: pgcrypto, uuid-ossp");
  } catch (e) {
    console.error("[ensure-extensions] Failed to ensure extensions:", e.message || e);
    // Do not hard-fail; migrations may still succeed depending on module usage
  } finally {
    try { await client.end(); } catch {}
  }
}

main();

