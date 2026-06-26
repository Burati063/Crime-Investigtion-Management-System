import { PendingCases } from "@/components/department-head/pending-cases"
import { Sidebar } from "@/components/layout/sidebar"


export default function PendingCasesPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-6">
       <Sidebar userRole="department_head" />
            <div className="flex-1 md:ml-64">
              <div className="p-6">
        <PendingCases />
        </div>
      </div>
    </div>
  )
}
