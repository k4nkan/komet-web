import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { createCommentStore } from "../src/comment-store.mjs";

test("creates and reads comments from sqlite", () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "komet-"));
  const store = createCommentStore(path.join(dir, "comments.sqlite"));

  try {
    const first = store.create(
      {
        text: "hello",
        name: "tester",
        color: "#ffffff",
      },
      "2026-05-19T00:00:00.000Z",
    );
    const second = store.create(
      {
        text: "world",
        name: "tester",
        color: "#2563eb",
      },
      "2026-05-19T00:00:01.000Z",
    );

    assert.equal(first.id, 1);
    assert.equal(second.id, 2);
    assert.equal(store.count(), 2);
    assert.deepEqual(store.recent(1), [second]);
  } finally {
    store.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("clears comments and resets ids", () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "komet-"));
  const store = createCommentStore(path.join(dir, "comments.sqlite"));

  try {
    store.create({
      text: "before",
      name: "tester",
      color: "#ffffff",
    });

    store.clear();

    const after = store.create({
      text: "after",
      name: "tester",
      color: "#ffffff",
    });

    assert.equal(store.count(), 1);
    assert.equal(after.id, 1);
    assert.deepEqual(store.recent(10), [after]);
  } finally {
    store.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
