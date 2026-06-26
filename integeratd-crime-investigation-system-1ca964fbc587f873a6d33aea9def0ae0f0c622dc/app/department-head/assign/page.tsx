import { AssignInvestigators } from "@/components/department-head/assign-investigators"

import { Sidebar } from "@/components/layout/sidebar"


export default function AssignInvestigatorsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar userRole="department_head" />

      <div className="flex-1 md:ml-64">
        <div className="p-6">
        <AssignInvestigators />
        </div>
      </div>
    </div>
  )
}
