"use client"

import { Sidebar } from "@/components/layout/sidebar"
import { CaseDecisions } from "@/components/prosecutor/case-decisions"

export default function CaseDecisionsPage() {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar userRole="prosecutor" />
      <div className="flex-1 md:ml-64">
        <div className="p-6">
          <CaseDecisions />
        </div>
      </div>
    </div>
  )
}
