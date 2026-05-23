export function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
    "Cache-Control": "no-store",
  });
  res.end(body);
}

export function sendError(res, error) {
  const statusCode = error.statusCode || 500;
  sendJson(res, statusCode, {
    error: statusCode >= 500 ? "server_error" : "bad_request",
    message: statusCode >= 500 ? "サーバーエラーが発生しました" : error.message,
  });

  if (statusCode >= 500) {
    console.error(error);
  }
}

export async function readJsonBody(req, maxBytes = 16_384) {
  return new Promise((resolve, reject) => {
    let total = 0;
    const chunks = [];

    req.on("data", (chunk) => {
      total += chunk.length;
      if (total > maxBytes) {
        const error = new Error("リクエストが大きすぎます");
        error.statusCode = 413;
        reject(error);
        req.destroy();
        return;
      }

      chunks.push(chunk);
    });

    req.on("end", () => {
      if (chunks.length === 0) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
      } catch {
        const error = new Error("JSONの形式が正しくありません");
        error.statusCode = 400;
        reject(error);
      }
    });

    req.on("error", reject);
  });
}

export function requestOrigin(req, fallbackPort) {
  const protocol = req.headers["x-forwarded-proto"] || "http";
  const hostHeader = req.headers.host || `localhost:${fallbackPort}`;
  return `${protocol}://${hostHeader}`;
}

export function clampLimit(rawValue, fallback = 50, min = 1, max = 100) {
  const value = Number(rawValue) || fallback;
  return Math.min(Math.max(value, min), max);
}
