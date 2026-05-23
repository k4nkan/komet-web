const STORAGE_DEFAULTS = {
  kometEnabled: false,
  kometWebSocketUrl: "",
};

const LANE_HEIGHT = 48;
const MAX_LANES = 6;
const COMMENT_SPEED = 125;
const LANE_RETRY_MS = 120;
const MIN_DURATION_MS = 8500;
const MAX_DURATION_MS = 15000;

let enabled = false;
let webSocketUrl = "";
let socket = null;
let connectedUrl = "";
let reconnectTimer = null;
let reconnectDelayMs = 1000;
let overlay = null;
let queueTimer = null;
let laneAvailableAt = [];
const displayQueue = [];

function normalizeWebSocketUrl(value) {
  const trimmed = String(value || "").trim();
  if (!trimmed) {
    return "";
  }

  const withScheme = /^[a-z]+:\/\//i.test(trimmed)
    ? trimmed
    : `wss://${trimmed}`;

  try {
    const url = new URL(withScheme);

    if (url.protocol === "http:") {
      url.protocol = "ws:";
    } else if (url.protocol === "https:") {
      url.protocol = "wss:";
    }

    if (url.pathname === "/" || url.pathname === "/client") {
      url.pathname = "/ws/host";
    }

    return url.protocol === "ws:" || url.protocol === "wss:"
      ? url.toString()
      : "";
  } catch {
    return "";
  }
}

function mountOverlay() {
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "komet-overlay";
  }

  const parent =
    document.fullscreenElement || document.body || document.documentElement;
  if (overlay.parentElement !== parent) {
    parent.appendChild(overlay);
  }
}

function removeOverlay() {
  clearQueueTimer();
  displayQueue.splice(0);
  laneAvailableAt = [];

  if (overlay) {
    overlay.remove();
    overlay = null;
  }
}

function estimateCommentWidth(text) {
  return Math.max(160, String(text || "").length * 28);
}

function commentDuration(text) {
  const textWidth = estimateCommentWidth(text);
  const duration = ((window.innerWidth + textWidth) / COMMENT_SPEED) * 1000;

  return Math.min(MAX_DURATION_MS, Math.max(MIN_DURATION_MS, duration));
}

function laneHoldMs(text) {
  return Math.max(
    1600,
    ((estimateCommentWidth(text) + 180) / COMMENT_SPEED) * 1000,
  );
}

function availableLaneCount() {
  return Math.min(
    MAX_LANES,
    Math.max(
      1,
      Math.floor((overlay.clientHeight || window.innerHeight) / LANE_HEIGHT),
    ),
  );
}

function claimLane(comment) {
  const laneCount = availableLaneCount();

  laneAvailableAt = laneAvailableAt.slice(0, laneCount);
  while (laneAvailableAt.length < laneCount) {
    laneAvailableAt.push(0);
  }

  const now = performance.now();
  const holdMs = laneHoldMs(comment.text);

  for (let lane = 0; lane < laneCount; lane += 1) {
    if (laneAvailableAt[lane] <= now) {
      laneAvailableAt[lane] = now + holdMs;
      return { lane, waitMs: 0 };
    }
  }

  let nextLane = 0;
  for (let lane = 1; lane < laneCount; lane += 1) {
    if (laneAvailableAt[lane] < laneAvailableAt[nextLane]) {
      nextLane = lane;
    }
  }

  return {
    lane: nextLane,
    waitMs: Math.max(LANE_RETRY_MS, laneAvailableAt[nextLane] - now),
  };
}

function clearQueueTimer() {
  if (queueTimer) {
    clearTimeout(queueTimer);
    queueTimer = null;
  }
}

function scheduleQueue(waitMs = LANE_RETRY_MS) {
  if (queueTimer) {
    return;
  }

  queueTimer = setTimeout(() => {
    queueTimer = null;
    processQueue();
  }, waitMs);
}

function renderComment(comment, lane) {
  const duration = commentDuration(comment.text);
  const el = document.createElement("div");

  el.className = "komet-comment";
  el.textContent = String(comment.text).slice(0, 80);
  el.style.setProperty("--komet-top", `${lane * LANE_HEIGHT + 8}px`);
  el.style.setProperty("--komet-duration", `${duration}ms`);
  el.style.setProperty("--komet-color", comment.color || "#111");
  overlay.appendChild(el);

  el.addEventListener("animationend", () => el.remove(), { once: true });
  setTimeout(() => el.remove(), duration + 1000);
}

function processQueue() {
  if (!enabled || !webSocketUrl || displayQueue.length === 0) {
    return;
  }

  mountOverlay();

  while (displayQueue.length > 0) {
    const comment = displayQueue[0];
    const claimed = claimLane(comment);

    if (claimed.waitMs > 0) {
      scheduleQueue(claimed.waitMs);
      return;
    }

    displayQueue.shift();
    renderComment(comment, claimed.lane);
  }
}

function enqueueComment(comment) {
  if (!enabled || !comment || !comment.text) {
    return;
  }

  displayQueue.push(comment);
  processQueue();
}

function clearReconnectTimer() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
}

function disconnect() {
  clearReconnectTimer();

  if (socket) {
    const current = socket;
    socket = null;
    connectedUrl = "";
    current.onclose = null;
    current.onerror = null;
    current.onmessage = null;
    current.close();
  }
}

function scheduleReconnect() {
  if (!enabled || !webSocketUrl || reconnectTimer) {
    return;
  }

  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connect();
  }, reconnectDelayMs);
  reconnectDelayMs = Math.min(10_000, Math.floor(reconnectDelayMs * 1.6));
}

function connect() {
  if (!enabled || !webSocketUrl) {
    return;
  }

  if (
    socket &&
    (socket.readyState === WebSocket.OPEN ||
      socket.readyState === WebSocket.CONNECTING)
  ) {
    return;
  }

  socket = new WebSocket(webSocketUrl);
  connectedUrl = webSocketUrl;

  socket.onopen = () => {
    reconnectDelayMs = 1000;
  };

  socket.onmessage = (event) => {
    try {
      const payload = JSON.parse(event.data);
      if (payload.type === "comment") {
        enqueueComment(payload.comment);
      }
    } catch {
      // Ignore non-JSON messages from the server.
    }
  };

  socket.onclose = () => {
    socket = null;
    connectedUrl = "";
    scheduleReconnect();
  };

  socket.onerror = () => {
    if (socket) {
      socket.close();
    }
  };
}

function applySettings(settings) {
  enabled = Boolean(settings.kometEnabled);
  webSocketUrl = normalizeWebSocketUrl(settings.kometWebSocketUrl);

  if (!enabled || !webSocketUrl) {
    disconnect();
    removeOverlay();
    return;
  }

  if (socket && connectedUrl !== webSocketUrl) {
    disconnect();
  }

  mountOverlay();
  connect();
}

chrome.storage.local.get(STORAGE_DEFAULTS, applySettings);

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "local") {
    return;
  }

  if (!changes.kometEnabled && !changes.kometWebSocketUrl) {
    return;
  }

  chrome.storage.local.get(STORAGE_DEFAULTS, applySettings);
});

document.addEventListener("fullscreenchange", () => {
  if (enabled && overlay) {
    mountOverlay();
  }
});
