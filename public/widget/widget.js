const ICONS = {
  chat: `<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>`,
  send: `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>`,
  stop: `<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>`,
};

const HISTORY_KEY = "widgetron-chat-history";

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

async function handleSendMessage(text, elements, config, state) {
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
      });
    }

    if (actionResult && actionResult.action !== "none") {
      typingEl.remove();
      showConfirmDialog(actionResult, {
        onAddToCart: config.onAddToCart,
        onRemoveFromCart: config.onRemoveFromCart,
      });
      return;
    }

    const assistantResult = await askAssistant({
      chatFn: config.chatFn,
      userMessage: text,
      pageUrls: config.pageUrls,
      apiConfigs: config.apiConfigs,
      signal: controller.signal,
    });

    typingEl.remove();
    appendMessage(
      elements.messagesEl,
      "assistant",
      assistantResult.answer,
      state.history,
    );
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

function initWidget(config) {
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
}

if (typeof window !== "undefined") {
  window.Widgetron = { init: initWidget };
}
