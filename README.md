# Widgetron

An embeddable AI assistant for websites. Drop in a script tag and it can:

- **Read mode** — answer visitor questions using the site's own content
  (current page, other same-site pages, and optionally a configured API).
- **Action mode** — parse natural-language requests into constrained,
  confirmed actions (e.g. add/remove cart items), executed by callbacks the
  site owner provides. Widgetron never touches the site's backend directly.

No hosting, no database, no per-user accounts. You bring your own AI provider
key (Anthropic, OpenAI, a local model via Ollama, or your own custom adapter).

**Status: early development.** Not yet published to npm. See `ROADMAP.md`
for what's built and what's next.

## Why

Most "AI website widget" products require you to hand your data and API
usage to a third-party service. Widgetron is a library, not a service — it
runs entirely in the browser, on the site owner's own page, using their own
model access. You control your data and your costs.

## Quick look at the shape (subject to change during development)

```html
<script src="widgetron.js"></script>
<script>
  Widgetron.init({
    provider: "anthropic", // or "openai", "ollama", or a customProvider function
    apiKey: "...", // or proxied through your own thin relay server
    modes: ["read"], // default modes; can be overridden per page
    pageRules: [{ match: "/product/*", modes: ["read", "action"] }],
    onAddToCart: (item, quantity) => {
      /* your own cart logic */
    },
    onRemoveFromCart: (item, quantity) => {
      /* your own cart logic */
    },
  });
</script>
```

## Project structure

```
widgetron/
  src/
    widget/       — browser-side code: page reading, chat UI, voice input
    providers/    — AI provider adapters (shared interface, swappable)
  README.md
  ROADMAP.md
  LICENSE
```

## License

MIT — see `LICENSE`.
