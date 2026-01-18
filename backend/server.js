import http from "http";
import { makePgClient } from "./db.js";
import { makeRedisClient } from "./redis.js";
import pkg from "pg";
import { createClient } from "redis";

const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function waitForDb(retries = 10) {
  while (retries > 0) {
    try {
      await pool.query("SELECT 1");
      console.log("Database connected");
      return;
    } catch (err) {
      retries--;
      console.log("Waiting for database...");
      await new Promise(r => setTimeout(r, 3000));
    }
  }
  throw new Error("Database not reachable");
}

await waitForDb();

const PORT = Number(process.env.PORT || 3000);
const DATABASE_URL = process.env.DATABASE_URL;
const REDIS_URL = process.env.REDIS_URL;

const pgClient = makePgClient(DATABASE_URL);
const redisClient = makeRedisClient(REDIS_URL);

async function init() {
  await pgClient.connect();
  await pgClient.query(`
    CREATE TABLE IF NOT EXISTS hits (
      id SERIAL PRIMARY KEY,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  redisClient.on("error", () => {});
  await redisClient.connect();
}

function json(res, statusCode, bodyObj) {
  const body = JSON.stringify(bodyObj);
  res.writeHead(statusCode, {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(body)
  });
  res.end(body);
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.url === "/api/health") {
      // Quick checks (simple V1 style)
      let dbOk = true;
      let redisOk = true;

      try { await pgClient.query("SELECT 1"); } catch { dbOk = false; }
      try { await redisClient.ping(); } catch { redisOk = false; }

      return json(res, 200, { ok: true, db: dbOk, redis: redisOk });
    }

    if (req.url === "/api") {
      // Very basic hit counter
      await pgClient.query("INSERT INTO hits DEFAULT VALUES");

      // Optional redis count cache (simple)
      const cached = await redisClient.get("hits_count");
      if (cached) return json(res, 200, { hits: Number(cached), source: "redis" });

      const result = await pgClient.query("SELECT COUNT(*)::int AS count FROM hits");
      const count = result.rows[0]?.count ?? 0;

      await redisClient.setEx("hits_count", 5, String(count));

      return json(res, 200, { hits: count, source: "db" });
    }

    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not Found");
  } catch (err) {
    json(res, 500, { ok: false, error: "server_error" });
  }
});

init()
  .then(() => {
    server.listen(PORT, () => {
      console.log(`backend listening on ${PORT}`);
    });
  })
  .catch((e) => {
    console.error("init failed:", e);
    process.exit(1);
  });

