"use client"

import { Sidebar } from "@/components/layout/sidebar"
import { DepartmentManagement } from "@/components/admin/department-management"

export default function DepartmentsPage() {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar userRole="admin" />
      <div className="flex-1 md:ml-64">
        <div className="p-6">
          <DepartmentManagement />
        </div>
      </div>
    </div>
  )
}
