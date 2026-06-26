"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { AdminDashboard } from "@/components/dashboards/admin-dashboard"
import { PreInvestigationDashboard } from "@/components/dashboards/pre-investigation-dashboard"
import { DepartmentHeadDashboard } from "@/components/dashboards/department-head-dashboard"
import { InvestigatorDashboard } from "@/components/dashboards/investigator-dashboard"
import { ProsecutorDashboard } from "@/components/dashboards/prosecutor-dashboard"

export default function DashboardPage() {
  const [userRole, setUserRole] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    const role = localStorage.getItem("userRole")
    if (!role) {
      router.push("/")
      return
    }
    setUserRole(role)
  }, [router])

  if (!userRole) {
    return <div>Loading...</div>
  }

  const renderDashboard = () => {
    switch (userRole) {
      case "admin":
        return <AdminDashboard />
      case "pre_investigation":
        return <PreInvestigationDashboard />
      case "department_head":
        return <DepartmentHeadDashboard />
      case "investigator":
        return <InvestigatorDashboard />
      case "prosecutor":
        return <ProsecutorDashboard />
      default:
        return <AdminDashboard />
    }
  }

  return renderDashboard()
}
