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

const store = createCommentStore(config.paths.dbPath);
const events = createSseHub();

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
    sendJson(res, 200, {
      publicUrl: origin,
      hostUrl: `${origin}/host`,
      clientUrl: `${origin}/client`,
      screenUrl: `${origin}/screen`,
      commentUrl: `${origin}/comment`,
      colors: COLORS,
      dbPath: config.paths.dbPath,
      localAddresses: localAddresses(config.port),
    });
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

    events.broadcast("comment", { comment, total: store.count() });
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

server.listen(config.port, config.host, () => {
  console.log(`Komet listening on http://${config.host}:${config.port}`);
  console.log(`database: ${config.paths.dbPath}`);
});

process.on("SIGTERM", () => {
  events.close();
  server.close(() => {
    store.close();
    process.exit(0);
  });
});
