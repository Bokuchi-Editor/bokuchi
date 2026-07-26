![Bokuchi](https://raw.githubusercontent.com/shinya/image-storage/refs/heads/master/bokuchi/hero.png)

![Downloads](https://img.shields.io/github/downloads/Bokuchi-Editor/bokuchi/total) ![Stars](https://img.shields.io/github/stars/Bokuchi-Editor/bokuchi) ![License](https://img.shields.io/github/license/Bokuchi-Editor/bokuchi) ![Release](https://img.shields.io/github/v/release/Bokuchi-Editor/bokuchi)

**Bokuchi** is a lightweight, open-source Markdown editor for Windows, macOS, and Linux. Built with Tauri, React, and Rust.

[Official Site](https://bokuchi.com) · [User Guide](https://doc.bokuchi.com/) · [Download](https://github.com/Bokuchi-Editor/bokuchi/releases/latest)

![Screen Shot](https://raw.githubusercontent.com/shinya/image-storage/master/bokuchi/ss2.png)

## Download

Get the latest version from the [Releases page](https://github.com/Bokuchi-Editor/bokuchi/releases/latest):

| OS                | File                          |
| ----------------- | ----------------------------- |
| Windows           | `Bokuchi_x.y.z_x64-setup.exe` |
| macOS (Universal) | `Bokuchi_x.y.z_universal-apple.dmg` |
| Linux             | `.AppImage` / `.deb` / `.rpm` |

Bokuchi keeps itself up to date with a built-in updater.

## Why another Markdown editor?

There are plenty of Markdown editors out there. Bokuchi exists because:

- **Free and open source, actively developed.** Typora is now paid, and MarkText is no longer actively maintained.
- **No vault, no lock-in.** Bokuchi opens plain `.md` / `.txt` files directly, like a text editor — not a knowledge base.
- **Private by design.** Works completely offline. No account, no telemetry.

## Features

- **Live preview** with synchronized scrolling, interactive checkboxes, and a Markdown toolbar
- **Variable system**: define `{{variables}}` per file or globally and reuse them across documents
- **Marp presentations**: preview slide decks with `marp: true` front-matter, including custom themes
- **Math & diagrams**: KaTeX expressions and Mermaid diagrams out of the box
- **Lightweight**: minimal memory footprint and fast startup, thanks to Tauri
- **Tabs** with session restore and external file-change detection
- **9 built-in themes** (light and dark) — or create your own custom theme
- **14 UI languages**: English, 日本語, 中文 (简体/繁體), Español, हिन्दी, Русский, 한국어, Português (Brasil), العربية, Français, Deutsch, Bahasa Indonesia, Tiếng Việt — translation PRs welcome!

The full feature list is in the [User Guide](https://doc.bokuchi.com/).

## Variable System

Define variables in a file and reuse them anywhere in the document:

```markdown
<!-- @var title: My Document -->
<!-- @var author: John Doe -->

# {{title}}

Author: {{author}}
```

Global variables can be set in the Variables settings panel and are available across all files.

## Development

Prerequisites: Node.js 18+ and Rust.

```bash
npm install
npm run tauri:dev
```

See the [Development Guide](docs/DEVELOPMENT.md) for commands, testing, and production builds.

## License

[MIT](LICENSE)
