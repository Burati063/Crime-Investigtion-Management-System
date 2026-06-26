"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Sidebar } from "@/components/layout/sidebar"
import { Clock, Users, CheckCircle, Activity } from "lucide-react"
import { withBase } from "@/lib/config"

// Unified data structure for department head dashboard
export interface DepartmentHeadDashboardData {
  stats: Array<{
    key: string
    title: string
    value: number | string
    icon?: string
  }>
  pendingCases: Array<{
    id?: string | number
    caseId: string
    title: string
    priority?: string
    received: string | Date | number
  }>
  meta?: Record<string, any>
}

const iconMap: Record<string, any> = {
  pending: Clock,
  pendingcases: Clock,
  investigators: Users,
  availableInvestigators: Users,
  available: Users,
  assigned: CheckCircle,
  assignedtoday: CheckCircle,
  assignedcases: CheckCircle,
}

export function DepartmentHeadDashboard() {
  const [role, setRole] = useState<string>("department_head")
  const [data, setData] = useState<DepartmentHeadDashboardData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    try {
      const stored = localStorage.getItem("user")
      if (stored) {
        const parsed = JSON.parse(stored)
        const storedRole = parsed?.role || localStorage.getItem("userRole")
        if (storedRole) setRole(String(storedRole))
      }
    } catch {/* ignore */}
  }, [])

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const token = typeof window !== "undefined" ? (localStorage.getItem("token") || localStorage.getItem("authToken")) : null
        const res = await fetch(withBase("/api/dashboard/department-head"), {
          method: "GET",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          cache: "no-store",
        })
        if (!res.ok) throw new Error(`Failed to load department head dashboard (${res.status})`)
        const raw = await res.json()
        const payload: any = raw?.data || raw?.dashboard || raw

        // Normalize stats
        let statsArray: DepartmentHeadDashboardData["stats"] = []
        if (Array.isArray(payload?.stats)) {
          statsArray = payload.stats.map((s: any, idx: number) => ({
            key: String(s.key || s.id || idx),
            title: s.title || s.name || s.label || `Stat ${idx + 1}`,
            value: s.value ?? s.count ?? s.total ?? 0,
            icon: s.icon || s.key || undefined,
          }))
        } else if (payload?.totals && typeof payload.totals === "object") {
          statsArray = Object.entries(payload.totals).map(([k, v]) => ({
            key: k,
            title: k
              .replace(/([A-Z])/g, " $1")
              .replace(/^./, (c) => c.toUpperCase())
              .replace(/_/g, " "),
            value: v as any,
            icon: k,
          }))
        }
        if (!statsArray.length) {
          const possible = [
            "pendingCases",
            "availableInvestigators",
            "casesAssignedToday",
            "openPendingCases",
            "unassignedCases",
          ]
          statsArray = possible
            .filter((k) => k in payload)
            .map((k) => ({
              key: k,
              title: k
                .replace(/([A-Z])/g, " $1")
                .replace(/^./, (c) => c.toUpperCase())
                .replace(/_/g, " "),
              value: payload[k],
              icon: k,
            }))
        }

        // Normalize pending cases
        let pendingCases: DepartmentHeadDashboardData["pendingCases"] = []
        const pc = payload?.pendingCases || payload?.cases || payload?.pending || []
        if (Array.isArray(pc)) {
          pendingCases = pc.map((c: any, idx: number) => ({
            id: c.id || idx,
            caseId: c.caseId || c.case_id || c.reference || c.code || `CASE-${idx + 1}`,
            title: c.title || c.name || c.subject || "Untitled Case",
            priority: c.priority || c.level || c.importance || undefined,
            received: c.received || c.receivedAt || c.createdAt || c.timestamp || new Date().toISOString(),
          }))
        }

        const normalized: DepartmentHeadDashboardData = {
          stats: statsArray,
          pendingCases,
          meta: payload?.meta,
        }
        if (!cancelled) setData(normalized)
      } catch (e: any) {
        if (!cancelled) setError(e.message || "Error loading dashboard data")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar userRole={role} />

      <div className="flex-1 md:ml-64">
        <div className="p-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Department Head Dashboard</h1>
            <p className="text-gray-600">Review cases and assign investigators.</p>
          </div>

          {loading && <p className="text-sm text-gray-500 mb-6">Loading dashboard...</p>}
          {error && !loading && <p className="text-sm text-red-600 mb-6">{error}</p>}

          {/* Stats Grid */}
          {data && !!data.stats.length && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {data.stats.map((stat) => {
                const IconComp = stat.icon ? iconMap[stat.icon.toLowerCase?.() || stat.icon] || Clock : Clock
                return (
                  <Card key={stat.key}>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                          <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                        </div>
                        <IconComp className="h-8 w-8 text-blue-500" />
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}

          {/* Pending Cases */}
          {data && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Activity className="mr-2 h-5 w-5" />
                  Pending Cases for Review
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!data.pendingCases.length && (
                  <p className="text-sm text-gray-500">No pending cases.</p>
                )}
                <div className="space-y-4">
                  {data.pendingCases.map((caseItem) => (
                    <div key={String(caseItem.id ?? caseItem.caseId)} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{caseItem.caseId}</p>
                        <p className="text-sm text-gray-600">{caseItem.title}</p>
                      </div>
                      <div className="flex items-center space-x-4">
                        {caseItem.priority && (
                          <span
                            className={`px-2 py-1 text-xs rounded-full ${
                              caseItem.priority.toLowerCase() === "high"
                                ? "bg-red-100 text-red-800"
                                : caseItem.priority.toLowerCase() === "medium"
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-green-100 text-green-800"
                            }`}
                          >
                            {caseItem.priority}
                          </span>
                        )}
                        <span className="text-xs text-gray-400">{String(caseItem.received)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
