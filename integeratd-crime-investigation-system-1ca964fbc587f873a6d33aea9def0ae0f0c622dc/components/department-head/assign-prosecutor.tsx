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
  registeredDate: string
  priority: string
  dueDate?: string
  prosecutor?: string | null
  prosecutorBadge?: string | null
}

interface Prosecutor {
  id: string
  name: string
  badge: string
  department: string
  specialization: string
  currentCases: number
  maxCases: number
  status: string
}

export function AssignProsecutor() {
  const { t } = useLanguage()
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCase, setSelectedCase] = useState<CaseRecord | null>(null)
  const [selectedProsecutor, setSelectedProsecutor] = useState("")
  const [assignmentNote, setAssignmentNote] = useState("")
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false)

  const [cases, setCases] = useState<CaseRecord[]>([])
  const [casesLoading, setCasesLoading] = useState(false)
  const [casesError, setCasesError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const [prosecutors, setProsecutors] = useState<Prosecutor[]>([])
  const [prosecutorsLoading, setProsecutorsLoading] = useState(false)
  const [prosecutorsError, setProsecutorsError] = useState<string | null>(null)

  const [assignSubmitting, setAssignSubmitting] = useState(false)
  const [assignError, setAssignError] = useState<string | null>(null)
  const [assignSuccess, setAssignSuccess] = useState<string | null>(null)

  // View Case dialog state
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [viewCase, setViewCase] = useState<CaseRecord | null>(null)

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
    prosecutor?: string | null
    prosecutorBadge?: string | null
    [key: string]: unknown
  }

  interface ApiCaseListResponse { cases?: ApiCaseItem[]; count?: number; [key: string]: unknown }

  const normalizePriority = (p?: string): string => {
    if (!p) return "Medium"
    const v = p.toLowerCase()
    if (["critical", "urgent"].includes(v)) return "Critical"
    if (v === "high") return "High"
    if (v === "medium") return "Medium"
    if (v === "low") return "Low"
    return p.charAt(0).toUpperCase() + p.slice(1)
  }

  const mapApiCase = (c: ApiCaseItem, idx: number): CaseRecord => ({
    id: c.id != null ? String(c.id) : String(idx + 1),
    crNumber: c.crNumber != null ? String(c.crNumber) : `CR-${idx + 1}`,
    derNumber: c.derNumber != null ? String(c.derNumber) : `DER-${idx + 1}`,
    title: c.title || "Untitled Case",
    department: c.department || "",
    crime: c.crime || "",
    status: c.status || "new",
    registeredDate: c.assignedDate || "",
    priority: normalizePriority(c.priority),
    dueDate: c.dueDate,
    prosecutor: c.prosecutor || null,
    prosecutorBadge: c.prosecutorBadge || null,
  })

  const fetchCases = useCallback(async (opts?: { silent?: boolean }) => {
    const silent = opts?.silent
    if (!silent) setCasesLoading(true)
    setCasesError(null)
    try {
      const base = (process.env.NEXT_PUBLIC_API_BASE_URL || '').replace(/\/$/, '')
      // NOTE: Replace with actual endpoint if different for prosecutor context
      const url = `${base}/api/cases/department-head/submitted-cases`
      const headers: Record<string,string> = { Accept: 'application/json' }
      const token = getAuthToken(); if (token) headers['Authorization'] = `Bearer ${token}`
      const controller = new AbortController(); const timeout = setTimeout(()=>controller.abort(),15000)
      const res = await fetch(url,{method:'GET',headers,signal:controller.signal}); clearTimeout(timeout)
      if(!res.ok){ let msg='Failed to load cases.'; if(res.status===401) msg='Unauthorized.'; else if(res.status===403) msg='Forbidden.'; else if(res.status===404) msg='Cases endpoint not found.'; else if(res.status>=500) msg='Server error.'; setCases([]); setCasesError(msg); return }
      const raw:unknown = await res.json().catch(()=>null)
      let list:ApiCaseItem[] = []
      if(raw && typeof raw==='object'){ const obj = raw as ApiCaseListResponse; if(Array.isArray(obj.cases)) list = obj.cases }
      setCases(list.map(mapApiCase))
    } catch(e:any){ if((e as Error).name==='AbortError') setCasesError('Request timed out.'); else setCasesError('Unexpected error loading cases.'); setCases([]) } finally { setCasesLoading(false); setRefreshing(false) }
  },[])

  useEffect(()=>{ fetchCases() },[fetchCases])

  const handleRefresh = async () => { setRefreshing(true); await fetchCases({silent:true}) }

  interface ApiProsecutorItem {
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

  const mapApiProsecutor = (d: ApiProsecutorItem, idx:number): Prosecutor => {
    const nameParts:string[]=[]; if(d.first_name) nameParts.push(String(d.first_name)); if(d.last_name) nameParts.push(String(d.last_name));
    const composite = nameParts.join(' ')
    const rawName = d.fullName || d.name || composite || `Prosecutor ${idx+1}`
    const rawCurrent = typeof d.currentCases==='string'?parseInt(d.currentCases):d.currentCases
    const rawMax = typeof d.maxCases==='string'?parseInt(d.maxCases):d.maxCases
    return {
      id: d.id!=null?String(d.id): d.userId!=null? String(d.userId): String(idx+1),
      name: rawName,
      badge: (d.badge || d.badgeNumber || d.badge_number || '').toString(),
      department: d.departmentName || d.department || '',
      specialization: (d.specialization as string) || '',
      currentCases: Number.isFinite(rawCurrent as number)? Number(rawCurrent):0,
      maxCases: Number.isFinite(rawMax as number)? Number(rawMax):999,
      status: d.status || 'Available'
    }
  }

  const fetchProsecutors = useCallback(async ()=>{
    setProsecutorsError(null); setProsecutorsLoading(true)
    try {
      const base = (process.env.NEXT_PUBLIC_API_BASE_URL || '').replace(/\/$/, '')
      // NOTE: Replace with actual prosecutors endpoint when available
      const url = `${base}/api/users/all_prosecutors`
      const headers: Record<string,string> = { Accept:'application/json' }
      const token = getAuthToken(); if(token) headers['Authorization'] = `Bearer ${token}`
      const controller = new AbortController(); const timeout = setTimeout(()=>controller.abort(),15000)
      const res = await fetch(url,{method:'GET',headers,signal:controller.signal}); clearTimeout(timeout)
      if(!res.ok){ let msg='Failed to load prosecutors.'; if(res.status===401) msg='Unauthorized. Please login again.'; else if(res.status===403) msg='Forbidden. Cannot load prosecutors.'; else if(res.status===404) msg='Prosecutors endpoint not found.'; else if(res.status>=500) msg='Server error while loading prosecutors.'; setProsecutors([]); setProsecutorsError(msg); return }
      const raw:unknown = await res.json().catch(()=>null)
      let list:ApiProsecutorItem[] = []
      if(Array.isArray(raw)) list = raw; else if(raw && typeof raw==='object'){ const obj = raw as Record<string,unknown>; const maybe = ['prosecutors','users','data'].map(k=>obj[k]); const arr = maybe.find(v=>Array.isArray(v)) as unknown[]|undefined; if(arr) list = arr as ApiProsecutorItem[] }
      setProsecutors(list.map(mapApiProsecutor))
    } catch(e:any){ if((e as Error).name==='AbortError') setProsecutorsError('Loading prosecutors timed out.'); else setProsecutorsError('Unexpected error loading prosecutors.'); setProsecutors([]) } finally { setProsecutorsLoading(false) }
  },[])

  const filteredCases = cases.filter(c => (
    c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.crNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.derNumber.toLowerCase().includes(searchTerm.toLowerCase())
  ))

  const getAvailableProsecutors = (caseItem: CaseRecord) => {
    if(!prosecutors.length) return []
    const list = prosecutors.slice()
    list.sort((a,b)=>{
      const deptA = a.department === caseItem.department ? 0:1
      const deptB = b.department === caseItem.department ? 0:1
      if(deptA!==deptB) return deptA - deptB
      return a.currentCases - b.currentCases
    })
    return list
  }

  const getPriorityBadge = (priority:string) => {
    const p = priority.charAt(0).toUpperCase()+priority.slice(1).toLowerCase()
    const colors:Record<string,string> = {
      Critical: 'bg-red-100 text-red-800',
      High: 'bg-orange-100 text-orange-800',
      Medium: 'bg-yellow-100 text-yellow-800',
      Low: 'bg-green-100 text-green-800'
    }
    return colors[p] || 'bg-gray-100 text-gray-800'
  }

  const handleAssignCase = async () => {
    if(!selectedCase){ setAssignError('No case selected.'); return }
    setAssignError(null); setAssignSuccess(null)
    const note = assignmentNote.trim()
    if(!selectedProsecutor){ setAssignError('Please select a prosecutor.'); return }
    if(!note){ setAssignError('Assignment note is required.'); return }
    if(note.length < 3){ setAssignError('Note must be at least 3 characters.'); return }
    try {
      setAssignSubmitting(true)
      const base = (process.env.NEXT_PUBLIC_API_BASE_URL || '').replace(/\/$/,'')
      /*
        Backend contract (as provided): POST baseurl/api/cases//department_head/assign_prosecutor
        Payload: { case_id, prosecutor_id, prosecutor_note }
        There was a double slash shown between cases and department_head. We first try the canonical single slash.
        If the server returns 404 we retry with the double slash form to be resilient while backend routes stabilize.
      */
      const singlePath = `${base}/api/cases/department_head/assign_prosecutor`
      const doubleSlashPath = `${base}/api/cases//department_head/assign_prosecutor`
      const token = getAuthToken()
      const payload = { case_id: selectedCase.id, prosecutor_id: selectedProsecutor, prosecutor_note: note }

      const doRequest = async (url:string) => {
        const res = await fetch(url, {
          method:'POST',
          headers:{ 'Content-Type':'application/json', Accept:'application/json', ...(token?{Authorization:`Bearer ${token}`}:{}) },
          body: JSON.stringify(payload)
        })
        return res
      }

      let res = await doRequest(singlePath)
      if(res.status === 404) { // fallback attempt with double-slash variant
        try { res = await doRequest(doubleSlashPath) } catch { /* swallow to uniform handling below */ }
      }

      if(!res.ok){
        let msg='Failed to assign case to prosecutor.'
        if(res.status===400) msg='Invalid assignment request.'
        else if(res.status===401) msg='Unauthorized. Please login again.'
        else if(res.status===403) msg='Forbidden. You cannot assign this case.'
        else if(res.status===404) msg='Assignment endpoint not found.'
        else if(res.status>=500) msg='Server error during assignment.'
        throw new Error(msg)
      }

      await res.json().catch(()=>null) // ignore body; success indicated by 2xx
      setAssignSuccess('Case assigned to prosecutor successfully.')
      fetchCases({silent:true})
      setTimeout(()=>{ setIsAssignDialogOpen(false); setSelectedCase(null); setSelectedProsecutor(''); setAssignmentNote(''); setAssignSuccess(null) },800)
    } catch(err){ setAssignError(err instanceof Error ? err.message : 'Unknown error assigning case') } finally { setAssignSubmitting(false) }
  }

  const openAssignDialog = (caseItem: CaseRecord) => { setSelectedCase(caseItem); setIsAssignDialogOpen(true); fetchProsecutors() }

  const openViewDialog = (caseItem: CaseRecord) => { setViewCase(caseItem); setIsViewDialogOpen(true) }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <UserPlus className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Assign Prosecutor</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pending Cases (Prosecutor)</CardTitle>
          <CardDescription>Cases awaiting prosecutor assignment</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input placeholder="Search cases" value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} className="pl-10" disabled={casesLoading} />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleRefresh} disabled={casesLoading || refreshing}>{refreshing || casesLoading ? 'Loading...' : 'Refresh'}</Button>
            </div>
          </div>

          {casesError && (
            <div className="mb-4 text-sm text-red-600">{casesError}<Button variant="link" className="px-1" onClick={()=>fetchCases({silent:true})}>Retry</Button></div>
          )}

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>CR Number</TableHead>
                  <TableHead>DER Number</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Crime</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Registered</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {casesLoading && (
                  <TableRow><TableCell colSpan={8} className="text-center py-6 text-sm text-gray-500">Loading cases...</TableCell></TableRow>
                )}
                {!casesLoading && filteredCases.length===0 && !casesError && (
                  <TableRow><TableCell colSpan={8} className="text-center py-6 text-sm text-gray-500">No cases found</TableCell></TableRow>
                )}
                {!casesLoading && filteredCases.map(c=> (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.crNumber}</TableCell>
                    <TableCell>{c.derNumber}</TableCell>
                    <TableCell>{c.title}</TableCell>
                    <TableCell>{c.department}</TableCell>
                    <TableCell>{c.crime}</TableCell>
                    <TableCell><Badge className={getPriorityBadge(c.priority)}>{c.priority}</Badge></TableCell>
                    <TableCell>{c.registeredDate || '-'}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="flex items-center gap-1 bg-transparent" onClick={()=>openViewDialog(c)}><Eye className="h-4 w-4" />View</Button>
                        <Button size="sm" onClick={()=>openAssignDialog(c)} className="flex items-center gap-1 bg-purple-600 hover:bg-purple-700" disabled={!c.department}><UserPlus className="h-4 w-4" />Assign</Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Assign Prosecutor</DialogTitle>
            <DialogDescription>Select a prosecutor and add a note to assign this case.</DialogDescription>
          </DialogHeader>
          {selectedCase && (
            <div className="space-y-4">
              <Card>
                <CardHeader><CardTitle className="text-lg">Case Details</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium">CR Number</Label>
                      <p className="text-sm text-gray-600">{selectedCase.crNumber}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">DER Number</Label>
                      <p className="text-sm text-gray-600">{selectedCase.derNumber}</p>
                    </div>
                    <div className="col-span-2">
                      <Label className="text-sm font-medium">Title</Label>
                      <p className="text-sm text-gray-600">{selectedCase.title}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Department</Label>
                      <p className="text-sm text-gray-600">{selectedCase.department}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Crime</Label>
                      <p className="text-sm text-gray-600">{selectedCase.crime}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="prosecutor">Select Prosecutor</Label>
                  <Button type="button" variant="ghost" size="sm" className="h-7 px-2" onClick={fetchProsecutors} disabled={prosecutorsLoading}>{prosecutorsLoading ? 'Loading...' : 'Reload'}</Button>
                </div>
                <Select value={selectedProsecutor} onValueChange={v=>setSelectedProsecutor(v)} disabled={prosecutorsLoading || !!prosecutorsError || !prosecutors.length}>
                  <SelectTrigger>
                    <SelectValue placeholder={prosecutorsLoading ? 'Loading prosecutors...' : (prosecutorsError ? 'Failed to load prosecutors' : (!prosecutors.length ? 'No prosecutors found' : 'Select prosecutor'))} />
                  </SelectTrigger>
                  <SelectContent>
                    {prosecutorsLoading && <div className="px-2 py-2 text-sm text-gray-500">Loading...</div>}
                    {prosecutorsError && <div className="px-2 py-2 text-sm text-red-600">{prosecutorsError}</div>}
                    {!prosecutorsLoading && !prosecutorsError && !prosecutors.length && <div className="px-2 py-2 text-sm text-gray-500">No prosecutors available</div>}
                    {!prosecutorsLoading && !prosecutorsError && getAvailableProsecutors(selectedCase).map(p => (
                      <SelectItem key={p.id} value={p.id}>
                        <div className="flex items-center justify-between w-full">
                          <span>{p.name}{p.badge ? ` (${p.badge})` : ''}</span>
                          <span className="text-xs text-gray-500 ml-2 whitespace-nowrap">{p.currentCases}/{p.maxCases} cases</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {prosecutorsError && <p className="text-xs text-red-600">{prosecutorsError}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="assign-note">Assignment Note</Label>
                <Textarea id="assign-note" placeholder="Provide assignment instructions or context" value={assignmentNote} onChange={e=>setAssignmentNote(e.target.value)} rows={3} />
                {assignError && <p className="text-xs text-red-600">{assignError}</p>}
                {assignSuccess && <p className="text-xs text-green-600">{assignSuccess}</p>}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={()=>setIsAssignDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAssignCase} disabled={assignSubmitting || !selectedProsecutor || !assignmentNote.trim()} className="bg-purple-600 hover:bg-purple-700">{assignSubmitting ? 'Assigning...' : 'Assign'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Case Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Case Information</DialogTitle>
            <DialogDescription>Read-only details of the selected case.</DialogDescription>
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
                      <Label className="text-xs font-medium">Case ID</Label>
                      <p className="text-gray-700 mt-0.5">{viewCase.id}</p>
                    </div>
                    <div>
                      <Label className="text-xs font-medium">Priority</Label>
                      <p className="mt-0.5"><Badge variant="outline" className="capitalize">{viewCase.priority}</Badge></p>
                    </div>
                    <div>
                      <Label className="text-xs font-medium">Department</Label>
                      <p className="text-gray-700 mt-0.5">{viewCase.department || '-'}</p>
                    </div>
                    <div>
                      <Label className="text-xs font-medium">Crime</Label>
                      <p className="text-gray-700 mt-0.5">{viewCase.crime || '-'}</p>
                    </div>
                    <div>
                      <Label className="text-xs font-medium">Status</Label>
                      <p className="mt-0.5"><Badge variant="outline" className="capitalize">{viewCase.status}</Badge></p>
                    </div>
                    <div>
                      <Label className="text-xs font-medium">Registered Date</Label>
                      <p className="text-gray-700 mt-0.5">{viewCase.registeredDate || '-'}</p>
                    </div>
                    {viewCase.dueDate && (
                      <div>
                        <Label className="text-xs font-medium">Due Date</Label>
                        <p className="text-gray-700 mt-0.5">{viewCase.dueDate}</p>
                      </div>
                    )}
                    {viewCase.prosecutor && (
                      <div>
                        <Label className="text-xs font-medium">Assigned Prosecutor</Label>
                        <p className="text-gray-700 mt-0.5">{viewCase.prosecutor}{viewCase.prosecutorBadge?` (${viewCase.prosecutorBadge})`:''}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={()=>setIsViewDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
