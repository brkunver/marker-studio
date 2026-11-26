import { browser } from "wxt/browser"
import { defineContentScript } from "wxt/utils/define-content-script"
import { MARKER_DEFAULTS, readMarkerSettings, type MarkerSettings } from "@/utils/settings"
import { createMarkerAutoScroll } from "./auto-scroll"
import { createMarkerHighlighter } from "./highlighter"
import { createMarkerPageEffects } from "./page-effects"
import { createMarkerZoom } from "./zoom"

type SettingsChanges = {
  [Key in keyof MarkerSettings]?: { newValue?: MarkerSettings[Key] }
}

const settingKeys = Object.keys(MARKER_DEFAULTS) as (keyof MarkerSettings)[]

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

    const settingsChangedWhileLoading = new Set<keyof MarkerSettings>()
    let loadingSettings = true
    browser.storage.local.onChanged.addListener(onSettingsChanged)
    ctx.addEventListener(document, "keydown", onKeyDown, { capture: true })
    ctx.onInvalidated(() => {
      browser.storage.local.onChanged.removeListener(onSettingsChanged)
      resetAll()
    })

    try {
      const stored = await readMarkerSettings()
      if (ctx.isValid) {
        for (const key of settingKeys) {
          if (!settingsChangedWhileLoading.has(key)) {
            applySetting(key, stored[key])
          }
        }
      }
    } finally {
      loadingSettings = false
      settingsChangedWhileLoading.clear()
    }

    function onSettingsChanged(rawChanges: Record<string, Browser.storage.StorageChange>) {
      // Changes come from the persisted MarkerSettings keys written by the popup.
      const changes = rawChanges as SettingsChanges
      for (const key of settingKeys) {
        const change = changes[key]
        if (!change) {
          continue
        }
        if (loadingSettings) {
          settingsChangedWhileLoading.add(key)
        }
        applySetting(key, change.newValue)
      }
      if (changes.enabled && !settings.enabled) {
        resetAll()
      }
    }

    function applySetting<Key extends keyof MarkerSettings>(key: Key, value: MarkerSettings[Key] | undefined) {
      settings[key] = value ?? MARKER_DEFAULTS[key]
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
