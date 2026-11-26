"use strict"

function createMarkerPageEffects(settings) {
  let hovered = null
  let cleanState = null
  const blurred = new Map()

  document.addEventListener("mousemove", (e) => {
    hovered = e.target
  }, true)

  function toggleClean() {
    if (cleanState) {
      restoreClean()
      return
    }
    cleanState = { saved: [] }
    for (const el of document.querySelectorAll("body *")) {
      const position = getComputedStyle(el).position
      if (position === "fixed" || position === "sticky") {
        cleanState.saved.push(saveStyle(el, "visibility"))
        el.style.setProperty("visibility", "hidden", "important")
      }
    }
    // Consent modals often lock page scroll
    for (const el of [document.documentElement, document.body]) {
      if (getComputedStyle(el).overflowY === "hidden") {
        cleanState.saved.push(saveStyle(el, "overflow"))
        el.style.setProperty("overflow", "auto", "important")
      }
    }
  }

  function saveStyle(el, prop) {
    return {
      el,
      prop,
      value: el.style.getPropertyValue(prop),
      priority: el.style.getPropertyPriority(prop)
    }
  }

  function restoreClean() {
    for (const item of cleanState.saved) {
      item.el.style.setProperty(item.prop, item.value, item.priority)
    }
    cleanState = null
  }

  function toggleBlur() {
    const el = hovered
    if (!el || el === document.body || el === document.documentElement) {
      return
    }
    if (blurred.has(el)) {
      el.style.filter = blurred.get(el)
      blurred.delete(el)
      return
    }
    blurred.set(el, el.style.filter)
    el.style.filter = `blur(${settings.blur}px)`
  }

  function reset() {
    if (cleanState) {
      restoreClean()
    }
    blurred.forEach((filter, el) => {
      el.style.filter = filter
    })
    blurred.clear()
  }

  return { toggleClean, toggleBlur, reset }
}
