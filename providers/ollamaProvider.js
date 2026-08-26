async function chat({ messages, systemPrompt, signal }) {
  const res = await fetch("http://localhost:11434/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "llama3.2",
      messages: [{ role: "system", content: systemPrompt }, ...messages],
      stream: false,
    }),
    signal,
  });

  if (!res.ok) {
    throw new Error(`Ollama request failed: ${res.status}`);
  }

  const data = await res.json();
  return data.message.content;
}

if (typeof module !== "undefined") {
  module.exports = { chat };
}
