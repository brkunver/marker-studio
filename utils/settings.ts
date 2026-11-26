import { browser } from "wxt/browser"

export type MarkerTheme = "auto" | "light" | "dark"

type MarkerPreferences = {
  color: string
  opacity: number
  highlightSpeed: number
  zoomDuration: number
  maxZoom: number
  dim: number
  scrollSpeed: number
  blur: number
  theme: MarkerTheme
}

export type MarkerSettings = MarkerPreferences & { enabled: boolean }

export const MARKER_PREFERENCE_DEFAULTS: MarkerPreferences = {
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

export const MARKER_DEFAULTS: MarkerSettings = { ...MARKER_PREFERENCE_DEFAULTS, enabled: true }

export function readMarkerSettings() {
  return browser.storage.local.get<MarkerSettings>(MARKER_DEFAULTS)
}

export function writeMarkerSettings(settings: Partial<MarkerSettings>) {
  return browser.storage.local.set<MarkerSettings>(settings)
}

export function markerColor(hex: string, opacity: number) {
  const clean = hex.replace("#", "")
  const r = parseInt(clean.slice(0, 2), 16)
  const g = parseInt(clean.slice(2, 4), 16)
  const b = parseInt(clean.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${opacity})`
}
