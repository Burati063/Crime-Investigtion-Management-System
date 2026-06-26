"use client"

import { Sidebar } from "@/components/layout/sidebar"
import { RegisterCase } from "@/components/pre-investigation/register-case"

export default function RegisterCasePage() {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar userRole="pre_investigation" />
      <div className="flex-1 md:ml-64">
        <div className="p-6">
          <RegisterCase />
        </div>
      </div>
    </div>
  )
}
