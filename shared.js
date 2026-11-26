const MARKER_PREFERENCE_DEFAULTS = {
  color: "#ffd600",
  opacity: 0.6,
  highlightSpeed: 450,
  zoomDuration: 900,
  maxZoom: 2,
  dim: 0.6,
  scrollSpeed: 120,
  blur: 8,
  theme: "auto"
}

const MARKER_DEFAULTS = { ...MARKER_PREFERENCE_DEFAULTS, enabled: true }

function markerColor(hex, opacity) {
  const clean = hex.replace("#", "")
  const r = parseInt(clean.slice(0, 2), 16)
  const g = parseInt(clean.slice(2, 4), 16)
  const b = parseInt(clean.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${opacity})`
}
