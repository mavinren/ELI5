const ext = globalThis.browser ?? globalThis.chrome;

const GEMINI_MODEL = "gemini-2.5-flash";
const GEMINI_URL =
  `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
const MAX_TEXT_LENGTH = 6000;

ext.runtime.onInstalled.addListener(async () => {
  await ext.contextMenus.removeAll();
  await ext.contextMenus.create({
    id: "eli5-explain",
    title: "Explain like I'm 5",
    contexts: ["selection"],
  });
});

ext.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== "eli5-explain" || !tab?.id) return;
  triggerExplain(tab.id, info.selectionText || "", info.frameId ?? 0);
});

ext.runtime.onMessage.addListener((message) => {
  if (message?.type !== "ELI5_REQUEST") return;

  return handleExplainRequest(message.text).catch((err) => ({
    error: err?.message || "Something went wrong. Please try again.",
  }));
});

async function triggerExplain(tabId, text, frameId) {
  const message = { type: "ELI5_TRIGGER", text };

  try {
    await ext.tabs.sendMessage(tabId, message, { frameId });
    return;
  } catch {
    // Content script missing (common on tabs open before install/reload).
  }

  try {
    await ext.scripting.executeScript({
      target: { tabId, frameIds: [frameId] },
      files: ["content.js"],
    });
    await ext.tabs.sendMessage(tabId, message, { frameId });
  } catch (err) {
    console.error("ELI5: could not open explanation card", err);
    try {
      await ext.scripting.executeScript({
        target: { tabId },
        func: () => {
          alert(
            "ELI5 can't run on this page. Try a normal webpage (http/https) and refresh it, then try again."
          );
        },
      });
    } catch {
      // Restricted page (about:, AMO, etc.)
    }
  }
}

async function handleExplainRequest(rawText) {
  const stored = await ext.storage.local.get("geminiApiKey");
  const apiKey = (stored.geminiApiKey || "").trim();

  if (!apiKey) {
    return { error: "NO_KEY" };
  }

  const text = String(rawText || "").trim().slice(0, MAX_TEXT_LENGTH);
  if (!text) {
    return { error: "No text selected to explain." };
  }

  const prompt = buildPrompt(text);

  let response;
  try {
    response = await fetch(`${GEMINI_URL}?key=${encodeURIComponent(apiKey)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.4,
        },
      }),
    });
  } catch {
    return {
      error: "Could not reach Gemini. Check your internet connection and try again.",
    };
  }

  if (!response.ok) {
    return { error: friendlyHttpError(response.status) };
  }

  let data;
  try {
    data = await response.json();
  } catch {
    return { error: "Received an unreadable response from Gemini." };
  }

  const modelText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!modelText || typeof modelText !== "string") {
    return { error: "Gemini returned an empty explanation. Try again." };
  }

  const levels = parseLevels(modelText);
  return { levels };
}

function buildPrompt(text) {
  return `You explain confusing text at three reading levels.

Return ONLY a JSON object with exactly these three string keys:
- "five": Explain to a curious 5-year-old in 2-3 short sentences. Use a friendly concrete analogy. Zero jargon.
- "fifteen": Explain to a sharp 15-year-old in plain vocabulary. Stay accurate and clear.
- "expert": Explain in precise, technically correct, professional plain English in 2-4 sentences.

Do not include markdown, code fences, labels, or any text outside the JSON object.

Text to explain:
"""
${text}
"""`;
}

function friendlyHttpError(status) {
  if (status === 400 || status === 403) {
    return "Your Gemini API key looks invalid. Check it in the extension settings.";
  }
  if (status === 429) {
    return "Rate limit hit on the free Gemini tier. Try again in a moment.";
  }
  return `Gemini request failed (HTTP ${status}). Please try again.`;
}

function parseLevels(modelText) {
  let parsed;

  try {
    parsed = JSON.parse(modelText);
  } catch {
    const match = modelText.match(/\{[\s\S]*\}/);
    if (!match) {
      throw new Error("Could not parse Gemini's response. Please try again.");
    }
    try {
      parsed = JSON.parse(match[0]);
    } catch {
      throw new Error("Could not parse Gemini's response. Please try again.");
    }
  }

  const five = typeof parsed?.five === "string" ? parsed.five.trim() : "";
  const fifteen =
    typeof parsed?.fifteen === "string" ? parsed.fifteen.trim() : "";
  const expert = typeof parsed?.expert === "string" ? parsed.expert.trim() : "";

  if (!five || !fifteen || !expert) {
    throw new Error(
      "Gemini response was missing one or more explanation levels. Please try again."
    );
  }

  return { five, fifteen, expert };
}
