// Probes a PGlite data dir given as argv[2].
const { PGlite } = await import("@electric-sql/pglite");
const dir = process.argv[2];
const db = new PGlite(dir);
try {
  const r = await db.query("SELECT 1 AS ok");
  console.log("open ok:", JSON.stringify(r.rows[0]));
} catch (error) {
  console.error("probe failed:", error.message);
} finally {
  await db.close();
}
