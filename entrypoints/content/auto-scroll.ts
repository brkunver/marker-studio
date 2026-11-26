import type { MarkerSettings } from "@/utils/settings"

type ScrollState = {
  pos: number
  velocity: number
  stopping: boolean
  last: number
}

export function createMarkerAutoScroll(settings: MarkerSettings) {
  let scroller: ScrollState | null = null

  function toggleScroll() {
    if (scroller) {
      scroller.stopping = true
      return
    }
    scroller = { pos: window.scrollY, velocity: 0, stopping: false, last: performance.now() }
    requestAnimationFrame(stepScroll)
  }

  // Constant speed with a short linear ramp at start and stop
  function stepScroll(now: number) {
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

  function approach(current: number, target: number, step: number) {
    if (current < target) {
      return Math.min(target, current + step)
    }
    return Math.max(target, current - step)
  }

  function reset() {
    scroller = null
  }

  return { toggleScroll, reset }
}
