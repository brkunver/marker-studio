import { markerColor, type MarkerSettings } from "@/utils/settings"
import type { createMarkerZoom, MarkerRect } from "./zoom"

type LineRect = {
  top: number
  bottom: number
  left: number
  right: number
}

type Rgba = {
  r: number
  g: number
  b: number
  a: number
}

export function createMarkerHighlighter(
  settings: MarkerSettings,
  toDocRect: ReturnType<typeof createMarkerZoom>["toDocRect"],
  overlayZIndex: string,
) {
  const STROKE_CLASS = "__ms-stroke"
  const STROKE_Y_PAD = 1
  const EASE_IN = "cubic-bezier(0.5, 0, 0.75, 0.75)"
  const EASE_OUT = "cubic-bezier(0.25, 0.25, 0.5, 1)"
  const EASE_IN_OUT = "cubic-bezier(0.65, 0, 0.35, 1)"

  const highlightQueue: Range[] = []
  let highlightEndsAt = 0

  function queueHighlight() {
    const selection = window.getSelection()
    if (!selection || selection.isCollapsed) {
      return
    }
    highlightQueue.push(selection.getRangeAt(0).cloneRange())
    selection.removeAllRanges()
  }

  function playNextHighlight() {
    const range = highlightQueue.shift()
    if (!range) {
      return
    }
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const currentTime = document.timeline.currentTime
    const startTime = Math.max(typeof currentTime === "number" ? currentTime : 0, highlightEndsAt)
    highlightEndsAt = drawRange(range, startTime, reduceMotion)
  }

  // Rects are measured at draw time, so scrolling between presses is fine
  function drawRange(range: Range, startTime: number, reduceMotion: boolean) {
    const lines = getLineRects(range)
    const dark = isDarkBackground(range)
    lines.forEach((line, i) => {
      const timing = getTiming(i, lines.length, line.right - line.left)
      drawStroke(line, {
        duration: reduceMotion ? 0 : timing.duration,
        easing: timing.easing,
        fill: "both"
      }, startTime, dark)
      startTime += timing.duration
    })
    return startTime
  }

  function isDarkBackground(range: Range) {
    if (settings.theme === "light") {
      return false
    }
    if (settings.theme === "dark") {
      return true
    }
    const node = range.startContainer
    let el = node instanceof Element ? node : node.parentElement
    while (el) {
      const color = parseColor(getComputedStyle(el).backgroundColor)
      if (color && color.a > 0.5) {
        return luminance(color) < 0.4
      }
      el = el.parentElement
    }
    return getComputedStyle(document.documentElement).colorScheme.includes("dark")
  }

  function parseColor(value: string) {
    if (!value.startsWith("rgb")) {
      return null
    }
    const [r, g, b, a = 1] = value.match(/[\d.]+/g)?.map(Number) ?? []
    if (r === undefined || g === undefined || b === undefined) {
      return null
    }
    return { r, g, b, a }
  }

  function luminance(c: Rgba) {
    return (0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b) / 255
  }

  // Merge duplicate rects into one rect per visual line
  function getLineRects(range: Range) {
    const lines: LineRect[] = []
    for (const rect of range.getClientRects()) {
      if (rect.width < 2) {
        continue
      }
      const same = lines.find(line => Math.abs(line.top - rect.top) < 4)
      if (same) {
        same.top = Math.min(same.top, rect.top)
        same.bottom = Math.max(same.bottom, rect.bottom)
        same.left = Math.min(same.left, rect.left)
        same.right = Math.max(same.right, rect.right)
      } else {
        lines.push({ top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right })
      }
    }
    return lines
  }

  // Keep speed continuous across line breaks
  function getTiming(index: number, total: number, width: number) {
    const base = ((width + 8) / settings.highlightSpeed) * 1000
    if (total === 1) {
      return { duration: base * 1.4, easing: EASE_IN_OUT }
    }
    if (index === 0) {
      return { duration: base, easing: EASE_IN }
    }
    if (index === total - 1) {
      return { duration: base, easing: EASE_OUT }
    }
    return { duration: base, easing: "linear" }
  }

  // Dark pages: invert the strip first, then multiply the color on top,
  // so the result reads like a real highlighter (light strip, dark text)
  function drawStroke(line: LineRect, timing: KeyframeAnimationOptions, startTime: number, dark: boolean) {
    const rect = toDocRect(line.left, line.top, line.right - line.left, line.bottom - line.top)
    const layers = []
    if (dark) {
      layers.push(createStrokeLayer(rect, "#ffffff", "difference"))
    }
    layers.push(createStrokeLayer(rect, markerColor(settings.color, settings.opacity), "multiply"))
    for (const layer of layers) {
      const animation = layer.animate({ transform: ["scaleX(0)", "scaleX(1)"] }, timing)
      animation.startTime = startTime
    }
  }

  function createStrokeLayer(rect: MarkerRect, background: string, blend: string) {
    const el = document.createElement("div")
    el.className = STROKE_CLASS
    Object.assign(el.style, {
      position: "absolute",
      left: `${rect.left - 4}px`,
      top: `${rect.top - STROKE_Y_PAD}px`,
      width: `${rect.width + 8}px`,
      height: `${rect.height + STROKE_Y_PAD * 2}px`,
      background,
      borderRadius: "3px 6px 4px 7px",
      mixBlendMode: blend,
      pointerEvents: "none",
      zIndex: overlayZIndex,
      transformOrigin: "left center",
      transform: "scaleX(0)"
    })
    document.documentElement.appendChild(el)
    return el
  }

  function reset() {
    highlightQueue.length = 0
    highlightEndsAt = 0
    document.querySelectorAll(`.${STROKE_CLASS}`).forEach((el) => {
      el.getAnimations().forEach((animation) => animation.cancel())
      el.remove()
    })
  }

  return { queueHighlight, playNextHighlight, reset }
}
