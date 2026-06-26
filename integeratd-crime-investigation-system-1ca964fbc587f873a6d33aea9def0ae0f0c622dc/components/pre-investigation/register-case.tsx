"use client"

import type React from "react"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useLanguage } from "@/lib/i18n"

export function RegisterCase() {
  const { t } = useLanguage()
  const [caseData, setCaseData] = useState({
    title: "",
    department: "", // stores department id as string
    crime: "",
    description: "",
    location: "",
    reportedBy: "",
    reportedDate: new Date().toISOString().split("T")[0], // kept in case later needed by backend
  })

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [submitLoading, setSubmitLoading] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null)

  interface APIDepartment {
    id: number | string
    name: string
    crimes?: string[]
    description?: string
    isActive?: boolean
  }

  interface DepartmentListResponse {
    departments?: APIDepartment[]
    // Allow any additional fields without breaking
    [key: string]: unknown
  }

  const [departments, setDepartments] = useState<APIDepartment[]>([])
  const [departmentsLoading, setDepartmentsLoading] = useState<boolean>(false)
  const [departmentsError, setDepartmentsError] = useState<string | null>(null)

  const fetchDepartments = useCallback(async () => {
    setDepartmentsError(null)
    setDepartmentsLoading(true)
    try {
      const base = (process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(/\/$/, "")
      const url = `${base}/api/departments`
      const headers: Record<string, string> = { "Content-Type": "application/json" }
      const res = await fetch(url, { headers, method: "GET" })
      if (!res.ok) {
        setDepartments([])
        return
      }
      const data = (await res.json().catch(() => ({}))) as DepartmentListResponse
      const list = Array.isArray(data?.departments) ? data.departments : []
      // Keep only active when flag present (mirrors logic elsewhere)
      const filtered = list.filter((d) => (typeof d.isActive === "boolean" ? d.isActive : true))
      setDepartments(filtered)
    } catch (e) {
      setDepartments([])
      setDepartmentsError("Failed to load departments.")
    } finally {
      setDepartmentsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDepartments()
  }, [fetchDepartments])

  const selectedDepartment = departments.find((dept) => String(dept.id) === caseData.department)

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!caseData.title.trim()) errs.title = "Title is required"
    if (!caseData.department) errs.department = "Department is required"
    if (!caseData.crime) errs.crime = "Crime type is required"
    if (!caseData.description.trim()) errs.description = "Description is required"
    if (!caseData.location.trim()) errs.location = "Location is required"
    if (!caseData.reportedBy.trim()) errs.reportedBy = "Reported by is required"
    // reportedDate optional; ensure format if provided
    if (caseData.reportedDate && !/^\d{4}-\d{2}-\d{2}$/.test(caseData.reportedDate)) {
      errs.reportedDate = "Invalid reported date format"
    }
    setFieldErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitError(null)
    setSubmitSuccess(null)
    if (!validate()) return

    const base = (process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(/\/$/, "")
    const url = `${base}/api/cases/` // provided endpoint

    // Payload prepared exactly as JSON the backend expects. If backend requires snake_case add it here.
    const payload = {
      title: caseData.title.trim(),
      crime: caseData.crime,
      description: caseData.description.trim(),
      location: caseData.location.trim(),
      reported_by: caseData.reportedBy.trim(),
      department_id: Number(caseData.department),
      reported_date: caseData.reportedDate, // include for completeness; remove if backend auto-generates
    }

    // If API instead expects a wrapper (e.g. { case: { ... } }) change next line to: const body = JSON.stringify({ case: payload })
    const body = JSON.stringify(payload)
    // Helpful during development; remove in production
    if (process.env.NODE_ENV !== "production") console.debug("Submitting case JSON:", body)

    setSubmitLoading(true)
    try {
      const token = localStorage.getItem("token")
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body,
      })
      if (!res.ok) {
        let msg = "Failed to register case."
        if (res.status === 400) msg = "Invalid case data submitted."
        else if (res.status === 401) msg = "Unauthorized. Please login."
        else if (res.status === 403) msg = "Forbidden. You are not allowed to register a case."
        else if (res.status >= 500) msg = "Server error while registering case."
        throw new Error(msg)
      }
      // Attempt to read JSON (ignore if none)
      await res.json().catch(() => null)
      setSubmitSuccess(t.caseRegistration.caseRegisteredSuccessfully || "Case registered successfully")
      // Reset form
      setCaseData({
        title: "",
        department: "",
        crime: "",
        description: "",
        location: "",
        reportedBy: "",
        reportedDate: new Date().toISOString().split("T")[0],
      })
      setFieldErrors({})
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Unknown error during case registration")
    } finally {
      setSubmitLoading(false) 
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t.caseRegistration.registerCase}</h1>
        <p className="text-gray-600">{t.caseRegistration.registerNewCaseInvestigation}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t.caseRegistration.caseInformation}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* CR and DER fields removed since backend generates them */}

            <div>
              <Label htmlFor="title">{t.caseRegistration.caseTitle}</Label>
              <Input
                id="title"
                value={caseData.title}
                onChange={(e) => setCaseData({ ...caseData, title: e.target.value })}
                placeholder={t.caseRegistration.enterCaseTitle}
                required
              />
              {fieldErrors.title && <p className="text-xs text-red-600 mt-1">{fieldErrors.title}</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="department">{t.cases.department}</Label>
                <Select
                  disabled={departmentsLoading}
                  value={caseData.department}
                  onValueChange={(value) => setCaseData({ ...caseData, department: value, crime: "" })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={departmentsLoading ? "Loading departments..." : t.caseRegistration.selectDepartment} />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={String(dept.id)}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {departmentsError && (
                  <p className="text-xs text-red-600 mt-1">{departmentsError}</p>
                )}
              </div>
              <div>
                <Label htmlFor="crime">{t.caseRegistration.crimeType}</Label>
                <Select
                  value={caseData.crime}
                  onValueChange={(value) => setCaseData({ ...caseData, crime: value })}
                  disabled={!selectedDepartment}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={!caseData.department ? "Select department first" : t.caseRegistration.selectCrimeType} />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedDepartment?.crimes?.length ? (
                      selectedDepartment.crimes.map((crime) => (
                        <SelectItem key={crime} value={crime}>
                          {crime}
                        </SelectItem>
                      ))
                    ) : (
                      <div className="px-2 py-1 text-xs text-gray-500">No crimes listed for this department</div>
                    )}
                  </SelectContent>
                </Select>
                {fieldErrors.crime && <p className="text-xs text-red-600 mt-1">{fieldErrors.crime}</p>}
              </div>
            </div>

            <div>
              <Label htmlFor="description">{t.caseRegistration.caseDescription}</Label>
              <Textarea
                id="description"
                value={caseData.description}
                onChange={(e) => setCaseData({ ...caseData, description: e.target.value })}
                placeholder={t.caseRegistration.enterCaseDescription}
                rows={4}
                required
              />
              {fieldErrors.description && <p className="text-xs text-red-600 mt-1">{fieldErrors.description}</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="location">{t.caseRegistration.location}</Label>
                <Input
                  id="location"
                  value={caseData.location}
                  onChange={(e) => setCaseData({ ...caseData, location: e.target.value })}
                  placeholder={t.caseRegistration.enterLocation}
                  required
                />
                {fieldErrors.location && <p className="text-xs text-red-600 mt-1">{fieldErrors.location}</p>}
              </div>
              <div>
                <Label htmlFor="reportedBy">{t.caseRegistration.reportedBy}</Label>
                <Input
                  id="reportedBy"
                  value={caseData.reportedBy}
                  onChange={(e) => setCaseData({ ...caseData, reportedBy: e.target.value })}
                  placeholder={t.caseRegistration.enterReporterName}
                  required
                />
                {fieldErrors.reportedBy && <p className="text-xs text-red-600 mt-1">{fieldErrors.reportedBy}</p>}
              </div>
            </div>

            <div>
              <Label htmlFor="reportedDate">{t.caseRegistration.reportedDate}</Label>
              <Input
                id="reportedDate"
                type="date"
                value={caseData.reportedDate}
                onChange={(e) => setCaseData({ ...caseData, reportedDate: e.target.value })}
                required
              />
              {fieldErrors.reportedDate && <p className="text-xs text-red-600 mt-1">{fieldErrors.reportedDate}</p>}
            </div>

            {submitError && <p className="text-sm text-red-600">{submitError}</p>}
            {submitSuccess && <p className="text-sm text-green-600">{submitSuccess}</p>}

            <Button type="submit" className="w-full" disabled={submitLoading}>
              {submitLoading ? "Submitting..." : t.caseRegistration.registerCase}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
