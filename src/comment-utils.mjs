const MAX_TEXT_LENGTH = 90;
const MAX_NAME_LENGTH = 24;

export const COLORS = [
  "#ffffff",
  "#ffef6a",
  "#7dd3fc",
  "#fda4af",
  "#86efac",
  "#c4b5fd",
];

function cleanString(value, maxLength) {
  if (typeof value !== "string") {
    return "";
  }

  return value.replace(/\s+/g, " ").trim().slice(0, maxLength);
}

export function normalizeComment(input = {}) {
  const text = cleanString(input.text, MAX_TEXT_LENGTH);
  if (!text) {
    const error = new Error("コメントを入力してください");
    error.statusCode = 400;
    throw error;
  }

  const name = cleanString(input.name, MAX_NAME_LENGTH) || "anonymous";
  const color = COLORS.includes(input.color) ? input.color : COLORS[0];

  return { text, name, color };
}

export function toPublicComment(row) {
  return {
    id: Number(row.id),
    text: row.text,
    name: row.name,
    color: row.color,
    createdAt: row.created_at,
  };
}
