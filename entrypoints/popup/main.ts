import {
  MARKER_DEFAULTS,
  MARKER_PREFERENCE_DEFAULTS,
  markerColor,
  readMarkerSettings,
  resetMarkerPreferences,
  writeMarkerSetting,
  type MarkerSettings,
} from "@/utils/settings"

const UNITS = {
  opacity: "",
  highlightSpeed: " px/s",
  zoomDuration: " ms",
  maxZoom: "x",
  dim: "",
  scrollSpeed: " px/s",
  blur: " px",
}
type NumberInputKey = keyof typeof UNITS

const numberInputKeys = Object.keys(UNITS) as NumberInputKey[]
const enabledToggle = getRequiredElement("enabled-toggle", HTMLButtonElement)
const colorInput = getRequiredElement("color", HTMLInputElement)
const resetButton = getRequiredElement("reset", HTMLButtonElement)
const preview = getRequiredElement("preview", HTMLSpanElement)
const themeButtons = document.querySelectorAll<HTMLButtonElement>(".theme-btn")
const swatches = document.querySelectorAll<HTMLButtonElement>(".swatch")

let current = { ...MARKER_DEFAULTS }
let savingEnabled = false

void init()

async function init() {
  try {
    fillForm(await readMarkerSettings())
  } catch (error) {
    console.error("Could not load Marker Studio settings", error)
    fillForm(MARKER_DEFAULTS)
  }
  enabledToggle.disabled = false
  enabledToggle.addEventListener("click", onToggleEnabled)
  for (const button of themeButtons) {
    button.addEventListener("click", () => {
      const { theme } = button.dataset
      if (theme === "auto" || theme === "light" || theme === "dark") {
        save("theme", theme)
        updateThemeButtons()
      }
    })
  }
  for (const key of numberInputKeys) {
    const input = getRequiredElement(key, HTMLInputElement)
    input.addEventListener("input", () => {
      current[key] = input.valueAsNumber
      updateOutput(key, current[key])
      updatePreview()
    })
    input.addEventListener("change", () => save(key, input.valueAsNumber))
  }
  colorInput.addEventListener("input", () => {
    current.color = colorInput.value
    updatePreview()
  })
  colorInput.addEventListener("change", () => save("color", colorInput.value))
  for (const button of swatches) {
    button.addEventListener("click", () => {
      const { color } = button.dataset
      if (!color) {
        return
      }
      colorInput.value = color
      save("color", color)
      updatePreview()
    })
  }
  resetButton.addEventListener("click", resetDefaults)
}

function getRequiredElement<ElementType extends HTMLElement>(id: string, type: new () => ElementType) {
  const el = document.getElementById(id)
  if (!(el instanceof type)) {
    throw new Error(`Missing popup control: ${id}`)
  }
  return el
}

function fillForm(values: MarkerSettings) {
  current = { ...values }
  colorInput.value = values.color
  for (const key of numberInputKeys) {
    getRequiredElement(key, HTMLInputElement).value = String(values[key])
    updateOutput(key, values[key])
  }
  updateThemeButtons()
  updatePreview()
  updateEnabledToggle()
}

async function onToggleEnabled() {
  if (savingEnabled) {
    return
  }
  const enabled = !current.enabled
  savingEnabled = true
  try {
    await writeMarkerSetting("enabled", enabled)
    current.enabled = enabled
    updateEnabledToggle()
  } catch (error) {
    console.error("Could not save Marker Studio's enabled state", error)
  } finally {
    savingEnabled = false
  }
}

function updateEnabledToggle() {
  enabledToggle.setAttribute("aria-checked", String(current.enabled))
  enabledToggle.textContent = current.enabled ? "On" : "Off"
}

function updateThemeButtons() {
  for (const button of themeButtons) {
    button.classList.toggle("active", button.dataset.theme === current.theme)
  }
}

function save<Key extends keyof MarkerSettings>(key: Key, value: MarkerSettings[Key]) {
  current[key] = value
  void writeMarkerSetting(key, value).catch(reportSaveError)
}

function reportSaveError(error: unknown) {
  console.error("Could not save Marker Studio settings", error)
}

function updateOutput(key: NumberInputKey, value: number) {
  getRequiredElement(`${key}-out`, HTMLOutputElement).textContent = `${value}${UNITS[key]}`
}

function updatePreview() {
  preview.style.background = markerColor(current.color, current.opacity)
  for (const swatch of swatches) {
    swatch.classList.toggle("active", swatch.dataset.color === current.color)
  }
}

function resetDefaults() {
  void resetMarkerPreferences().catch(reportSaveError)
  fillForm({ ...MARKER_PREFERENCE_DEFAULTS, enabled: current.enabled })
}
