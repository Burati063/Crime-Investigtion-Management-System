"use client"

import DailyActivityReport from "@/components/investigator/DailyActivityReports"
import { Sidebar } from "@/components/layout/sidebar"


export default function UsersPage() {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar userRole="investigator" />
      <div className="flex-1 md:ml-64">
        <div className="p-6">
          <DailyActivityReport />
        </div>
      </div>
    </div>
  )
}