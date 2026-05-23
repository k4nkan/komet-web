import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { sendJson } from "./http-utils.mjs";

const CONTENT_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

const HOST_ROUTES = new Set(["/", "/host", "/host/", "/screen", "/screen/"]);
const CLIENT_ROUTES = new Set(["/client", "/client/", "/comment", "/comment/"]);

function routeToFile(pathname) {
  if (HOST_ROUTES.has(pathname)) {
    return "host/index.html";
  }

  if (CLIENT_ROUTES.has(pathname)) {
    return "client/index.html";
  }

  return pathname.replace(/^\/+/, "");
}

function isInside(parentDir, childPath) {
  const relative = path.relative(parentDir, childPath);
  return relative && !relative.startsWith("..") && !path.isAbsolute(relative);
}

function contentType(filePath) {
  return CONTENT_TYPES[path.extname(filePath)] || "application/octet-stream";
}

export async function serveStatic(res, publicDir, pathname) {
  const filePath = path.normalize(path.join(publicDir, routeToFile(pathname)));

  if (!isInside(publicDir, filePath)) {
    sendJson(res, 403, { error: "forbidden" });
    return;
  }

  let fileStat;
  try {
    fileStat = await stat(filePath);
  } catch {
    sendJson(res, 404, { error: "not_found" });
    return;
  }

  if (!fileStat.isFile()) {
    sendJson(res, 404, { error: "not_found" });
    return;
  }

  res.writeHead(200, {
    "Content-Type": contentType(filePath),
    "Content-Length": fileStat.size,
    "Cache-Control": filePath.endsWith(".html")
      ? "no-store"
      : "public, max-age=60",
  });
  createReadStream(filePath).pipe(res);
}
