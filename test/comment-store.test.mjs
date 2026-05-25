import assert from "node:assert/strict";
import test from "node:test";
import { createCommentStore } from "../src/comment-store.mjs";

test("creates and reads comments from memory", () => {
  const store = createCommentStore();

  const first = store.create(
    {
      text: "hello",
      color: "#ffffff",
    },
    "2026-05-19T00:00:00.000Z",
  );
  const second = store.create(
    {
      text: "world",
      color: "#2563eb",
    },
    "2026-05-19T00:00:01.000Z",
  );

  assert.equal(first.id, 1);
  assert.equal(second.id, 2);
  assert.equal(store.count(), 2);
  assert.deepEqual(store.recent(1), [second]);
});

test("clears comments and resets ids", () => {
  const store = createCommentStore();

  store.create({
    text: "before",
    color: "#ffffff",
  });

  store.clear();

  const after = store.create({
    text: "after",
    color: "#ffffff",
  });

  assert.equal(store.count(), 1);
  assert.equal(after.id, 1);
  assert.deepEqual(store.recent(10), [after]);
});
