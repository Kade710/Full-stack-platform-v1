import pg from "pg";

const { Client } = pg;

export function makePgClient(databaseUrl) {
  if (!databaseUrl) throw new Error("DATABASE_URL is missing");
  const client = new Client({ connectionString: databaseUrl });
  return client;
}

