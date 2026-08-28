# Widgetron

An embeddable AI assistant for websites. Install it, import it, configure it.

- **Read mode** — answer visitor questions using the site's own content (current page, other same-site pages, and/or a configured API).
- **Action mode** — parse natural-language requests into confirmed cart actions (add/remove), executed by callbacks you provide. Widgetron never touches your backend directly — you stay in control of what actually happens.

No hosting, no database, no per-user accounts, no fee to us. You bring your own AI provider — Ollama (free, local), Grok, OpenAI, Anthropic, or any OpenAI-compatible API.

## Install

```
npm install widgetron
```

## Quick start (React, Vite, or any bundler)

```jsx
// components/WidgetronLoader.jsx
import { useEffect } from "react";
import { init, createProvider } from "widgetron";
import "widgetron/dist/widgetron.css";

export default function WidgetronLoader() {
  useEffect(() => {
    const provider = createProvider({
      format: "openai",
      baseUrl: "https://api.x.ai/v1/chat/completions",
      apiKey: "YOUR_KEY", // see the relay-server note below before shipping this as-is
      model: "grok-4.3",
    });

    init({
      chatFn: provider.chat,
      modes: ["read"],
      pageUrls: ["/", "/about", "/products"],
    });
  }, []);

  return null; // renders nothing — this component only runs the init side effect
}
```

Render `<WidgetronLoader />` once, anywhere in your app (root layout/App component is typical). That's it — no `<script>` tags, nothing added to `index.html`.

**Next.js:** `window` doesn't exist during server-side rendering, so this must run client-side only.

- **App Router:** add `"use client"` at the top of `WidgetronLoader.jsx`.
- **Pages Router:** works as-is — components are already client-rendered by default there.

## Configuring for your site

Three things almost every real install needs to change from the example above:

1. **Pick and configure a real provider.** For production, use Grok/OpenAI/Anthropic with a real key, or set up the relay server so the key isn't exposed client-side (see below).

2. **Point `pageUrls` at your real pages**, and `apiConfigs` at any live data endpoints (like a products API) — without these, the assistant has nothing to answer from and will correctly say so rather than guess.

3. **Set `pageRules` if you want action mode scoped to specific pages** (e.g. only your cart/product pages, not your About page) — and wire `onAddToCart`/`onRemoveFromCart` to your actual cart or order logic.

```jsx
init({
  chatFn: provider.chat,
  modes: ["read"],
  pageRules: [{ match: "/cart", modes: ["read", "action"] }],
  pageUrls: ["/", "/about", "/products"],
  apiConfigs: [{ name: "products", url: "/api/products" }],
  onAddToCart: async (item, qty) => {
    // your real cart logic here
  },
  onRemoveFromCart: async (item, qty) => {
    // your real cart logic here
  },
});
```

## No bundler? (plain HTML, server-rendered templates, etc.)

If your site isn't built with a bundler at all — a plain Express app serving static HTML, server-rendered templates, or anything similar — `import` isn't available, so use the classic global build instead:

```html
<link rel="stylesheet" href="node_modules/widgetron/dist/widgetron.css" />
<script src="node_modules/widgetron/dist/widgetron.js"></script>
<script>
  const provider = createProvider({
    format: "openai",
    baseUrl: "http://localhost:11434/v1/chat/completions",
    apiKey: "ollama",
    model: "llama3.2",
  });

  Widgetron.init({
    chatFn: provider.chat,
    modes: ["read"],
    pageUrls: ["/index.html", "/about.html"],
  });
</script>
```

For an Express app specifically, serve the package's files with one line rather than copying them into `public/`:

```javascript
app.use(
  "/vendor/widgetron",
  express.static(path.join(__dirname, "node_modules/widgetron/dist")),
);
```

then reference `/vendor/widgetron/widgetron.js` and `/vendor/widgetron/widgetron.css` in your HTML.

## Providers

One function, `createProvider({ format, baseUrl, apiKey, model, headers })`, covers most APIs — you configure it, you don't write a new file per provider.

**`format: "openai"`** — covers OpenAI, Grok (xAI), Groq, and Ollama's own OpenAI-compatible endpoint. These share one request/response shape.

**`format: "anthropic"`** — Anthropic's Messages API has a different shape (system prompt as a separate field), so it gets its own branch, same function.

```javascript
// Ollama — local, free, no signup
createProvider({
  format: "openai",
  baseUrl: "http://localhost:11434/v1/chat/completions",
  apiKey: "ollama",
  model: "llama3.2",
});

// Grok (xAI)
createProvider({
  format: "openai",
  baseUrl: "https://api.x.ai/v1/chat/completions",
  apiKey: "YOUR_GROK_KEY",
  model: "grok-4.3", // check console.x.ai for the current model id — these get renamed/retired periodically
});

// OpenAI
createProvider({
  format: "openai",
  baseUrl: "https://api.openai.com/v1/chat/completions",
  apiKey: "YOUR_OPENAI_KEY",
  model: "gpt-4o",
});

// Anthropic
createProvider({
  format: "anthropic",
  baseUrl: "https://api.anthropic.com/v1/messages",
  apiKey: "YOUR_ANTHROPIC_KEY",
  model: "claude-sonnet-4-5",
});
```

Need a provider that fits neither format? Skip `createProvider` and pass any function matching `chat({ messages, systemPrompt, signal }) -> Promise<string>` directly as `chatFn`.

### ⚠️ API key exposure

Calling `createProvider` in client code puts your API key in the browser — anyone can read it via dev tools. Fine for low-risk/free-tier keys, but for anything with real billing risk, use the relay server instead (`relay-example/` in this repo): it keeps the key server-side, and the widget calls your own server instead of the AI API directly. Same `chatFn` interface either way — swapping between them is a one-line change.

## `init(config)` reference

| Option             | Type                                   | Description                                                                                                                   |
| ------------------ | -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `chatFn`           | function                               | **Required.** From `createProvider(...).chat`, or your own function matching the interface.                                   |
| `modes`            | `["read"]` and/or `["read", "action"]` | Default modes for any page not matched by `pageRules`.                                                                        |
| `pageRules`        | array                                  | Per-page mode overrides, e.g. `[{ match: "/cart", modes: ["read", "action"] }]`. `*` is a wildcard. First matching rule wins. |
| `pageUrls`         | array of strings                       | Other same-site pages to read for context (handles JS-rendered content too, not just static HTML).                            |
| `apiConfigs`       | array of `{ name, url, headers? }`     | Live API endpoints to pull data from — preferred over page-scraping when you have a real API.                                 |
| `onAddToCart`      | `(item, quantity) => void \| Promise`  | Called after the user confirms an add action.                                                                                 |
| `onRemoveFromCart` | `(item, quantity) => void \| Promise`  | Same, for remove actions.                                                                                                     |
| `theme`            | `"light"` \| `"dark"`                  | Forces a palette. Omit to follow the visitor's OS/browser setting automatically.                                              |
| `voice`            | `false`                                | Set to disable the mic button even on browsers that support it.                                                               |

## What action mode actually does

The model classifies user intent into a structured action — it never executes anything itself. A confirm modal always appears before your callback runs, and the chat shows a real success/failure message afterward based on whether your callback actually succeeded, not a model guess.

On any page where `"action"` isn't enabled, a code-level check catches and blocks the model if it tries to claim an action was performed anyway — this doesn't rely on prompt instructions alone.

## Known limitations (honest, not hidden)

- **Small/local models are noticeably less reliable** at intent classification and following strict JSON output. Test with your actual target model before shipping.
- **Reading a client-rendered page's DOM via `pageUrls`** needs the target page to actually be finished rendering by the time it's read — very slow dev-mode builds (unminified, unbundled) can occasionally be slower than the read timeout. Test against a production build if you see unexpected empty-context results.
- **Voice input requires Chrome or Edge.** Safari support is inconsistent, Firefox doesn't support the Web Speech API at all. The mic button is automatically hidden on unsupported browsers.
- **Action-mode conversation memory is more limited than read mode's** — a follow-up like "remove that instead" may not always resolve correctly.

## Repo structure

```
widgetron/
  providers/provider.js   — source: the provider factory
  public/widget/          — source: page reading, chat/action engines, confirm UI, widget shell
  dist/                   — built output (widgetron.js, widgetron.esm.js, widgetron.css)
  relay-example/          — optional server-side relay for hiding API keys
  build.js                — run with `node build.js` after editing source files
```

## License

MIT — see `LICENSE`.
