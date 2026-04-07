/**
 * themeTransition.js — Production-grade cinematic theme transition
 * ─────────────────────────────────────────────────────────────────
 * API:
 *   playThemeTransition(event, toTheme, onComplete)
 *
 * Behavior:
 *   • Burst originates from exact click position (fallback: screen center)
 *   • Full-screen overlay: position fixed, inset 0, z-index 99999, pointer-events none
 *   • Radial gradient from click point → transparent (no hard edges)
 *   • Scale 0 → 1 — cubic-bezier(0.22, 1, 0.36, 1), 600ms total
 *   • onComplete() fires at 300ms (visual midpoint — theme swaps under cover)
 *   • Overlay removed on animationend + 750ms safety timeout
 *   • Global lock: ignores clicks during active transition
 *   • No overlay stacking, guaranteed DOM cleanup
 *
 * Visual palette (matches existing design tokens):
 *   Light (#f8fafc + blue-white shimmer) → aligns with --color-bg / --glass-bg
 *   Dark  (#0a0a1a + deep navy)          → aligns with dark mesh tokens
 */

let isTransitionRunning = false

export function playThemeTransition(event, toTheme, onComplete) {
  // ── Global lock: prevent stacking ─────────────────────────────────────────
  if (isTransitionRunning) return
  isTransitionRunning = true

  // ── Origin from click position, fallback to screen center ─────────────────
  const ox = event?.clientX ?? window.innerWidth  / 2
  const oy = event?.clientY ?? window.innerHeight / 2

  // Express as CSS percentage so the gradient origin stays accurate across
  // different viewport sizes without needing recalculation.
  const xPct = `${((ox / window.innerWidth)  * 100).toFixed(3)}%`
  const yPct = `${((oy / window.innerHeight) * 100).toFixed(3)}%`

  // ── Choose palette aligned with existing design language ──────────────────
  // Light burst: soft blue-white (#f8fafc core) → matches --color-bg surface
  // Dark swallow: deep navy (#0a0a1a core)       → matches dark --mesh-gradient-1
  const gradientCore =
    toTheme === 'light'
      ? `radial-gradient(circle at ${xPct} ${yPct},
           rgba(248, 250, 252, 0.98)  0%,
           rgba(239, 246, 255, 0.94) 25%,
           rgba(224, 238, 255, 0.80) 50%,
           rgba(214, 233, 255, 0.40) 72%,
           transparent               100%)`
      : `radial-gradient(circle at ${xPct} ${yPct},
           rgba(10,  10,  26,  0.98)  0%,
           rgba(15,  15,  40,  0.94) 25%,
           rgba(17,  24,  39,  0.78) 50%,
           rgba(15,  23,  42,  0.35) 72%,
           transparent               100%)`

  // ── Build overlay ──────────────────────────────────────────────────────────
  const overlay = document.createElement('div')

  Object.assign(overlay.style, {
    position:       'fixed',
    inset:          '0',
    zIndex:         '99999',
    pointerEvents:  'none',
    background:     gradientCore,
    willChange:     'transform, opacity',
    // No border-radius per spec
    // backdrop-filter only if budget allows (skipped: causes compositing cost
    // and the radial gradient is already visually sufficient)
    transform:       'scale(0)',
    transformOrigin: `${xPct} ${yPct}`,
    opacity:         '0',
    // Use a Web Animation instead of CSS class injection so there is zero
    // style-sheet mutation and the animation is frame-synchronised with rAF.
  })

  document.body.appendChild(overlay)

  // ── Web Animations API — single animation, no stylesheet needed ────────────
  const animation = overlay.animate(
    [
      // 0ms — invisible, point origin
      { transform: 'scale(0)',    opacity: '0',   offset: 0    },
      // ~80ms — snap open (fast initial expansion)
      { transform: 'scale(0.12)', opacity: '0.6', offset: 0.08 },
      // 300ms — full coverage (theme swaps behind this)
      { transform: 'scale(1)',    opacity: '1',   offset: 0.5  },
      // hold at peak very briefly
      { transform: 'scale(1)',    opacity: '1',   offset: 0.58 },
      // 600ms — fade out smoothly
      { transform: 'scale(1)',    opacity: '0',   offset: 1    },
    ],
    {
      duration:   600,
      easing:     'cubic-bezier(0.22, 1, 0.36, 1)',
      fill:       'forwards',
    }
  )

  // ── Theme swap at midpoint (300ms) ────────────────────────────────────────
  const swapTimer = setTimeout(() => {
    try { onComplete() } catch (err) { console.warn('[themeTransition] onComplete error:', err) }
  }, 300)

  // ── Cleanup ───────────────────────────────────────────────────────────────
  const cleanup = () => {
    clearTimeout(swapTimer)
    clearTimeout(safetyTimer)
    if (overlay.parentNode) overlay.parentNode.removeChild(overlay)
    isTransitionRunning = false
  }

  animation.onfinish = cleanup

  // Safety: force-remove if animationend never fires (e.g. tab hidden)
  const safetyTimer = setTimeout(cleanup, 750)
}
