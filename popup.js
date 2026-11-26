const UNITS = {
  opacity: "",
  highlightSpeed: " px/s",
  zoomDuration: " ms",
  maxZoom: "x",
  dim: "",
  scrollSpeed: " px/s",
  blur: " px"
}

const INPUT_KEYS = Object.keys(MARKER_DEFAULTS).filter((key) => key !== "theme")

let current = { ...MARKER_DEFAULTS }

init()

function init() {
  chrome.storage.local.get(MARKER_DEFAULTS, fillForm)
  document.querySelectorAll(".theme-btn").forEach((btn) => {
    btn.addEventListener("click", onThemeClick)
  })
  for (const key of INPUT_KEYS) {
    let input = document.getElementById(key)
    input.addEventListener("input", onInput)
    input.addEventListener("change", onChange)
  }
  document.querySelectorAll(".swatch").forEach((btn) => {
    btn.addEventListener("click", onSwatchClick)
  })
  document.getElementById("reset").addEventListener("click", resetDefaults)
}

function fillForm(values) {
  current = { ...values }
  for (const key of INPUT_KEYS) {
    document.getElementById(key).value = values[key]
    updateOutput(key, values[key])
  }
  updateThemeButtons()
  updatePreview()
}

function onThemeClick(e) {
  save("theme", e.currentTarget.dataset.theme)
  updateThemeButtons()
}

function updateThemeButtons() {
  document.querySelectorAll(".theme-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.theme === current.theme)
  })
}

function readValue(input) {
  if (input.type === "color") {
    return input.value
  }
  return Number(input.value)
}

function onInput(e) {
  current[e.target.id] = readValue(e.target)
  updateOutput(e.target.id, current[e.target.id])
  updatePreview()
}

// Save on change only, to avoid a write per slider tick
function onChange(e) {
  save(e.target.id, readValue(e.target))
}

function onSwatchClick(e) {
  const color = e.currentTarget.dataset.color
  document.getElementById("color").value = color
  current.color = color
  save("color", color)
  updatePreview()
}

function save(key, value) {
  current[key] = value
  chrome.storage.local.set({ [key]: value })
}

function updateOutput(key, value) {
  const output = document.getElementById(`${key}-out`)
  if (!output) {
    return
  }
  output.textContent = `${value}${UNITS[key] || ""}`
}

function updatePreview() {
  document.getElementById("preview").style.background = markerColor(current.color, current.opacity)
  document.querySelectorAll(".swatch").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.color === current.color)
  })
}

function resetDefaults() {
  chrome.storage.local.set(MARKER_DEFAULTS)
  fillForm(MARKER_DEFAULTS)
}
