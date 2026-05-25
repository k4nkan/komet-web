import { getInfo, postComment } from "/shared/api.js";

const form = document.querySelector("#commentForm");
const textInput = document.querySelector("#textInput");
const colorRow = document.querySelector("#colorRow");
const submitButton = document.querySelector(".submit-button");

let selectedColor = "#111111";
let isSubmitting = false;

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

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (isSubmitting) {
    return;
  }

  isSubmitting = true;
  submitButton.disabled = true;
  submitButton.textContent = "送信中";

  const payload = {
    text: textInput.value,
    color: selectedColor,
  };

  try {
    await postComment(payload);

    textInput.value = "";
    textInput.focus();
    submitButton.textContent = "送信済み";
    setTimeout(() => {
      submitButton.textContent = "送信";
    }, 600);
  } catch (error) {
    console.error(error);
    submitButton.textContent = "再送信";
  } finally {
    isSubmitting = false;
    submitButton.disabled = false;
  }
});

loadInfo().catch((error) => console.error(error));
