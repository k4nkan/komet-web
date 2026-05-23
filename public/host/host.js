import { connectCommentStream, getComments, getInfo } from "/shared/api.js";

const layer = document.querySelector("#commentLayer");
const clientUrl = document.querySelector("#clientUrl");
const dbStatus = document.querySelector("#dbStatus");
const statusText = document.querySelector("#statusText");
const statusDot = document.querySelector("#statusDot");
const hostPanel = document.querySelector("#hostPanel");
const hidePanel = document.querySelector("#hidePanel");
const showPanel = document.querySelector("#showPanel");

let commentCount = 0;
let replayCursor = 0;
let replayTimer = null;
let queueTimer = null;
let activeComments = 0;
const seenIds = new Set();
const recentComments = [];
const displayQueue = [];
let laneAvailableAt = [];

const REPLAY_GAP_MS = 900;
const QUEUE_RETRY_MS = 120;
const LANE_HEIGHT = 58;

function setOnline(isOnline) {
  statusDot.classList.toggle("is-online", isOnline);
  statusText.textContent = isOnline ? "接続中" : "再接続中";
}

function hostLayout() {
  const panelOffset = hostPanel.classList.contains("is-hidden") ? 40 : 170;
  const usableHeight = Math.max(window.innerHeight - panelOffset - 42, 160);
  const laneCount = Math.max(4, Math.floor(usableHeight / LANE_HEIGHT));

  return { laneCount, panelOffset };
}

function estimateCommentWidth(text) {
  let width = 0;

  for (const char of text) {
    width += /^[\x00-\x7f]$/.test(char) ? 24 : 44;
  }

  return Math.max(160, width);
}

function commentTiming(comment, options = {}) {
  const estimatedWidth = estimateCommentWidth(comment.text);
  const speed = options.replay ? 102 : 118;
  const duration = ((window.innerWidth + estimatedWidth) / speed) * 1000;
  const laneHold = ((estimatedWidth + 180) / speed) * 1000;

  return {
    durationMs: Math.min(24_000, Math.max(11_000, duration)),
    laneHoldMs: Math.max(2_200, laneHold),
  };
}

function claimLane(laneHoldMs) {
  const { laneCount, panelOffset } = hostLayout();

  laneAvailableAt = laneAvailableAt.slice(0, laneCount);
  while (laneAvailableAt.length < laneCount) {
    laneAvailableAt.push(0);
  }

  const now = performance.now();
  let lane = -1;

  for (let candidate = 0; candidate < laneCount; candidate += 1) {
    if (laneAvailableAt[candidate] <= now) {
      lane = candidate;
      break;
    }
  }

  if (lane === -1) {
    let nextLane = 0;

    for (let candidate = 1; candidate < laneCount; candidate += 1) {
      if (laneAvailableAt[candidate] < laneAvailableAt[nextLane]) {
        nextLane = candidate;
      }
    }

    return {
      waitMs: Math.max(QUEUE_RETRY_MS, laneAvailableAt[nextLane] - now),
    };
  }

  laneAvailableAt[lane] = now + laneHoldMs + 320;

  return {
    top: panelOffset + lane * LANE_HEIGHT,
    waitMs: 0,
  };
}

function scheduleQueue(waitMs = QUEUE_RETRY_MS) {
  if (queueTimer) {
    return;
  }

  queueTimer = setTimeout(() => {
    queueTimer = null;
    processQueue();
  }, waitMs);
}

function clearReplayTimer() {
  if (!replayTimer) {
    return;
  }

  clearTimeout(replayTimer);
  replayTimer = null;
}

function scheduleReplay() {
  if (
    replayTimer ||
    activeComments > 0 ||
    displayQueue.length > 0 ||
    recentComments.length === 0
  ) {
    return;
  }

  replayTimer = setTimeout(() => {
    replayTimer = null;
    const comment = recentComments[replayCursor % recentComments.length];

    replayCursor += 1;
    enqueueComment(comment, { replay: true });
  }, REPLAY_GAP_MS);
}

function showComment(comment, options = {}) {
  const el = document.createElement("div");
  const durationMs =
    options.durationMs ?? commentTiming(comment, options).durationMs;

  el.className = "flying-comment";
  el.textContent = comment.text;
  el.style.setProperty("--top", `${options.top}px`);
  el.style.setProperty("--duration", `${durationMs}ms`);
  el.style.setProperty("--comment-color", comment.color || "#fff");
  el.title = `${comment.name || "anonymous"} / ${comment.createdAt || ""}`;

  activeComments += 1;
  layer.appendChild(el);
  el.addEventListener(
    "animationend",
    () => {
      el.remove();
      activeComments = Math.max(0, activeComments - 1);
      processQueue();
      scheduleReplay();
    },
    { once: true },
  );
}

function processQueue() {
  while (displayQueue.length > 0) {
    const item = displayQueue[0];
    const timing = commentTiming(item.comment, item.options);
    const lane = claimLane(timing.laneHoldMs);

    if (lane.waitMs > 0) {
      scheduleQueue(lane.waitMs);
      return;
    }

    displayQueue.shift();
    showComment(item.comment, {
      ...item.options,
      durationMs: timing.durationMs,
      top: lane.top,
    });
  }

  scheduleReplay();
}

function enqueueComment(comment, options = {}) {
  if (!comment) {
    return;
  }

  if (!options.replay) {
    clearReplayTimer();
  }

  displayQueue.push({ comment, options });
  processQueue();
}

function updateCount() {
  commentCount = Math.max(commentCount + 1, seenIds.size);
  dbStatus.textContent = `SQLite / ${commentCount}`;
}

function setCount(count) {
  commentCount = Math.max(commentCount, count || 0, seenIds.size);
  dbStatus.textContent = `SQLite / ${commentCount}`;
}

function rememberComment(comment) {
  if (!comment || typeof comment.id !== "number") {
    return;
  }

  const existingIndex = recentComments.findIndex(
    (item) => item.id === comment.id,
  );
  if (existingIndex >= 0) {
    recentComments.splice(existingIndex, 1);
  }

  recentComments.push(comment);
  recentComments.splice(0, Math.max(0, recentComments.length - 50));
}

function ingestComments(comments, options = {}) {
  const sorted = [...comments].sort((a, b) => a.id - b.id);
  const newComments = [];

  for (const comment of sorted) {
    rememberComment(comment);
    if (!seenIds.has(comment.id)) {
      seenIds.add(comment.id);
      newComments.push(comment);
    }
  }

  setCount(options.total ?? sorted.length);

  newComments.slice(-16).forEach((comment, index) => {
    setTimeout(
      () => enqueueComment(comment, { replay: options.replay }),
      index * 140,
    );
  });

  if (newComments.length === 0) {
    scheduleReplay();
  }
}

async function renderInfo() {
  const info = await getInfo();
  clientUrl.textContent = info.clientUrl;
  dbStatus.textContent = "SQLite / 0";
}

function connectEvents() {
  connectCommentStream({
    onOpen: () => setOnline(true),
    onError: () => setOnline(false),
    onSnapshot: (payload) => {
      ingestComments(payload.comments, { replay: true, total: payload.total });
    },
    onComment: (payload) => {
      if (seenIds.has(payload.comment.id)) {
        return;
      }

      seenIds.add(payload.comment.id);
      rememberComment(payload.comment);
      if (typeof payload.total === "number") {
        setCount(payload.total);
      } else {
        updateCount();
      }
      enqueueComment(payload.comment);
    },
  });
}

async function pollComments() {
  try {
    const payload = await getComments(50);
    ingestComments(payload.comments, { replay: true, total: payload.total });
    setOnline(true);
  } catch {
    setOnline(false);
  }
}

hidePanel.addEventListener("click", () => {
  hostPanel.classList.add("is-hidden");
  showPanel.classList.add("is-visible");
});

showPanel.addEventListener("click", () => {
  hostPanel.classList.remove("is-hidden");
  showPanel.classList.remove("is-visible");
});

document.addEventListener("keydown", (event) => {
  if (event.key.toLowerCase() === "i") {
    hostPanel.classList.toggle("is-hidden");
    showPanel.classList.toggle(
      "is-visible",
      hostPanel.classList.contains("is-hidden"),
    );
  }
});

renderInfo().catch(() => {
  clientUrl.textContent = `${window.location.origin}/client`;
});
connectEvents();
pollComments();
setInterval(pollComments, 1600);
