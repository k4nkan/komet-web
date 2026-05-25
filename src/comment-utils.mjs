const MAX_TEXT_LENGTH = 80;

export const COLORS = [
  "#111111",
  "#ffffff",
  "#2563eb",
  "#dc2626",
  "#16a34a",
  "#7c3aed",
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

  const color = COLORS.includes(input.color) ? input.color : COLORS[0];

  return { text, color };
}
