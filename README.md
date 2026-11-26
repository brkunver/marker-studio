# Marker Studio

Marker Studio adds animated highlights, spotlight zoom, smooth scrolling, clean mode and blur to webpages for screen recordings.

## Develop with Bun

```sh
bun install --frozen-lockfile
bun run dev
```

WXT opens a development browser with the extension loaded. The popup and its stylesheet live in `entrypoints/popup/`. The content script and its page tools live in `entrypoints/content/`. Both use the WXT Storage items in `utils/settings.ts`, which map to the existing local storage keys.

## Build for Chrome

```sh
bun run typecheck
bun run build
bun run zip
```

- To load a production build locally, open `chrome://extensions`, enable Developer mode, and load `.output/chrome-mv3` as an unpacked extension.
- For Chrome Web Store submission, use the ZIP under `.output/`. See [CHROMEWEBSTORE.md](CHROMEWEBSTORE.md) for the listing assets and reviewer notes.
- Change the extension version in `package.json`. WXT generates the manifest from that version, `wxt.config.ts`, and the extension entrypoints.
