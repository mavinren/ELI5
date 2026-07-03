const ext = globalThis.browser ?? globalThis.chrome;

const apiKeyInput = document.getElementById("api-key");
const saveBtn = document.getElementById("save-btn");
const statusEl = document.getElementById("status");

let statusTimer = null;

function setStatus(message, type) {
  statusEl.textContent = message;
  statusEl.classList.remove("is-success", "is-error");
  if (type) statusEl.classList.add(type);

  if (statusTimer) clearTimeout(statusTimer);
  if (message && type === "is-success") {
    statusTimer = setTimeout(() => {
      statusEl.textContent = "";
      statusEl.classList.remove("is-success", "is-error");
      statusTimer = null;
    }, 1800);
  }
}

async function loadKey() {
  const stored = await ext.storage.local.get("geminiApiKey");
  if (stored.geminiApiKey) {
    apiKeyInput.value = stored.geminiApiKey;
  }
}

async function saveKey() {
  const key = apiKeyInput.value.trim();

  if (!key) {
    setStatus("Enter an API key first.", "is-error");
    apiKeyInput.focus();
    return;
  }

  await ext.storage.local.set({ geminiApiKey: key });
  setStatus("Saved ✓", "is-success");
}

saveBtn.addEventListener("click", () => {
  saveKey();
});

apiKeyInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    saveKey();
  }
});

loadKey();
