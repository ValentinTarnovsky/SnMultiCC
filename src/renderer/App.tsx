import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import type { AppInfo } from '@shared/ipc-contract'
import { Button } from '@/components/ui/Button'
import { Logo } from '@/components/ui/Logo'

export function App() {
  const [info, setInfo] = useState<AppInfo | null>(null)

  useEffect(() => {
    window.snApi.app.info().then(setInfo).catch(() => undefined)
  }, [])

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-8 bg-bg-primary px-6 text-center">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="flex flex-col items-center gap-6"
      >
        <Logo size="lg" />
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight text-text-primary">
            Multi Command Consoles
          </h1>
          <p className="max-w-md text-sm text-text-secondary">
            Conjuntos de terminales y sesiones de IA en un mosaico. Engineered in silence.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button>Nuevo workspace</Button>
          <Button variant="ghost">Ajustes</Button>
        </div>
      </motion.div>

      {info && (
        <div className="rounded-card border border-border bg-card px-4 py-2 font-mono text-xs text-text-secondary">
          v{info.version} · {info.platform}/{info.arch} · {info.portable ? 'portable' : 'installed'}
        </div>
      )}
    </div>
  )
}
