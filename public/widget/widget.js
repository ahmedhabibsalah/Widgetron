const ICONS = {
  chat: `<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>`,
  send: `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>`,
  stop: `<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>`,
  mic: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>`,
};

const SpeechRecognitionAPI =
  window.SpeechRecognition || window.webkitSpeechRecognition;

function isSpeechSupported() {
  return typeof SpeechRecognitionAPI !== "undefined";
}

const HISTORY_KEY = "widgetron-chat-history";

const ACTION_CLAIM_PATTERN =
  /\b(added|removed|placed your order|order (id|#|number)|added to (your|the) cart)\b/i;

function containsActionClaim(text) {
  return ACTION_CLAIM_PATTERN.test(text);
}

function loadHistory() {
  try {
    const raw = sessionStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveHistory(history) {
  try {
    sessionStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  } catch {
    // sessionStorage can fail in private browsing on some browsers — chat
    // still works for the current page, it just won't persist across nav.
  }
}

function createWidgetDOM(config) {
  const bubble = document.createElement("button");
  bubble.className = "widgetron-bubble";
  bubble.innerHTML = ICONS.chat;

  const panel = document.createElement("div");
  panel.className = "widgetron-panel";
  panel.innerHTML = `
    <div class="widgetron-messages"></div>
    <div class="widgetron-input-row">
      ${
        isSpeechSupported() && config.voice !== false
          ? `<button class="widgetron-mic" type="button" title="Speak">${ICONS.mic}</button>`
          : ""
      }
      <input type="text" placeholder="Ask something..." />
      <button class="widgetron-send" type="button">${ICONS.send}</button>
    </div>
  `;

  // theme: "light" | "dark" forces that palette via the CSS variable
  // overrides. Anything else (unset, "auto") leaves it to the
  // prefers-color-scheme media query in widget.css, which follows the
  // visitor's OS/browser setting automatically.
  // Applied to <html>, not the widget elements themselves, so the confirm
  // modal (mounted separately, straight to document.body) inherits the
  // same variables too.
  if (config.theme === "light" || config.theme === "dark") {
    document.documentElement.dataset.widgetronTheme = config.theme;
  }

  bubble.addEventListener("click", () => {
    panel.classList.toggle("open");
  });

  document.body.appendChild(bubble);
  document.body.appendChild(panel);

  return {
    messagesEl: panel.querySelector(".widgetron-messages"),
    inputEl: panel.querySelector("input"),
    sendBtn: panel.querySelector(".widgetron-send"),
    micBtn: panel.querySelector(".widgetron-mic"), // null if unsupported or disabled
  };
}

function appendMessage(messagesEl, role, text, history) {
  const el = document.createElement("div");
  el.className = `widgetron-message ${role}`;
  el.textContent = text;
  messagesEl.appendChild(el);
  messagesEl.scrollTop = messagesEl.scrollHeight;

  if (history) {
    history.push({ role, text });
    saveHistory(history);
  }

  return el;
}

function showTypingIndicator(messagesEl) {
  const el = document.createElement("div");
  el.className = "widgetron-message assistant widgetron-typing";
  el.innerHTML = `<span></span><span></span><span></span>`;
  messagesEl.appendChild(el);
  messagesEl.scrollTop = messagesEl.scrollHeight;
  return el;
}

function resolveModesForPage(config) {
  const currentPath = window.location.pathname;

  if (config && Array.isArray(config.pageRules)) {
    for (const rule of config.pageRules) {
      let regexPattern = rule.match.replace(/[.+^${}()|[\]\\]/g, "\\$&");
      regexPattern = regexPattern.replace(/\*/g, ".*");
      const pathRegex = new RegExp(`^${regexPattern}$`);
      if (pathRegex.test(currentPath)) {
        return rule.modes;
      }
    }
  }

  return config.modes || ["read"];
}

function formatActionResultMessage(action, success) {
  const qty = action.quantity ?? 1;

  if (!success) {
    return `Sorry, I couldn't complete that — please try again.`;
  }

  if (action.action === "add_to_cart") {
    return `Added ${qty} × ${action.item} to your cart.`;
  }

  if (action.action === "remove_from_cart") {
    return `Removed ${action.item} from your cart.`;
  }

  return "Done.";
}

async function handleSendMessage(text, elements, config, state) {
  // Snapshot BEFORE appending the current message — otherwise the current
  // message ends up duplicated (once from history, once as userMessage).
  const recentHistory = state.history.slice(-6);

  appendMessage(elements.messagesEl, "user", text, state.history);

  const activeModes = resolveModesForPage(config);
  const typingEl = showTypingIndicator(elements.messagesEl);

  const controller = new AbortController();
  state.activeController = controller;
  setSendButtonState(elements.sendBtn, "cancel");

  try {
    let actionResult = null;

    if (activeModes.includes("action")) {
      actionResult = await askForAction({
        chatFn: config.chatFn,
        userMessage: text,
        signal: controller.signal,
        history: recentHistory,
      });
    }

    if (actionResult && actionResult.action !== "none") {
      typingEl.remove();
      showConfirmDialog(
        actionResult,
        {
          onAddToCart: config.onAddToCart,
          onRemoveFromCart: config.onRemoveFromCart,
        },
        (finishedAction, success) => {
          const resultText = formatActionResultMessage(finishedAction, success);
          appendMessage(
            elements.messagesEl,
            "assistant",
            resultText,
            state.history,
          );
        },
      );
      return;
    }

    const assistantResult = await askAssistant({
      chatFn: config.chatFn,
      userMessage: text,
      pageUrls: config.pageUrls,
      apiConfigs: config.apiConfigs,
      signal: controller.signal,
      history: recentHistory,
    });

    let finalAnswer = assistantResult.answer;

    // Backstop against the model claiming an action happened on a page
    // where action mode isn't even active — never trust the model's own
    // claim about performing an action, override it in code regardless of
    // what it says.
    if (!activeModes.includes("action") && containsActionClaim(finalAnswer)) {
      finalAnswer =
        "I can only answer questions here — I'm not able to perform actions like adding or removing items on this page.";
    }

    typingEl.remove();
    appendMessage(elements.messagesEl, "assistant", finalAnswer, state.history);
  } catch (err) {
    typingEl.remove();
    if (err.name !== "AbortError") {
      appendMessage(
        elements.messagesEl,
        "assistant",
        "Something went wrong — please try again.",
        state.history,
      );
    }
    // AbortError means the user cancelled on purpose — no error message needed.
  } finally {
    state.activeController = null;
    setSendButtonState(elements.sendBtn, "send");
  }
}

function setSendButtonState(sendBtn, mode) {
  sendBtn.innerHTML = mode === "cancel" ? ICONS.stop : ICONS.send;
  sendBtn.dataset.mode = mode;
}

function setupVoiceInput(elements, send) {
  if (!elements.micBtn) return; // unsupported browser, or voice disabled in config

  const recognizer = new SpeechRecognitionAPI();
  recognizer.lang = navigator.language || "en-US";
  recognizer.continuous = false;
  recognizer.interimResults = true;

  let listening = false;

  const setListeningState = (isListening) => {
    listening = isListening;
    elements.micBtn.classList.toggle("listening", isListening);
  };

  elements.micBtn.addEventListener("click", () => {
    if (listening) {
      recognizer.stop();
      return;
    }
    try {
      recognizer.start();
      setListeningState(true);
    } catch {
      // start() throws if called while already running — ignore, the
      // existing session will just continue.
    }
  });

  recognizer.addEventListener("result", (e) => {
    const transcript = Array.from(e.results)
      .map((r) => r[0].transcript)
      .join("");
    elements.inputEl.value = transcript;

    const lastResult = e.results[e.results.length - 1];
    if (lastResult.isFinal) {
      setListeningState(false);
      send();
    }
  });

  recognizer.addEventListener("error", () => {
    setListeningState(false);
    // Permission denied, no speech detected, etc. — fail quietly, the
    // person can just type instead. No need to surface a chat error for
    // an optional input method.
  });

  recognizer.addEventListener("end", () => {
    setListeningState(false);
  });
}

function initWidget(config) {
  // Being loaded inside a background content-read iframe (see
  // readDynamicPage in pageReader.js) rather than a real page visit —
  // don't self-initialize. Without this guard, the widget would spin up a
  // second hidden copy of itself inside every page it reads for context,
  // restoring THAT copy's chat history and leaking it into the very
  // context being gathered.
  if (new URLSearchParams(window.location.search).has("widgetronRead")) {
    return;
  }

  const elements = createWidgetDOM(config);
  const state = { activeController: null, history: loadHistory() };

  // Re-render any messages from a previous page's chat session.
  state.history.forEach((msg) => {
    appendMessage(elements.messagesEl, msg.role, msg.text, null); // null: don't re-save what we just loaded
  });

  const send = () => {
    if (elements.sendBtn.dataset.mode === "cancel") {
      state.activeController?.abort();
      return;
    }
    const text = elements.inputEl.value.trim();
    if (!text) return;
    elements.inputEl.value = "";
    handleSendMessage(text, elements, config, state);
  };

  elements.sendBtn.addEventListener("click", send);
  elements.inputEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter") send();
  });

  setupVoiceInput(elements, send);
}

if (typeof window !== "undefined") {
  window.Widgetron = { init: initWidget };
}
