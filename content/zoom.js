"use strict"

function createMarkerZoom(settings, overlayZIndex) {
  const Z_SPOT = "2147483646"
  const SPOT_PAD = 16
  const MIN_ZOOM_SELECTION = 8
  const ZOOM_EASING = "cubic-bezier(0.37, 0, 0.63, 1)"

  let zoomSelection = null
  let armedZoomRect = null
  let zoom = null

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
      zIndex: overlayZIndex,
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

  function reset() {
    armedZoomRect = null
    closeZoomSelection()
    resetZoom()
  }

  return { toggleZoom, toDocRect, reset }
}
