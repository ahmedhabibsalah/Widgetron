// Generic relay server — reads which provider to call from .env, using the
// same two formats as the client-side provider.js. No per-provider file:
// switching providers means changing .env, not writing new code.

require("dotenv").config();
const express = require("express");
const app = express();

app.use(express.json());

const FORMAT = process.env.PROVIDER_FORMAT; // "openai" | "anthropic"
const BASE_URL = process.env.PROVIDER_BASE_URL;
const API_KEY = process.env.PROVIDER_API_KEY;
const MODEL = process.env.PROVIDER_MODEL;

async function callOpenAIFormat({ messages, systemPrompt }) {
  const res = await fetch(BASE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(API_KEY ? { Authorization: `Bearer ${API_KEY}` } : {}),
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: "system", content: systemPrompt }, ...messages],
    }),
  });

  if (!res.ok) {
    throw new Error(
      `Provider request failed: ${res.status} ${await res.text()}`,
    );
  }

  const data = await res.json();
  return data.choices[0].message.content;
}

async function callAnthropicFormat({ messages, systemPrompt }) {
  const res = await fetch(BASE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1024,
      system: systemPrompt,
      messages,
    }),
  });

  if (!res.ok) {
    throw new Error(
      `Provider request failed: ${res.status} ${await res.text()}`,
    );
  }

  const data = await res.json();
  return data.content[0].text;
}

app.post("/api/widgetron-relay", async (req, res) => {
  const { messages, systemPrompt } = req.body;

  if (!Array.isArray(messages) || typeof systemPrompt !== "string") {
    return res
      .status(400)
      .json({
        error: "messages (array) and systemPrompt (string) are required",
      });
  }

  if (!FORMAT || !BASE_URL || !MODEL) {
    return res.status(500).json({
      error:
        "Relay is not configured. Set PROVIDER_FORMAT, PROVIDER_BASE_URL, PROVIDER_MODEL (and PROVIDER_API_KEY if required) in .env",
    });
  }

  try {
    const reply =
      FORMAT === "anthropic"
        ? await callAnthropicFormat({ messages, systemPrompt })
        : await callOpenAIFormat({ messages, systemPrompt });

    res.status(200).json({ reply });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "AI request failed" });
  }
});

const PORT = process.env.RELAY_PORT || 3002;
app.listen(PORT, () => {
  console.log(`Widgetron relay server running on http://localhost:${PORT}`);
  console.log(
    `Configured provider: format=${FORMAT || "(unset)"} model=${MODEL || "(unset)"}`,
  );
});
