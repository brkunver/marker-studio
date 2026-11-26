import type { WxtStorageItem } from "wxt/utils/storage"
import { storage } from "#imports"

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

const settingsItems: { [Key in keyof MarkerSettings]: WxtStorageItem<MarkerSettings[Key], Record<string, unknown>> } = {
  color: defineSetting("color"),
  opacity: defineSetting("opacity"),
  highlightSpeed: defineSetting("highlightSpeed"),
  zoomDuration: defineSetting("zoomDuration"),
  maxZoom: defineSetting("maxZoom"),
  dim: defineSetting("dim"),
  scrollSpeed: defineSetting("scrollSpeed"),
  blur: defineSetting("blur"),
  theme: defineSetting("theme"),
  enabled: defineSetting("enabled"),
}

function defineSetting<Key extends keyof MarkerSettings>(key: Key) {
  return storage.defineItem<MarkerSettings[Key]>(`local:${key}`, { fallback: MARKER_DEFAULTS[key] })
}

export async function readMarkerSettings() {
  const entries = await storage.getItems(Object.values(settingsItems))
  // Each entry comes from a typed item above. Strip the area prefix to restore the settings shape.
  return Object.fromEntries(entries.map(({ key, value }) => [key.slice("local:".length), value])) as MarkerSettings
}

export function writeMarkerSetting<Key extends keyof MarkerSettings>(key: Key, value: MarkerSettings[Key]) {
  return settingsItems[key].setValue(value)
}

export function resetMarkerPreferences() {
  return storage.setItems(Object.entries(MARKER_PREFERENCE_DEFAULTS).map(([key, value]) => ({
    key: `local:${key}`,
    value,
  })))
}

export function watchMarkerSettings(
  onChange: <Key extends keyof MarkerSettings>(key: Key, value: MarkerSettings[Key]) => void,
) {
  const keys = Object.keys(settingsItems) as (keyof MarkerSettings)[]
  const unwatch = keys.map(watchSetting)
  return () => unwatch.forEach(stop => stop())

  function watchSetting<Key extends keyof MarkerSettings>(key: Key) {
    return settingsItems[key].watch(value => onChange(key, value))
  }
}

export function markerColor(hex: string, opacity: number) {
  const clean = hex.replace("#", "")
  const r = parseInt(clean.slice(0, 2), 16)
  const g = parseInt(clean.slice(2, 4), 16)
  const b = parseInt(clean.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${opacity})`
}
