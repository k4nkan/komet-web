const STORAGE_DEFAULTS = {
  kometEnabled: false,
  kometWebSocketUrl: "",
};

const form = document.querySelector("#settingsForm");
const urlInput = document.querySelector("#urlInput");
const logOutput = document.querySelector("#logOutput");
const logs = [];

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

function log(message) {
  logs.push(`${new Date().toLocaleTimeString()} ${message}`);
  logs.splice(0, Math.max(0, logs.length - 8));
  logOutput.textContent = logs.join("\n");
}

function loadSettings() {
  chrome.storage.local.get(STORAGE_DEFAULTS, (settings) => {
    urlInput.value = settings.kometWebSocketUrl || "";
    log(settings.kometWebSocketUrl ? "loaded" : "no url");
  });
}

function saveSettings() {
  const normalizedUrl = normalizeWebSocketUrl(urlInput.value);

  chrome.storage.local.set(
    {
      kometEnabled: Boolean(normalizedUrl),
      kometWebSocketUrl: normalizedUrl,
    },
    () => {
      urlInput.value = normalizedUrl;
      log(normalizedUrl ? "saved" : "cleared");
    },
  );
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  saveSettings();
});

loadSettings();
