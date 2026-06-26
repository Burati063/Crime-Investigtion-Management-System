"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Sidebar } from "@/components/layout/sidebar"
import { FileText, Clock, CheckCircle, Activity } from "lucide-react"
import { withBase } from "@/lib/config"

// Unified data structure for the Pre-Investigation dashboard
export interface PreInvestigationDashboardData {
  stats: Array<{
    key: string
    title: string
    value: number | string
    icon?: string // icon identifier (optional — mapped client side)
  }>
  recentActivities: Array<{
    id?: string | number
    action: string
    department?: string
    time: string | number | Date
  }>
  meta?: Record<string, any>
}

// Map optional string icon names from API to icon components
const iconMap: Record<string, any> = {
  cases: FileText,
  registered: FileText,
  today: FileText,
  month: CheckCircle,
  completed: CheckCircle,
  pending: Clock,
  assignment: Clock,
  activity: Activity,
}

export function PreInvestigationDashboard() {
  const [role, setRole] = useState<string>("pre_investigation")
  const [data, setData] = useState<PreInvestigationDashboardData | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Try to derive role (kept flexible for consistency with other dashboards)
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
        const res = await fetch(withBase("/api/dashboard/pre-investigation"), {
          method: "GET",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          cache: "no-store",
        })
        if (!res.ok) throw new Error(`Failed to load pre-investigation dashboard (${res.status})`)
        const raw = await res.json()
        const payload: any = raw?.data || raw?.dashboard || raw

        // Normalize stats: API may provide an array, an object of totals, or flat keys
        let statsArray: PreInvestigationDashboardData["stats"] = []
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

        // Fallback: expected semantic keys in payload
        if (!statsArray.length) {
          const possible = [
            "casesRegisteredToday",
            "totalCasesThisMonth",
            "pendingAssignment",
            "registeredToday",
            "pendingCases",
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

        // Normalize activities
        let activities: PreInvestigationDashboardData["recentActivities"] = []
        const act = payload?.recentActivities || payload?.activities || payload?.activity || []
        if (Array.isArray(act)) {
          activities = act.map((a: any, idx: number) => ({
            id: a.id || idx,
            action: a.action || a.event || a.description || "Activity",
            department: a.department || a.division || a.unit || undefined,
            time: a.time || a.timestamp || a.when || new Date().toISOString(),
          }))
        }

        const normalized: PreInvestigationDashboardData = {
          stats: statsArray,
          recentActivities: activities,
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
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar userRole={role} />

      <div className="flex-1 md:ml-64">
        <div className="p-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Pre Investigation Dashboard</h1>
            <p className="text-gray-600">Manage case registrations and assignments.</p>
          </div>

          {loading && <p className="text-sm text-gray-500 mb-6">Loading dashboard...</p>}
          {error && !loading && <p className="text-sm text-red-600 mb-6">{error}</p>}

            {/* Stats Grid */}
          {data && !!data.stats.length && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {data.stats.map((stat) => {
                const IconComp = stat.icon ? iconMap[stat.icon.toLowerCase?.() || stat.icon] || FileText : FileText
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

          {/* Recent Activity */}
          {data && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Activity className="mr-2 h-5 w-5" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!data.recentActivities.length && (
                  <p className="text-sm text-gray-500">No recent activity found.</p>
                )}
                <div className="space-y-4">
                  {data.recentActivities.map((activity) => (
                    <div key={String(activity.id ?? activity.time)} className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{activity.action}</p>
                        {activity.department && (
                          <p className="text-xs text-gray-500">{activity.department}</p>
                        )}
                      </div>
                      <span className="text-xs text-gray-400">{String(activity.time)}</span>
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
