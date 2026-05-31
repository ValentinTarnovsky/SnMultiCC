import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import type { PaneType } from '@shared/types'
import { useT } from '@/i18n'
import { cn } from '@/lib/cn'

/** Common quick-pick models per agent (free text always allowed). */
const QUICK: Partial<Record<PaneType, string[]>> = {
  claude: ['opus', 'sonnet', 'haiku'],
  codex: ['gpt-5.1-codex', 'gpt-5.1', 'o3'],
}

interface ModelPickerProps {
  open: boolean
  paneType: PaneType
  current?: string
  onApply: (model: string, applyAll: boolean) => void
  onCancel: () => void
}

/** Pick the model for an agent console; optionally apply to the whole workspace. */
export function ModelPicker({ open, paneType, current, onApply, onCancel }: ModelPickerProps) {
  const t = useT()
  const [value, setValue] = useState(current ?? '')
  const [all, setAll] = useState(false)

  useEffect(() => {
    if (open) {
      setValue(current ?? '')
      setAll(false)
    }
  }, [open, current])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onCancel()
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [open, onCancel])

  if (!open) return null
  const quick = QUICK[paneType] ?? []

  return createPortal(
    <div className="fixed inset-0 z-[75] flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-black/60" onClick={onCancel} />
      <div className="relative z-10 w-full max-w-sm overflow-hidden rounded-modal border border-border bg-card shadow-[0_20px_48px_-12px_rgba(0,0,0,0.6)]">
        <div className="space-y-3 p-5">
          <h2 className="text-sm font-semibold text-text-primary">{t('model.title')}</h2>

          <div className="flex flex-wrap gap-1.5">
            <Chip label={t('model.default')} active={!value.trim()} onClick={() => setValue('')} />
            {quick.map((m) => (
              <Chip key={m} label={m} active={value.trim() === m} onClick={() => setValue(m)} />
            ))}
          </div>

          <input
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                onApply(value, all)
              }
            }}
            placeholder={t('model.placeholder')}
            className="h-9 w-full rounded-btn border border-border bg-bg-secondary px-3 font-mono text-sm text-text-primary outline-none transition-colors focus:border-accent-violet"
          />

          <label className="flex cursor-pointer items-center gap-2 text-xs text-text-secondary">
            <input
              type="checkbox"
              checked={all}
              onChange={(e) => setAll(e.target.checked)}
              className="accent-accent-violet"
            />
            {t('model.applyAll')}
          </label>

          <p className="text-[11px] text-text-secondary/70">{t('model.hint')}</p>
        </div>

        <div className="flex justify-end gap-2 border-t border-border bg-bg-secondary/40 px-5 py-3">
          <button
            onClick={onCancel}
            className="rounded-btn border border-border px-4 py-2 text-sm text-text-primary transition-colors hover:bg-card"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={() => onApply(value, all)}
            className="rounded-btn bg-[linear-gradient(135deg,var(--color-accent-violet),var(--color-accent-blue))] px-4 py-2 text-sm font-medium text-white hover:brightness-110"
          >
            {t('model.apply')}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'rounded-full border px-2.5 py-1 text-xs transition-colors',
        active
          ? 'border-accent-violet bg-accent-violet/10 text-text-primary'
          : 'border-border text-text-secondary hover:text-text-primary',
      )}
    >
      {label}
    </button>
  )
}
