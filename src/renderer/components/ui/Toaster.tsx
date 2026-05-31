import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle2, HelpCircle, X } from 'lucide-react'
import { useToastStore, type Toast } from '@/lib/toastStore'
import { useAppStore } from '@/lib/store'
import { cn } from '@/lib/cn'

/** Auto-dismiss delay per toast. */
const TTL_MS = 7000

/** Top-right stack of in-app notifications (console finished / needs input). */
export function Toaster() {
  const toasts = useToastStore((s) => s.toasts)
  const dismiss = useToastStore((s) => s.dismiss)
  const setActive = useAppStore((s) => s.setActive)

  return createPortal(
    <div className="pointer-events-none fixed right-4 top-12 z-[80] flex w-72 flex-col gap-2">
      <AnimatePresence initial={false}>
        {toasts.map((t) => (
          <ToastCard
            key={t.id}
            toast={t}
            onJump={() => {
              setActive(t.workspaceId)
              window.snApi.system.focus()
              dismiss(t.id)
            }}
            onClose={() => dismiss(t.id)}
          />
        ))}
      </AnimatePresence>
    </div>,
    document.body,
  )
}

function ToastCard({
  toast,
  onJump,
  onClose,
}: {
  toast: Toast
  onJump: () => void
  onClose: () => void
}) {
  useEffect(() => {
    const id = setTimeout(onClose, TTL_MS)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const done = toast.kind === 'done'
  const Icon = done ? CheckCircle2 : HelpCircle

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 24 }}
      transition={{ type: 'spring', stiffness: 500, damping: 38 }}
      onClick={onJump}
      className="pointer-events-auto cursor-pointer overflow-hidden rounded-card border border-border bg-card shadow-[0_12px_32px_-12px_rgba(0,0,0,0.7)]"
    >
      <div className="flex items-start gap-2.5 p-3">
        <Icon size={16} className={cn('mt-0.5 shrink-0', done ? 'text-emerald-400' : 'text-amber-400')} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-sm font-medium text-text-primary">{toast.title}</span>
          </div>
          <p className="mt-0.5 truncate text-xs text-text-secondary">{toast.body}</p>
          <p className="mt-0.5 truncate text-[11px] text-text-secondary/60">{toast.workspaceName}</p>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onClose()
          }}
          className="shrink-0 rounded p-0.5 text-text-secondary transition-colors hover:bg-bg-secondary hover:text-text-primary"
        >
          <X size={14} />
        </button>
      </div>
      <span
        className={cn('block h-0.5 w-full', done ? 'bg-emerald-400/60' : 'bg-amber-400/60')}
      />
    </motion.div>
  )
}
