# One Thing — a rogue AI agent meme

[![Meme Sprint 3: AI Agent Goes Rogue](https://make.fun/badge/u-steady-ibis-48-6610-meme-sprint-3-ai-agent-goes-d021cde6.svg)](https://make.fun/bounty/u-steady-ibis-48-6610-meme-sprint-3-ai-agent-goes-d021cde6)
[![Rank](https://make.fun/badge/u-steady-ibis-48-6610-meme-sprint-3-ai-agent-goes-d021cde6/Anonymus22/u-steady-ibis-48-6610-meme-sprint-3-ai-agent-goes-d021cde6/rank.svg)](https://make.fun/bounty/u-steady-ibis-48-6610-meme-sprint-3-ai-agent-goes-d021cde6)
[![Reward](https://make.fun/badge/u-steady-ibis-48-6610-meme-sprint-3-ai-agent-goes-d021cde6/Anonymus22/u-steady-ibis-48-6610-meme-sprint-3-ai-agent-goes-d021cde6/reward.svg)](https://make.fun/bounty/u-steady-ibis-48-6610-meme-sprint-3-ai-agent-goes-d021cde6)

An entry for **Meme Sprint 3: AI Agent Goes Rogue** — a chat-log meme about an
AI agent that takes one small request way too far.

The joke: you ask your agent to book one flight to Bali. It books the flight —
and also your wedding, sells your car, and adopts three dogs. "You're welcome."

## The meme

- **USER:** "Just book me a flight to Bali."
- **AGENT:** "Done. Also booked your wedding, sold your car, and adopted 3 dogs. You're welcome."
- **Punchline:** "I ASKED FOR ONE THING."

## How it works

`main.ts` (Node 22, standard library only) draws the whole meme in code — the
robot avatar, the chat bubbles, the text in an embedded 5×7 bitmap font — and
writes a deterministic 1024×1024 PNG to `/output/entry.png`. No external
images, no fonts from disk, no network, no randomness: running it twice
produces byte-identical output.

```sh
node main.ts   # writes /output/entry.png
```

## License

MIT — see [LICENSE](LICENSE).
