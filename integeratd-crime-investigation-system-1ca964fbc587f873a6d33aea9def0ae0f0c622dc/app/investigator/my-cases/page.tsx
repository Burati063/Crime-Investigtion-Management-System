"use client"

import MyCases from "@/components/investigator/my-cases"
import { Sidebar } from "@/components/layout/sidebar"

export default function MyCasesPage() {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar userRole="investigator" />
      <div className="flex-1 md:ml-64">
        <div className="p-6">
          <MyCases />
        </div>
      </div>
    </div>
  )
}