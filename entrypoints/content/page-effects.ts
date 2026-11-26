import type { MarkerSettings } from "@/utils/settings"

type StyledElement = Element & ElementCSSInlineStyle

type SavedStyle = {
  el: StyledElement
  prop: string
  value: string
  priority: string
}

export function createMarkerPageEffects(settings: MarkerSettings, signal: AbortSignal) {
  let hovered: StyledElement | null = null
  let cleanState: SavedStyle[] | null = null
  const blurred = new Map<StyledElement, string>()

  document.addEventListener("mousemove", (e) => {
    if (settings.enabled) {
      hovered = hasInlineStyle(e.target) ? e.target : null
    }
  }, { capture: true, signal })

  function toggleClean() {
    if (cleanState) {
      restoreClean(cleanState)
      return
    }
    cleanState = []
    for (const el of document.querySelectorAll("body *")) {
      if (!hasInlineStyle(el)) {
        continue
      }
      const position = getComputedStyle(el).position
      if (position === "fixed" || position === "sticky") {
        cleanState.push(saveStyle(el, "visibility"))
        el.style.setProperty("visibility", "hidden", "important")
      }
    }
    // Consent modals often lock page scroll
    for (const el of [document.documentElement, document.body]) {
      if (getComputedStyle(el).overflowY === "hidden") {
        cleanState.push(saveStyle(el, "overflow"))
        el.style.setProperty("overflow", "auto", "important")
      }
    }
  }

  function saveStyle(el: StyledElement, prop: string) {
    return {
      el,
      prop,
      value: el.style.getPropertyValue(prop),
      priority: el.style.getPropertyPriority(prop)
    }
  }

  function restoreClean(items: SavedStyle[]) {
    for (const item of items) {
      item.el.style.setProperty(item.prop, item.value, item.priority)
    }
    cleanState = null
  }

  function toggleBlur() {
    const el = hovered
    if (!el || el === document.body || el === document.documentElement) {
      return
    }
    const previousFilter = blurred.get(el)
    if (previousFilter !== undefined) {
      el.style.filter = previousFilter
      blurred.delete(el)
      return
    }
    blurred.set(el, el.style.filter)
    el.style.filter = `blur(${settings.blur}px)`
  }

  function reset() {
    if (cleanState) {
      restoreClean(cleanState)
    }
    blurred.forEach((filter, el) => {
      el.style.filter = filter
    })
    blurred.clear()
  }

  return { toggleClean, toggleBlur, reset }
}

function hasInlineStyle(target: EventTarget | null): target is StyledElement {
  return target instanceof Element && "style" in target && target.style instanceof CSSStyleDeclaration
}
