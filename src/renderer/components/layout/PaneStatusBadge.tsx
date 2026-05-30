import { useEffect, useState } from 'react'
import type { PaneState } from '@shared/types'
import { useActivityStore } from '@/lib/activityStore'
import { cn } from '@/lib/cn'

const DOT: Record<PaneState, string> = {
  working: 'bg-emerald-400',
  waiting: 'bg-amber-400',
  idle: 'bg-text-secondary/40',
  exited: 'bg-red-400',
}

/** mm:ss, rolling up to Hh once past an hour. */
function fmt(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const m = Math.floor(total / 60)
  const s = total % 60
  if (m >= 60) return `${Math.floor(m / 60)}h${String(m % 60).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

/** State dot + session runtime for a console (U6). No token/cost data. */
export function PaneStatusBadge({ paneId }: { paneId: string }) {
  const state = useActivityStore((s) => s.states[paneId])
  const spawnedAt = useActivityStore((s) => s.spawnedAt[paneId])
  const [, tick] = useState(0)

  useEffect(() => {
    if (!spawnedAt || state === 'exited') return
    const id = setInterval(() => tick((n) => n + 1), 1000)
    return () => clearInterval(id)
  }, [spawnedAt, state])

  if (!state) return null
  const runtime = spawnedAt ? fmt(Date.now() - spawnedAt) : null

  return (
    <span className="flex shrink-0 items-center gap-1">
      <span
        className={cn('h-1.5 w-1.5 rounded-full', DOT[state], state === 'working' && 'animate-pulse')}
      />
      {runtime && state !== 'exited' && (
        <span className="font-mono text-[10px] tabular-nums text-text-secondary/70">{runtime}</span>
      )}
    </span>
  )
}
