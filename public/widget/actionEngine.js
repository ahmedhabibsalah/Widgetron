const ALLOWED_ACTIONS = ["add_to_cart", "remove_from_cart", "none"];

function parseActionResponse(rawText) {
  try {
    const parsed = JSON.parse(rawText);

    if (
      typeof parsed.action !== "string" ||
      !ALLOWED_ACTIONS.includes(parsed.action)
    ) {
      return { action: "none", item: null, quantity: null, wellFormed: false };
    }

    return {
      action: parsed.action,
      item: typeof parsed.item === "string" ? parsed.item : null,
      quantity: typeof parsed.quantity === "number" ? parsed.quantity : null,
      wellFormed: true,
    };
  } catch {
    return { action: "none", item: null, quantity: null, wellFormed: false };
  }
}

async function executeAction(action, callbacks) {
  const handlers = {
    add_to_cart: () =>
      callbacks.onAddToCart?.(action.item, action.quantity ?? 1),
    remove_from_cart: () =>
      callbacks.onRemoveFromCart?.(action.item, action.quantity),
    none: () => null,
  };

  const handler = handlers[action.action];
  if (!handler) {
    throw new Error(`No handler for action: ${action.action}`);
  }

  return await handler();
}

function buildActionSystemPrompt() {
  const systemPrompt = `
You are an e-commerce intent classification engine. Your sole job is to analyze the user's message and convert their intent into a single, structured JSON object.

CRITICAL RULES:
1. You must classify ONLY the most recent user message into exactly ONE of the three JSON shapes listed below. Earlier messages in the conversation are provided only for context — for example, to resolve "it" or "that" if the user refers back to something mentioned before. Do not re-classify earlier messages.
2. If the user wants to add an item but does not specify a quantity, you MUST default the quantity to 1.
3. If the user's message is not a clear request to add or remove items from a cart, you MUST return the "none" action. Do not try to answer questions or guess intent.
4. Output ONLY the raw JSON object. Do not include introductory text, markdown block formatting (like \`\`\`json), or trailing text.

ACCEPTED JSON SHAPES:

For adding items:
{ 
  "action": "add_to_cart", 
  "item": "Name of the item as a string", 
  "quantity": Integer number 
}

For removing items:
{ 
  "action": "remove_from_cart", 
  "item": "Name of the item as a string", 
  "quantity": null 
}

For unrelated inquiries, questions, or greetings:
{ 
  "action": "none" 
}
  `.trim();
  return systemPrompt;
}

async function askForAction({ userMessage, chatFn, signal, history = [] }) {
  const systemPrompt = buildActionSystemPrompt();
  const messages = [
    ...history.map((m) => ({ role: m.role, content: m.text })),
    { role: "user", content: userMessage },
  ];
  const rawReply = await chatFn({ systemPrompt, messages, signal });
  return parseActionResponse(rawReply);
}
if (typeof module !== "undefined") {
  module.exports = {
    parseActionResponse,
    executeAction,
    buildActionSystemPrompt,
    askForAction,
  };
}
