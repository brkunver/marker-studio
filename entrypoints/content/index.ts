import { defineContentScript } from "wxt/utils/define-content-script"
import { MARKER_DEFAULTS, readMarkerSettings, watchMarkerSettings, type MarkerSettings } from "@/utils/settings"
import { createMarkerAutoScroll } from "./auto-scroll"
import { createMarkerHighlighter } from "./highlighter"
import { createMarkerPageEffects } from "./page-effects"
import { createMarkerZoom } from "./zoom"

export default defineContentScript({
  matches: ["<all_urls>"],
  runAt: "document_idle",

  async main(ctx) {
    const settings: MarkerSettings = { ...MARKER_DEFAULTS, enabled: false }
    const overlayZIndex = "2147483647"
    const zoom = createMarkerZoom(settings, overlayZIndex)
    const highlighter = createMarkerHighlighter(settings, zoom.toDocRect, overlayZIndex)
    const autoScroll = createMarkerAutoScroll(settings)
    const pageEffects = createMarkerPageEffects(settings, ctx.signal)
    const actions = new Map([
      ["h", highlighter.queueHighlight],
      ["z", zoom.toggleZoom],
      ["s", autoScroll.toggleScroll],
      ["c", pageEffects.toggleClean],
      ["b", pageEffects.toggleBlur],
      ["escape", resetAll],
    ])

    const changesWhileLoading: Partial<MarkerSettings> = {}
    let loadingSettings = true
    const unwatch = watchMarkerSettings(onSettingChanged)
    ctx.addEventListener(document, "keydown", onKeyDown, { capture: true })
    ctx.onInvalidated(() => {
      unwatch()
      resetAll()
    })

    try {
      const stored = await readMarkerSettings()
      if (ctx.isValid) {
        Object.assign(settings, stored, changesWhileLoading)
      }
    } finally {
      loadingSettings = false
    }

    function onSettingChanged<Key extends keyof MarkerSettings>(key: Key, value: MarkerSettings[Key]) {
      if (loadingSettings) {
        changesWhileLoading[key] = value
      }
      settings[key] = value
      if (key === "enabled" && !settings.enabled) {
        resetAll()
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (loadingSettings || !settings.enabled || event.repeat || event.ctrlKey || event.metaKey ||
        event.altKey || isTyping(event.target)) {
        return
      }
      const key = event.key.toLowerCase()
      const action = key === "h" && event.shiftKey ? highlighter.playNextHighlight : actions.get(key)
      if (!action) {
        return
      }
      event.preventDefault()
      event.stopImmediatePropagation()
      action()
    }

    function resetAll() {
      highlighter.reset()
      zoom.reset()
      autoScroll.reset()
      pageEffects.reset()
    }
  },
})

function isTyping(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false
  }
  return target.isContentEditable || target.matches("input, textarea, select")
}
