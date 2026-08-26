function createWidgetDOM() {
  const bubble = document.createElement("button");
  bubble.className = "widgetron-bubble";
  bubble.textContent = "💬";

  const panel = document.createElement("div");
  panel.className = "widgetron-panel";
  panel.innerHTML = `
    <div class="widgetron-messages"></div>
    <div class="widgetron-input-row">
      <input type="text" placeholder="Ask something..." />
      <button class="widgetron-send">Send</button>
    </div>
  `;

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

function appendMessage(messagesEl, role, text) {
  const el = document.createElement("div");
  el.className = `widgetron-message ${role}`;
  el.textContent = text;
  messagesEl.appendChild(el);
  messagesEl.scrollTop = messagesEl.scrollHeight;
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

async function handleSendMessage(text, elements, config) {
  appendMessage(elements.messagesEl, "user", text);

  const activeModes = resolveModesForPage(config);

  let actionResult = null;

  if (activeModes.includes("action")) {
    actionResult = await askForAction({
      chatFn: config.chatFn,
      userMessage: text,
    });
  }

  if (actionResult && actionResult.action !== "none") {
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
  });

  appendMessage(elements.messagesEl, "assistant", assistantResult.answer);
}

function initWidget(config) {
  const elements = createWidgetDOM();

  const send = () => {
    const text = elements.inputEl.value.trim();
    if (!text) return;
    elements.inputEl.value = "";
    handleSendMessage(text, elements, config);
  };

  elements.sendBtn.addEventListener("click", send);
  elements.inputEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter") send();
  });
}

if (typeof window !== "undefined") {
  window.Widgetron = { init: initWidget };
}
