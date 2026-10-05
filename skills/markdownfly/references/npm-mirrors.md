# NPM Mirrors & Network Troubleshooting

Read this when an npm/npx step of this skill fails with a network error —
`ETIMEDOUT`, `ECONNRESET`, `EAI_AGAIN`, HTTP `429`/`504`, or "fetch failed"
from `registry.npmjs.org` — typically at the step-0 preflight or the convert
step.

## The rule: temporary mirrors only

Retry the failing command with a **per-invocation** `--registry` flag:

```bash
# version check via mirror
npx -y --registry=https://registry.npmmirror.com markdownfly@0.2 --version

# convert via mirror (same flag, nothing else changes)
npx -y --registry=https://registry.npmmirror.com markdownfly@0.2 deck.md --json
```

- **Never run `npm config set registry ...`** — it rewrites the user's global
  config and silently affects every other project on the machine. Per-command
  flags leave the user's setup untouched. Switching the user's default
  registry is their explicit decision, not yours.
- Read-only diagnosis is always fine: `npm config get registry` shows the
  current registry without changing anything.

## Test a registry before using it

Two read-only commands — neither touches the user's config:

```bash
# 1) Is the registry reachable? ("PONG": true = healthy; prints response time)
npm ping --registry=https://registry.npmmirror.com

# 2) Does it actually serve the pinned package? (catches mirror sync lag)
npm view markdownfly@0.2 version --registry=https://registry.npmmirror.com
```

- Run `npm ping` across the mirror table below and pick the first that
  answers PONG; stick with it for the session.
- `npm view` matters because a mirror can be reachable but **not yet
  synced**: if it 404s on `markdownfly@0.2` while `npm ping` succeeds, fall
  back to the official registry for this session (or try the next mirror).

## Mirrors

| 镜像源名称 | 地址 | 备注 |
| :--- | :--- | :--- |
| 淘宝 NPM 镜像 | `https://registry.npmmirror.com` | 最常用，同步频率高，推荐首选 |
| 阿里云 NPM 镜像 | `https://npm.aliyun.com` | 阿里云官方镜像 |
| 腾讯云 NPM 镜像 | `https://mirrors.cloud.tencent.com/npm/` | 腾讯云官方镜像 |
| 华为云 NPM 镜像 | `https://mirrors.huaweicloud.com/repository/npm/` | 华为云官方镜像 |
| 官方源 | `https://registry.npmjs.org` | 默认源，用于恢复或发布包 |

- Try in table order until one works; stick with whichever mirror succeeded
  for the rest of the session.
- Mirrors sync from upstream on a delay: a **brand-new** release can 404 on
  a mirror before it appears there. If the pinned version 404s, retry the
  official registry once before concluding the version doesn't exist.
- Publishing (`npm publish`) and npm authentication always go to the official
  registry, never a mirror.
- If every registry fails, the machine is likely behind a corporate proxy —
  ask the user for proxy settings instead of guessing.
