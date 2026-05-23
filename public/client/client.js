import {
  connectCommentStream,
  getComments,
  getInfo,
  postComment,
} from "/shared/api.js";

const form = document.querySelector("#commentForm");
const nameInput = document.querySelector("#nameInput");
const textInput = document.querySelector("#textInput");
const colorRow = document.querySelector("#colorRow");
const formStatus = document.querySelector("#formStatus");
const recentList = document.querySelector("#recentList");
const hostUrl = document.querySelector("#hostUrl");
const submitButton = document.querySelector(".submit-button");

let selectedColor = "#ffffff";
let isSubmitting = false;
const recent = [];
const seenIds = new Set();

function setStatus(text, isError = false) {
  formStatus.textContent = text;
  formStatus.classList.toggle("is-error", isError);
}

function renderColors(colors) {
  colorRow.innerHTML = "";
  colors.forEach((color) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "color-choice";
    button.style.setProperty("--swatch", color);
    button.setAttribute("aria-label", color);
    button.classList.toggle("is-selected", color === selectedColor);
    button.addEventListener("click", () => {
      selectedColor = color;
      document.querySelectorAll(".color-choice").forEach((item) => {
        item.classList.toggle("is-selected", item === button);
      });
    });
    colorRow.appendChild(button);
  });
}

function addRecent(comment) {
  if (seenIds.has(comment.id)) {
    return;
  }

  seenIds.add(comment.id);
  recent.unshift(comment);
  recent.splice(12);
  recentList.innerHTML = "";

  for (const item of recent) {
    const li = document.createElement("li");
    const meta = document.createElement("span");
    const text = document.createElement("span");

    li.className = "recent-item";
    meta.className = "recent-meta";
    text.className = "recent-text";
    text.style.setProperty("--item-color", item.color || "#fff");
    meta.textContent = `${item.name || "anonymous"} / ${new Date(item.createdAt).toLocaleTimeString()}`;
    text.textContent = item.text;

    li.append(meta, text);
    recentList.appendChild(li);
  }
}

async function loadInfo() {
  const info = await getInfo();
  hostUrl.textContent = info.hostUrl;
  renderColors(info.colors);
}

async function loadRecent() {
  const payload = await getComments(12);
  recent.splice(0, recent.length);
  seenIds.clear();
  payload.comments.forEach(addRecent);
}

function connectEvents() {
  connectCommentStream({
    onOpen: () => setStatus("ready"),
    onError: () => setStatus("offline", true),
    onComment: (payload) => {
      addRecent(payload.comment);
    },
  });
}

nameInput.value = localStorage.getItem("komet:name") || "";

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (isSubmitting) {
    return;
  }

  isSubmitting = true;
  submitButton.disabled = true;
  setStatus("sending");

  const payload = {
    name: nameInput.value,
    text: textInput.value,
    color: selectedColor,
  };

  try {
    const data = await postComment(payload);

    localStorage.setItem("komet:name", nameInput.value);
    addRecent(data.comment);
    textInput.value = "";
    textInput.focus();
    setStatus("sent");
    setTimeout(() => setStatus("ready"), 900);
  } catch (error) {
    setStatus(error.message, true);
  } finally {
    isSubmitting = false;
    submitButton.disabled = false;
  }
});

Promise.all([loadInfo(), loadRecent()])
  .then(connectEvents)
  .catch(() => setStatus("offline", true));
