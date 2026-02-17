# NIP Handler Skill Framework — Session Handoff

## What Was Built

A Claude Code skill at `.claude/skills/nip-handler/` that provides a repeatable, extensible framework for handling TOON-encoded Nostr events. The skill routes events by kind to handler reference files and outputs structured action JSON.

### File Tree

```
.claude/skills/nip-handler/
├── SKILL.md                                    # Master router — kind-based dispatch
├── scripts/
│   └── scaffold-handler.sh                     # Generate new handler reference files
└── references/
    ├── action-schema.md                        # Structured JSON action types + per-kind allowlists
    ├── security.md                             # 10-layer prompt injection defense stack
    ├── kind-registry.md                        # Kind → handler routing table + classification
    ├── handler-template.md                     # Template for creating new handlers
    └── handlers/
        ├── kind-1-text-note.md                 # NIP-01: reply/react/zap/repost decisions
        ├── kind-1059-gift-wrap.md              # NIP-59: unwrap + re-dispatch
        └── kind-5xxx-dvm-request.md            # NIP-90: fulfill/decline DVM jobs
```

### Architecture

```
Raw TOON Input → Extract Kind → Registry Lookup → Load Handler Reference → Security Sandbox → LLM Decides Action → Structured JSON Output
```

Key design decisions:
- **Deterministic kind-based dispatch** (not LLM semantic routing) — inspired by NDK's `wrapEvent` + `registerEventClass`
- **TOON goes directly to LLM** — no decode step; TOON is self-documenting and designed for LLM consumption
- **Progressive disclosure** — only the matched handler reference is loaded into context
- **10-layer defense-in-depth** — layers 1-5 are prompt-level (XML tags, datamarking, sandwich defense), layers 6-10 are deterministic code (schema validation, action allowlists, rate limiting)
- **Domain-agnostic handlers** — handlers don't assume the agent's domain; agent personality/domain comes from the agent's own config

### Adding New NIP Handlers

```bash
.claude/skills/nip-handler/scripts/scaffold-handler.sh <kind> <name> [nip-number]
# Edit generated file → Add to kind-registry.md → Update action-schema.md if needed
```

## Research Completed

7 parallel research agents produced findings that shaped the design:

1. **Plugin registry patterns** — Manifest + file-convention hybrid recommended (NDK, Next.js, Fastify, VS Code extensions)
2. **LangChain/LangGraph tool-use** — Zod discriminated unions for structured action output
3. **ElizaOS plugin architecture** — Adopt validate→handle flow + provider context injection; replace LLM routing with deterministic kind dispatch
4. **DVM/NIP-90 implementations** — nostrdvm, ezdvm patterns; kind 5000-5999 requests, 6000-6999 results, 7000 feedback
5. **Prompt injection defenses** — Microsoft Spotlighting, XML tag isolation, datamarking, sandwich defense, output validation
6. **TOON token budget** — Minimal savings vs JSON for Nostr events (~0-6%); hex strings are 47% of token cost; domain-specific compact format with hex abbreviation could achieve ~63% savings
7. **Nostr event kind routing** — NDK's class registry is most extensible; relays use range-based classification; clients use switch/when dispatch; NIP-per-module is universal

Full research outputs are in `/private/tmp/claude-501/-Users-jonathangreen-Documents-crosstown/tasks/` (agent IDs: a16e458, a0bd369, a5cb898, a4cdfee, a6c686e, a9bc989, aa17044).

## What's Next

The skill works now as a Claude Code reasoning tool (paste TOON data → get action JSON). To make it an **autonomous agent**, a runtime epic is needed:

### Runtime Implementation (proposed epic)

The runtime would:
1. **Subscribe to relays** and receive events
2. **Pass raw TOON directly to LLM** with handler context and security wrapper (no TOON→JSON decode needed)
3. **Validate action output** with Zod schemas (deterministic layer 6)
4. **Enforce action allowlists** per kind (deterministic layer 7)
5. **Execute actions** — publish replies, reactions, zaps, reposts to relays
6. **Rate limit** actions per pubkey per time window (deterministic layer 8)
7. **Audit log** all decisions (deterministic layer 10)
8. **Handle NIP-59 unwrap loop** — decrypt gift wrap → re-dispatch inner event
9. **Handle NIP-90 DVM lifecycle** — feedback → processing → result

The existing codebase provides:
- `BusinessLogicServer` (packages/bls/) — TOON decoding, signature verification, pricing
- `RelayMonitor` (packages/core/) — relay subscription patterns
- `NostrSpspServer` (packages/core/) — kind-filtered subscription + response publishing
- Event builders/parsers (packages/core/src/events/) — for constructing response events

### Other potential improvements
- **Compact presentation format** — Strip signatures, abbreviate hex fields before LLM input (~63% token savings per TOON budget research)
- **More handler files** — kind:0 metadata, kind:6 repost, kind:7 reaction, kind:9735 zap receipt, kind:30023 long-form
- **Agent config layer** — Define agent personality, domain expertise, capability list separate from handlers

## BMad Context

The user has a BMad workflow with epics and stories. They were considering creating an epic for the runtime implementation. The existing epic structure has epics 1-10 already. The user mentioned wanting to "create a new epic for this and push down the existing epics so this is epic-10" earlier in the session (referring to a different task). Check `.bmad-core/` and `docs/` for the current epic/story structure before creating new epics.
