(function () {
  "use strict"

  if (window.__markerStudio) {
    return
  }
  window.__markerStudio = true

  const STROKE_CLASS = "__ms-stroke"
  const STROKE_Y_PAD = 1
  const Z_TOP = "2147483647"
  const Z_SPOT = "2147483646"
  const SPOT_PAD = 16
  const MIN_ZOOM_SELECTION = 8

  const EASE_IN = "cubic-bezier(0.5, 0, 0.75, 0.75)"
  const EASE_OUT = "cubic-bezier(0.25, 0.25, 0.5, 1)"
  const EASE_IN_OUT = "cubic-bezier(0.65, 0, 0.35, 1)"
  const ZOOM_EASING = "cubic-bezier(0.37, 0, 0.63, 1)"

  const ACTIONS = {
    h: queueHighlight,
    z: toggleZoom,
    s: toggleScroll,
    c: toggleClean,
    b: toggleBlur,
    escape: resetAll
  }

  let settings = { ...MARKER_DEFAULTS }
  let hovered = null
  const highlightQueue = []
  let highlightEndsAt = 0
  let zoomSelection = null
  let armedZoomRect = null
  let zoom = null
  let scroller = null
  let cleanState = null
  let blurred = new Map()

  init()

  function init() {
    chrome.storage.local.get(MARKER_DEFAULTS, (stored) => {
      settings = stored
    })
    chrome.storage.onChanged.addListener(onSettingsChanged)
    document.addEventListener("mousemove", (e) => {
      hovered = e.target
    }, true)
    document.addEventListener("keydown", onKeyDown, true)
  }

  function onSettingsChanged(changes, area) {
    if (area !== "local") {
      return
    }
    for (const key in changes) {
      settings[key] = changes[key].newValue
    }
  }

  function onKeyDown(e) {
    if (e.repeat || e.ctrlKey || e.metaKey || e.altKey || isTyping(e.target)) {
      return
    }
    const key = (e.key || "").toLowerCase()
    const action = key === "h" && e.shiftKey ? playHighlights : ACTIONS[key]
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

  // Map a viewport rect to untransformed document coords (works while zoomed)
  function toDocRect(left, top, width, height) {
    if (!zoom) {
      return { left: left + window.scrollX, top: top + window.scrollY, width, height }
    }
    const transform = getComputedStyle(document.documentElement).transform
    const matrix = new DOMMatrixReadOnly(transform === "none" ? undefined : transform)
    return {
      left: zoom.originX + (left + window.scrollX - zoom.originX - matrix.e) / matrix.a,
      top: zoom.originY + (top + window.scrollY - zoom.originY - matrix.f) / matrix.d,
      width: width / matrix.a,
      height: height / matrix.d
    }
  }

  // ---------- Highlighter ----------

  function queueHighlight() {
    const selection = window.getSelection()
    if (!selection || selection.isCollapsed) {
      return
    }
    highlightQueue.push(selection.getRangeAt(0).cloneRange())
    selection.removeAllRanges()
  }

  function playHighlights() {
    if (highlightQueue.length === 0) {
      return
    }
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    let startTime = Math.max(document.timeline.currentTime ?? 0, highlightEndsAt)
    for (const range of highlightQueue.splice(0)) {
      startTime = drawRange(range, startTime, reduceMotion)
    }
    highlightEndsAt = startTime
  }

  // Rects are measured at draw time, so scrolling between presses is fine
  function drawRange(range, startTime, reduceMotion) {
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

  function isDarkBackground(range) {
    if (settings.theme === "light") {
      return false
    }
    if (settings.theme === "dark") {
      return true
    }
    const node = range.startContainer
    let el = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement
    while (el) {
      const color = parseColor(getComputedStyle(el).backgroundColor)
      if (color && color.a > 0.5) {
        return luminance(color) < 0.4
      }
      el = el.parentElement
    }
    return getComputedStyle(document.documentElement).colorScheme.includes("dark")
  }

  function parseColor(value) {
    const nums = value.match(/[\d.]+/g)
    if (!value.startsWith("rgb") || !nums || nums.length < 3) {
      return null
    }
    return { r: +nums[0], g: +nums[1], b: +nums[2], a: nums.length > 3 ? +nums[3] : 1 }
  }

  function luminance(c) {
    return (0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b) / 255
  }

  // Merge duplicate rects into one rect per visual line
  function getLineRects(range) {
    let lines = []
    for (const rect of range.getClientRects()) {
      if (rect.width < 2) {
        continue
      }
      let same = lines.find((l) => Math.abs(l.top - rect.top) < 4)
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
  function getTiming(index, total, width) {
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
  function drawStroke(line, timing, startTime, dark) {
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

  function createStrokeLayer(rect, background, blend) {
    let el = document.createElement("div")
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
      zIndex: Z_TOP,
      transformOrigin: "left center",
      transform: "scaleX(0)"
    })
    document.documentElement.appendChild(el)
    return el
  }

  // ---------- Spotlight zoom ----------

  function toggleZoom() {
    if (zoom) {
      resetZoom()
      return
    }
    if (armedZoomRect) {
      const rect = armedZoomRect
      armedZoomRect = null
      zoomTo(rect)
      return
    }
    if (!zoomSelection) {
      openZoomSelection()
    }
  }

  function openZoomSelection() {
    const overlay = document.createElement("div")
    const box = document.createElement("div")
    overlay.setAttribute("aria-hidden", "true")
    Object.assign(overlay.style, {
      all: "initial",
      position: "fixed",
      inset: "0",
      zIndex: Z_TOP,
      cursor: "crosshair",
      touchAction: "none",
      userSelect: "none",
      pointerEvents: "auto"
    })
    Object.assign(box.style, {
      all: "initial",
      position: "absolute",
      display: "none",
      boxSizing: "border-box",
      border: "2px dashed #ffd600",
      boxShadow: "0 0 0 1px #17171b",
      background: "rgba(255, 214, 0, 0.12)",
      pointerEvents: "none"
    })
    overlay.appendChild(box)
    overlay.addEventListener("pointerdown", startZoomDrag)
    overlay.addEventListener("pointermove", moveZoomDrag)
    overlay.addEventListener("pointerup", finishZoomDrag)
    overlay.addEventListener("lostpointercapture", clearZoomDrag)
    zoomSelection = { overlay, box, drag: null }
    document.documentElement.appendChild(overlay)
  }

  function startZoomDrag(e) {
    if (e.button !== 0 || zoomSelection.drag) {
      return
    }
    e.preventDefault()
    zoomSelection.drag = { pointerId: e.pointerId, x: e.clientX, y: e.clientY }
    zoomSelection.overlay.setPointerCapture(e.pointerId)
  }

  function getZoomDragRect(e, drag) {
    const x = Math.max(0, Math.min(e.clientX, document.documentElement.clientWidth))
    const y = Math.max(0, Math.min(e.clientY, document.documentElement.clientHeight))
    return {
      left: Math.min(x, drag.x),
      top: Math.min(y, drag.y),
      width: Math.abs(x - drag.x),
      height: Math.abs(y - drag.y)
    }
  }

  function moveZoomDrag(e) {
    const { drag, box } = zoomSelection
    if (drag?.pointerId !== e.pointerId) {
      return
    }
    const rect = getZoomDragRect(e, drag)
    Object.assign(box.style, {
      display: "block",
      left: `${rect.left}px`,
      top: `${rect.top}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`
    })
  }

  function finishZoomDrag(e) {
    const { drag } = zoomSelection
    if (drag?.pointerId !== e.pointerId) {
      return
    }
    const { left, top, width, height } = getZoomDragRect(e, drag)
    if (width < MIN_ZOOM_SELECTION || height < MIN_ZOOM_SELECTION) {
      clearZoomDrag(e)
      return
    }
    armedZoomRect = toDocRect(left, top, width, height)
    closeZoomSelection()
  }

  function clearZoomDrag(e) {
    if (zoomSelection?.drag?.pointerId !== e.pointerId) {
      return
    }
    zoomSelection.drag = null
    zoomSelection.box.style.display = "none"
  }

  function closeZoomSelection() {
    if (!zoomSelection) {
      return
    }
    zoomSelection.overlay.remove()
    zoomSelection = null
  }

  function zoomTo(rect) {
    const root = document.documentElement
    const vw = root.clientWidth
    const vh = root.clientHeight
    const fitW = vw / (rect.width + SPOT_PAD * 2)
    const fitH = vh / (rect.height + SPOT_PAD * 2)
    const scale = Math.max(1, Math.min(settings.maxZoom, fitW, fitH))
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    const [originX, originY] = getComputedStyle(root).transformOrigin.split(" ").map(parseFloat)
    // Compensate for scaling around the page's origin so the selected center follows a straight path.
    const dx = vw / 2 + window.scrollX - cx - (cx - originX) * (scale - 1)
    const dy = vh / 2 + window.scrollY - cy - (cy - originY) * (scale - 1)
    const timing = { duration: settings.zoomDuration, easing: ZOOM_EASING, fill: "both" }
    const spotlight = drawSpotlight(rect)
    const camera = root.animate({
      transform: ["translate(0px, 0px) scale(1)", `translate(${dx}px, ${dy}px) scale(${scale})`]
    }, timing)
    const dimming = spotlight.animate({ opacity: [0, 1] }, timing)
    zoom = { originX, originY, camera, spotlight, dimming, returning: false }
  }

  function drawSpotlight(rect) {
    const el = document.createElement("div")
    Object.assign(el.style, {
      position: "absolute",
      left: `${rect.left - SPOT_PAD}px`,
      top: `${rect.top - SPOT_PAD}px`,
      width: `${rect.width + SPOT_PAD * 2}px`,
      height: `${rect.height + SPOT_PAD * 2}px`,
      borderRadius: "12px",
      boxShadow: `0 0 0 300vmax rgba(0, 0, 0, ${settings.dim})`,
      pointerEvents: "none",
      zIndex: Z_SPOT
    })
    document.documentElement.appendChild(el)
    return el
  }

  function resetZoom() {
    if (!zoom || zoom.returning) {
      return
    }
    const { camera, spotlight, dimming } = zoom
    zoom.returning = true
    camera.onfinish = () => {
      camera.cancel()
      dimming.cancel()
      spotlight.remove()
      zoom = null
    }
    camera.reverse()
    dimming.reverse()
  }

  // ---------- Auto-scroll ----------

  function toggleScroll() {
    if (scroller) {
      scroller.stopping = true
      return
    }
    scroller = { pos: window.scrollY, velocity: 0, stopping: false, last: performance.now() }
    requestAnimationFrame(stepScroll)
  }

  // Constant speed with a short linear ramp at start and stop
  function stepScroll(now) {
    if (!scroller) {
      return
    }
    const dt = Math.min(0.05, Math.max(0, (now - scroller.last) / 1000))
    scroller.last = now

    const target = scroller.stopping ? 0 : settings.scrollSpeed
    const accel = settings.scrollSpeed / 0.6
    scroller.velocity = approach(scroller.velocity, target, accel * dt)
    scroller.pos += scroller.velocity * dt
    window.scrollTo({ top: scroller.pos, behavior: "instant" })

    const maxScroll = document.documentElement.scrollHeight - window.innerHeight
    const stopped = scroller.stopping && scroller.velocity === 0
    if (stopped || scroller.pos >= maxScroll) {
      scroller = null
      return
    }
    requestAnimationFrame(stepScroll)
  }

  function approach(current, target, step) {
    if (current < target) {
      return Math.min(target, current + step)
    }
    return Math.max(target, current - step)
  }

  // ---------- Clean mode ----------

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

  // ---------- Blur ----------

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

  // ---------- Reset ----------

  function resetAll() {
    highlightQueue.length = 0
    highlightEndsAt = 0
    armedZoomRect = null
    closeZoomSelection()
    document.querySelectorAll(`.${STROKE_CLASS}`).forEach((el) => {
      el.getAnimations().forEach((animation) => animation.cancel())
      el.remove()
    })
    resetZoom()
    scroller = null
    if (cleanState) {
      restoreClean()
    }
    blurred.forEach((filter, el) => {
      el.style.filter = filter
    })
    blurred.clear()
  }
})()
