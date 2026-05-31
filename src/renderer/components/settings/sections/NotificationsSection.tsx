import { useAppStore } from '@/lib/store'
import { playBeep } from '@/lib/sound'
import { useT } from '@/i18n'
import { ToggleRow } from '../ui'

export function NotificationsSection() {
  const t = useT()
  const settings = useAppStore((s) => s.settings)
  const updateSettings = useAppStore((s) => s.updateSettings)

  return (
    <div className="space-y-5">
      <ToggleRow
        checked={settings.showPaneStatus}
        onChange={(v) => updateSettings({ showPaneStatus: v })}
        title={t('settings.showPaneStatus')}
        description={t('settings.showPaneStatusHint')}
      />

      <div className="space-y-5 border-t border-border pt-5">
        <ToggleRow
          checked={settings.notifyOnDone}
          onChange={(v) => updateSettings({ notifyOnDone: v })}
          title={t('settings.notifyOnDone')}
          description={t('settings.notifyOnDoneHint')}
        />
        <ToggleRow
          checked={settings.notifyOnWaiting}
          onChange={(v) => updateSettings({ notifyOnWaiting: v })}
          title={t('settings.notifyOnWaiting')}
          description={t('settings.notifyOnWaitingHint')}
        />
        <ToggleRow
          checked={settings.notifySound}
          onChange={(v) => updateSettings({ notifySound: v })}
          title={t('settings.notifySound')}
        />

        <div>
          <div className="mb-1 flex items-center justify-between">
            <span className="text-sm font-medium text-text-primary">
              {t('settings.notifyVolume')}
            </span>
            <span className="font-mono text-xs tabular-nums text-text-secondary">
              {settings.notifyVolume}%
            </span>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={settings.notifyVolume}
              onChange={(e) => updateSettings({ notifyVolume: Number(e.target.value) })}
              className="h-1.5 flex-1 cursor-pointer accent-accent-violet"
            />
            <button
              type="button"
              onClick={() => playBeep(settings.notifyVolume / 100)}
              className="shrink-0 rounded-btn border border-border bg-bg-secondary px-3 py-1.5 text-xs text-text-primary transition-colors hover:border-accent-violet/40"
            >
              {t('settings.testSound')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
