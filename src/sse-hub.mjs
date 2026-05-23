function sseWrite(res, event, payload) {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
}

export function createSseHub({ heartbeatMs = 20_000 } = {}) {
  const clients = new Set();
  const heartbeat = setInterval(() => {
    broadcast("heartbeat", { now: new Date().toISOString() });
  }, heartbeatMs);
  heartbeat.unref();

  function broadcast(event, payload) {
    for (const client of clients) {
      sseWrite(client, event, payload);
    }
  }

  return {
    add(req, res, snapshotPayload) {
      res.writeHead(200, {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-store",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      });
      res.write(": connected\n\n");
      clients.add(res);
      sseWrite(res, "snapshot", snapshotPayload);
      req.on("close", () => clients.delete(res));
    },

    broadcast,

    close() {
      clearInterval(heartbeat);
      clients.clear();
    },
  };
}
