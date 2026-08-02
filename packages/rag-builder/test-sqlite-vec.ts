import sqlite3 from "sqlite3";
import * as sqliteVec from "sqlite-vec";

console.log("sqlite-vec version/info:", sqliteVec);

const db = new sqlite3.Database(":memory:", (err) => {
  if (err) {
    console.error("Database connection failed:", err);
    process.exit(1);
  }
});

sqliteVec.load(db);

db.serialize(() => {
  db.run("CREATE VIRTUAL TABLE vec_chunks USING vec0(chunk_id TEXT PRIMARY KEY, embedding float[384]);", (err) => {
    if (err) {
      console.error("Failed to create vec0 table:", err);
    } else {
      console.log("[SUCCESS] vec0 table created cleanly in SQLite!");
    }
  });
});

db.close();
