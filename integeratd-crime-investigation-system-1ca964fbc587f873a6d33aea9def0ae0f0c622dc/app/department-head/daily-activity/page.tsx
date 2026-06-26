import DailyActivityList from "@/components/department-head/daily-activity"
import { Sidebar } from "@/components/layout/sidebar"

export default function DepartmentHeadDailyActivityPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar userRole="department_head" />
      <div className="flex-1 md:ml-64">
        <div className="p-6">
          <DailyActivityList />
        </div>
      </div>
    </div>
  )
}
