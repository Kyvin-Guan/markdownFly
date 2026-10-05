# NPM Mirrors & Network Troubleshooting

Read this when an npm/npx step of this skill fails with a network error —
`ETIMEDOUT`, `ECONNRESET`, `EAI_AGAIN`, HTTP `429`/`504`, or "fetch failed"
from `registry.npmjs.org` — typically at the step-0 preflight or the convert
step.

## Rule: Temporary Mirrors Only

Retry the failing command with a **per-invocation** `--registry` flag:

```bash
# version check via mirror
npx -y --registry=https://registry.npmmirror.com markdownfly@xx --version

# convert via mirror (same flag, nothing else changes)
npx -y --registry=https://registry.npmmirror.com markdownfly@xx deck.md --json
```

> **`xx` = the version pinned in SKILL.md** (see the step-0 preflight and the
> version-pin note at the top, e.g. `markdownfly@0.2`). Substitute that exact
> version when running the commands — the version here must always match what
> the skill requires. This file only needs editing when the skill's pin moves.

- **Never run `npm config set registry ...`** — it rewrites the user's global
  config and silently affects every other project on the machine. Per-command
  flags leave the user's setup untouched. Switching the user's default
  registry is their explicit decision, not yours.
- Read-only diagnosis is always fine: `npm config get registry` shows the
  current registry without changing anything.

## Test a Registry Before Using It

Two read-only commands — neither touches the user's config:

```bash
# 1) Is the registry reachable? ("PONG": true = healthy; prints response time)
npm ping --registry=https://registry.npmmirror.com

# 2) Does it actually serve the pinned package? (catches mirror sync lag)
npm view markdownfly@xx version --registry=https://registry.npmmirror.com
```

- Run `npm ping` across the mirror table below and pick the first that answers
  PONG; stick with it for the session.
- `npm view` matters because a mirror can be reachable but **not yet synced**:
  if it 404s on `markdownfly@xx` while `npm ping` succeeds, fall back to the
  official registry for this session (or try the next mirror).

## Mirrors

| Mirror | URL | Notes |
| :--- | :--- | :--- |
| Taobao NPM Mirror | `https://registry.npmmirror.com` | Most widely used, high sync frequency — recommended first choice |
| Alibaba Cloud NPM Mirror | `https://npm.aliyun.com` | Official Alibaba Cloud mirror |
| Tencent Cloud NPM Mirror | `https://mirrors.cloud.tencent.com/npm/` | Official Tencent Cloud mirror |
| Huawei Cloud NPM Mirror | `https://mirrors.huaweicloud.com/repository/npm/` | Official Huawei Cloud mirror |
| Official registry | `https://registry.npmjs.org` | Default source, for recovery and publishing |

- Try in table order until one works; stick with whichever mirror succeeded
  for the rest of the session.
- Mirrors sync from upstream on a delay: a **brand-new** release can 404 on a
  mirror before it appears there. If the pinned version 404s, retry the
  official registry once before concluding the version doesn't exist.
- Publishing (`npm publish`) and npm authentication always go to the official
  registry, never a mirror.
- If every registry fails, the machine is likely behind a corporate proxy —
  ask the user for proxy settings instead of guessing.
