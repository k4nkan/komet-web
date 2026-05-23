import http from "node:http";
import { config } from "./config.mjs";
import { createCommentStore } from "./comment-store.mjs";
import { COLORS, normalizeComment } from "./comment-utils.mjs";
import {
  clampLimit,
  readJsonBody,
  requestOrigin,
  sendError,
  sendJson,
} from "./http-utils.mjs";
import { localAddresses } from "./network.mjs";
import { serveStatic } from "./static-files.mjs";
import { createSseHub } from "./sse-hub.mjs";
import { createWebSocketHub } from "./websocket-hub.mjs";

const store = createCommentStore(config.paths.dbPath);
const events = createSseHub();
const hostSockets = createWebSocketHub();

function publicOrigin(req) {
  return (config.publicUrl || requestOrigin(req, config.port)).replace(
    /\/+$/,
    "",
  );
}

function commentsPayload(limit) {
  return {
    comments: store.recent(limit),
    total: store.count(),
  };
}

async function handleApiRequest(req, res, url) {
  if (req.method === "GET" && url.pathname === "/api/info") {
    const origin = publicOrigin(req);
    const wsOrigin = origin.replace(/^http/, "ws");
    sendJson(res, 200, {
      publicUrl: origin,
      hostUrl: `${origin}/host`,
      clientUrl: `${origin}/client`,
      webSocketUrl: `${wsOrigin}/ws/host`,
      screenUrl: `${origin}/screen`,
      commentUrl: `${origin}/comment`,
      colors: COLORS,
      dbPath: config.paths.dbPath,
      localAddresses: localAddresses(config.port),
    });
    return true;
  }

  if (req.method === "GET" && url.pathname === "/api/health") {
    sendJson(res, 200, { ok: true });
    return true;
  }

  if (req.method === "GET" && url.pathname === "/api/comments") {
    const limit = clampLimit(url.searchParams.get("limit"));
    sendJson(res, 200, commentsPayload(limit));
    return true;
  }

  if (req.method === "POST" && url.pathname === "/api/comments") {
    const payload = await readJsonBody(req);
    const comment = store.create(normalizeComment(payload));

    const broadcastPayload = { comment, total: store.count() };
    events.broadcast("comment", broadcastPayload);
    hostSockets.broadcast("comment", broadcastPayload);
    sendJson(res, 201, { comment });
    return true;
  }

  return false;
}

async function handleRequest(req, res) {
  const url = new URL(req.url || "/", requestOrigin(req, config.port));

  try {
    if (req.method === "GET" && url.pathname === "/events") {
      events.add(req, res, commentsPayload(30));
      return;
    }

    if (
      url.pathname.startsWith("/api/") &&
      (await handleApiRequest(req, res, url))
    ) {
      return;
    }

    if (req.method !== "GET") {
      res.writeHead(405, { Allow: "GET, POST" });
      res.end();
      return;
    }

    await serveStatic(
      res,
      config.paths.publicDir,
      decodeURIComponent(url.pathname),
    );
  } catch (error) {
    sendError(res, error);
  }
}

const server = http.createServer(handleRequest);

server.on("upgrade", (req, socket) => {
  const url = new URL(req.url || "/", `http://${req.headers.host || "local"}`);

  if (url.pathname === "/ws/host") {
    hostSockets.accept(req, socket);
    return;
  }

  socket.write("HTTP/1.1 404 Not Found\r\n\r\n");
  socket.destroy();
});

server.listen(config.port, config.host, () => {
  console.log(`Komet listening on http://${config.host}:${config.port}`);
  console.log(`database: ${config.paths.dbPath}`);
});

process.on("SIGTERM", () => {
  events.close();
  hostSockets.close();
  server.close(() => {
    store.close();
    process.exit(0);
  });
});
