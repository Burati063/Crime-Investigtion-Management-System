"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useLanguage } from "@/lib/i18n"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Search, Eye, Clock, User } from "lucide-react"

interface AssignedCase {
  id: string
  crNumber: string
  derNumber: string
  title: string
  department: string
  crime: string
  investigator: string
  investigatorBadge: string
  assignedDate: string
  status: string
  priority: string
  dueDate: string
}

interface ApiCaseItem {
  id?: string | number
  crNumber?: string | number
  derNumber?: string | number
  title?: string
  department?: string
  crime?: string
  investigator?: string | null
  investigatorBadge?: string | null
  assignedDate?: string
  status?: string
  priority?: string
  dueDate?: string
  [key: string]: unknown
}

interface ApiCaseListResponse {
  cases?: ApiCaseItem[]
  count?: number
  [key: string]: unknown
}

export function PendingCases() {
  const { t } = useLanguage()
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [investigatorFilter, setInvestigatorFilter] = useState("all")
  const [assignedCases, setAssignedCases] = useState<AssignedCase[]>([])
  const [casesLoading, setCasesLoading] = useState<boolean>(false)
  const [casesError, setCasesError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState<boolean>(false)
  // View dialog state
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [viewCase, setViewCase] = useState<AssignedCase | null>(null)

  const getAuthToken = (): string | null => {
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
  }

  const normalizePriority = (p: string): string => {
    const v = p?.toLowerCase()
    if (["critical", "urgent"].includes(v)) return "Critical"
    if (v === "high") return "High"
    if (v === "medium") return "Medium"
    if (v === "low") return "Low"
    return p.charAt(0).toUpperCase() + p.slice(1)
  }

  const mapApiCase = (c: ApiCaseItem, idx: number): AssignedCase => {
    return {
      id: c.id != null ? String(c.id) : String(idx + 1),
      crNumber: c.crNumber != null ? String(c.crNumber) : `CR-${idx + 1}`,
      derNumber: c.derNumber != null ? String(c.derNumber) : `DER-${idx + 1}`,
      title: c.title || "Untitled Case",
      department: c.department || "",
      crime: c.crime || "",
      investigator: c.investigator || "Unassigned",
      investigatorBadge: c.investigatorBadge || "",
      assignedDate: c.assignedDate || "",
      status: c.status || "new",
      priority: c.priority ? normalizePriority(String(c.priority)) : "Medium",
      dueDate: c.dueDate || "",
    }
  }

  const fetchCases = useCallback(async (opts?: { silent?: boolean }) => {
    const silent = opts?.silent
    if (!silent) setCasesLoading(true)
    setCasesError(null)
    try {
      const base = (process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(/\/$/, "")
      const url = `${base}/api/cases/department-head/department-cases`
      const headers: Record<string, string> = { Accept: "application/json" }
      const token = getAuthToken()
      if (token) headers["Authorization"] = `Bearer ${token}`
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 15000)
      const res = await fetch(url, { method: "GET", headers, signal: controller.signal })
      clearTimeout(timeout)
      if (!res.ok) {
        let msg = "Failed to load cases."
        switch (res.status) {
          case 400:
            msg = "Invalid request for cases."
            break
          case 401:
            msg = "Unauthorized. Please login again."
            break
          case 403:
            msg = "Forbidden. You do not have access to these cases."
            break
          case 404:
            msg = "Cases endpoint not found."
            break
          default:
            if (res.status >= 500) msg = "Server error while retrieving cases."
        }
        console.error("Department Cases API error", { status: res.status, statusText: res.statusText })
        setAssignedCases([])
        setCasesError(msg)
        return
      }
      const raw: unknown = await res.json().catch(() => null)
      let list: ApiCaseItem[] = []
      if (raw && typeof raw === "object") {
        const obj = raw as ApiCaseListResponse
        if (Array.isArray(obj.cases)) list = obj.cases
      }
      const mapped = list.map(mapApiCase)
      setAssignedCases(mapped)
    } catch (err) {
      if ((err as Error)?.name === "AbortError") setCasesError("Request timed out while loading cases.")
      else setCasesError("Unexpected error loading cases.")
      setAssignedCases([])
    } finally {
      setCasesLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchCases()
  }, [fetchCases])

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchCases({ silent: true })
  }

  const filteredCases = useMemo(
    () =>
      assignedCases.filter((caseItem) => {
        const term = searchTerm.toLowerCase()
        const matchesSearch =
          caseItem.title.toLowerCase().includes(term) ||
          caseItem.crNumber.toLowerCase().includes(term) ||
            caseItem.derNumber.toLowerCase().includes(term) ||
          caseItem.investigator.toLowerCase().includes(term)
        const matchesStatus = statusFilter === "all" || caseItem.status === statusFilter
        const matchesInvestigator = investigatorFilter === "all" || caseItem.investigator === investigatorFilter
        return matchesSearch && matchesStatus && matchesInvestigator
      }),
    [assignedCases, searchTerm, statusFilter, investigatorFilter],
  )

  const getStatusBadge = (status: string) => {
    const statusColors = {
      "Initial Investigation": "bg-blue-100 text-blue-800",
      "In Progress": "bg-orange-100 text-orange-800",
      "Evidence Collection": "bg-purple-100 text-purple-800",
      "Report Pending": "bg-yellow-100 text-yellow-800",
      Completed: "bg-green-100 text-green-800",
    }
    return statusColors[status as keyof typeof statusColors] || "bg-gray-100 text-gray-800"
  }

  const getPriorityBadge = (priority: string) => {
    const priorityColors = {
      Critical: "bg-red-100 text-red-800",
      High: "bg-orange-100 text-orange-800",
      Medium: "bg-yellow-100 text-yellow-800",
      Low: "bg-green-100 text-green-800",
    }
    return priorityColors[priority as keyof typeof priorityColors] || "bg-gray-100 text-gray-800"
  }

  const uniqueInvestigators = useMemo(
    () => Array.from(new Set(assignedCases.map((c) => c.investigator).filter(Boolean))),
    [assignedCases],
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Clock className="h-6 w-6" />
        <h1 className="text-2xl font-bold">{t.departmentHead.pendingCases}</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t.departmentHead.assignedCases}</CardTitle>
          <CardDescription>{t.departmentHead.assignedCasesDesc}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder={t.common.searchPlaceholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                disabled={casesLoading}
              />
            </div>
            <Button variant="outline" onClick={handleRefresh} disabled={casesLoading || refreshing}>
              {refreshing || casesLoading ? (t.common.loading || "Loading...") : "Refresh"}
            </Button>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder={t.common.filterByStatus} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t.common.allStatuses}</SelectItem>
                <SelectItem value="Initial Investigation">{t.common.initialInvestigation}</SelectItem>
                <SelectItem value="In Progress">{t.common.inProgress}</SelectItem>
                <SelectItem value="Evidence Collection">{t.common.evidenceCollection}</SelectItem>
                <SelectItem value="Report Pending">{t.common.reportPending}</SelectItem>
                <SelectItem value="Completed">{t.common.completed}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={investigatorFilter} onValueChange={setInvestigatorFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder={t.common.filterByInvestigator} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t.common.allInvestigators}</SelectItem>
                {uniqueInvestigators.map((investigator) => (
                  <SelectItem key={investigator} value={investigator}>
                    {investigator}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t.common.crNumber}</TableHead>
                  <TableHead>{t.common.derNumber}</TableHead>
                  <TableHead>{t.common.title}</TableHead>
                  <TableHead>{t.common.investigator}</TableHead>
                  <TableHead>{t.common.status}</TableHead>
                  <TableHead>{t.common.priority}</TableHead>
                  <TableHead>{t.common.assignedDate}</TableHead>
                  <TableHead>{t.common.dueDate}</TableHead>
                  <TableHead>{t.common.actions}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {casesLoading && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-6 text-sm text-gray-500">
                      {t.common.loading || "Loading cases..."}
                    </TableCell>
                  </TableRow>
                )}
                {!casesLoading && casesError && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-6 text-sm text-red-600">
                      {casesError}
                      <Button variant="link" className="px-1" onClick={() => fetchCases({ silent: true })}>
                        Retry
                      </Button>
                    </TableCell>
                  </TableRow>
                )}
                {!casesLoading && !casesError && filteredCases.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-6 text-sm text-gray-500">
                      {t.common.noDataFound}
                    </TableCell>
                  </TableRow>
                )}
                {!casesLoading && !casesError && filteredCases.map((caseItem) => (
                  <TableRow key={caseItem.id}>
                    <TableCell className="font-medium">{caseItem.crNumber}</TableCell>
                    <TableCell>{caseItem.derNumber}</TableCell>
                    <TableCell>{caseItem.title}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-400" />
                        <div>
                          <p className="font-medium">{caseItem.investigator}</p>
                          <p className="text-sm text-gray-500">{caseItem.investigatorBadge}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusBadge(caseItem.status)}>{caseItem.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getPriorityBadge(caseItem.priority)}>{caseItem.priority}</Badge>
                    </TableCell>
                    <TableCell>{caseItem.assignedDate || '-'}</TableCell>
                    <TableCell>{caseItem.dueDate || '-'}</TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-1 bg-transparent"
                        onClick={() => { setViewCase(caseItem); setIsViewDialogOpen(true) }}
                      >
                        <Eye className="h-4 w-4" />
                        {t.common.view}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {/* Empty / error / loading handled in table body */}
        </CardContent>
      </Card>

      {/* View Case Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{t.common.caseDetails || 'Case Details'}</DialogTitle>
            <DialogDescription>{t.common.view || 'View'}: {'Read-only details of the selected case.'}</DialogDescription>
          </DialogHeader>
          {viewCase && (
            <div className="space-y-4">
              <Card className="border shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center justify-between">
                    <span>{viewCase.title}</span>
                    <Badge className={getPriorityBadge(viewCase.priority)}>{viewCase.priority}</Badge>
                  </CardTitle>
                  <CardDescription className="text-xs">CR: {viewCase.crNumber} | DER: {viewCase.derNumber}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-xs font-medium">Case ID</span>
                      <p className="text-gray-700 mt-0.5">{viewCase.id}</p>
                    </div>
                    <div>
                      <span className="text-xs font-medium">Priority</span>
                      <p className="mt-0.5"><Badge variant="outline" className="capitalize">{viewCase.priority}</Badge></p>
                    </div>
                    <div>
                      <span className="text-xs font-medium">{t.common.department}</span>
                      <p className="text-gray-700 mt-0.5">{viewCase.department || '-'}</p>
                    </div>
                    <div>
                      <span className="text-xs font-medium">{t.common.crime}</span>
                      <p className="text-gray-700 mt-0.5">{viewCase.crime || '-'}</p>
                    </div>
                    <div>
                      <span className="text-xs font-medium">{t.common.status}</span>
                      <p className="mt-0.5"><Badge variant="outline" className="capitalize">{viewCase.status}</Badge></p>
                    </div>
                    <div>
                      <span className="text-xs font-medium">{t.common.assignedDate}</span>
                      <p className="text-gray-700 mt-0.5">{viewCase.assignedDate || '-'}</p>
                    </div>
                    {viewCase.dueDate && (
                      <div>
                        <span className="text-xs font-medium">{t.common.dueDate}</span>
                        <p className="text-gray-700 mt-0.5">{viewCase.dueDate}</p>
                      </div>
                    )}
                    {viewCase.investigator && (
                      <div className="col-span-2">
                        <span className="text-xs font-medium">{t.common.investigator}</span>
                        <p className="text-gray-700 mt-0.5">{viewCase.investigator}{viewCase.investigatorBadge ? ` (${viewCase.investigatorBadge})` : ''}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>{t.common.close || 'Close'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
