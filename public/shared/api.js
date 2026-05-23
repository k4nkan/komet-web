export async function requestJson(url, options = {}) {
  const res = await fetch(url, {
    cache: "no-store",
    ...options,
  });
  const payload = await res.json();

  if (!res.ok) {
    throw new Error(payload.message || "通信に失敗しました");
  }

  return payload;
}

export function getInfo() {
  return requestJson("/api/info");
}

export function getComments(limit = 50) {
  return requestJson(`/api/comments?limit=${limit}`);
}

export function postComment(payload) {
  return requestJson("/api/comments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function connectCommentStream(handlers = {}) {
  const source = new EventSource("/events");

  source.addEventListener("open", () => handlers.onOpen?.());
  source.addEventListener("error", () => handlers.onError?.());
  source.addEventListener("snapshot", (event) => {
    handlers.onSnapshot?.(JSON.parse(event.data));
  });
  source.addEventListener("comment", (event) => {
    handlers.onComment?.(JSON.parse(event.data));
  });

  return source;
}
