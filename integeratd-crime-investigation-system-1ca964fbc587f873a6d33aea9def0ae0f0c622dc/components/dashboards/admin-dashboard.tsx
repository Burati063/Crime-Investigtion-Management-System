"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Sidebar } from "@/components/layout/sidebar"
import { Users, Building2, Clock, CheckCircle, Activity } from "lucide-react"
import { withBase } from "@/lib/config"

// Unified data structure for the admin dashboard response
// Adjust field names if backend returns different keys – flexible normalization below.
export interface AdminDashboardData {
  stats: Array<{
    key: string
    title: string
    value: number | string
    icon?: string // icon identifier (optional – mapping done client side)
  }>
  recentActivities: Array<{
    id?: string | number
    action: string
    user: string
    time: string | number | Date
  }>
  // Room for future expansion (e.g., charts, trends, alerts)
  meta?: Record<string, any>
}

// Map optional string icon names from API to actual icon components
const iconMap: Record<string, any> = {
  users: Users,
  cases: Building2,
  pending: Clock,
  completed: CheckCircle,
  activity: Activity,
}

export function AdminDashboard() {
  const [displayName, setDisplayName] = useState<string>("")
  const [role, setRole] = useState<string | null>(null)

  useEffect(() => {
    try {
      const stored = localStorage.getItem("user")
      const parsed = stored ? JSON.parse(stored) : null
      const first = parsed?.first_name || parsed?.firstName || ""
      const last = parsed?.last_name || parsed?.lastName || ""
      const name = `${first} ${last}`.trim() || parsed?.username || parsed?.email || ""
      if (name) setDisplayName(name)
      const storedRole = parsed?.role || localStorage.getItem("userRole")
      if (storedRole) setRole(String(storedRole))
    } catch {
      // ignore parsing/storage errors
    }
  }, [])

  const [data, setData] = useState<AdminDashboardData | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const token = typeof window !== "undefined" ? (localStorage.getItem("token") || localStorage.getItem("authToken")) : null
        const res = await fetch(withBase("/api/dashboard/admin"), {
          method: "GET",
            headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          cache: "no-store",
        })
        if (!res.ok) throw new Error(`Failed to load admin dashboard (${res.status})`)
        const raw = await res.json()
        const payload: any = raw?.data || raw?.dashboard || raw
        // Normalize stats
        let statsArray: AdminDashboardData["stats"] = []
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
        // Fallback if backend returns flat numbers
        if (!statsArray.length) {
          const possible = ["totalCases", "activeUsers", "pendingReviews", "completedCases"]
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
        let activities: AdminDashboardData["recentActivities"] = []
        const act = payload?.recentActivities || payload?.activities || payload?.activity || []
        if (Array.isArray(act)) {
          activities = act.map((a: any, idx: number) => ({
            id: a.id || idx,
            action: a.action || a.event || a.description || "Activity",
            user: a.user || a.actor || a.performedBy || "System",
            time: a.time || a.timestamp || a.when || new Date().toISOString(),
          }))
        }

        const normalized: AdminDashboardData = {
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
      <Sidebar userRole={role ?? "admin"} />

      <div className="flex-1 md:ml-64">
        <div className="p-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="text-gray-600">{`Welcome back${displayName ? ", " + displayName : ""}! Here's what's happening in your system.`}</p>
          </div>

          {/* Loading / Error States */}
          {loading && <p className="text-sm text-gray-500 mb-6">Loading dashboard...</p>}
          {error && !loading && (
            <p className="text-sm text-red-600 mb-6">{error}</p>
          )}

          {/* Stats Grid */}
          {data && !!data.stats.length && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {data.stats.map((stat) => {
                const IconComp = stat.icon ? iconMap[stat.icon.toLowerCase?.() || stat.icon] || Building2 : Building2
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
                    <div key={activity.id ?? activity.time} className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{activity.action}</p>
                        <p className="text-xs text-gray-500">by {activity.user}</p>
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
