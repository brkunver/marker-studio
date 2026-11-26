(function () {
  "use strict"

  if (window.__markerStudio) {
    return
  }
  window.__markerStudio = true

  const settings = { ...MARKER_DEFAULTS, enabled: false }
  const overlayZIndex = "2147483647"
  const zoom = createMarkerZoom(settings, overlayZIndex)
  const highlighter = createMarkerHighlighter(settings, zoom.toDocRect, overlayZIndex)
  const autoScroll = createMarkerAutoScroll(settings)
  const pageEffects = createMarkerPageEffects(settings)
  const ACTIONS = {
    h: highlighter.queueHighlight,
    z: zoom.toggleZoom,
    s: autoScroll.toggleScroll,
    c: pageEffects.toggleClean,
    b: pageEffects.toggleBlur,
    escape: resetAll
  }

  init()

  function init() {
    chrome.storage.local.get(MARKER_DEFAULTS, (stored) => {
      Object.assign(settings, stored)
    })
    chrome.storage.onChanged.addListener(onSettingsChanged)
    document.addEventListener("keydown", onKeyDown, true)
  }

  function onSettingsChanged(changes, area) {
    if (area !== "local") {
      return
    }
    for (const key in changes) {
      settings[key] = changes[key].newValue ?? MARKER_DEFAULTS[key]
    }
    if (changes.enabled && !settings.enabled) {
      resetAll()
    }
  }

  function onKeyDown(e) {
    if (!settings.enabled || e.repeat || e.ctrlKey || e.metaKey || e.altKey || isTyping(e.target)) {
      return
    }
    const key = (e.key || "").toLowerCase()
    const action = key === "h" && e.shiftKey ? highlighter.playNextHighlight : ACTIONS[key]
    if (!action) {
      return
    }
    e.preventDefault()
    e.stopImmediatePropagation()
    action()
  }

  function isTyping(target) {
    if (!target || !target.tagName) {
      return false
    }
    const tag = target.tagName
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") {
      return true
    }
    return target.isContentEditable
  }

  function resetAll() {
    highlighter.reset()
    zoom.reset()
    autoScroll.reset()
    pageEffects.reset()
  }
})()
