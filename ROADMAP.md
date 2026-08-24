# Roadmap

| Phase | Deliverable                                                                                                              | Status      |
| ----- | ------------------------------------------------------------------------------------------------------------------------ | ----------- |
| 1     | Provider abstraction + working relay against Ollama (local, free)                                                        | Done        |
| 2     | Page-content gathering: current page DOM, multi-page iframe reads, custom API config, timeout/status tracking per source | In progress |
| 3     | Prompt construction: context-only answers + structured `answerFound` field, with an "unverified" fallback in the UI      | Planned     |
| 4     | Action-mode intent parsing + confirm-step UI + callback wiring                                                           | Planned     |
| 5     | Chat widget UI: bubble, panel, config surface (position, theme, enabled modes, per-page mode rules)                      | Planned     |
| 6     | Voice input: Web Speech API, feature detection, mic UI                                                                   | Planned     |
| 7     | Documentation for site owners: embed snippet, config reference, key-handling guidance (client-side vs. relay server)     | Planned     |

Deferred / not yet scheduled: additional built-in provider adapters beyond
Anthropic/OpenAI/Ollama, and a reference implementation of the optional
relay-server for key handling.
