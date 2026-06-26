import { AssignProsecutor } from "@/components/department-head/assign-prosecutor"
import { Sidebar } from "@/components/layout/sidebar"

export default function AssignProsecutorPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar userRole="department_head" />
      <div className="flex-1 md:ml-64">
        <div className="p-6">
          <AssignProsecutor />
        </div>
      </div>
    </div>
  )
}
