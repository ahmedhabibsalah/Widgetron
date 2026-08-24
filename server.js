require("dotenv").config();
const express = require("express");
const { getProvider } = require("./config/providers");

const app = express();
app.use(express.json());

app.post("/api/chat", async (req, res) => {
  const { messages, provider } = req.body;
  const providerName = provider || process.env.DEFAULT_PROVIDER;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: "messages array is required" });
  }

  try {
    const ai = getProvider(providerName);
    const reply = await ai.chat({
      messages,
      systemPrompt:
        "You are a helpful assistant embedded on a website. Keep answers short.",
    });
    res.status(200).json({ reply });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "AI request failed" });
  }
});

app.listen(3001, () => {
  console.log("AI tool server running on http://localhost:3001");
});
