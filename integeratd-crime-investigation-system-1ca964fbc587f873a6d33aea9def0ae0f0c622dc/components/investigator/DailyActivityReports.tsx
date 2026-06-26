"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Search } from "lucide-react"

export default function DailyActivityReport() {
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    dern: "",
    investigator: "", // kept for UI but not sent per spec
    activityDesc: ""
  })
  const [dernList, setDernList] = useState<string[]>([])
  const [dernLoading, setDernLoading] = useState(false)
  const [dernError, setDernError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  
  const [showSuccessDialog, setShowSuccessDialog] = useState(false)

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

  const fetchDernNumbers = useCallback(async () => {
    setDernLoading(true)
    setDernError(null)
    try {
      const base = (process.env.NEXT_PUBLIC_API_BASE_URL || '').replace(/\/$/, '')
      const url = `${base}/api/cases/investigator/dern`
      const token = getAuthToken()
      const headers: Record<string, string> = { 'Accept': 'application/json' }
      if (token) headers['Authorization'] = `Bearer ${token}`
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 15000)
      const res = await fetch(url, { method: 'GET', headers, signal: controller.signal })
      clearTimeout(timeout)
      if (!res.ok) {
        let msg = 'Failed to load DERN numbers.'
        if (res.status === 401) msg = 'Unauthorized. Please login again.'
        else if (res.status === 403) msg = 'Forbidden to view DERN numbers.'
        else if (res.status === 404) msg = 'DERN endpoint not found.'
        else if (res.status >= 500) msg = 'Server error loading DERN numbers.'
        setDernError(msg)
        setDernList([])
        return
      }
      let json: any = null
      try { json = await res.json() } catch {}
      let list: string[] = []
      if (Array.isArray(json)) {
        list = json.filter(x => typeof x === 'string')
      } else if (json && typeof json === 'object') {
        // try common keys
        const possibleKeys = ['dern', 'derns', 'dern_numbers', 'data']
        for (const k of possibleKeys) {
          if (Array.isArray(json[k])) {
            list = json[k].filter((x: any) => typeof x === 'string')
            if (list.length) break
          }
        }
      }
      setDernList(list)
    } catch (e: any) {
      if ((e as Error).name === 'AbortError') setDernError('Request timed out while loading DERN numbers.')
      else setDernError('Unexpected error loading DERN numbers.')
      setDernList([])
    } finally {
      setDernLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDernNumbers()
  }, [fetchDernNumbers])

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSubmit = async () => {
    if (submitting) return
    setSubmitError(null)
    // Required fields (per backend spec investigator not required now)
    if (!formData.date || !formData.dern || !formData.activityDesc) {
      setSubmitError('Please fill in all required fields.')
      return
    }
    const base = (process.env.NEXT_PUBLIC_API_BASE_URL || '').replace(/\/$/, '')
    const url = `${base}/api/investigator/daily_activities`
    const token = getAuthToken()
    const payload = {
      date: formData.date,
      dern: formData.dern,
      activityDesc: formData.activityDesc,
    }
    setSubmitting(true)
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload)
      })
      if (!res.ok) {
        let msg = 'Failed to submit daily activity.'
        if (res.status === 400) msg = 'Validation error from server.'
        else if (res.status === 401) msg = 'Unauthorized. Please login again.'
        else if (res.status === 403) msg = 'Forbidden to submit activity.'
        else if (res.status === 404) msg = 'Submission endpoint not found.'
        else if (res.status >= 500) msg = 'Server error submitting activity.'
        setSubmitError(msg)
        return
      }
      // optional parse
      try { await res.json() } catch {}
      setShowSuccessDialog(true)
    } catch (e) {
      setSubmitError('Unexpected network error submitting activity.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleCloseDialog = () => {
    setShowSuccessDialog(false)
    // Reset form after successful submission
    setFormData({
      date: new Date().toISOString().split('T')[0],
      dern: "",
      investigator: "",
      activityDesc: ""
    })
    setSubmitError(null)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-white px-6 py-3 rounded-lg shadow-sm mb-4">
            <Search className="h-6 w-6 text-blue-600" />
            <span className="text-xl font-bold text-slate-700">DERN Reporting System</span>
          </div>
        </div>

        <Card className="shadow-xl border-0">
          <CardHeader className="bg-slate-800 text-white rounded-t-lg">
            <CardTitle className="text-center">
              <h1 className="text-3xl font-bold mb-2">Daily Activity Report</h1>
              <p className="text-slate-300">Complete all sections for accurate reporting</p>
            </CardTitle>
          </CardHeader>
          
          <CardContent className="p-8">
            <div className="space-y-8">
              {/* Report Information Section */}
              <div className="space-y-6 pb-6 border-b border-slate-200">
                <h2 className="text-xl font-semibold text-slate-700 border-b-2 border-blue-500 pb-2 inline-block">
                  Report Information
                </h2>
                
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="date" className="text-slate-600 font-medium">
                      Date <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      type="date"
                      id="date"
                      value={formData.date}
                      onChange={(e) => handleInputChange("date", e.target.value)}
                      required
                      className="border-slate-300 focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="dern" className="text-slate-600 font-medium">
                      DERN Number <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      value={formData.dern}
                      onValueChange={(value) => handleInputChange("dern", value)}
                      disabled={dernLoading || !!dernError}
                    >
                      <SelectTrigger className="border-slate-300 focus:border-blue-500">
                        <SelectValue placeholder={dernLoading ? 'Loading...' : (dernError ? 'Error loading DERN' : 'Select DERN Number')} />
                      </SelectTrigger>
                      <SelectContent>
                        {dernList.map((d) => (
                          <SelectItem key={d} value={d}>{d}</SelectItem>
                        ))}
                        {(!dernLoading && dernList.length === 0 && !dernError) && (
                          <div className="px-2 py-1 text-xs text-slate-500">No DERN numbers available</div>
                        )}
                      </SelectContent>
                    </Select>
                    {dernError && (
                      <p className="text-xs text-red-600 flex items-center gap-2">
                        {dernError}
                        <Button type="button" variant="outline" size="sm" className="h-5 px-2 text-xs" onClick={fetchDernNumbers}>Retry</Button>
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="investigator" className="text-slate-600 font-medium">
                    Investigator Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="text"
                    id="investigator"
                    value={formData.investigator}
                    onChange={(e) => handleInputChange("investigator", e.target.value)}
                    placeholder="Enter investigator name"
                    required
                    className="border-slate-300 focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Activity Details Section */}
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-slate-700 border-b-2 border-blue-500 pb-2 inline-block">
                  Activity Details
                </h2>
                
                <div className="space-y-2">
                  <Label htmlFor="activity-desc" className="text-slate-600 font-medium">
                    Activity Description <span className="text-red-500">*</span>
                  </Label>
                  <Textarea
                    id="activity-desc"
                    value={formData.activityDesc}
                    onChange={(e) => handleInputChange("activityDesc", e.target.value)}
                    placeholder="Provide a detailed description of today's activities..."
                    required
                    className="min-h-[150px] border-slate-300 focus:border-blue-500 focus:ring-blue-500 resize-y"
                  />
                  <p className="text-sm text-slate-500 mt-1">
                    Include methods used, locations visited, persons interviewed, evidence collected, etc.
                  </p>
                </div>
              </div>

              {/* Submit Button */}
              {submitError && (
                <p className="text-sm text-red-600 -mt-2">{submitError}</p>
              )}
              <Button
                onClick={handleSubmit}
                disabled={submitting || dernLoading}
                className="w-full bg-gradient-to-r from-blue-600 to-slate-700 hover:from-blue-700 hover:to-slate-800 text-white font-semibold py-4 text-lg transition-all duration-300 hover:shadow-lg transform hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {submitting ? 'Submitting...' : 'Submit Daily Report'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Success Dialog */}
        <AlertDialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Report Submitted Successfully!</AlertDialogTitle>
              <AlertDialogDescription>
                Your daily activity report has been submitted and recorded in the system.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogAction onClick={handleCloseDialog}>
              Continue
            </AlertDialogAction>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
}
