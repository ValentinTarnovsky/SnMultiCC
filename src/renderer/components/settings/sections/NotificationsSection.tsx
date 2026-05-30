import { useAppStore } from '@/lib/store'
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
      </div>
    </div>
  )
}
