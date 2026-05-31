import { useState } from 'react'
import { Download, FolderPlus, Layers, Trash2, Upload } from 'lucide-react'
import type { ConfigFile } from '@shared/types'
import { useAppStore } from '@/lib/store'
import { snapshotConfig } from '@/lib/persist'
import { useT } from '@/i18n'

export function DataSection() {
  const t = useT()
  const templates = useAppStore((s) => s.templates)
  const deleteTemplate = useAppStore((s) => s.deleteTemplate)
  const createFromTemplate = useAppStore((s) => s.createFromTemplate)
  const importConfig = useAppStore((s) => s.importConfig)
  const mergeConfig = useAppStore((s) => s.mergeConfig)
  const setSettingsOpen = useAppStore((s) => s.setSettingsOpen)

  const [pending, setPending] = useState<ConfigFile | null>(null)
  const [msg, setMsg] = useState<string | null>(null)

  const onExport = async (): Promise<void> => {
    const ok = await window.snApi.config.export(snapshotConfig())
    if (ok) setMsg(t('data.exported'))
  }
  const onImport = async (): Promise<void> => {
    setMsg(null)
    const cfg = await window.snApi.config.import()
    if (cfg) setPending(cfg)
  }
  const useTemplate = async (id: string): Promise<void> => {
    const dir = await window.snApi.dialog.openDirectory()
    if (!dir) return
    createFromTemplate(id, dir)
    setSettingsOpen(false)
  }

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <div>
          <div className="text-sm font-medium text-text-primary">{t('data.backup')}</div>
          <p className="mt-0.5 text-xs text-text-secondary">{t('data.exportHint')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onExport}
            className="flex items-center gap-2 rounded-btn border border-border bg-bg-secondary px-3 py-2 text-sm text-text-primary transition-colors hover:border-accent-violet/40"
          >
            <Download size={15} />
            {t('data.export')}
          </button>
          <button
            onClick={onImport}
            className="flex items-center gap-2 rounded-btn border border-border bg-bg-secondary px-3 py-2 text-sm text-text-primary transition-colors hover:border-accent-violet/40"
          >
            <Upload size={15} />
            {t('data.import')}
          </button>
          {msg && <span className="text-xs text-emerald-400">{msg}</span>}
        </div>

        {pending && (
          <div className="space-y-2 rounded-card border border-accent-violet/40 bg-accent-violet/5 p-3">
            <p className="text-sm text-text-primary">{t('data.importChoose')}</p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => {
                  importConfig(pending)
                  setPending(null)
                  setMsg(t('data.imported'))
                }}
                className="rounded-btn bg-red-500 px-3 py-1.5 text-sm font-medium text-white hover:brightness-110"
              >
                {t('data.replace')}
              </button>
              <button
                onClick={() => {
                  mergeConfig(pending)
                  setPending(null)
                  setMsg(t('data.merged'))
                }}
                className="rounded-btn bg-[linear-gradient(135deg,var(--color-accent-violet),var(--color-accent-blue))] px-3 py-1.5 text-sm font-medium text-white hover:brightness-110"
              >
                {t('data.merge')}
              </button>
              <button
                onClick={() => setPending(null)}
                className="rounded-btn border border-border px-3 py-1.5 text-sm text-text-secondary hover:text-text-primary"
              >
                {t('common.cancel')}
              </button>
            </div>
          </div>
        )}
      </section>

      <section className="space-y-2 border-t border-border pt-5">
        <div>
          <div className="text-sm font-medium text-text-primary">{t('data.templates')}</div>
          <p className="mt-0.5 text-xs text-text-secondary">{t('data.templatesHint')}</p>
        </div>

        {templates.length === 0 ? (
          <p className="rounded-card border border-dashed border-border px-3 py-4 text-center text-xs text-text-secondary">
            {t('data.noTemplates')}
          </p>
        ) : (
          <div className="space-y-2">
            {templates.map((tpl) => (
              <div
                key={tpl.id}
                className="flex items-center gap-3 rounded-card border border-border bg-bg-secondary px-3 py-2.5"
              >
                <Layers size={16} className="shrink-0 text-accent-violet" />
                <div className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-text-primary">{tpl.name}</span>
                  <span className="block text-[11px] text-text-secondary">
                    {t('data.consoles', { n: tpl.panes.length })}
                  </span>
                </div>
                <button
                  onClick={() => useTemplate(tpl.id)}
                  title={t('data.useTemplate')}
                  className="rounded p-1.5 text-text-secondary hover:text-text-primary"
                >
                  <FolderPlus size={15} />
                </button>
                <button
                  onClick={() => deleteTemplate(tpl.id)}
                  title={t('ctx.delete')}
                  className="rounded p-1.5 text-text-secondary hover:text-red-400"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
