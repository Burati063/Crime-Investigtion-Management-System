"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Sidebar } from "@/components/layout/sidebar"
import { Scale, CheckCircle, XCircle, Clock, Activity } from "lucide-react"
import { withBase } from "@/lib/config"

// Unified data structure for prosecutor dashboard
export interface ProsecutorDashboardData {
  stats: Array<{
    key: string
    title: string
    value: number | string
    icon?: string
  }>
  recentCases: Array<{
    id?: string | number
    caseId: string
    title: string
    status: string
    received: string | Date | number
  }>
  meta?: Record<string, any>
}

const iconMap: Record<string, any> = {
  active: Scale,
  activecases: Scale,
  accepted: CheckCircle,
  acceptedcases: CheckCircle,
  rejected: XCircle,
  rejectedcases: XCircle,
  modification: Clock,
  modificationrequests: Clock,
  pending: Clock,
}

export function ProsecutorDashboard() {
  const [role, setRole] = useState<string>("prosecutor")
  const [data, setData] = useState<ProsecutorDashboardData | null>(null)
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
        const res = await fetch(withBase("/api/dashboard/prosecutor"), {
          method: "GET",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          cache: "no-store",
        })
        if (!res.ok) throw new Error(`Failed to load prosecutor dashboard (${res.status})`)
        const raw = await res.json()
        const payload: any = raw?.data || raw?.dashboard || raw

        // Normalize stats
        let statsArray: ProsecutorDashboardData["stats"] = []
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
            "activeCases",
            "acceptedCases",
            "rejectedCases",
            "modificationRequests",
            "pendingReview",
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

        // Normalize recent cases
        let recentCases: ProsecutorDashboardData["recentCases"] = []
        const rc = payload?.recentCases || payload?.cases || payload?.recent || []
        if (Array.isArray(rc)) {
          recentCases = rc.map((c: any, idx: number) => ({
            id: c.id || idx,
            caseId: c.caseId || c.case_id || c.reference || c.code || `CASE-${idx + 1}`,
            title: c.title || c.name || c.subject || "Untitled Case",
            status: c.status || c.state || c.phase || "Unknown",
            received: c.received || c.receivedAt || c.createdAt || c.timestamp || new Date().toISOString(),
          }))
        }

        const normalized: ProsecutorDashboardData = {
          stats: statsArray,
          recentCases,
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
            <h1 className="text-3xl font-bold text-gray-900">Prosecutor Dashboard</h1>
            <p className="text-gray-600">Review cases and make prosecution decisions.</p>
          </div>

          {loading && <p className="text-sm text-gray-500 mb-6">Loading dashboard...</p>}
          {error && !loading && <p className="text-sm text-red-600 mb-6">{error}</p>}

          {/* Stats Grid */}
          {data && !!data.stats.length && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {data.stats.map((stat) => {
                const IconComp = stat.icon ? iconMap[stat.icon.toLowerCase?.() || stat.icon] || Scale : Scale
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

          {/* Recent Cases */}
          {data && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Activity className="mr-2 h-5 w-5" />
                  Recent Cases for Review
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!data.recentCases.length && (
                  <p className="text-sm text-gray-500">No recent cases.</p>
                )}
                <div className="space-y-4">
                  {data.recentCases.map((caseItem) => {
                    let badgeClasses = "bg-blue-100 text-blue-800"
                    const statusLc = caseItem.status.toLowerCase()
                    if (statusLc.includes("accept")) badgeClasses = "bg-green-100 text-green-800"
                    else if (statusLc.includes("reject")) badgeClasses = "bg-red-100 text-red-800"
                    else if (statusLc.includes("modification") || statusLc.includes("request")) badgeClasses = "bg-yellow-100 text-yellow-800"
                    return (
                      <div key={String(caseItem.id ?? caseItem.caseId)} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">{caseItem.caseId}</p>
                          <p className="text-sm text-gray-600">{caseItem.title}</p>
                        </div>
                        <div className="flex items-center space-x-4">
                          <span className={`px-2 py-1 text-xs rounded-full ${badgeClasses}`}>{caseItem.status}</span>
                          <span className="text-xs text-gray-400">{String(caseItem.received)}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
