"use client"

import React, { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Search, Eye, CheckCircle, XCircle, Edit, Calendar, User } from "lucide-react"
import { useLanguage } from "@/lib/i18n"
import { withBase } from "@/lib/config"

interface CaseDecision {
  id: string
  crNumber: string
  derNumber: string
  title: string
  decision: "request_reinvestigation" | "accepted_by_prosecutor" | "rejected_by_prosecutor"
  decisionDate: string
  reviewedBy: string
  investigator: string
  department: string
  priority: "High" | "Medium" | "Low"
  reviewNote: string
  summary: string
}

export function CaseDecisions() {
  const { t } = useLanguage()
  const [searchTerm, setSearchTerm] = useState("")
  const [decisionFilter, setDecisionFilter] = useState("all")
  const [dateFilter, setDateFilter] = useState("all")
  const [selectedCase, setSelectedCase] = useState<CaseDecision | null>(null)
  const [decisions, setDecisions] = useState<CaseDecision[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  // Decision meta helpers (labels, colors, icons)
  const decisionMeta: Record<CaseDecision["decision"], { label: string; color: string; icon: React.ReactNode }> = {
    accepted_by_prosecutor: {
      label: t.prosecutor.acceptedCases || t.prosecutor.accept || "Accepted",
      color: "bg-green-100 text-green-800",
      icon: <CheckCircle className="h-4 w-4" />,
    },
    rejected_by_prosecutor: {
      label: t.prosecutor.rejectedCases || t.prosecutor.reject || "Rejected",
      color: "bg-red-100 text-red-800",
      icon: <XCircle className="h-4 w-4" />,
    },
    request_reinvestigation: {
      label: t.prosecutor.modificationRequested || t.prosecutor.requestModification || "Modification Requested",
      color: "bg-yellow-100 text-yellow-800",
      icon: <Edit className="h-4 w-4" />,
    },
  }

  function getDecisionColor(decision: CaseDecision["decision"]) {
    return decisionMeta[decision]?.color || "bg-gray-100 text-gray-800"
  }
  function getDecisionIcon(decision: CaseDecision["decision"]) {
    return decisionMeta[decision]?.icon || null
  }
  function getDecisionLabel(decision: CaseDecision["decision"]) {
    return decisionMeta[decision]?.label || decision
  }

  useEffect(() => {
    let cancelled = false
    async function fetchDecisions() {
      setLoading(true)
      setError(null)
      try {
        const token = typeof window !== "undefined" ? localStorage.getItem("token") || localStorage.getItem("authToken") : null
        const res = await fetch(withBase("/api/cases/prosecutor/decisions"), {
          headers: {
            Accept: "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        })
        if (!res.ok) {
          throw new Error(`Failed to load decisions (${res.status})`)
        }
        const data = await res.json()
        const list: any[] = Array.isArray(data)
          ? data
          : data.decisions || data.items || data.data || data.results || []

        const normalized: CaseDecision[] = list.map((item, idx) => {
          const rawDecision = (item.decision || item.status || "") as string
          // Map potential backend variants to our enum
            const mappedDecision: CaseDecision["decision"] =
              rawDecision === "accepted_by_prosecutor" || rawDecision === "accepted" || rawDecision === "accept"
                ? "accepted_by_prosecutor"
                : rawDecision === "rejected_by_prosecutor" || rawDecision === "rejected" || rawDecision === "reject"
                ? "rejected_by_prosecutor"
                : "request_reinvestigation"

          return {
            id: String(item.id ?? item.caseId ?? `${idx}-${Date.now()}`),
            crNumber: String(item.crNumber ?? item.cr_number ?? item.cr ?? ""),
            derNumber: String(item.derNumber ?? item.der_number ?? item.der ?? ""),
            title: item.title || item.caseTitle || "Untitled Case",
            decision: mappedDecision,
            decisionDate: item.decisionDate || item.decision_date || item.updatedAt || new Date().toISOString().slice(0, 10),
            reviewedBy: item.reviewedBy || item.reviewed_by || item.prosecutorName || "",
            investigator: item.investigator || item.investigatorName || item.assignedInvestigator || "",
            department: item.department || item.departmentName || "",
            priority: ["High", "Medium", "Low"].includes(item.priority) ? item.priority : "Low",
            reviewNote: item.reviewNote || item.review_note || item.note || item.comment || "",
            summary: item.summary || item.caseSummary || item.description || "",
          }
        })
        if (!cancelled) setDecisions(normalized)
      } catch (e: any) {
        if (!cancelled) setError(e.message || "Error loading decisions")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchDecisions()
    return () => {
      cancelled = true
    }
  }, [])

  const filteredDecisions = decisions.filter((decision) => {
    const matchesSearch =
      decision.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      decision.crNumber.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesDecision = decisionFilter === "all" || decision.decision === decisionFilter

    let matchesDate = true
    if (dateFilter !== "all") {
      const decisionDate = new Date(decision.decisionDate)
      const today = new Date()
      const daysDiff = Math.floor((today.getTime() - decisionDate.getTime()) / (1000 * 60 * 60 * 24))

      switch (dateFilter) {
        case "today":
          matchesDate = daysDiff === 0
          break
        case "week":
          matchesDate = daysDiff <= 7
          break
        case "month":
          matchesDate = daysDiff <= 30
          break
      }
    }

    return matchesSearch && matchesDecision && matchesDate
  })

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "High":
        return "bg-red-100 text-red-800"
      case "Medium":
        return "bg-yellow-100 text-yellow-800"
      case "Low":
        return "bg-green-100 text-green-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }
  // getDecisionColor & getDecisionIcon now handled via helpers using enum values

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t.prosecutor.caseDecisions}</h1>
          <p className="text-gray-600">{t.prosecutor.caseDecisionsDescription}</p>
        </div>
        <div className="text-sm text-gray-600">Total Decisions: {loading ? "..." : decisions.length}</div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{t.prosecutor.acceptedCases || t.prosecutor.accept}</p>
                <p className="text-2xl font-bold text-green-600">
                  {decisions.filter((d) => d.decision === "accepted_by_prosecutor").length}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{t.prosecutor.rejectedCases || t.prosecutor.reject}</p>
                <p className="text-2xl font-bold text-red-600">
                  {decisions.filter((d) => d.decision === "rejected_by_prosecutor").length}
                </p>
              </div>
              <XCircle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{t.prosecutor.modificationRequested || t.prosecutor.requestModification}</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {decisions.filter((d) => d.decision === "request_reinvestigation").length}
                </p>
              </div>
              <Edit className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">This Week</p>
                <p className="text-2xl font-bold text-blue-600">
                  {
                    decisions.filter((d) => {
                      const decisionDate = new Date(d.decisionDate)
                      const today = new Date()
                      const daysDiff = Math.floor((today.getTime() - decisionDate.getTime()) / (1000 * 60 * 60 * 24))
                      return daysDiff <= 7
                    }).length
                  }
                </p>
              </div>
              <Calendar className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder={t.common.search}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={decisionFilter} onValueChange={setDecisionFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder={t.caseReview?.caseDecisions || t.prosecutor.caseDecisions} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t.caseReview?.caseDecisions || "All Decisions"}</SelectItem>
                <SelectItem value="accepted_by_prosecutor">{t.prosecutor.acceptedCases || t.prosecutor.accept}</SelectItem>
                <SelectItem value="rejected_by_prosecutor">{t.prosecutor.rejectedCases || t.prosecutor.reject}</SelectItem>
                <SelectItem value="request_reinvestigation">{t.prosecutor.modificationRequested || t.prosecutor.requestModification}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder={t.common?.registeredDate || "Filter by Date"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t.common?.registeredDate || "All Time"}</SelectItem>
                <SelectItem value="today">{t.common?.pending || "Today"}</SelectItem>
                <SelectItem value="week">{t.common?.assigned || "This Week"}</SelectItem>
                <SelectItem value="month">{t.common?.inProgress || "This Month"}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Decisions List */}
      {error && (
        <Card>
          <CardContent className="p-4 text-sm text-red-600">{error}</CardContent>
        </Card>
      )}
      {loading && decisions.length === 0 && !error && (
        <Card>
          <CardContent className="p-8 text-center text-gray-500">{t.common.loading || "Loading..."}</CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {filteredDecisions.map((decision) => (
          <Card key={decision.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{decision.title}</h3>
                    <Badge className={getPriorityColor(decision.priority)}>{decision.priority}</Badge>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-600 mb-2">
                    <p>
                      <span className="font-medium">CR Number:</span> {decision.crNumber}
                    </p>
                    <p>
                      <span className="font-medium">DER Number:</span> {decision.derNumber}
                    </p>
                    <p>
                      <span className="font-medium">Reviewed by:</span> {decision.reviewedBy}
                    </p>
                    <p>
                      <span className="font-medium">Decision Date:</span> {decision.decisionDate}
                    </p>
                  </div>
                  <p className="text-sm text-gray-700 mb-2">{decision.summary}</p>
                  <div className="flex items-center gap-2">
                    <Badge className={getDecisionColor(decision.decision)}>
                      <div className="flex items-center gap-1">
                        {getDecisionIcon(decision.decision)}
                        {getDecisionLabel(decision.decision)}
                      </div>
                    </Badge>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedCase(decision)}
                        className="flex items-center gap-2"
                      >
                        <Eye className="h-4 w-4" />
                        {t.common.view || "View"}
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                          <User className="h-5 w-5" />
                          {t.prosecutor.caseDecisions}
                        </DialogTitle>
                      </DialogHeader>

                      {selectedCase && (
                        <div className="space-y-6">
                          {/* Case Information */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <p className="font-medium text-gray-700">{t.caseRegistration?.caseTitle || "Case Title"}</p>
                              <p className="text-sm text-gray-600">{selectedCase.title}</p>
                            </div>
                            <div>
                              <p className="font-medium text-gray-700">{t.common.department}</p>
                              <p className="text-sm text-gray-600">{selectedCase.department}</p>
                            </div>
                            <div>
                              <p className="font-medium text-gray-700">CR Number</p>
                              <p className="text-sm text-gray-600">{selectedCase.crNumber}</p>
                            </div>
                            <div>
                              <p className="font-medium text-gray-700">DER Number</p>
                              <p className="text-sm text-gray-600">{selectedCase.derNumber}</p>
                            </div>
                            <div>
                              <p className="font-medium text-gray-700">{t.common.investigator}</p>
                              <p className="text-sm text-gray-600">{selectedCase.investigator}</p>
                            </div>
                            <div>
                              <p className="font-medium text-gray-700">{t.prosecutor.reviewed || "Reviewed By"}</p>
                              <p className="text-sm text-gray-600">{selectedCase.reviewedBy}</p>
                            </div>
                          </div>

                          {/* Decision Information */}
                          <div className="border-t pt-4">
                            <div className="flex items-center gap-4 mb-4">
                              <div>
                                <p className="font-medium text-gray-700">{t.prosecutor.reviewDecision || "Decision"}</p>
                                <Badge className={getDecisionColor(selectedCase.decision)}>
                                  <div className="flex items-center gap-1">
                                    {getDecisionIcon(selectedCase.decision)}
                                    {getDecisionLabel(selectedCase.decision)}
                                  </div>
                                </Badge>
                              </div>
                              <div>
                                <p className="font-medium text-gray-700">{t.prosecutor.decisionDate}</p>
                                <p className="text-sm text-gray-600">{selectedCase.decisionDate}</p>
                              </div>
                            </div>
                          </div>

                          {/* Case Summary */}
                          <div>
                            <p className="font-medium text-gray-700 mb-2">{t.prosecutor.caseSummary}</p>
                            <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded">{selectedCase.summary}</p>
                          </div>

                          {/* Review Note */}
                          <div>
                            <p className="font-medium text-gray-700 mb-2">{t.prosecutor.reviewNote}</p>
                            <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded">{selectedCase.reviewNote}</p>
                          </div>
                        </div>
                      )}
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredDecisions.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-gray-500">{t.common.noDataFound}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
