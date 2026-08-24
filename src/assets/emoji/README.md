# Emoji shortcode map

`shortcodes.json` maps GitHub emoji shortcodes (e.g. `rocket`) to their Unicode
emoji (e.g. `🚀`). It is generated from GitHub's official
[gemoji](https://github.com/github/gemoji) database (MIT licensed) and is
loaded lazily by `src/utils/emojiShortcodes.ts` only when a document actually
contains a `:shortcode:` pattern.

GitHub-custom emoji that have no Unicode equivalent (`:octocat:`, `:shipit:`,
…) are served by GitHub as PNG images and are intentionally NOT included:
bundling them would violate the app's offline policy (no CDN fetches) and the
Octocat artwork is a GitHub trademark. Such shortcodes render as literal text.

## Regenerating

```sh
curl -sL https://raw.githubusercontent.com/github/gemoji/master/db/emoji.json |
python3 -c "
import json, sys
m = {}
for e in json.load(sys.stdin):
    for a in e['aliases']:
        m[a] = e['emoji']
json.dump(m, open('src/assets/emoji/shortcodes.json', 'w'),
          ensure_ascii=False, separators=(',', ':'), sort_keys=True)
"
```

All aliases match `[a-z0-9_+-]+` (the tokenizer in `emojiShortcodes.ts` relies
on this charset).
