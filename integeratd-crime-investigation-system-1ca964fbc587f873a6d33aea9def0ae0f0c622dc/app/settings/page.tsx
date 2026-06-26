import { GlobalSettings } from "@/components/settings/global-settings"

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <GlobalSettings />
      </div>
    </div>
  )
}
