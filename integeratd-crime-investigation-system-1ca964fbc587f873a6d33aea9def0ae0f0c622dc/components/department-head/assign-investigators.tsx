"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useLanguage } from "@/lib/i18n"
import { Search, UserPlus, Eye } from "lucide-react"

interface CaseRecord {
  id: string
  crNumber: string
  derNumber: string
  title: string
  department: string
  crime: string
  status: string
  registeredDate: string // mapped from assignedDate or creation date
  priority: string
  dueDate?: string
  investigator?: string | null
  investigatorBadge?: string | null
}

interface Investigator {
  id: string
  name: string
  badge: string
  department: string
  specialization: string
  currentCases: number
  maxCases: number
  status: string
}

export function AssignInvestigators() {
  const { t } = useLanguage()
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCase, setSelectedCase] = useState<CaseRecord | null>(null)
  const [selectedInvestigator, setSelectedInvestigator] = useState("")
  const [assignmentNote, setAssignmentNote] = useState("")
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false)

  // Dynamic cases state
  const [cases, setCases] = useState<CaseRecord[]>([])
  const [casesLoading, setCasesLoading] = useState<boolean>(false)
  const [casesError, setCasesError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState<boolean>(false)

  // Investigator loading state
  const [investigators, setInvestigators] = useState<Investigator[]>([])
  const [investigatorsLoading, setInvestigatorsLoading] = useState<boolean>(false)
  const [investigatorsError, setInvestigatorsError] = useState<string | null>(null)

  // Assignment state
  const [assignSubmitting, setAssignSubmitting] = useState<boolean>(false)
  const [assignError, setAssignError] = useState<string | null>(null)
  const [assignSuccess, setAssignSuccess] = useState<string | null>(null)

  // View case dialog state
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [viewCase, setViewCase] = useState<CaseRecord | null>(null)

  // Helper to retrieve token robustly (mirrors pattern in other components)
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

  interface ApiCaseItem {
    id?: string | number
    crNumber?: string | number
    derNumber?: string | number
    title?: string
    department?: string
    crime?: string
    status?: string
    assignedDate?: string
    dueDate?: string
    priority?: string
    investigator?: string | null
    investigatorBadge?: string | null
    // allow unknown extras
    [key: string]: unknown
  }

  interface ApiCaseListResponse {
    cases?: ApiCaseItem[]
    count?: number
    [key: string]: unknown
  }

  const normalizePriority = (p: string): string => {
    const v = p?.toLowerCase()
    if (["critical", "urgent"].includes(v)) return "Critical"
    if (v === "high") return "High"
    if (v === "medium") return "Medium"
    if (v === "low") return "Low"
    // Title-case fallback
    return p.charAt(0).toUpperCase() + p.slice(1)
  }

  const mapApiCase = (c: ApiCaseItem, idx: number): CaseRecord => {
    return {
      id: c.id != null ? String(c.id) : String(idx + 1),
      crNumber: c.crNumber != null ? String(c.crNumber) : `CR-${idx + 1}`,
      derNumber: c.derNumber != null ? String(c.derNumber) : `DER-${idx + 1}`,
      title: c.title || "Untitled Case",
      department: c.department || "",
      crime: c.crime || "",
      status: c.status || "new",
      registeredDate: c.assignedDate || "", // may be empty if not yet assigned
      priority: c.priority ? normalizePriority(String(c.priority)) : "Medium",
      dueDate: c.dueDate,
      investigator: c.investigator || null,
      investigatorBadge: c.investigatorBadge || null,
    }
  }

  const fetchCases = useCallback(async (opts?: { silent?: boolean }) => {
    const silent = opts?.silent
    if (!silent) setCasesLoading(true)
    setCasesError(null)
    try {
      const base = (process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(/\/$/, "")
      const url = `${base}/api/cases/department-head/new-or-rejected-cases`
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
        console.error("Cases API error", { url, status: res.status, statusText: res.statusText, hasToken: !!token })
        setCases([])
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
      setCases(mapped)
    } catch (err) {
      if ((err as Error)?.name === "AbortError") {
        setCasesError("Request timed out while loading cases.")
      } else {
        setCasesError("Unexpected error loading cases.")
      }
      setCases([])
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

  interface ApiInvestigatorItem {
    id?: string | number
    userId?: string | number
    name?: string
    fullName?: string
    first_name?: string
    last_name?: string
    badge?: string
    badgeNumber?: string
    badge_number?: string
    department?: string
    departmentName?: string
    specialization?: string | null
    currentCases?: number | string
    maxCases?: number | string
    status?: string
    [key: string]: unknown
  }

  const mapApiInvestigator = (d: ApiInvestigatorItem, idx: number): Investigator => {
    const nameParts: string[] = []
    if (d.first_name) nameParts.push(String(d.first_name))
    if (d.last_name) nameParts.push(String(d.last_name))
    const composite = nameParts.join(" ")
    const rawName = d.fullName || d.name || composite || `Investigator ${idx + 1}`
    const rawCurrent = typeof d.currentCases === "string" ? parseInt(d.currentCases) : d.currentCases
    const rawMax = typeof d.maxCases === "string" ? parseInt(d.maxCases) : d.maxCases
    return {
      id: d.id != null ? String(d.id) : d.userId != null ? String(d.userId) : String(idx + 1),
      name: rawName,
      badge: (d.badge || d.badgeNumber || d.badge_number || "").toString(),
      department: d.departmentName || d.department || "",
      specialization: (d.specialization as string) || "",
      currentCases: Number.isFinite(rawCurrent as number) ? Number(rawCurrent) : 0,
      maxCases: Number.isFinite(rawMax as number) ? Number(rawMax) : 999,
      status: d.status || "Available",
    }
  }

  const fetchInvestigators = useCallback(async () => {
    setInvestigatorsError(null)
    setInvestigatorsLoading(true)
    try {
      const base = (process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(/\/$/, "")
      const url = `${base}/api/users/all_investigators`
      const headers: Record<string, string> = { Accept: "application/json" }
      const token = getAuthToken()
      if (token) headers["Authorization"] = `Bearer ${token}`
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 15000)
      const res = await fetch(url, { method: "GET", headers, signal: controller.signal })
      clearTimeout(timeout)
      if (!res.ok) {
        let msg = "Failed to load investigators."
        if (res.status === 401) msg = "Unauthorized. Please login again."
        else if (res.status === 403) msg = "Forbidden. Cannot load investigators."
        else if (res.status === 404) msg = "Investigators endpoint not found."
        else if (res.status >= 500) msg = "Server error while loading investigators."
        console.error("Investigators API error", { status: res.status, statusText: res.statusText })
        setInvestigators([])
        setInvestigatorsError(msg)
        return
      }
      const raw: unknown = await res.json().catch(() => null)
      let list: ApiInvestigatorItem[] = []
      if (Array.isArray(raw)) list = raw
      else if (raw && typeof raw === "object") {
        const obj = raw as Record<string, unknown>
        // try common container keys
        const maybe = ["investigators", "users", "data"].map((k) => obj[k])
        const arr = maybe.find((v) => Array.isArray(v)) as unknown[] | undefined
        if (arr) list = arr as ApiInvestigatorItem[]
      }
      const mapped = list.map(mapApiInvestigator)
      setInvestigators(mapped)
    } catch (err) {
      if ((err as Error)?.name === "AbortError") setInvestigatorsError("Loading investigators timed out.")
      else setInvestigatorsError("Unexpected error loading investigators.")
      setInvestigators([])
    } finally {
      setInvestigatorsLoading(false)
    }
  }, [])

  const filteredCases = cases.filter(
    (caseItem) =>
      caseItem.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      caseItem.crNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      caseItem.derNumber.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const getAvailableInvestigators = (caseItem: CaseRecord) => {
    // Show all investigators; optionally prioritize by matching department
    if (!investigators.length) return []
    const list = investigators.slice()
    // sort: matching department first, then by current load asc
    list.sort((a, b) => {
      const deptA = a.department === caseItem.department ? 0 : 1
      const deptB = b.department === caseItem.department ? 0 : 1
      if (deptA !== deptB) return deptA - deptB
      return a.currentCases - b.currentCases
    })
    return list
  }

  const getPriorityBadge = (priority: string) => {
    const p = priority.charAt(0).toUpperCase() + priority.slice(1).toLowerCase()
    const priorityColors: Record<string, string> = {
      Critical: "bg-red-100 text-red-800",
      High: "bg-orange-100 text-orange-800",
      Medium: "bg-yellow-100 text-yellow-800",
      Low: "bg-green-100 text-green-800",
    }
    return priorityColors[p] || "bg-gray-100 text-gray-800"
  }

  const handleAssignCase = async () => {
    if (!selectedCase) {
      setAssignError("No case selected.")
      return
    }
    setAssignError(null)
    setAssignSuccess(null)
    const note = assignmentNote.trim()
    if (!selectedInvestigator) {
      setAssignError("Please select an investigator.")
      return
    }
    if (!note) {
      setAssignError("Assignment note is required.")
      return
    }
    if (note.length < 3) {
      setAssignError("Note must be at least 3 characters.")
      return
    }
    try {
      setAssignSubmitting(true)
      const base = (process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(/\/$/, "")
      const url = `${base}/api/cases/department_head/assign_investigator`
      const token = getAuthToken()
      const payload = {
        case_id: selectedCase.id,
        investigator_id: selectedInvestigator,
        message: note,
      }
      if (process.env.NODE_ENV !== "production") console.debug("Assign payload (message)", payload)
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        let msg = "Failed to assign case."
        if (res.status === 400) msg = "Invalid assignment request."
        else if (res.status === 401) msg = "Unauthorized. Please login again."
        else if (res.status === 403) msg = "Forbidden. You cannot assign this case."
        else if (res.status === 404) msg = "Assignment endpoint not found."
        else if (res.status >= 500) msg = "Server error during assignment."
        throw new Error(msg)
      }
      await res.json().catch(() => null)
      setAssignSuccess("Case assigned successfully.")
      // Refresh case list so assigned case is updated/removed
      fetchCases({ silent: true })
      // Reset fields after short delay
      setTimeout(() => {
        setIsAssignDialogOpen(false)
        setSelectedCase(null)
        setSelectedInvestigator("")
        setAssignmentNote("")
        setAssignSuccess(null)
      }, 800)
    } catch (err) {
      setAssignError(err instanceof Error ? err.message : "Unknown error assigning case")
    } finally {
      setAssignSubmitting(false)
    }
  }

  const openAssignDialog = (caseItem: CaseRecord) => {
    setSelectedCase(caseItem)
    setIsAssignDialogOpen(true)
    // Fetch investigators when opening dialog
    fetchInvestigators()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <UserPlus className="h-6 w-6" />
        <h1 className="text-2xl font-bold">{t.departmentHead.assignInvestigators}</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t.departmentHead.pendingAssignment}</CardTitle>
          <CardDescription>{t.departmentHead.pendingAssignmentDesc}</CardDescription>
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
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleRefresh} disabled={casesLoading || refreshing}>
                {refreshing || casesLoading ? (t.common.loading || "Loading...") : "Refresh"}
              </Button>
            </div>
          </div>

          {casesError && (
            <div className="mb-4 text-sm text-red-600">
              {casesError}
              <Button variant="link" className="px-1" onClick={() => fetchCases({ silent: true })}>
                {"Retry"}
              </Button>
            </div>
          )}

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t.common.crNumber}</TableHead>
                  <TableHead>{t.common.derNumber}</TableHead>
                  <TableHead>{t.common.title}</TableHead>
                  <TableHead>{t.common.department}</TableHead>
                  <TableHead>{t.common.crime}</TableHead>
                  <TableHead>{t.common.priority}</TableHead>
                  <TableHead>{t.common.registeredDate}</TableHead>
                  <TableHead>{t.common.actions}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {casesLoading && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-6 text-sm text-gray-500">
                      {t.common.loading || "Loading cases..."}
                    </TableCell>
                  </TableRow>
                )}
                {!casesLoading && filteredCases.length === 0 && !casesError && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-6 text-sm text-gray-500">
                      {t.common.noDataFound}
                    </TableCell>
                  </TableRow>
                )}
                {!casesLoading && filteredCases.map((caseItem) => (
                  <TableRow key={caseItem.id}>
                    <TableCell className="font-medium">{caseItem.crNumber}</TableCell>
                    <TableCell>{caseItem.derNumber}</TableCell>
                    <TableCell>{caseItem.title}</TableCell>
                    <TableCell>{caseItem.department}</TableCell>
                    <TableCell>{caseItem.crime}</TableCell>
                    <TableCell>
                      <Badge className={getPriorityBadge(caseItem.priority)}>{caseItem.priority}</Badge>
                    </TableCell>
                    <TableCell>{caseItem.registeredDate || "-"}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex items-center gap-1 bg-transparent"
                          onClick={() => { setViewCase(caseItem); setIsViewDialogOpen(true) }}
                        >
                          <Eye className="h-4 w-4" />
                          {t.common.view}
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => openAssignDialog(caseItem)}
                          className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700"
                          disabled={!caseItem.department}
                        >
                          <UserPlus className="h-4 w-4" />
                          {t.common.assign}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {/* Additional empty state already handled in table body */}
        </CardContent>
      </Card>

      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t.departmentHead.assignInvestigator}</DialogTitle>
            <DialogDescription>{t.departmentHead.assignInvestigatorDesc}</DialogDescription>
          </DialogHeader>

          {selectedCase && (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">{t.common.caseDetails}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium">{t.common.crNumber}</Label>
                      <p className="text-sm text-gray-600">{selectedCase.crNumber}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">{t.common.derNumber}</Label>
                      <p className="text-sm text-gray-600">{selectedCase.derNumber}</p>
                    </div>
                    <div className="col-span-2">
                      <Label className="text-sm font-medium">{t.common.title}</Label>
                      <p className="text-sm text-gray-600">{selectedCase.title}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">{t.common.department}</Label>
                      <p className="text-sm text-gray-600">{selectedCase.department}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">{t.common.crime}</Label>
                      <p className="text-sm text-gray-600">{selectedCase.crime}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="investigator">{t.departmentHead.selectInvestigator}</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2"
                    onClick={fetchInvestigators}
                    disabled={investigatorsLoading}
                  >
                    {investigatorsLoading ? (t.common.loading || "…") : "Reload"}
                  </Button>
                </div>
                <Select
                  value={selectedInvestigator}
                  onValueChange={(v) => {
                    setSelectedInvestigator(v)
                  }}
                  disabled={investigatorsLoading || !!investigatorsError || !investigators.length}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        investigatorsLoading
                          ? (t.common.loading || "Loading investigators…")
                          : investigatorsError
                            ? "Failed to load investigators"
                            : !investigators.length
                              ? "No investigators found"
                              : t.departmentHead.selectInvestigatorPlaceholder
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {investigatorsLoading && (
                      <div className="px-2 py-2 text-sm text-gray-500">{t.common.loading || "Loading..."}</div>
                    )}
                    {investigatorsError && (
                      <div className="px-2 py-2 text-sm text-red-600">{investigatorsError}</div>
                    )}
                    {!investigatorsLoading && !investigatorsError && !investigators.length && (
                      <div className="px-2 py-2 text-sm text-gray-500">No investigators available</div>
                    )}
                    {!investigatorsLoading && !investigatorsError &&
                      getAvailableInvestigators(selectedCase).map((investigator) => (
                        <SelectItem key={investigator.id} value={investigator.id}>
                          <div className="flex items-center justify-between w-full">
                            <span>
                              {investigator.name}
                              {investigator.badge ? ` (${investigator.badge})` : ""}
                            </span>
                            <span className="text-xs text-gray-500 ml-2 whitespace-nowrap">
                              {investigator.currentCases}/{investigator.maxCases} cases
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                {investigatorsError && (
                  <p className="text-xs text-red-600">{investigatorsError}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="note">{t.departmentHead.assignmentNote}</Label>
                <Textarea
                  id="note"
                  placeholder={t.departmentHead.assignmentNotePlaceholder}
                  value={assignmentNote}
                  onChange={(e) => setAssignmentNote(e.target.value)}
                  rows={3}
                />
                {assignError && <p className="text-xs text-red-600">{assignError}</p>}
                {assignSuccess && <p className="text-xs text-green-600">{assignSuccess}</p>}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAssignDialogOpen(false)}>
              {t.common.cancel}
            </Button>
            <Button
              onClick={handleAssignCase}
              disabled={assignSubmitting || !selectedInvestigator || !assignmentNote.trim()}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {assignSubmitting ? (t.common.loading || "Assigning...") : t.common.assign}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Case Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{t.common.caseDetails || 'Case Information'}</DialogTitle>
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
                      <Label className="text-xs font-medium">{t.common.department}</Label>
                      <p className="text-gray-700 mt-0.5">{viewCase.department || '-'}</p>
                    </div>
                    <div>
                      <Label className="text-xs font-medium">{t.common.crime}</Label>
                      <p className="text-gray-700 mt-0.5">{viewCase.crime || '-'}</p>
                    </div>
                    <div>
                      <Label className="text-xs font-medium">{t.common.status}</Label>
                      <p className="mt-0.5"><Badge variant="outline" className="capitalize">{viewCase.status}</Badge></p>
                    </div>
                    <div>
                      <Label className="text-xs font-medium">{t.common.registeredDate}</Label>
                      <p className="text-gray-700 mt-0.5">{viewCase.registeredDate || '-'}</p>
                    </div>
                    {viewCase.dueDate && (
                      <div>
                        <Label className="text-xs font-medium">{t.common.dueDate}</Label>
                        <p className="text-gray-700 mt-0.5">{viewCase.dueDate}</p>
                      </div>
                    )}
                    {viewCase.investigator && (
                      <div className="col-span-2">
                        <Label className="text-xs font-medium">{t.common.investigator}</Label>
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
