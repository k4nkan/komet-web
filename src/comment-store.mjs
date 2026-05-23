import { mkdirSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { toPublicComment } from "./comment-utils.mjs";

export function createCommentStore(dbPath) {
  mkdirSync(path.dirname(dbPath), { recursive: true });

  const db = new DatabaseSync(dbPath);
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA busy_timeout = 5000;

    CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      text TEXT NOT NULL,
      name TEXT NOT NULL,
      color TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS comments_created_at_idx
      ON comments (created_at DESC);
  `);

  const insertComment = db.prepare(`
    INSERT INTO comments (text, name, color, created_at)
    VALUES (?, ?, ?, ?)
  `);
  const selectRecentComments = db.prepare(`
    SELECT id, text, name, color, created_at
    FROM comments
    ORDER BY id DESC
    LIMIT ?
  `);
  const countComments = db.prepare("SELECT COUNT(*) AS count FROM comments");
  const deleteComments = db.prepare("DELETE FROM comments");
  const resetCommentIds = db.prepare(
    "DELETE FROM sqlite_sequence WHERE name = ?",
  );

  return {
    count() {
      return Number(countComments.get().count);
    },

    recent(limit = 50) {
      return selectRecentComments.all(limit).reverse().map(toPublicComment);
    },

    create(input, createdAt = new Date().toISOString()) {
      const result = insertComment.run(
        input.text,
        input.name,
        input.color,
        createdAt,
      );
      return {
        id: Number(result.lastInsertRowid),
        ...input,
        createdAt,
      };
    },

    clear() {
      deleteComments.run();
      resetCommentIds.run("comments");
      db.exec("PRAGMA wal_checkpoint(TRUNCATE)");
    },

    close() {
      db.close();
    },
  };
}
