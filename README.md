# ELI5: Explain Like I'm 5

Created by [Mavin Emmanuel](https://x.com/konvashon).

The internet is full of text that was clearly written by someone who has never met a human being. Terms of service. Stack traces. Academic abstracts. Corporate "synergy" emails. You highlight the confusing bit, ELI5 turns it into plain English, and you get on with your life.

Three reading levels come back in one shot:

| Level | Who it's for |
| --- | --- |
| **5** | A curious five-year-old. Short sentences, a concrete analogy, zero jargon. |
| **15** | A sharp teenager. Plain words, still accurate. |
| **Expert** | You, but less tired. Precise, professional, no fluff. |

Flip between them with a slider. No second API call. No "please wait while we re-explain the same paragraph you already paid for."

You bring your own free [Gemini API key](https://aistudio.google.com/apikey). There is no backend, no account system, and no surprise invoice. The extension talks to Google from your browser. Running cost: **$0**.

Works in Chrome, Edge, Brave, and other Chromium browsers.

---

## Quick start

1. Grab a free Gemini key: [aistudio.google.com/apikey](https://aistudio.google.com/apikey)
2. Open `chrome://extensions`
3. Turn on **Developer mode** (top right)
4. Click **Load unpacked** and select this repo folder (the one that contains `manifest.json`)
5. Click the ELI5 toolbar icon, paste your key, hit **Save key**
6. Open any normal webpage, highlight something baffling, and either:
   - click the floating **Explain** pill, or
   - right-click and choose **Explain like I'm 5**

If nothing happens on a tab that was already open before you installed the extension, refresh the page. Content scripts are polite; they do not teleport into tabs that predate them. The context menu will try to inject itself if needed, but a refresh is the reliable fix.

---

## What you get

### The Explain pill

Highlight more than two characters of text. A small pill appears near the selection. Click it. That is the whole interaction model, and it is intentionally boring.

### The explanation card

A compact card shows up near your selection (clamped so it does not fall off the edge of the screen like a bad tooltip from 2009):

- Loading state with a spinner and "Explaining..."
- The explanation in a serif body font (so it feels like a person wrote it, not a settings panel)
- A **5 / 15 / Expert** segmented control that swaps the cached text instantly
- A **Copy** button that copies whatever level you are currently looking at
- Escape, the close button, or a click outside the card dismisses it

### Context menu

Right-click selected text and pick **Explain like I'm 5**. Same card, same flow. Useful when the pill is awkward (dense layouts, weird selection geometry, or you just like menus).

### Settings

The toolbar popup and the extension options page are the same small settings screen:

- Password-style field for your Gemini API key
- Stored only in `chrome.storage.local` on your machine
- Link to Google AI Studio if you do not have a key yet
- A three-step "how to use it" reminder for future-you who will forget

---

## How it works (the short version)

```
You highlight text
        |
        v
content.js shows the pill / opens the card
        |
        v
background.js reads your local API key
        |
        v
One request to Gemini (gemini-2.5-flash)
asks for all three levels as JSON
        |
        v
content.js caches { five, fifteen, expert }
and the slider just swaps strings
```

No server of ours sits in the middle. If Google is down, ELI5 is down. If your key is wrong, you get a friendly error instead of a blank card and existential dread.

---

## Privacy and money

| Question | Answer |
| --- | --- |
| Where is my API key stored? | Locally, in `chrome.storage.local`. |
| Does it leave my machine? | Only when the extension calls Gemini, as the `key` query param on Google's API. |
| Do you run a proxy? | No. |
| Do you log selections? | No. There is nothing to log into. |
| What does it cost to run? | $0 for you, assuming you stay on Gemini's free tier. |
| What about the Chrome Web Store? | Publishing there needs Google's one-time **$5** developer registration. That is a publisher fee, not a per-user fee, and it has nothing to do with this repo's runtime cost. |

Selected text is sent to Google so the model can explain it. Do not highlight your nuclear launch codes. Or do. I am a README, not your lawyer.

---

## Permissions (and why they exist)

Chrome will list these. Here is the plain-English version:

| Permission | Why |
| --- | --- |
| `contextMenus` | Adds **Explain like I'm 5** to the right-click menu on selected text. |
| `storage` | Saves your API key locally. |
| `scripting` | Injects the content script if a tab was open before install/reload and the menu needs a listener. |
| `activeTab` | Lets that on-demand injection work when you invoke the extension from the context menu. |
| Host access to `generativelanguage.googleapis.com` | So the service worker can call Gemini. Nothing else. |

The content script matches `<all_urls>` so the pill can appear on normal websites. It still cannot run on locked-down pages like `chrome://` settings or the Chrome Web Store. That is a browser rule, not a bug report waiting to happen.

---

## Install details (for when step 4 goes sideways)

**Load the folder that contains `manifest.json`.** If Chrome says the manifest is missing, you selected the parent directory by accident. Go one level deeper (or shallower). Computers are very literal.

After you change `manifest.json` permissions, hit **Reload** on the extension card at `chrome://extensions`. Then refresh the page you are testing.

Supported browsers in practice:

- Google Chrome
- Microsoft Edge
- Brave
- Other Chromium forks that still speak Manifest V3

Firefox is a different animal and is not targeted here.

---

## Usage tips

- Cap is **6000 characters** of selected text. That is plenty for a paragraph of legalese and not enough for your entire dissertation in one gulp.
- Default level on open is **5**. Adults are allowed to use it. No one is checking ID.
- Slider changes are instant because all three strings are already in memory.
- **Copy** copies the level currently on screen, not all three.
- If you have no key set, the card tells you and offers **Open settings**.
- Invalid keys and rate limits get human-readable errors (not a stack trace cosplay).

---

## Project layout

Plain JavaScript, HTML, and CSS. No build step, no bundler, no framework, no `node_modules` folder that weighs more than your laptop.

```
.
├── manifest.json      # Manifest V3 entry point
├── background.js      # Service worker: menu, Gemini call, JSON parsing
├── content.js         # Pill + card UI (Shadow DOM, so page CSS cannot wreck it)
├── options.html       # Settings UI (toolbar popup + options page)
├── options.js         # Save / load API key
├── options.css        # Same visual language as the card
├── icons/             # 16, 32, 48, 128 px toolbar icons
└── README.md          # You are here
```

### `manifest.json`

Declares Manifest V3, permissions, the service worker, the content script, icons, and points both the toolbar popup and the options page at `options.html`.

### `background.js`

- Creates the context menu on install
- On menu click, messages the active tab (and injects `content.js` if the tab has no listener yet)
- Handles `ELI5_REQUEST`: reads the key, trims/caps the text, calls `gemini-2.5-flash` with `responseMimeType: application/json`, parses `{ five, fifteen, expert }`, returns levels or a friendly error

HTTP status mapping, because APIs enjoy being cryptic:

- **400 / 403**: key looks invalid
- **429**: free-tier rate limit, try again in a moment
- **other**: generic failure with the status code included

If the model wraps JSON in stray text (it happens), a fallback pulls the first `{...}` block before giving up.

### `content.js`

Injected into pages. Responsibilities:

- Detect selection on `mouseup` (short debounce) and show the Explain pill
- Open the card from the pill or from `ELI5_TRIGGER`
- Render everything inside a single host element with an open Shadow DOM and inline styles (page CSS stays out; extension CSS stays in)
- Cache the three levels and swap on slider click
- Dismiss on Escape or outside click
- Keep the card inside the viewport

UI chrome uses a system sans stack. Explanation body uses Georgia / Iowan / Palatino so the answer feels written, not generated by a form control.

### `options.html` / `options.js` / `options.css`

Settings popup (~320px wide). Load key from storage, save key to storage, show **Saved** or an inline error if you try to save an empty field. Same ink-forest / parchment / amber palette as the card.

### `icons/`

Rounded square, deep green background (`#16241E`), parchment serif **5**, short amber bar underneath like a highlighter stroke. Four sizes for Chrome's various moods.

---

## Design notes (for the curious)

Colors are intentional and restrained:

| Token | Hex | Job |
| --- | --- | --- |
| Background | `#16241E` | Card and settings page |
| Primary text | `#F3EFE3` | Body copy |
| Muted text | `#B9C4BC` | Secondary labels |
| Accent | `#F2C14E` | Eyebrow, underline bar, active slider segment, primary buttons |
| Error | `#E7A0A0` | Bad news, gently |
| Success | `#9FD6A9` | "Saved" and "Copied" |

Accent is used sparingly. If everything is highlighted, nothing is.

The recurring motif is a small uppercase **ELI5** label with a short amber underline. Same mark on the card and the settings page so they feel like one product, not two strangers who met in a pull request.

---

## Manual test checklist

Use this after a fresh load:

- [ ] Loads via **Load unpacked** with no errors
- [ ] Highlighting text shows the Explain pill near the selection
- [ ] Pill opens a card: spinner, then the **5** explanation
- [ ] Slider switches **5 / 15 / Expert** with only one `generateContent` network call
- [ ] Copy puts the visible explanation on the clipboard
- [ ] Right-click menu produces the same card
- [ ] No API key shows a clear prompt and **Open settings** works
- [ ] Bad API key shows a friendly error
- [ ] Pill and card survive hostile page CSS (Shadow DOM isolation)
- [ ] Escape and outside click dismiss the UI
- [ ] Card stays fully on-screen near viewport edges

---

## Troubleshooting

**"Manifest file is missing or unreadable"**  
You loaded the wrong folder. Select the directory that contains `manifest.json`.

**Context menu does nothing**  
Reload the extension, refresh the page, try again. Restricted pages (`chrome://`, Web Store, some PDF viewers) will not run content scripts.

**Pill never appears**  
Refresh the tab after install. Selection must be longer than two characters.

**"Your Gemini API key looks invalid"**  
Re-copy the key from AI Studio. No extra spaces, no quotes, no "I pasted my grocery list by mistake."

**Rate limit errors**  
Free tier has limits. Wait a moment. Touch grass. Try again.

**Card appears but stays on "Explaining..."**  
Check the service worker console on `chrome://extensions` (service worker link under ELI5) and the page's content-script console. Network tab should show a call to `generativelanguage.googleapis.com`.

---

## Development

There is no build pipeline. Edit a file, reload the extension, refresh the test page. That is the whole developer experience, and it is gloriously unfashionable.

Suggested loop:

1. Change code
2. `chrome://extensions` → Reload
3. Refresh the test tab
4. Highlight something pretentious
5. See if it still works

Model used: `gemini-2.5-flash` via the Gemini `generateContent` endpoint. Temperature is `0.4` so explanations stay coherent without sounding like a thesaurus had a stroke.

---

## Publishing (optional)

This repo is set up for **Load unpacked**. Shipping to the Chrome Web Store is optional and separate:

1. Pay Google's one-time **$5** developer registration (publisher cost, not user cost)
2. Zip the extension files (not a parent folder full of unrelated junk)
3. Upload through the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
4. Fill out the listing, privacy disclosures, and screenshots like a responsible adult

Users still supply their own Gemini keys. Your store listing fee does not become their monthly bill.

---

## License

Use it, fork it, improve it, explain your own terms of service with it. If you ship a version that charges people for their own API keys, at least have the decency to feel slightly bad about it.

---

## Credits

Created by [Mavin Emmanuel](https://x.com/konvashon).

Built for people who read "force majeure" and feel personally attacked. Powered by your Gemini key and a deep suspicion of jargon.
