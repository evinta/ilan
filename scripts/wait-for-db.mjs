import mysql from "mysql2/promise";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL is required before the server can start.");
  process.exit(1);
}

const maxAttempts = 30;
for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
  let connection;
  try {
    connection = await mysql.createConnection(databaseUrl);
    await connection.ping();
    await connection.end();
    console.log("Database is ready.");
    process.exit(0);
  } catch {
    if (connection) await connection.end().catch(() => undefined);
    if (attempt === maxAttempts) break;
    console.log(`Database is not ready yet (${attempt}/${maxAttempts}); retrying in 2 seconds.`);
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
}
console.error("Database did not become ready before the startup timeout.");
process.exit(1);
