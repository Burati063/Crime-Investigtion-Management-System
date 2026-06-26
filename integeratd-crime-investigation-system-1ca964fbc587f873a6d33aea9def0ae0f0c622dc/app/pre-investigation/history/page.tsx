
import { Sidebar } from "@/components/layout/sidebar"
import { CaseHistory } from "@/components/pre-investigation/case-history"

export default function CaseHistoryPage() {
  return (
    <div className="min-h-screen bg-gray-50 ">
      <Sidebar userRole="pre_investigation" />
      <div className="flex-1 md:ml-64">
        <div className="p-6">
        <CaseHistory />
      </div>
      </div>
    </div>
  )
}
