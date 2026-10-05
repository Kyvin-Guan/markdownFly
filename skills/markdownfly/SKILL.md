---
name: markdownfly
description: Generate PowerPoint (.pptx) presentations from Markdown with the markdownfly (mfly) CLI — editable 16:9 slides, themes, syntax-highlighted code, and Mermaid/Graphviz/PlantUML/ECharts diagrams. Two ways in: the user names a topic and wants slides drafted from scratch, or the user already has content (an outline, class notes, book text, an essay) to turn into slides. Either way, draft a clean preview markdown, show it, and wait for the user's confirmation or change requests before generating the .pptx. Trigger on "make a PPT", tech talk, report deck, 做个PPT, 幻灯片, 演示文稿, "turn these notes into slides" — even if pptx is not spelled out. Not for programmatically editing an existing .pptx file (use a pptx-editing skill for that).
---

# MarkdownFly (mfly) — Markdown to PowerPoint

<!-- Version pin: this skill documents mfly 0.2.x exactly. When the CLI
     contract changes (themes, flags, JSON schema, syntax), bump every
     `markdownfly@0.2` occurrence here and re-verify references/. -->

One Markdown file in, one fully editable `.pptx` out. No JVM, no headless
browser. Requires Node.js 20+ — enforced by the step-0 preflight, not just
promised here. Run it via npx — no install step:

```bash
npx -y markdownfly@0.2 deck.md
```

The version is pinned to `0.2` on purpose: this skill's documented contract
matches 0.2.x behavior. Patch fixes still flow in; breaking minors are
blocked until the skill itself is updated.

## Workflow

Two entry modes share one pipeline: **preview first, generate only after
confirmation**. Never run the converter before the user has seen the preview.

### 0. Preflight — mandatory, run before anything else

Run both checks at the very start of every session that touches this skill
(they take seconds, and the second one warms the npx cache so the convert
step won't stall on a download):

```bash
node --version                    # must print v20 or higher
npx -y markdownfly@0.2 --version  # must print 0.2.x
```

- Node < 20 → stop, tell the user to install or upgrade Node.js 20+
  (https://nodejs.org), and do not continue the workflow.
- The npx check fails with a network error (timeout, `ECONNRESET`, "fetch
  failed") → read [references/npm-mirrors.md](references/npm-mirrors.md) and
  retry with a **temporary** mirror via a per-command `--registry` flag.
  Never rewrite the user's npm config. If every mirror fails, report to the
  user.
- The version does not start with `0.2` → a stray global `mfly` install or
  stale cache is interfering; show the user the actual version output before
  proceeding.

### 1. Identify the entry mode, then set style

- **Mode 1 — topic given**: the user supplies a subject ("a 5-page talk on
  REST APIs") and expects you to draft the content. Plan the slide flow
  first (cover → sections → summary), one idea per slide.
- **Mode 2 — content given**: the user supplies an outline, class notes,
  book text, or an essay. Restructure it into slide-sized ideas rather than
  pasting blocks verbatim; note anything you dropped or merged.

Either way, establish (ask only what the user didn't say, in one batch, each
with your proposal so the user can just accept): audience, language, rough
slide count, and style. Three style calls belong to the user:

- **Theme**: propose one and let the user confirm. Map style to a theme:
  technical → `blue` (default) or `ocean-dark`; warm/humanities → `gold`;
  fresh/editorial → `emerald`; neutral minimal → `slate`.
- **Advanced slot composition**: a preset alone is the default answer. Offer
  slot overrides when no preset matches or the user cares about the look:
  `--color` / `--text` / `--layout` (or frontmatter `color_scheme` /
  `text_scheme` / `layout_scheme`) — menus in
  [references/themes.md](references/themes.md).
- **Footer template**: off by default. Offer it for formal or long decks,
  e.g. `footer: "{title} - {page} / {total}"` — placeholders `{page}`,
  `{total}`, `{section}`, `{title}`.

### 2. Show the preview markdown and wait

Write the deck as plain, readable Markdown — no mfly syntax yet. Slide
titles plus content; mark planned diagrams as placeholders:

```markdown
# REST API Design

## Architecture

(diagram: client → gateway → services, auth checked at the gateway)

### Key points

- Stateless auth
- Versioned from day one
```

Save it to a file (e.g. `deck.md`), show it inline in the conversation, and
ask for confirmation or change requests. **Stop and wait here.** Iterate on
the preview until the user accepts it — this preview is the review artifact,
and the user can edit the file by hand between rounds.

### 3. On confirmation: add mfly syntax, then convert

Only after the user confirms (or after applying their change requests):

1. Upgrade the confirmed markdown into final deck form — `---` separators,
   `#` cover / `##` slides, frontmatter with the chosen theme and footer (if
   enabled), real diagram code blocks in place of the placeholders, and
   `@(notes=...)` speaker notes:

````markdown
---
theme: blue
author: "Your Name"
---

# Project Title

作者：Alice
日期：2026-10-05

---

## Architecture

```mermaid
graph LR
    A[Client] --> B[API]
    B --> C[DB]
```

<->

### Key points

- Low latency
- Horizontally scalable

@(notes=Walk through the request path left to right here.)
````

   Read [references/markdown-syntax.md](references/markdown-syntax.md) before
   using grid markers (`<->`, `===`), image sizing params, per-slide
   directives beyond `notes`, or non-mermaid diagram languages — the exact
   grammar lives there.

2. Convert:

```bash
npx -y markdownfly@0.2 deck.md --json
```

- Exit code `0` = every file converted. Exit `1` = at least one failure or a
  usage error (unknown theme, no matching files, `-o` with multiple files).
- Use the pinned version everywhere (including ad-hoc checks): the pin keeps
  the CLI behavior aligned with this skill. `--json` prints ONE JSON object
  on stdout; diagnostics go to stderr:

```json
{"ok":true,"durationMs":2102,"files":[{"input":"deck.md","output":"C:/abs/path/deck.pptx","ok":true}]}
```

### 4. Verify and report

1. Check the exit code and the `ok` field; read `files[].output` for the
   absolute product path.
2. **Read stderr too**: missing images, failed remote fetches, and diagram
   errors print warnings there but the deck is still generated — relay them to
   the user instead of silently passing.
3. Optional visual check if LibreOffice is available: render to PDF and
   inspect (`soffice --headless --convert-to pdf deck.pptx`). Skip if absent.
4. Report the absolute output path and any warnings. Never claim diagrams or
   images rendered if stderr said otherwise.

## CLI contract

| Flag | Effect |
| :--- | :--- |
| `mfly <files...>` | Convert one or more files (globs allowed) |
| `-o <path>` | Output path (single input only; overwrites) |
| `-t <name>` | Theme: `blue` (default), `emerald`, `gold`, `slate`, `ocean`, `ocean-dark`, `forest`, `champagne`, `graphite` |
| `--color <name>` | Override color scheme: `ocean, ocean-dark, forest, champagne, graphite` |
| `--text <name>` | Override text scheme: `system, academic, kai, source-han-serif` |
| `--layout <name>` | Override layout scheme: `folio, legacy, golden, minimal` |
| `--quiet` | Suppress per-file progress lines |
| `--json` | Machine-readable result on stdout |

- Without `-o`, output is `<input>.pptx` next to the source; if that name
  exists a timestamped name is used instead.
- Unknown `-t` / `--color` / `--text` / `--layout` names fail with exit `1`
  and list valid names. Unknown theme in frontmatter only warns and falls
  back to `blue`.

## Frontmatter template

```yaml
---
theme: blue            # preset or color-only name (see themes reference)
color_scheme: champagne  # optional slot overrides
text_scheme: kai
layout_scheme: folio
author: "Your Name"
footer: "Confidential - {page} / {total}"  # {page}/{total}/{section}/{title}
resource_dir: ./assets # base dir for relative image paths
layout: code           # default layout for content slides (rarely needed)
---
```

## Pitfalls

- **The preview gate is the contract**: mode 1 and mode 2 both end step 2
  with a wait. Only skip it when the user explicitly opts out ("直接生成" /
  "just generate it") — then go straight to step 3 with the theme you would
  have proposed.
- Image paths (and `resource_dir`) resolve against the **markdown file's
  directory**, never the shell's cwd — run the CLI from anywhere.
- A missing/broken image or failed remote fetch → stderr warning, deck still
  generated, slide just omits the image. Decide with the user whether to fix
  the source.
- `%% comment` lines are stripped from the deck entirely; code fences are safe.
- PlantUML: the `@startuml`/`@enduml` envelope is optional, `!theme` is not
  available (use `skinparam`), and `MFLY_DEBUG=1` forwards engine logs to stderr.
- `webp` images embed but PowerPoint for the web / Office ≤2019 show them
  broken — prefer `png`/`jpg`.
- Setext-style headings don't exist here: a standalone `===` line is a row
  break, so write `# Heading`, not `Heading` + `===`.
- If behavior looks wrong, run `npx -y markdownfly@0.2 --version` first — a
  stray global install or cached older copy may lack the flags documented
  here. The version should start with `0.2`.
