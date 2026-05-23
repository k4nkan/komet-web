import { getInfo, postComment } from "/shared/api.js";

const form = document.querySelector("#commentForm");
const nameInput = document.querySelector("#nameInput");
const textInput = document.querySelector("#textInput");
const colorRow = document.querySelector("#colorRow");
const formStatus = document.querySelector("#formStatus");
const submitButton = document.querySelector(".submit-button");

let selectedColor = "#111111";
let isSubmitting = false;

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

async function loadInfo() {
  const info = await getInfo();
  renderColors(info.colors);
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
    await postComment(payload);

    localStorage.setItem("komet:name", nameInput.value);
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

loadInfo().catch(() => setStatus("offline", true));
