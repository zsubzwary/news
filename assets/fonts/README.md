# Local Nastaliq Fonts

To use local Nastaliq fonts, place your font files in this directory with the following names:

- `NotoNastaliqUrdu-Regular.ttf` or `NotoNastaliqUrdu-Regular.woff2`
- `NotoNastaliqUrdu-Bold.ttf` or `NotoNastaliqUrdu-Bold.woff2`

Or for Jameel Noori Nastaleeq:
- `JameelNooriNastaleeq.ttf`

The CSS will automatically fall back to these fonts if the Google Fonts CDN is unavailable.

## Recommended Nastaliq Fonts

1. **Noto Nastaliq Urdu** (Google Fonts) - Already included via CDN
2. **Jameel Noori Nastaleeq** - Popular commercial font
3. **Urdu Typesetting** - Available on most systems
4. **Awami Nastaliq** - Open-source alternative

## Usage in Frontmatter

To use custom fonts in your markdown files:

```yaml
---
layout: default
title: Your Title
rtl: true
font_url: "https://your-custom-font-url.css"
---
```