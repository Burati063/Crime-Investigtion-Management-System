import { BackupExport } from "@/components/admin/backup-export"
import { Sidebar } from "@/components/layout/sidebar"
export default function BackupPage() {
  return (
    <div className="flex">
      <Sidebar userRole="admin" />
      <main className="flex-1 p-4 md:ml-64">
        <BackupExport />
      </main>
    </div>
  )
}
