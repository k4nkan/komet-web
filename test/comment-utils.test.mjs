import assert from "node:assert/strict";
import test from "node:test";
import { COLORS, normalizeComment } from "../src/comment-utils.mjs";

test("uses the public six-color palette", () => {
  assert.deepEqual(COLORS, [
    "#111111",
    "#ffffff",
    "#2563eb",
    "#dc2626",
    "#16a34a",
    "#7c3aed",
  ]);
});

test("normalizes comment text, name, and color", () => {
  const comment = normalizeComment({
    text: "  hello   world  ",
    name: "  user  ",
    color: COLORS[2],
  });

  assert.deepEqual(comment, {
    text: "hello world",
    name: "user",
    color: COLORS[2],
  });
});

test("uses defaults for optional fields", () => {
  const comment = normalizeComment({ text: "hi", color: "#000000" });

  assert.equal(comment.name, "anonymous");
  assert.equal(comment.color, COLORS[0]);
});

test("rejects empty comments", () => {
  assert.throws(() => normalizeComment({ text: "   " }), /コメント/);
});
