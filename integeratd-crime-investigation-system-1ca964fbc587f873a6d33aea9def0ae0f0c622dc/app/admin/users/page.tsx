"use client"

import { Sidebar } from "@/components/layout/sidebar"
import { UserManagement } from "@/components/admin/user-management"

export default function UsersPage() {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar userRole="admin" />
      <div className="flex-1 md:ml-64">
        <div className="p-6">
          <UserManagement />
        </div>
      </div>
    </div>
  )
}
