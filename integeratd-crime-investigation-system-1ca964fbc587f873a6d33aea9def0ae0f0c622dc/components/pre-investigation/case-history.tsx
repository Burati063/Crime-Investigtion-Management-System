"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useLanguage } from "@/lib/i18n"
import { Search, Eye, FileText, RefreshCw, AlertCircle } from "lucide-react"
import { withBase } from "@/lib/config"

interface CaseRecord {
  crNumber: string
  derNumber: string
  title: string
  department: string | null
  crime: string
  status: string
  reportedDate: string | null
  reportedBy: string
}

export function CaseHistory() {
  const { t } = useLanguage()
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [departmentFilter, setDepartmentFilter] = useState("all")
  const [cases, setCases] = useState<CaseRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadCases = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null
      if (!token) {
        setError("Missing authentication token. Please sign in again.")
        setCases([])
        return
      }
      const res = await fetch(withBase("/api/cases/pre_investigation-cases"), {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
        cache: "no-store",
      })
      if (!res.ok) {
        if (res.status === 401) setError("Unauthorized. Please log in again.")
        else if (res.status === 404) setCases([])
        else {
          const txt = await res.text().catch(() => "")
          setError(txt || `Failed to load cases (status ${res.status}).`)
        }
        return
      }
      const data = await res.json().catch(() => null)

      // API may return either an array of cases directly OR an object: { cases: [...], count: number }
      const extracted = Array.isArray(data)
        ? data
        : (data && typeof data === "object" && Array.isArray((data as any).cases))
          ? (data as any).cases
          : null

      if (extracted) {
        // Sort newest first (by reportedDate) and coerce to CaseRecord
        const sorted = [...extracted].sort((a, b) => {
          const da = a.reportedDate ? Date.parse(a.reportedDate) : 0
          const db = b.reportedDate ? Date.parse(b.reportedDate) : 0
          return db - da
        })
        setCases(sorted as CaseRecord[])
      } else if (extracted === null) {
        // If format is object with count 0 or no cases array, treat as empty list silently
        const countIsZero = !!(data && typeof data === "object" && (data as any).count === 0)
        if (countIsZero) {
          setCases([])
        } else {
          setError("Unexpected response format from server.")
          setCases([])
        }
      } else {
        setCases([])
      }
    } catch (e) {
      setError("Network error while loading cases.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadCases() }, [loadCases])

  const filteredCases = cases.filter((caseItem) => {
    const q = searchTerm.toLowerCase()
    const matchesSearch =
      !q ||
      [caseItem.title, caseItem.crNumber, caseItem.derNumber, caseItem.crime, caseItem.reportedBy]
        .some(v => v?.toLowerCase().includes(q))
    const matchesStatus = statusFilter === "all" || caseItem.status === statusFilter
    const matchesDepartment = departmentFilter === "all" || caseItem.department === departmentFilter
    return matchesSearch && matchesStatus && matchesDepartment
  })

  const getStatusBadge = (status: string) => {
    const statusColors: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-800",
      assigned: "bg-blue-100 text-blue-800",
      "under investigation": "bg-orange-100 text-orange-800",
      completed: "bg-green-100 text-green-800",
      new: "bg-purple-100 text-purple-800",
    }
    const key = status.toLowerCase()
    return statusColors[key] || "bg-gray-100 text-gray-800"
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <FileText className="h-6 w-6" />
        <h1 className="text-2xl font-bold">{t.preInvestigation.caseHistory}</h1>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>{t.preInvestigation.caseHistoryTitle}</CardTitle>
            <CardDescription>{t.preInvestigation.caseHistoryDesc}</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={loadCases} disabled={loading} className="flex items-center gap-1">
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              {loading ? (t.common.loading || "Loading") : "Refresh"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 flex items-start gap-2 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder={t.common.searchPlaceholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder={t.common.filterByStatus} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t.common.allStatuses}</SelectItem>
                <SelectItem value="Pending">{t.common.pending}</SelectItem>
                <SelectItem value="Assigned">{t.common.assigned}</SelectItem>
                <SelectItem value="Under Investigation">{t.common.underInvestigation}</SelectItem>
                <SelectItem value="Completed">{t.common.completed}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder={t.common.filterByDepartment} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t.common.allDepartments}</SelectItem>
                <SelectItem value="Major Crime Division">{t.departments.majorCrime}</SelectItem>
                <SelectItem value="Specialized Crime Division">{t.departments.specializedCrime}</SelectItem>
                <SelectItem value="Financial Crime Division">{t.departments.financialCrime}</SelectItem>
                <SelectItem value="Anti-Corruption Division">{t.departments.antiCorruption}</SelectItem>
                <SelectItem value="Technology Crime Division">{t.departments.technologyCrime}</SelectItem>
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
                  <TableHead>{t.common.department}</TableHead>
                  <TableHead>{t.common.crime}</TableHead>
                  <TableHead>{t.common.status}</TableHead>
                  <TableHead>{t.common.registeredDate}</TableHead>
                  <TableHead>{t.common.registeredBy}</TableHead>
                  <TableHead>{t.common.actions}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && cases.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="py-8 text-center text-sm text-gray-500">
                      {t.common.loading || "Loading cases..."}
                    </TableCell>
                  </TableRow>
                )}
                {!loading && filteredCases.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="py-8 text-center text-sm text-gray-500">
                      {t.common.noDataFound}
                    </TableCell>
                  </TableRow>
                )}
                {filteredCases.map((caseItem) => (
                  <TableRow key={`${caseItem.crNumber}-${caseItem.derNumber}`} className="hover:bg-gray-50">
                    <TableCell className="font-medium">{caseItem.crNumber}</TableCell>
                    <TableCell>{caseItem.derNumber}</TableCell>
                    <TableCell>{caseItem.title}</TableCell>
                    <TableCell>{caseItem.department || <span className="text-gray-400">—</span>}</TableCell>
                    <TableCell>{caseItem.crime}</TableCell>
                    <TableCell>
                      <Badge className={getStatusBadge(caseItem.status)}>{caseItem.status}</Badge>
                    </TableCell>
                    <TableCell>
                      {caseItem.reportedDate ? new Date(caseItem.reportedDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : <span className="text-gray-400">—</span>}
                    </TableCell>
                    <TableCell>{caseItem.reportedBy}</TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm" className="flex items-center gap-1 bg-transparent">
                        <Eye className="h-4 w-4" />
                        {t.common.view}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Additional empty state already handled inside table */}
        </CardContent>
      </Card>
    </div>
  )
}
