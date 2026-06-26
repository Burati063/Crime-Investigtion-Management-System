"use client"

import { useEffect, useState, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Search, Eye, CheckCircle, XCircle, Edit, FileText, Download, Loader2 } from "lucide-react"
import { useLanguage } from "@/lib/i18n"
import { withBase } from "@/lib/config"
import { useToast } from "@/hooks/use-toast"

// Domain interfaces (aligned with backend contract provided by user)
interface Person {
  id: string;
  type: "witness" | "accuser" | "accused";
  fullName: string;
  dateOfBirth: string;
  age: number;
  gender: string;
  nationality: string;
  houseNumber: string;
  address: string;
  region: string;
  nation: string;
  woreda: string;
  kebele: string;
  residentId: string;
  maritalStatus: string;
  educationStatus: string;
  workStatus: string;
  phoneNumber: string;
  description?: string;
  fileUrl?: string;
}

interface Exhibit {
  id: string;
  name: string;
  description: string;
  quantity: number;
  registeredDate: string;
  relatedPersonId: string;
  relatedPersonName: string;
  fileUrl?: string;
}

interface Case {
  id: string;
  crNumber: string;
  derNumber: string;
  title: string;
  status: string;
  assignedDate: string; // date the case was assigned / submitted for review
  deadline: string;
  department: string;
  priority: "High" | "Medium" | "Low" | "Critical";
  description?: string;
  assignedBy: string;
  progress: number; // percent 0-100
  persons?: Person[];
  exhibits?: Exhibit[];
}

export function ReviewCases() {
  const { t } = useLanguage()
  const { toast } = useToast()
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [selectedCase, setSelectedCase] = useState<Case | null>(null)
  const [reviewAction, setReviewAction] = useState<"accept" | "reject" | "modify" | null>(null)
  const [reviewNote, setReviewNote] = useState("")
  const [cases, setCases] = useState<Case[]>([])
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [submittingDecision, setSubmittingDecision] = useState<boolean>(false)
  const [decisionError, setDecisionError] = useState<string | null>(null)

  // Fetch cases from backend
  const fetchCases = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      // Retrieve auth token (assumption: stored in localStorage under 'authToken' or 'token')
      const token = typeof window !== 'undefined' ? (localStorage.getItem('authToken') || localStorage.getItem('token')) : null
      const res = await fetch('/api/cases/prosecutor/review-cases', {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        method: 'GET'
      })
      if (!res.ok) {
        throw new Error(`Failed to load cases (${res.status})`)
      }
      const data = await res.json()
      // Assume API returns an array of Case objects directly or inside data.cases
      const payload: Case[] = Array.isArray(data) ? data : Array.isArray(data?.cases) ? data.cases : []
      setCases(payload)
    } catch (e: any) {
      setError(e.message || 'Unknown error loading cases')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCases()
  }, [fetchCases])

  const filteredCases = cases.filter((case_) => {
    const term = searchTerm.toLowerCase().trim()
    const matchesSearch = !term ||
      case_.title.toLowerCase().includes(term) ||
      case_.crNumber.toLowerCase().includes(term) ||
      case_.derNumber.toLowerCase().includes(term)
    const matchesStatus = statusFilter === "all" || case_.status === statusFilter
    return matchesSearch && matchesStatus
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Under Review":
        return "bg-blue-100 text-blue-800"
      case "Pending Review":
        return "bg-orange-100 text-orange-800"
      case "Reviewed":
        return "bg-green-100 text-green-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const handleReviewSubmit = async () => {
    if (!selectedCase || !reviewAction || !reviewNote.trim()) return

    setSubmittingDecision(true)
    setDecisionError(null)
    try {
      const token = typeof window !== 'undefined' ? (localStorage.getItem('token') || localStorage.getItem('token')) : null
  const endpoint = withBase('/api/cases/prosecutor/make-decision') // Use base URL aware endpoint
      // Map UI action to backend expected decision value (assumption for modify -> request_modification)
      const decisionMap: Record<string, string> = {
        accept: 'accept',
        reject: 'reject',
        modify: 'request_modification'
      }
      const payload = {
        case_id: selectedCase.id,
        decision: decisionMap[reviewAction],
        note: reviewNote.trim()
      }
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(payload)
      })
      if (!res.ok) {
        let message = `Failed to submit decision (${res.status})`
        try {
          const errData = await res.json()
          if (errData?.message) message = errData.message
        } catch { /* ignore JSON parse errors */ }
        throw new Error(message)
      }

      // Attempt to parse response for updated case (optional)
      let updatedCase: Case | null = null
      try {
        const responseData = await res.json()
        if (responseData && typeof responseData === 'object') {
          // Heuristics: response might directly be updated case or inside responseData.case
          const candidate = (responseData.case || responseData) as any
            
          if (candidate && candidate.id === selectedCase.id) {
            updatedCase = {
              ...selectedCase,
              ...candidate
            }
          }
        }
      } catch { /* response may be empty */ }

      // Optimistic local update if server didn't send full updated case
      if (!updatedCase) {
        updatedCase = {
          ...selectedCase,
          status: 'Reviewed'
        }
      }

      setCases(prev => prev.map(c => c.id === updatedCase!.id ? updatedCase! : c))

      toast({
        title: 'Decision submitted',
        description: `Case decision (${payload.decision}) saved successfully.`
      })

      // Reset form/dialog state
      setReviewAction(null)
      setReviewNote("")
      setSelectedCase(null)
    } catch (e: any) {
      const msg = e.message || 'Unknown error submitting decision'
      setDecisionError(msg)
      toast({
        title: 'Submission failed',
        description: msg,
        variant: 'destructive'
      })
    } finally {
      setSubmittingDecision(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t.prosecutor.reviewCases}</h1>
          <p className="text-gray-600">{t.prosecutor.reviewCasesDescription}</p>
        </div>
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
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder={t.common.filterByStatus} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t.common.allStatuses}</SelectItem>
                <SelectItem value="Pending Review">{t.prosecutor.pendingReview}</SelectItem>
                <SelectItem value="Under Review">{t.prosecutor.underReview}</SelectItem>
                <SelectItem value="Reviewed">{t.prosecutor.reviewed}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Loading & Error States */}
      {loading && (
        <div className="flex items-center gap-2 text-gray-600">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading cases...</span>
        </div>
      )}
      {error && (
        <Card className="border-red-300">
          <CardContent className="p-4 text-sm text-red-700 flex justify-between items-center">
            <span>{error}</span>
            <Button size="sm" variant="outline" onClick={fetchCases}>Retry</Button>
          </CardContent>
        </Card>
      )}

      {/* Cases List */}
      {!loading && !error && (
        <div className="grid gap-4">
          {filteredCases.map((case_) => (
            <Card key={case_.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{case_.title}</h3>
                      <Badge className={getPriorityColor(case_.priority)}>{case_.priority}</Badge>
                      <Badge className={getStatusColor(case_.status)}>{case_.status}</Badge>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm text-gray-600 mb-2">
                      <p><span className="font-medium">CR:</span> {case_.crNumber}</p>
                      <p><span className="font-medium">DER:</span> {case_.derNumber}</p>
                      <p><span className="font-medium">Dept:</span> {case_.department}</p>
                      <p><span className="font-medium">Assigned:</span> {case_.assignedDate}</p>
                      <p><span className="font-medium">Deadline:</span> {case_.deadline}</p>
                      <p><span className="font-medium">By:</span> {case_.assignedBy}</p>
                    </div>
                    {case_.description && (
                      <p className="text-sm text-gray-700 mb-2 line-clamp-3">{case_.description}</p>
                    )}
                    <div className="w-full bg-gray-200 rounded h-2 mt-1">
                      <div className="h-2 rounded bg-blue-600" style={{ width: `${Math.min(Math.max(case_.progress,0),100)}%` }} />
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedCase(case_)}
                          className="flex items-center gap-2"
                        >
                          <Eye className="h-4 w-4" />
                          {t.common.view}
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle className="flex items-center gap-2">
                            <FileText className="h-5 w-5" />
                            {t.prosecutor.caseDetails}
                          </DialogTitle>
                        </DialogHeader>

                        {selectedCase && selectedCase.id === case_.id && (
                          <div className="space-y-8">
                            {/* Case Information */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              <div>
                                <Label className="font-medium">{t.common.title}</Label>
                                <p className="text-sm text-gray-700">{selectedCase.title}</p>
                              </div>
                              <div>
                                <Label className="font-medium">{t.common.department}</Label>
                                <p className="text-sm text-gray-700">{selectedCase.department}</p>
                              </div>
                              <div>
                                <Label className="font-medium">CR Number</Label>
                                <p className="text-sm text-gray-700">{selectedCase.crNumber}</p>
                              </div>
                              <div>
                                <Label className="font-medium">DER Number</Label>
                                <p className="text-sm text-gray-700">{selectedCase.derNumber}</p>
                              </div>
                              <div>
                                <Label className="font-medium">Assigned Date</Label>
                                <p className="text-sm text-gray-700">{selectedCase.assignedDate}</p>
                              </div>
                              <div>
                                <Label className="font-medium">Deadline</Label>
                                <p className="text-sm text-gray-700">{selectedCase.deadline}</p>
                              </div>
                              <div>
                                <Label className="font-medium">Priority</Label>
                                <p className="text-sm text-gray-700">{selectedCase.priority}</p>
                              </div>
                              <div>
                                <Label className="font-medium">Assigned By</Label>
                                <p className="text-sm text-gray-700">{selectedCase.assignedBy}</p>
                              </div>
                              <div>
                                <Label className="font-medium">Progress</Label>
                                <p className="text-sm text-gray-700">{selectedCase.progress}%</p>
                              </div>
                            </div>

                            {selectedCase.description && (
                              <div>
                                <Label className="font-medium">Description</Label>
                                <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">{selectedCase.description}</p>
                              </div>
                            )}

                            {/* Persons */}
                            <div>
                              <Label className="font-medium">Persons</Label>
                              <div className="mt-2 overflow-x-auto">
                                {(!selectedCase.persons || selectedCase.persons.length === 0) && (
                                  <p className="text-sm text-gray-500">No persons registered.</p>
                                )}
                                {selectedCase.persons && selectedCase.persons.length > 0 && (
                                  <table className="w-full text-sm border border-gray-200 rounded overflow-hidden">
                                    <thead className="bg-gray-50 text-gray-700">
                                      <tr>
                                        <th className="text-left p-2 font-medium">Name</th>
                                        <th className="text-left p-2 font-medium">Type</th>
                                        <th className="text-left p-2 font-medium">Gender</th>
                                        <th className="text-left p-2 font-medium">Age</th>
                                        <th className="text-left p-2 font-medium">Phone</th>
                                        <th className="text-left p-2 font-medium">File</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {selectedCase.persons.map(person => (
                                        <tr key={person.id} className="border-t hover:bg-gray-50">
                                          <td className="p-2">{person.fullName}</td>
                                          <td className="p-2 capitalize">{person.type}</td>
                                          <td className="p-2">{person.gender}</td>
                                          <td className="p-2">{person.age}</td>
                                          <td className="p-2">{person.phoneNumber}</td>
                                          <td className="p-2">
                                            {person.fileUrl ? (
                                              <Button asChild variant="ghost" size="icon" title="Download file">
                                                <a href={person.fileUrl} download target="_blank" rel="noopener noreferrer">
                                                  <Download className="h-4 w-4" />
                                                </a>
                                              </Button>
                                            ) : <span className="text-gray-400">—</span>}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                )}
                              </div>
                            </div>

                            {/* Exhibits */}
                            <div>
                              <Label className="font-medium">Exhibits</Label>
                              <div className="mt-2 overflow-x-auto">
                                {(!selectedCase.exhibits || selectedCase.exhibits.length === 0) && (
                                  <p className="text-sm text-gray-500">No exhibits registered.</p>
                                )}
                                {selectedCase.exhibits && selectedCase.exhibits.length > 0 && (
                                  <table className="w-full text-sm border border-gray-200 rounded overflow-hidden">
                                    <thead className="bg-gray-50 text-gray-700">
                                      <tr>
                                        <th className="text-left p-2 font-medium">Name</th>
                                        <th className="text-left p-2 font-medium">Description</th>
                                        <th className="text-left p-2 font-medium">Qty</th>
                                        <th className="text-left p-2 font-medium">Registered</th>
                                        <th className="text-left p-2 font-medium">Related Person</th>
                                        <th className="text-left p-2 font-medium">File</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {selectedCase.exhibits.map(ex => (
                                        <tr key={ex.id} className="border-t hover:bg-gray-50">
                                          <td className="p-2">{ex.name}</td>
                                          <td className="p-2 max-w-[200px] truncate" title={ex.description}>{ex.description}</td>
                                          <td className="p-2">{ex.quantity}</td>
                                          <td className="p-2">{ex.registeredDate}</td>
                                          <td className="p-2">{ex.relatedPersonName}</td>
                                          <td className="p-2">
                                            {ex.fileUrl ? (
                                              <Button asChild variant="ghost" size="icon" title="Download file">
                                                <a href={ex.fileUrl} download target="_blank" rel="noopener noreferrer">
                                                  <Download className="h-4 w-4" />
                                                </a>
                                              </Button>
                                            ) : <span className="text-gray-400">—</span>}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                )}
                              </div>
                            </div>

                            {/* Review Decision */}
                            <div className="border-t pt-4 space-y-4">
                              <div>
                                <Label className="font-medium">{t.prosecutor.reviewDecision}</Label>
                                <div className="flex flex-wrap gap-2 mt-2">
                                  <Button
                                    variant={reviewAction === "accept" ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setReviewAction("accept")}
                                    className="flex items-center gap-2"
                                  >
                                    <CheckCircle className="h-4 w-4" />
                                    {t.prosecutor.accept}
                                  </Button>
                                  <Button
                                    variant={reviewAction === "reject" ? "destructive" : "outline"}
                                    size="sm"
                                    onClick={() => setReviewAction("reject")}
                                    className="flex items-center gap-2"
                                  >
                                    <XCircle className="h-4 w-4" />
                                    {t.prosecutor.reject}
                                  </Button>
                                  <Button
                                    variant={reviewAction === "modify" ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setReviewAction("modify")}
                                    className="flex items-center gap-2"
                                  >
                                    <Edit className="h-4 w-4" />
                                    {t.prosecutor.requestModification}
                                  </Button>
                                </div>
                              </div>

                              {reviewAction && (
                                <div>
                                  <Label htmlFor="reviewNote" className="font-medium">{t.prosecutor.reviewNote}</Label>
                                  <Textarea
                                    id="reviewNote"
                                    value={reviewNote}
                                    onChange={(e) => setReviewNote(e.target.value)}
                                    placeholder={t.prosecutor.reviewNotePlaceholder}
                                    rows={4}
                                    className="mt-2"
                                  />
                                </div>
                              )}

                              {decisionError && (
                                <p className="text-sm text-red-600">{decisionError}</p>
                              )}

                              {reviewAction && reviewNote && (
                                <div className="flex justify-end">
                                  <Button onClick={handleReviewSubmit} disabled={submittingDecision}>
                                    {submittingDecision && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                    {t.prosecutor.submitReview}
                                  </Button>
                                </div>
                              )}
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
      )}

      {!loading && !error && filteredCases.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-gray-500">{t.common.noDataFound}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
