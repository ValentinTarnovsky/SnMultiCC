/**
 * A short notification chime emitted by the app itself (Web Audio), independent
 * of the OS notification system / its sound settings. One shared AudioContext,
 * resumed on demand to satisfy the autoplay policy.
 *
 * @param volume 0..1 (maps to the gain peak).
 */
let ctx: AudioContext | null = null

export function playBeep(volume = 0.6): void {
  try {
    if (!ctx) ctx = new AudioContext()
    if (ctx.state === 'suspended') void ctx.resume()
    const now = ctx.currentTime
    const peak = Math.max(0.0002, Math.min(1, volume) * 0.3)
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = 'sine'
    osc.frequency.setValueAtTime(880, now)
    osc.frequency.setValueAtTime(660, now + 0.09)
    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.exponentialRampToValueAtTime(peak, now + 0.015)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.32)
    osc.start(now)
    osc.stop(now + 0.33)
  } catch {
    /* audio unavailable */
  }
}
