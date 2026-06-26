import { Reports } from "@/components/admin/reports"
import { Sidebar } from "@/components/layout/sidebar"

export default function ReportsPage() {
  return (
    <div className="flex">
      <Sidebar userRole="admin" />
      <main className="flex-1 p-4 md:ml-64">
        <Reports />
      </main>
    </div>
  )
}
