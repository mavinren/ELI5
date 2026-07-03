(() => {
  if (globalThis.__ELI5_CONTENT_LOADED__) return;
  globalThis.__ELI5_CONTENT_LOADED__ = true;

  const HOST_ID = "eli5-extension-host";
  const Z_MAX = "2147483647";
  const LEVELS = ["five", "fifteen", "expert"];
  const LEVEL_LABELS = { five: "5", fifteen: "15", expert: "Expert" };

  let host = null;
  let shadow = null;
  let pillEl = null;
  let cardEl = null;
  let selectedText = "";
  let selectionRect = null;
  let levelsCache = null;
  let activeLevel = "five";
  let mouseupTimer = null;
  let copyResetTimer = null;

  function ensureHost() {
    if (host && shadow) return;

    host = document.getElementById(HOST_ID);
    if (!host) {
      host = document.createElement("div");
      host.id = HOST_ID;
      host.style.all = "initial";
      host.style.position = "fixed";
      host.style.inset = "0";
      host.style.pointerEvents = "none";
      host.style.zIndex = Z_MAX;
      document.documentElement.appendChild(host);
    }

    shadow = host.shadowRoot || host.attachShadow({ mode: "open" });
    if (!shadow.querySelector("style")) {
      const style = document.createElement("style");
      style.textContent = getStyles();
      shadow.appendChild(style);
    }
  }

  function getStyles() {
    return `
      :host {
        all: initial;
      }

      * {
        box-sizing: border-box;
      }

      .eli5-pill,
      .eli5-card {
        pointer-events: auto;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        color: #F3EFE3;
      }

      .eli5-pill {
        position: fixed;
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 7px 12px;
        border: 1px solid rgba(243, 239, 227, 0.12);
        border-radius: 999px;
        background: #16241E;
        color: #F3EFE3;
        font-size: 13px;
        font-weight: 600;
        line-height: 1;
        cursor: pointer;
        box-shadow: 0 4px 14px rgba(0, 0, 0, 0.28);
        transition: transform 150ms ease, box-shadow 150ms ease, border-color 150ms ease;
        z-index: ${Z_MAX};
        user-select: none;
        -webkit-user-select: none;
      }

      .eli5-pill:hover {
        transform: translateY(-1px);
        box-shadow: 0 6px 18px rgba(0, 0, 0, 0.34);
        border-color: rgba(242, 193, 78, 0.45);
      }

      .eli5-pill-dot {
        width: 7px;
        height: 7px;
        border-radius: 50%;
        background: #F2C14E;
        flex-shrink: 0;
      }

      .eli5-card {
        position: fixed;
        width: min(340px, calc(100vw - 20px));
        background: #16241E;
        border: 1px solid rgba(243, 239, 227, 0.1);
        border-radius: 12px;
        box-shadow: 0 12px 32px rgba(0, 0, 0, 0.35);
        overflow: hidden;
        z-index: ${Z_MAX};
      }

      .eli5-header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 12px;
        padding: 14px 14px 0;
      }

      .eli5-eyebrow-wrap {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }

      .eli5-eyebrow {
        margin: 0;
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: #F2C14E;
        line-height: 1;
      }

      .eli5-eyebrow-bar {
        width: 28px;
        height: 3px;
        border-radius: 2px;
        background: #F2C14E;
      }

      .eli5-close {
        appearance: none;
        border: 1px solid transparent;
        background: transparent;
        color: #B9C4BC;
        width: 28px;
        height: 28px;
        border-radius: 8px;
        font-size: 16px;
        line-height: 1;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        transition: color 150ms ease, border-color 150ms ease, background 150ms ease;
      }

      .eli5-close:hover {
        color: #F3EFE3;
        border-color: rgba(243, 239, 227, 0.14);
        background: rgba(243, 239, 227, 0.04);
      }

      .eli5-body {
        padding: 14px;
        min-height: 88px;
      }

      .eli5-loading {
        display: flex;
        align-items: center;
        gap: 10px;
        color: #B9C4BC;
        font-size: 14px;
      }

      .eli5-spinner {
        width: 14px;
        height: 14px;
        border: 2px solid rgba(185, 196, 188, 0.25);
        border-top-color: #F2C14E;
        border-radius: 50%;
        animation: eli5-spin 0.7s linear infinite;
        flex-shrink: 0;
      }

      @keyframes eli5-spin {
        to { transform: rotate(360deg); }
      }

      .eli5-text {
        margin: 0;
        font-family: Georgia, "Iowan Old Style", "Palatino Linotype", serif;
        font-size: 15px;
        line-height: 1.55;
        color: #F3EFE3;
        white-space: pre-wrap;
      }

      .eli5-error {
        margin: 0;
        font-size: 14px;
        line-height: 1.5;
        color: #E7A0A0;
      }

      .eli5-nokey {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .eli5-nokey p {
        margin: 0;
        font-size: 14px;
        line-height: 1.5;
        color: #F3EFE3;
      }

      .eli5-btn {
        appearance: none;
        border: 1px solid transparent;
        border-radius: 10px;
        background: #F2C14E;
        color: #16241E;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        font-size: 13px;
        font-weight: 700;
        padding: 9px 12px;
        cursor: pointer;
        transition: filter 150ms ease, border-color 150ms ease;
        align-self: flex-start;
      }

      .eli5-btn:hover {
        filter: brightness(1.05);
      }

      .eli5-footer {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        padding: 0 14px 10px;
      }

      .eli5-credit {
        margin: 0;
        padding: 0 14px 12px;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        font-size: 11px;
        line-height: 1.4;
        color: #B9C4BC;
      }

      .eli5-credit a {
        color: #F2C14E;
        font-weight: 600;
        text-decoration: none;
      }

      .eli5-credit a:hover {
        text-decoration: underline;
      }

      .eli5-slider {
        display: inline-flex;
        align-items: center;
        padding: 3px;
        border-radius: 999px;
        background: rgba(243, 239, 227, 0.06);
        border: 1px solid rgba(243, 239, 227, 0.08);
      }

      .eli5-segment {
        appearance: none;
        border: none;
        background: transparent;
        color: #B9C4BC;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        font-size: 12px;
        font-weight: 600;
        padding: 6px 10px;
        border-radius: 999px;
        cursor: pointer;
        transition: background-color 150ms ease, color 150ms ease;
        line-height: 1;
      }

      .eli5-segment.is-active {
        background: #F2C14E;
        color: #16241E;
      }

      .eli5-copy {
        appearance: none;
        border: 1px solid rgba(243, 239, 227, 0.14);
        background: transparent;
        color: #F3EFE3;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        font-size: 12px;
        font-weight: 600;
        padding: 7px 10px;
        border-radius: 10px;
        cursor: pointer;
        transition: border-color 150ms ease, filter 150ms ease, color 150ms ease;
        min-width: 58px;
      }

      .eli5-copy:hover {
        border-color: rgba(242, 193, 78, 0.45);
        filter: brightness(1.05);
      }

      .eli5-copy.is-copied {
        color: #9FD6A9;
        border-color: rgba(159, 214, 169, 0.35);
      }
    `;
  }

  function isOurElement(target) {
    if (!target) return false;
    if (host && (target === host || host.contains(target))) return true;
    return false;
  }

  function getSelectionInfo() {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
      return null;
    }

    const text = selection.toString().trim();
    if (!text || text.length <= 2) return null;

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    if (!rect || (rect.width === 0 && rect.height === 0)) {
      const rects = range.getClientRects();
      if (!rects.length) return null;
      const last = rects[rects.length - 1];
      return {
        text,
        rect: {
          top: last.top,
          left: last.left,
          right: last.right,
          bottom: last.bottom,
          width: last.width,
          height: last.height,
        },
      };
    }

    return {
      text,
      rect: {
        top: rect.top,
        left: rect.left,
        right: rect.right,
        bottom: rect.bottom,
        width: rect.width,
        height: rect.height,
      },
    };
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function positionPill(rect) {
    if (!pillEl || !rect) return;

    const pad = 10;
    const pillWidth = pillEl.offsetWidth || 110;
    const pillHeight = pillEl.offsetHeight || 34;

    let left = rect.right - pillWidth;
    let top = rect.bottom + 8;

    left = clamp(left, pad, window.innerWidth - pillWidth - pad);
    top = clamp(top, pad, window.innerHeight - pillHeight - pad);

    pillEl.style.left = `${left}px`;
    pillEl.style.top = `${top}px`;
  }

  function positionCard(rect) {
    if (!cardEl) return;

    const pad = 10;
    const cardWidth = cardEl.offsetWidth || 340;
    const cardHeight = cardEl.offsetHeight || 220;

    let left;
    let top;

    if (rect) {
      left = rect.left;
      top = rect.bottom + 10;
    } else {
      left = (window.innerWidth - cardWidth) / 2;
      top = (window.innerHeight - cardHeight) / 2;
    }

    left = clamp(left, pad, window.innerWidth - cardWidth - pad);
    top = clamp(top, pad, window.innerHeight - cardHeight - pad);

    cardEl.style.left = `${left}px`;
    cardEl.style.top = `${top}px`;
  }

  function removePill() {
    if (pillEl) {
      pillEl.remove();
      pillEl = null;
    }
  }

  function removeCard() {
    if (copyResetTimer) {
      clearTimeout(copyResetTimer);
      copyResetTimer = null;
    }
    if (cardEl) {
      cardEl.remove();
      cardEl = null;
    }
    levelsCache = null;
    activeLevel = "five";
  }

  function dismissAll() {
    removePill();
    removeCard();
  }

  function showPill(text, rect) {
    ensureHost();
    removePill();

    selectedText = text;
    selectionRect = rect;

    pillEl = document.createElement("button");
    pillEl.type = "button";
    pillEl.className = "eli5-pill";
    pillEl.setAttribute("aria-label", "Explain selection");
    pillEl.innerHTML = `<span class="eli5-pill-dot"></span><span>✨ Explain</span>`;

    pillEl.addEventListener("mousedown", (event) => {
      event.preventDefault();
      event.stopPropagation();
    });

    pillEl.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      openCard(selectedText, selectionRect);
      removePill();
    });

    shadow.appendChild(pillEl);
    positionPill(rect);
  }

  function openCard(text, rect) {
    ensureHost();
    removeCard();

    selectedText = (text || "").trim();
    selectionRect = rect || null;
    levelsCache = null;
    activeLevel = "five";

    cardEl = document.createElement("div");
    cardEl.className = "eli5-card";
    cardEl.innerHTML = `
      <div class="eli5-header">
        <div class="eli5-eyebrow-wrap">
          <p class="eli5-eyebrow">ELI5</p>
          <div class="eli5-eyebrow-bar"></div>
        </div>
        <button type="button" class="eli5-close" aria-label="Close">✕</button>
      </div>
      <div class="eli5-body">
        <div class="eli5-loading">
          <div class="eli5-spinner"></div>
          <span>Explaining…</span>
        </div>
      </div>
      <p class="eli5-credit">
        Created by
        <a href="https://x.com/konvashon" target="_blank" rel="noopener noreferrer">Mavin Emmanuel</a>
      </p>
    `;

    const creditLink = cardEl.querySelector(".eli5-credit a");
    creditLink.addEventListener("mousedown", (event) => {
      event.stopPropagation();
    });
    creditLink.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      window.open("https://x.com/konvashon", "_blank", "noopener,noreferrer");
    });

    const closeBtn = cardEl.querySelector(".eli5-close");
    closeBtn.addEventListener("mousedown", (event) => {
      event.preventDefault();
      event.stopPropagation();
    });
    closeBtn.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      removeCard();
    });

    cardEl.addEventListener("mousedown", (event) => {
      event.stopPropagation();
    });

    shadow.appendChild(cardEl);
    positionCard(selectionRect);
    requestExplanation(selectedText);
  }

  function renderBodySuccess() {
    if (!cardEl || !levelsCache) return;

    const body = cardEl.querySelector(".eli5-body");
    let footer = cardEl.querySelector(".eli5-footer");

    body.innerHTML = `<p class="eli5-text"></p>`;
    body.querySelector(".eli5-text").textContent = levelsCache[activeLevel];

    if (!footer) {
      footer = document.createElement("div");
      footer.className = "eli5-footer";
      footer.innerHTML = `
        <div class="eli5-slider" role="tablist" aria-label="Explanation level">
          ${LEVELS.map(
            (level) =>
              `<button type="button" class="eli5-segment${
                level === activeLevel ? " is-active" : ""
              }" data-level="${level}" role="tab" aria-selected="${
                level === activeLevel
              }">${LEVEL_LABELS[level]}</button>`
          ).join("")}
        </div>
        <button type="button" class="eli5-copy">Copy</button>
      `;
      const credit = cardEl.querySelector(".eli5-credit");
      if (credit) {
        cardEl.insertBefore(footer, credit);
      } else {
        cardEl.appendChild(footer);
      }

      footer.querySelectorAll(".eli5-segment").forEach((btn) => {
        btn.addEventListener("mousedown", (event) => {
          event.preventDefault();
          event.stopPropagation();
        });
        btn.addEventListener("click", (event) => {
          event.preventDefault();
          event.stopPropagation();
          setActiveLevel(btn.dataset.level);
        });
      });

      const copyBtn = footer.querySelector(".eli5-copy");
      copyBtn.addEventListener("mousedown", (event) => {
        event.preventDefault();
        event.stopPropagation();
      });
      copyBtn.addEventListener("click", async (event) => {
        event.preventDefault();
        event.stopPropagation();
        await copyCurrentText(copyBtn);
      });
    } else {
      footer.querySelectorAll(".eli5-segment").forEach((btn) => {
        const isActive = btn.dataset.level === activeLevel;
        btn.classList.toggle("is-active", isActive);
        btn.setAttribute("aria-selected", String(isActive));
      });
    }

    positionCard(selectionRect);
  }

  function setActiveLevel(level) {
    if (!levelsCache || !LEVELS.includes(level)) return;
    activeLevel = level;

    const textEl = cardEl?.querySelector(".eli5-text");
    if (textEl) {
      textEl.textContent = levelsCache[activeLevel];
    }

    cardEl?.querySelectorAll(".eli5-segment").forEach((btn) => {
      const isActive = btn.dataset.level === activeLevel;
      btn.classList.toggle("is-active", isActive);
      btn.setAttribute("aria-selected", String(isActive));
    });
  }

  async function copyCurrentText(button) {
    if (!levelsCache) return;
    const text = levelsCache[activeLevel] || "";

    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const area = document.createElement("textarea");
      area.value = text;
      area.style.position = "fixed";
      area.style.left = "-9999px";
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      area.remove();
    }

    button.textContent = "Copied";
    button.classList.add("is-copied");

    if (copyResetTimer) clearTimeout(copyResetTimer);
    copyResetTimer = setTimeout(() => {
      button.textContent = "Copy";
      button.classList.remove("is-copied");
      copyResetTimer = null;
    }, 1400);
  }

  function renderNoKey() {
    if (!cardEl) return;

    const body = cardEl.querySelector(".eli5-body");
    const footer = cardEl.querySelector(".eli5-footer");
    if (footer) footer.remove();

    body.innerHTML = `
      <div class="eli5-nokey">
        <p>Add your free Gemini API key in settings to start explaining text.</p>
        <button type="button" class="eli5-btn">Open settings</button>
      </div>
    `;

    const btn = body.querySelector(".eli5-btn");
    btn.addEventListener("mousedown", (event) => {
      event.preventDefault();
      event.stopPropagation();
    });
    btn.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      chrome.runtime.openOptionsPage();
    });

    positionCard(selectionRect);
  }

  function renderError(message) {
    if (!cardEl) return;

    const body = cardEl.querySelector(".eli5-body");
    const footer = cardEl.querySelector(".eli5-footer");
    if (footer) footer.remove();

    body.innerHTML = `<p class="eli5-error"></p>`;
    body.querySelector(".eli5-error").textContent = message;
    positionCard(selectionRect);
  }

  function requestExplanation(text) {
    chrome.runtime.sendMessage({ type: "ELI5_REQUEST", text }, (response) => {
      if (chrome.runtime.lastError) {
        renderError(
          chrome.runtime.lastError.message ||
            "Could not reach the extension background script."
        );
        return;
      }

      if (!response) {
        renderError("No response from the extension. Please try again.");
        return;
      }

      if (response.error === "NO_KEY") {
        renderNoKey();
        return;
      }

      if (response.error) {
        renderError(response.error);
        return;
      }

      if (!response.levels) {
        renderError("Received an incomplete explanation. Please try again.");
        return;
      }

      levelsCache = response.levels;
      activeLevel = "five";
      renderBodySuccess();
    });
  }

  document.addEventListener(
    "mouseup",
    () => {
      if (mouseupTimer) clearTimeout(mouseupTimer);
      mouseupTimer = setTimeout(() => {
        const info = getSelectionInfo();
        if (!info) return;
        showPill(info.text, info.rect);
      }, 10);
    },
    true
  );

  document.addEventListener(
    "mousedown",
    (event) => {
      if (isOurElement(event.target)) return;
      const path = event.composedPath ? event.composedPath() : [];
      if (host && path.includes(host)) return;
      dismissAll();
    },
    true
  );

  document.addEventListener(
    "keydown",
    (event) => {
      if (event.key === "Escape") {
        dismissAll();
      }
    },
    true
  );

  function keepInViewport(el) {
    if (!el) return;
    const pad = 10;
    const rect = el.getBoundingClientRect();
    const left = clamp(rect.left, pad, window.innerWidth - rect.width - pad);
    const top = clamp(rect.top, pad, window.innerHeight - rect.height - pad);
    el.style.left = `${left}px`;
    el.style.top = `${top}px`;
  }

  window.addEventListener(
    "scroll",
    () => {
      const info = getSelectionInfo();
      if (info) {
        selectionRect = info.rect;
        selectedText = info.text;
      }
      if (pillEl && selectionRect) positionPill(selectionRect);
      keepInViewport(cardEl);
    },
    true
  );

  window.addEventListener("resize", () => {
    const info = getSelectionInfo();
    if (info) selectionRect = info.rect;
    if (pillEl && selectionRect) positionPill(selectionRect);
    keepInViewport(cardEl);
  });

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type !== "ELI5_TRIGGER") return;

    const text = (message.text || "").trim();
    if (!text) {
      sendResponse({ ok: false });
      return;
    }

    const info = getSelectionInfo();
    const rect = info?.rect || selectionRect || null;
    openCard(text, rect);
    removePill();
    sendResponse({ ok: true });
  });
})();
