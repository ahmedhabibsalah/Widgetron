# Widgetron

An embeddable AI assistant for websites. Drop in two files and it can:

- **Read mode** — answer visitor questions using the site's own content (current page, other same-site pages, and/or a configured API).
- **Action mode** — parse natural-language requests into confirmed cart actions (add/remove), executed by callbacks you provide. Widgetron never touches your backend directly — you stay in control of what actually happens.

No hosting, no database, no per-user accounts, no fee to us. You bring your own AI provider — Ollama (free, local), Grok, OpenAI, Anthropic, or any OpenAI-compatible API.

**Status: MVP.** Not yet published to npm — install by copying the two built files below into your project.

## Install

**Via npm (once published):**

```
npm install widgetron
```

Then reference the built files directly — Widgetron is a browser script, not an ES module, so it's loaded via `<script>`/`<link>`, not `import`:

```html
<link rel="stylesheet" href="node_modules/widgetron/dist/widgetron.css" />
<script src="node_modules/widgetron/dist/widgetron.js"></script>
```

**Via CDN (no install step at all, once published):**

```html
<link rel="stylesheet" href="https://unpkg.com/widgetron/dist/widgetron.css" />
<script src="https://unpkg.com/widgetron/dist/widgetron.js"></script>
```

unpkg (and jsdelivr) serve any published npm package's files directly — this works automatically the moment `npm publish` succeeds, no extra setup needed on our end. Pin a version in production (`widgetron@0.1.0/dist/...`) rather than always pulling latest.

**Testing before it's published, or for local development:**

```
npm pack                                  # from this repo, builds widgetron-x.y.z.tgz
npm install /path/to/widgetron-x.y.z.tgz  # from your test project
```

This installs through the real npm mechanism (into `node_modules`, same as any package), just from a local file instead of the public registry — the safest way to verify a release before actually publishing it.

> **Note on `import`:** because Widgetron sets `window.Widgetron` rather than exporting ES module syntax, `import Widgetron from "widgetron"` won't work in a bundler out of the box. If your project uses Vite/webpack/etc., either load it via a plain `<script>` tag as above, or add `window.Widgetron` to your bundler's global externals config. A true ESM build is possible later but isn't part of this MVP.

## Quick start (React / Next.js)

Widgetron is plain JS that sets `window.Widgetron` — it isn't a React component, so it's loaded once via `<script>`, then initialized inside `useEffect`. `initWidget` is safe to call more than once (e.g. React StrictMode's intentional double-invoke in development) — it silently no-ops after the first real call.

```jsx
// components/WidgetronLoader.jsx
import { useEffect } from "react";

export default function WidgetronLoader() {
  useEffect(() => {
    if (!window.Widgetron) return; // script tag hasn't loaded yet

    const provider = window.createProvider({
      format: "openai",
      baseUrl: "https://api.x.ai/v1/chat/completions",
      apiKey: "YOUR_KEY", // see the relay-server note if this needs to stay private
      model: "grok-4",
    });

    window.Widgetron.init({
      chatFn: provider.chat,
      modes: ["read"],
      pageUrls: ["/", "/products"],
    });
  }, []);

  return null; // this component renders nothing, it only runs the init side effect
}
```

Load the script and CSS once, at the app root — for a standard React app, in `public/index.html`:

```html
<link rel="stylesheet" href="%PUBLIC_URL%/widgetron.css" />
<script src="%PUBLIC_URL%/widgetron.js"></script>
```

(copy `dist/widgetron.js` and `dist/widgetron.css` into your `public/` folder — a plain `<script>` tag can't reach into `node_modules` for a browser to load directly)

Then render `<WidgetronLoader />` once, anywhere in your app (e.g. in your root layout/App component).

**Next.js specifically:** `window` doesn't exist during server-side rendering, so this must run client-side only.

- **App Router:** add `"use client"` at the top of `WidgetronLoader.jsx`, and put the `<script>`/`<link>` tags in `app/layout.jsx`'s `<head>`.
- **Pages Router:** same component pattern works as-is (components are already client-rendered by default there); add the script tags in `pages/_document.jsx`.

The `if (!window.Widgetron) return` check in the example handles the case where the effect runs before the external script finishes loading — for stricter control, use Next.js's `<Script>` component with `strategy="afterInteractive"` and its `onLoad` callback to call `Widgetron.init` at the right moment instead.

## Configuring for your site

Three things almost every real install needs to change from the example above:

1. **Pick and configure a real provider.** For production, use Grok/OpenAI/Anthropic with a real key (see "Providers" below), or set up the relay server so the key isn't exposed client-side.

2. **Point `pageUrls` at your real pages**, and `apiConfigs` at any live data endpoints (like a products API) — without these, the assistant has nothing to answer from and will correctly say so rather than guess.

3. **Set `pageRules` if you want action mode scoped to specific pages** (e.g. only your cart/product pages, not your About page) — and wire `onAddToCart`/`onRemoveFromCart` to your actual cart or order logic.

```jsx
window.Widgetron.init({
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

## Quick start (plain HTML, no framework)

If you're not using React — a static site, server-rendered templates, or anything else — same install, no `useEffect` needed, just load the script and call `init` directly:

```html
<link rel="stylesheet" href="widgetron.css" />
<script src="widgetron.js"></script>
<script>
  // Pick ONE provider. This example uses Ollama (free, runs locally,
  // needs Ollama installed and running — see "Providers" below).
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
    apiConfigs: [{ name: "products", url: "/api/products" }],
  });
</script>
```

## Providers

One function, `createProvider({ format, baseUrl, apiKey, model, headers })`, covers most APIs — you configure it, you don't write a new file per provider.

**`format: "openai"`** — covers OpenAI, Grok (xAI), Groq, and Ollama's own OpenAI-compatible endpoint. These share one request/response shape.

**`format: "anthropic"`** — Anthropic's Messages API has a different shape (system prompt as a separate field), so it gets its own branch, same function.

```javascript
// Ollama — local, free, no signup
createProvider({
  format: "openai",
  baseUrl: "http://localhost:11434/v1/chat/completions",
  apiKey: "ollama", // unused by Ollama, but the header needs something present
  model: "llama3.2",
});

// Grok (xAI)
createProvider({
  format: "openai",
  baseUrl: "https://api.x.ai/v1/chat/completions",
  apiKey: "YOUR_GROK_KEY",
  model: "grok-4", // check x.ai's current docs/playground for the exact model id
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

Using `createProvider` directly in your page's `<script>` puts your API key in the browser — anyone can read it via dev tools. This is fine for low-risk/free-tier keys (like a Grok trial key), but for anything with real billing risk, use the relay server instead (see `relay-example/` in this repo): it keeps the key server-side and the widget calls your own server instead of the AI API directly. Same `chatFn` interface either way — swapping between them is a one-line change.

## `Widgetron.init(config)` reference

| Option             | Type                                   | Description                                                                                                                                     |
| ------------------ | -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `chatFn`           | function                               | **Required.** From `createProvider(...).chat`, or your own function matching the interface.                                                     |
| `modes`            | `["read"]` and/or `["read", "action"]` | Default modes for any page not matched by `pageRules`.                                                                                          |
| `pageRules`        | array                                  | Per-page mode overrides, e.g. `[{ match: "/cart.html", modes: ["read", "action"] }]`. `*` is a wildcard. First matching rule wins.              |
| `pageUrls`         | array of strings                       | Other same-site pages to read for context (handles JS-rendered content too, not just static HTML).                                              |
| `apiConfigs`       | array of `{ name, url, headers? }`     | Live API endpoints to pull data from — preferred over page-scraping when you have a real API, since it's cleaner and more reliable.             |
| `onAddToCart`      | `(item, quantity) => void \| Promise`  | Called after the user confirms an add action. Do your real cart/order logic here.                                                               |
| `onRemoveFromCart` | `(item, quantity) => void \| Promise`  | Same, for remove actions.                                                                                                                       |
| `theme`            | `"light"` \| `"dark"`                  | Forces a palette. Omit to follow the visitor's OS/browser setting automatically.                                                                |
| `voice`            | `false`                                | Set to disable the mic button even on browsers that support it. Omit/true to allow it (still auto-hidden on unsupported browsers like Firefox). |

## What action mode actually does

The model classifies user intent into a structured action — it never executes anything itself. A confirm modal always appears before your callback runs, and the chat shows a real success/failure message afterward based on whether your callback actually succeeded, not a model guess.

On any page where `"action"` isn't enabled, a code-level check catches and blocks the model if it tries to claim an action was performed anyway — this doesn't rely on prompt instructions alone, since we found in testing those aren't reliably followed by smaller models.

## Known limitations (honest, not hidden)

- **Small/local models are noticeably less reliable** at both intent classification (may misclassify add vs. remove) and following the strict JSON output format. Larger hosted models perform better. Test with your actual target model before shipping.
- **Action mode does not yet share conversation memory across a session in the same way read mode does for pronoun-style follow-ups** — improving, but a follow-up like "remove that instead" depends on how much prior context was retained.
- **Voice input requires Chrome or Edge.** Safari support is inconsistent, Firefox doesn't support the Web Speech API at all. The mic button is automatically hidden on unsupported browsers — text input always works everywhere.
- **Reading JS-rendered pages via `pageUrls`** uses a hidden iframe technique and needs the target page to be same-origin. Content that loads asynchronously well after page load may be missed.

## Repo structure

```
widgetron/
  src/            — individual source files (edit these)
  dist/           — bundled widgetron.js + widgetron.css (what you actually install)
  relay-example/  — optional server-side relay for hiding API keys
  README.md
  ROADMAP.md
  LICENSE
```

To rebuild `dist/` after editing `src/`, concatenate the files in this order: `provider.js`, `pageReader.js`, `chatEngine.js`, `actionEngine.js`, `confirmUI.js`, `widget.js` — load order matters, each file depends on functions defined in the ones before it.

## License

MIT — see `LICENSE`.
