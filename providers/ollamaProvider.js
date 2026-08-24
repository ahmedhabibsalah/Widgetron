// Every provider exports one function with this exact shape:
// chat({ messages, systemPrompt }) -> Promise<string>
// messages: [{ role: "user" | "assistant", content: "..." }]

async function chat({ messages, systemPrompt }) {
  const res = await fetch("http://localhost:11434/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: process.env.OLLAMA_MODEL,
      messages: [{ role: "system", content: systemPrompt }, ...messages],
      stream: false,
    }),
  });

  if (!res.ok) {
    throw new Error(`Ollama request failed: ${res.status}`);
  }

  const data = await res.json();
  return data.message.content;
}

module.exports = { chat };
