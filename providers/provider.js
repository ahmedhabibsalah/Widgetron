function createProvider({ format, baseUrl, apiKey, model, headers = {} }) {
  if (format === "openai") {
    return {
      async chat({ messages, systemPrompt, signal }) {
        const res = await fetch(baseUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
            ...headers,
          },
          body: JSON.stringify({
            model,
            messages: [{ role: "system", content: systemPrompt }, ...messages],
          }),
          signal,
        });

        if (!res.ok) {
          throw new Error(`Request failed: ${res.status}`);
        }

        const data = await res.json();
        return data.choices[0].message.content;
      },
    };
  }

  if (format === "anthropic") {
    return {
      async chat({ messages, systemPrompt, signal }) {
        const res = await fetch(baseUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
            ...headers,
          },
          body: JSON.stringify({
            model,
            max_tokens: 1024,
            system: systemPrompt,
            messages,
          }),
          signal,
        });

        if (!res.ok) {
          throw new Error(`Request failed: ${res.status}`);
        }

        const data = await res.json();
        return data.content[0].text;
      },
    };
  }

  throw new Error(`Unknown provider format: ${format}`);
}

if (typeof module !== "undefined") {
  module.exports = { createProvider };
}
