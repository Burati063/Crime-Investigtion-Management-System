"use client"

import { Sidebar } from "@/components/layout/sidebar"
import { ReviewCases } from "@/components/prosecutor/review-cases"

export default function ReviewCasesPage() {
  return (
    <div className="flex min-h-screen bg-gray-50 p-6">
      <Sidebar userRole="prosecutor" />
      <div className="flex-1 md:ml-64">
        <div className="p-6">
          <ReviewCases />
        </div>
      </div>
    </div>
  )
}
