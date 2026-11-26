import { defineConfig } from "wxt"

export default defineConfig({
  manifest: {
    name: "Marker Studio",
    description: "Screen recording helpers: animated highlighter, spotlight zoom, smooth auto-scroll, clean mode and blur.",
    permissions: ["storage"],
    icons: {
      16: "icons/16.png",
      48: "icons/48.png",
      128: "icons/128.png",
    },
    action: {
      default_title: "Marker Studio",
    },
  },
})
