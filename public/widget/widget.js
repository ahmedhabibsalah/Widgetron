// ---- Given: the visual shell ----
// Creates the floating bubble + chat panel and wires open/close. Message
// rendering is a plain append-to-list function — nothing decides WHAT to
// send yet, that's your TODOs below.

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

// ---- TODO 1: resolve which modes apply on the current page ----
//
// config shape:
// {
//   modes: ["read"],                 // default/fallback
//   pageRules: [
//     { match: "/product/*", modes: ["read", "action"] }
//   ]
// }
//
// Steps:
// 1. Get the current path: window.location.pathname
// 2. Loop through config.pageRules (if any). For each rule, check whether
//    the current path matches rule.match.
//    - rule.match uses a simple glob: "*" means "anything". You'll need to
//      turn that into something you can test against — look up how to
//      convert a string with "*" into a RegExp (hint: escape the string,
//      then replace the escaped "*" with ".*", then build `new RegExp(...)`
//      anchored with ^ and $).
// 3. Return the FIRST matching rule's modes array.
// 4. If nothing matches, return config.modes (the default).
//
// function resolveModesForPage(config) {
//   // your code here
// }

// ---- TODO 2: handle sending a message ----
//
// This is the orchestration piece — ties together everything from Phases
// 3 and 4 based on which modes are active.
//
// Steps:
// 1. Read the user's text from the input, and don't do anything if it's empty.
// 2. Call appendMessage(elements.messagesEl, "user", text) to show it immediately.
// 3. Clear the input.
// 4. Call resolveModesForPage(config) (your TODO 1) to know what's allowed
//    on this page.
// 5. Decide what to do:
//    - If "action" is in the resolved modes, try askForAction() first
//      (from actionEngine.js). If it returns something other than
//      { action: "none" }, call showConfirmDialog() (from confirmUI.js)
//      instead of treating this as a question — don't also call
//      askAssistant in this case.
//    - Otherwise (or if action mode isn't enabled, or the action was
//      "none"), fall back to askAssistant() (from chatEngine.js) and
//      appendMessage(elements.messagesEl, "assistant", result.answer).
// 6. Both askForAction and askAssistant need a chatFn — pass through
//    whatever provider function config gives you (e.g. config.chatFn).
//
// async function handleSendMessage(text, elements, config) {
//   // your code here
// }

// ---- Given: entry point, wires TODOs in once you've built them ----

function initWidget(config) {
  const elements = createWidgetDOM();

  const send = () => {
    const text = elements.inputEl.value.trim();
    if (!text) return;
    handleSendMessage(text, elements, config); // relies on your TODO 2
  };

  elements.sendBtn.addEventListener("click", send);
  elements.inputEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter") send();
  });
}

if (typeof window !== "undefined") {
  window.Widgetron = { init: initWidget };
}
