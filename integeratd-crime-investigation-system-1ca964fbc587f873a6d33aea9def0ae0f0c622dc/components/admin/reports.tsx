"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DatePickerWithRange } from "@/components/ui/date-range-picker"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts"
import { FileText, Download, Calendar, TrendingUp } from "lucide-react"
import { useLanguage } from "@/lib/i18n"
import { withBase } from "@/lib/config"

interface ReportsData {
  totals: {
    totalCases: number
    resolvedCases: number
    pendingCases: number
    resolutionRate?: number
  }
  casesByDepartment: Array<{ name: string; cases: number; color?: string }>
  monthlyTrends: Array<{ month: string; cases: number; resolved: number }>
  userActivity?: any[]
  caseStatus?: Array<{ status: string; count: number }>
}

export function Reports() {
  const { t } = useLanguage()
  const [selectedReport, setSelectedReport] = useState("cases-by-department")
  const [dateRange, setDateRange] = useState<any>(null)
  const [data, setData] = useState<ReportsData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const defaultDeptColors = ["#8884d8", "#82ca9d", "#ffc658", "#ff7300", "#00bcd4", "#9c27b0", "#4caf50", "#ff9800"]

  useEffect(() => {
    let cancelled = false
    async function loadReports() {
      setLoading(true)
      setError(null)
      try {
        const token = typeof window !== "undefined" ? (localStorage.getItem("token") || localStorage.getItem("authToken")) : null
        const res = await fetch(withBase("/api/analytics"), {
          headers: {
            Accept: "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          cache: "no-store",
        })
        if (!res.ok) throw new Error(`Failed to load reports (${res.status})`)
        const raw = await res.json()
        const payload: any = raw?.data || raw?.report || raw
        const normalized: ReportsData = {
          totals: {
            totalCases: Number(payload?.totals?.totalCases ?? payload?.totalCases ?? 0),
            resolvedCases: Number(payload?.totals?.resolvedCases ?? payload?.resolvedCases ?? 0),
            pendingCases: Number(payload?.totals?.pendingCases ?? payload?.pendingCases ?? 0),
            resolutionRate: payload?.totals?.resolutionRate ?? payload?.resolutionRate,
          },
          casesByDepartment: Array.isArray(payload?.casesByDepartment)
            ? payload.casesByDepartment.map((d: any, idx: number) => ({
                name: d.name || d.department || `Dept ${idx + 1}`,
                cases: Number(d.cases ?? d.count ?? 0),
                color: d.color,
              }))
            : [],
          monthlyTrends: Array.isArray(payload?.monthlyTrends)
            ? payload.monthlyTrends.map((m: any) => ({
                month: m.month || m.label || "",
                cases: Number(m.cases ?? m.total ?? 0),
                resolved: Number(m.resolved ?? m.closed ?? 0),
              }))
            : [],
          userActivity: payload?.userActivity || payload?.activity,
          caseStatus: Array.isArray(payload?.caseStatus)
            ? payload.caseStatus.map((s: any) => ({ status: s.status || s.name, count: Number(s.count ?? s.total ?? 0) }))
            : undefined,
        }
        if (!normalized.totals.resolutionRate && normalized.totals.totalCases > 0) {
          normalized.totals.resolutionRate = Math.round(
            (normalized.totals.resolvedCases / normalized.totals.totalCases) * 100
          )
        }
        if (!cancelled) setData(normalized)
      } catch (e: any) {
        if (!cancelled) setError(e.message || "Error loading report data")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    loadReports()
    return () => {
      cancelled = true
    }
  }, [])

  const casesByDepartment = useMemo(
    () => (data?.casesByDepartment || []).map((d, idx) => ({ ...d, color: d.color || defaultDeptColors[idx % defaultDeptColors.length] })),
    [data]
  )
  const monthlyTrends = data?.monthlyTrends || []

  const handleExportReport = () => {
    let exportRows: any[] = []
    switch (selectedReport) {
      case "cases-by-department":
        exportRows = casesByDepartment
        break
      case "monthly-trends":
        exportRows = monthlyTrends
        break
      case "user-activity":
        exportRows = Array.isArray(data?.userActivity) ? data!.userActivity : []
        break
      case "case-status":
        exportRows = Array.isArray(data?.caseStatus) ? data!.caseStatus : []
        break
    }
    if (!exportRows.length) return
    const headers = Object.keys(exportRows[0])
    const csvContent = [headers.join(","), ...exportRows.map((row: any) => headers.map((h) => JSON.stringify(row[h] ?? "")).join(","))].join("\n")
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `${selectedReport}-report.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  function renderSelectedReport() {
    if (!data) return <p className="text-sm text-muted-foreground">No data loaded yet.</p>

    switch (selectedReport) {
      case "cases-by-department":
        return (
          <Card>
            <CardHeader>
              <CardTitle>Cases by Department</CardTitle>
            </CardHeader>
            <CardContent>
              {casesByDepartment.length === 0 && !loading && (
                <p className="text-sm text-gray-500">No data available.</p>
              )}
              {casesByDepartment.length > 0 && (
                <ResponsiveContainer width="100%" height={340}>
                  <PieChart>
                    <Pie
                      data={casesByDepartment}
                      cx="50%"
                      cy="50%"
                      outerRadius={110}
                      dataKey="cases"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {casesByDepartment.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        )
      case "monthly-trends":
        return (
          <Card>
            <CardHeader>
              <CardTitle>Monthly Case Trends</CardTitle>
            </CardHeader>
            <CardContent>
              {monthlyTrends.length === 0 && !loading && (
                <p className="text-sm text-gray-500">No data available.</p>
              )}
              {monthlyTrends.length > 0 && (
                <ResponsiveContainer width="100%" height={340}>
                  <BarChart data={monthlyTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="cases" fill="#8884d8" name="Total Cases" />
                    <Bar dataKey="resolved" fill="#82ca9d" name="Resolved Cases" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        )
      case "case-status": {
        const statusData = data.caseStatus || []
        return (
          <Card>
            <CardHeader>
              <CardTitle>Case Status Overview</CardTitle>
            </CardHeader>
            <CardContent>
              {statusData.length === 0 && !loading && (
                <p className="text-sm text-gray-500">No data available.</p>
              )}
              {statusData.length > 0 && (
                <ResponsiveContainer width="100%" height={340}>
                  <BarChart data={statusData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="status" interval={0} angle={-25} textAnchor="end" height={70} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#6366f1" name="Count" />
                  </BarChart>
                </ResponsiveContainer>
              )}
              {statusData.length > 0 && (
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left border-b">
                        <th className="py-1 pr-2">Status</th>
                        <th className="py-1 pr-2">Count</th>
                        <th className="py-1 pr-2">Percent</th>
                      </tr>
                    </thead>
                    <tbody>
                      {statusData.map((s: any) => {
                        const pct = data.totals.totalCases ? ((s.count / data.totals.totalCases) * 100).toFixed(1) : '0.0'
                        return (
                          <tr key={s.status} className="border-b last:border-b-0">
                            <td className="py-1 pr-2 font-medium">{s.status}</td>
                            <td className="py-1 pr-2">{s.count}</td>
                            <td className="py-1 pr-2">{pct}%</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        )
      }
      case "user-activity": {
        const activity = data.userActivity || []
        return (
          <Card>
            <CardHeader>
              <CardTitle>User Activity</CardTitle>
            </CardHeader>
            <CardContent>
              {activity.length === 0 && !loading && (
                <p className="text-sm text-gray-500">No activity data available.</p>
              )}
              {activity.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left border-b">
                        <th className="py-1 pr-2">User</th>
                        <th className="py-1 pr-2">Actions</th>
                        <th className="py-1 pr-2">Last Active</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activity.map((u: any, idx: number) => (
                        <tr key={idx} className="border-b last:border-b-0">
                          <td className="py-1 pr-2 font-medium">{u.user || '—'}</td>
                          <td className="py-1 pr-2">{u.actions}</td>
                          <td className="py-1 pr-2">{u.lastActive ? new Date(u.lastActive).toLocaleString() : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        )
      }
      default:
        return null
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Reports & Analytics</h1>
          <p className="text-gray-600">Generate and view system reports</p>
          {loading && <p className="text-sm text-blue-600">Loading data...</p>}
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
       {/* 
        <Button onClick={handleExportReport} disabled={loading || !data}>
          <Download className="mr-2 h-4 w-4" />
          Export Report
        </Button>
        */}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Cases</p>
                <p className="text-2xl font-bold">{data?.totals.totalCases ?? '-'}</p>
              </div>
              <FileText className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Resolved Cases</p>
                <p className="text-2xl font-bold">{data?.totals.resolvedCases ?? '-'}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Cases</p>
                <p className="text-2xl font-bold">{data?.totals.pendingCases ?? '-'}</p>
              </div>
              <Calendar className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Resolution Rate</p>
                <p className="text-2xl font-bold">{data?.totals.resolutionRate != null ? `${data.totals.resolutionRate}%` : '-'}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-4 mb-6">
        <Select value={selectedReport} onValueChange={setSelectedReport}>
          <SelectTrigger className="w-64">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="cases-by-department">Cases by Department</SelectItem>
            <SelectItem value="monthly-trends">Monthly Trends</SelectItem>
            <SelectItem value="user-activity">User Activity</SelectItem>
            <SelectItem value="case-status">Case Status Overview</SelectItem>
          </SelectContent>
        </Select>
        <DatePickerWithRange date={dateRange} setDate={setDateRange} />
      </div>

      <div className="grid grid-cols-1 gap-6">
        {renderSelectedReport()}
      </div>
    </div>
  )
}
