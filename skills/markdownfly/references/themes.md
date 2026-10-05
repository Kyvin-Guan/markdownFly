# MarkdownFly Themes Reference

Theme selection grammar for markdownfly v0.2. `-t` / frontmatter `theme:`
take a **theme name**; resolution order is **theme preset → color scheme**.

## Theme presets (color × text × layout in one name)

| Theme name | Color | Text | Layout | Best for |
| :--- | :--- | :--- | :--- | :--- |
| **`blue`** *(default)* | `ocean` | `academic` (SimSun/宋体) | `legacy` | Default full theme, technical decks |
| `emerald` | `forest` | `system` (Microsoft YaHei/微软雅黑) | `folio` | Fresh green, editorial |
| `gold` | `champagne` | `kai` (KaiTi/楷体) | `golden` | Warm gold, golden-ratio layout |
| `slate` | `graphite` | `source-han-serif` (思源宋体) | `minimal` | Neutral monochrome, archival |

## Color-only names (recolor without changing text/layout)

| Name | Ink (on light) / paper or inverse | Primary / secondary | Use |
| :--- | :--- | :--- | :--- |
| `ocean` | `#1E4A6F` / `#F0F8FF` | `#4F9FD9` / `#2D6A9F` | Light sea-blue |
| `ocean-dark` | `#D6E7F5` / `#0B1C2E` | `#5BAAE8` / `#8BBCDD` | Dark "night" deck (inverse of `ocean`) |
| `forest` | `#2A4A3F` / `#F0FFF5` | `#5F9A8A` / `#3F6A5A` | Fresh green |
| `champagne` | `#CFB53B` / `#FFFCE6` | `#E5CD5F` / `#F5E08A` | Warm metallic gold |
| `graphite` | `#4D4D4D` / `#F8F8F8` | `#D9D9D9` / `#A6A6A6` | Neutral monochrome |

## Text schemes

| Name | Fonts |
| :--- | :--- |
| `system` | Platform system fonts (Microsoft YaHei family) |
| `academic` | SimSun / 宋体, Times-flavored Latin |
| `kai` | KaiTi / 楷体 |
| `source-han-serif` | Source Han Serif / 思源宋体 |

## Layout schemes

| Name | Character |
| :--- | :--- |
| `legacy` | The classic mfly layout pack (default with `blue`) |
| `folio` | Editorial, book-like spacing |
| `golden` | Golden-ratio proportions |
| `minimal` | Reduced chrome, lots of whitespace |

## Composition (free mix)

CLI flags or frontmatter slots override the matching theme slot individually
(precedence: composition flag > frontmatter scheme > theme preset > default
`blue`). When composition flags are given without `-t`, the base theme is
`blue`.

```bash
mfly deck.md -t blue --text kai            # blue palette/layout, kai text
mfly deck.md --color forest --text academic --layout golden   # full custom mix
mfly deck.md --layout minimal              # layout only, rest of blue
```

Frontmatter equivalents: `color_scheme:` / `text_scheme:` / `layout_scheme:`.

Unknown names: CLI flags fail with exit `1` and list valid options. In
frontmatter nothing fails — unknown `theme:` warns and falls back to `blue`;
unknown scheme values warn and fall back to that slot's default (color keeps
the theme's color, text falls back to `system`, layout to the built-in pack).

## Extending programmatically

Library consumers can register new entries via
`registerThemePreset` / `registerColorScheme` / `registerTextScheme` /
`registerLayoutScheme` exported from the `markdownfly` package.
