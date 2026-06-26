"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Clock, RefreshCw, Search, User } from "lucide-react"

type DailyActivity = {
  id: number
  date: string
  derNumber: string | null
  investigatorId: number
  investigatorName: string
  activityDesc: string
  createdAt: string
  updatedAt: string
}

type ApiResponse = {
  dailyActivities?: DailyActivity[]
  count?: number
  [key: string]: unknown
}

function useAuthToken() {
  return useCallback((): string | null => {
    try {
      const raw = localStorage.getItem("user")
      const user = raw ? JSON.parse(raw) : null
      return (
        user?.token ||
        user?.access_token ||
        user?.accessToken ||
        user?.jwt ||
        localStorage.getItem("token") ||
        null
      )
    } catch {
      return localStorage.getItem("token")
    }
  }, [])
}

function formatDate(d?: string) {
  if (!d) return "-"
  try {
    const dt = new Date(d)
    return dt.toLocaleString()
  } catch {
    return d
  }
}

function truncate(text: string, len = 100) {
  if (!text) return ""
  return text.length > len ? text.slice(0, len) + "…" : text
}

export function DailyActivityList() {
  const getAuthToken = useAuthToken()

  const [activities, setActivities] = useState<DailyActivity[]>([])
  const [count, setCount] = useState<number | undefined>(undefined)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const [search, setSearch] = useState("")
  const [dateFilter, setDateFilter] = useState("") // yyyy-mm-dd

  const fetchActivities = useCallback(async (opts?: { silent?: boolean }) => {
    const silent = opts?.silent
    if (!silent) setLoading(true)
    setError(null)
    try {
      const base = (process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(/\/$/, "")
      const url = `${base}/api/daily_activities`

      const headers: Record<string, string> = { Accept: "application/json" }
      const token = getAuthToken()
      if (token) headers["Authorization"] = `Bearer ${token}`

      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 15000)
      const res = await fetch(url, { method: "GET", headers, signal: controller.signal })
      clearTimeout(timeout)

      if (!res.ok) {
        let msg = "Failed to load daily activities."
        switch (res.status) {
          case 400:
            msg = "Invalid request for daily activities."
            break
          case 401:
            msg = "Unauthorized. Please login again."
            break
          case 403:
            msg = "Forbidden. You do not have access to this resource."
            break
          case 404:
            msg = "Daily activities endpoint not found."
            break
          default:
            if (res.status >= 500) msg = "Server error while retrieving daily activities."
        }
        setActivities([])
        setCount(0)
        setError(msg)
        return
      }

      const raw: unknown = await res.json().catch(() => null)
      const data = (raw && typeof raw === "object" ? (raw as ApiResponse) : {})
      const list = Array.isArray(data.dailyActivities) ? data.dailyActivities : []
      setActivities(list)
      setCount(typeof data.count === "number" ? data.count : list.length)
    } catch (err) {
      if ((err as Error)?.name === "AbortError") setError("Request timed out while loading daily activities.")
      else setError("Unexpected error loading daily activities.")
      setActivities([])
      setCount(0)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [getAuthToken])

  useEffect(() => {
    fetchActivities()
  }, [fetchActivities])

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return activities.filter((a) => {
      const matchesTerm = term
        ? (
            a.investigatorName.toLowerCase().includes(term) ||
            (a.derNumber ? String(a.derNumber).toLowerCase().includes(term) : false) ||
            a.activityDesc.toLowerCase().includes(term)
          )
        : true
      const matchesDate = dateFilter ? a.date === dateFilter : true
      return matchesTerm && matchesDate
    })
  }, [activities, search, dateFilter])

  const onRefresh = async () => {
    setRefreshing(true)
    await fetchActivities({ silent: true })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Clock className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Daily Activity</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Investigator Daily Activity</CardTitle>
          <CardDescription>
            Review investigators' daily entries. Click a row to expand and see full details.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by investigator, DER number, or text..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
                disabled={loading}
              />
            </div>
            <Input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="sm:w-48"
              disabled={loading}
            />
            <Button variant="outline" onClick={onRefresh} disabled={loading || refreshing}>
              <RefreshCw className={`mr-2 h-4 w-4 ${refreshing || loading ? "animate-spin" : ""}`} />
              {refreshing || loading ? "Refreshing" : "Refresh"}
            </Button>
          </div>

          <div className="text-sm text-gray-500 mb-2">
            {loading ? "Loading daily activities..." : error ? error : `${filtered.length} of ${count ?? filtered.length} shown`}
          </div>

          {!loading && !error && filtered.length === 0 && (
            <div className="text-sm text-gray-500 py-6 text-center">No daily activities found.</div>
          )}

          {!!filtered.length && (
            <div className="rounded-md border divide-y">
              <Accordion type="multiple" className="w-full">
                {filtered.map((a) => (
                  <AccordionItem key={a.id} value={`activity-${a.id}`}>
                    <AccordionTrigger className="px-4">
                      <div className="flex w-full items-center justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="font-mono">{a.date}</Badge>
                            <span className="text-xs text-gray-500">DER:</span>
                            <span className="font-medium">{a.derNumber ?? "N/A"}</span>
                          </div>
                          <div className="mt-1 flex items-center gap-2 text-sm text-gray-700">
                            <User className="h-4 w-4 text-gray-400" />
                            <span className="truncate">{a.investigatorName}</span>
                          </div>
                        </div>
                        <div className="hidden sm:block text-sm text-gray-600 max-w-[40%] truncate">
                          {truncate(a.activityDesc, 80)}
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4">
                      <div className="bg-gray-50 rounded-md p-4 border">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <div className="text-xs font-medium text-gray-500">Activity ID</div>
                            <div className="text-sm">{a.id}</div>
                          </div>
                          <div>
                            <div className="text-xs font-medium text-gray-500">Investigator</div>
                            <div className="text-sm">{a.investigatorName} (ID: {a.investigatorId})</div>
                          </div>
                          <div>
                            <div className="text-xs font-medium text-gray-500">Date</div>
                            <div className="text-sm">{a.date}</div>
                          </div>
                          <div>
                            <div className="text-xs font-medium text-gray-500">DER Number</div>
                            <div className="text-sm">{a.derNumber ?? "—"}</div>
                          </div>
                        </div>
                        <div className="mt-4">
                          <div className="text-xs font-medium text-gray-500 mb-1">Description</div>
                          <div className="text-sm whitespace-pre-wrap">{a.activityDesc}</div>
                        </div>
                        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-gray-600">
                          <div>
                            <span className="text-xs font-medium text-gray-500">Created</span>
                            <div>{formatDate(a.createdAt)}</div>
                          </div>
                          <div>
                            <span className="text-xs font-medium text-gray-500">Updated</span>
                            <div>{formatDate(a.updatedAt)}</div>
                          </div>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default DailyActivityList
