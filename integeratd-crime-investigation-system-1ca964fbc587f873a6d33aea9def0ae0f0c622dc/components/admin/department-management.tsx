"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Plus, Edit, Trash2, Eye } from "lucide-react"
import { useLanguage } from "@/lib/i18n"

interface Department {
  id: string
  name: string
  description: string
  crimes: string[]
  isActive: boolean
}

// Shape returned by the backend API
interface APIDepartment {
  id?: number | string
  name?: string
  description?: string | null
  crimes?: string[] | string | null
  isActive?: boolean | string | number
}

export function DepartmentManagement() {
  const { t } = useLanguage()
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null)
  const [newDepartment, setNewDepartment] = useState({
    name: "",
    description: "",
    crimes: "",
  })
  const [creating, setCreating] = useState<boolean>(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [editDepartment, setEditDepartment] = useState({
    name: "",
    description: "",
    crimes: "",
    isActive: true,
  })
  const [updating, setUpdating] = useState<boolean>(false)
  const [updateError, setUpdateError] = useState<string | null>(null)
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set())
  const [deleteError, setDeleteError] = useState<string | null>(null)

  // Helpers
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

  const mapApiDepartment = (d: APIDepartment, idx: number): Department => {
    const rawCrimes = d.crimes
    let crimes: string[] = []
    if (Array.isArray(rawCrimes)) crimes = rawCrimes.filter((c): c is string => typeof c === "string")
    else if (typeof rawCrimes === "string") crimes = rawCrimes.split(",").map((c) => c.trim()).filter(Boolean)

    const isActiveVal = d.isActive
    let isActive = false
    if (typeof isActiveVal === "boolean") isActive = isActiveVal
    else if (typeof isActiveVal === "number") isActive = isActiveVal !== 0
    else if (typeof isActiveVal === "string") {
      const s = isActiveVal.toLowerCase()
      isActive = s === "true" || s === "active" || s === "1" || s === "enabled"
    }

    return {
      id: d.id != null ? String(d.id) : String(idx + 1),
      name: d.name || "",
      description: d.description || "",
      crimes,
      isActive,
    }
  }

  const fetchDepartments = async (opts?: { silent?: boolean }) => {
    const silent = opts?.silent
    setError(null)
    if (!silent) setLoading(true)
    try {
      const base = (process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(/\/$/, "")
  const url = `${base}/api/departments`
      const headers: Record<string, string> = {}
      const token = getAuthToken()
      if (token) headers["Authorization"] = `Bearer ${token}`

      // Optional timeout to avoid hanging requests
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 15000)
      const res = await fetch(url, { method: "GET", headers, signal: controller.signal })
      clearTimeout(timeout)
      if (!res.ok) {
        let msg = "Failed to load departments."
        switch (res.status) {
          case 400:
            msg = "Invalid request."
            break
          case 401:
            msg = "Unauthorized. Please sign in again."
            break
          case 403:
            msg = "Forbidden. You don't have access to view departments."
            break
          case 404:
            msg = "Departments endpoint not found."
            break
          default:
            if (res.status >= 500) msg = "Server error while loading departments."
        }
        setDepartments([])
        setError(msg)
        // Log details for debugging without leaking sensitive data
        console.error("Departments API error", { url, status: res.status, statusText: res.statusText, hasToken: !!token })
        return
      }

      // Robust parsing: accept array, wrapped object (e.g., { departments: [...] }), single object, or empty
      const raw: unknown = await res.json().catch(() => null)
      let list: APIDepartment[] = []
      if (Array.isArray(raw)) {
        list = raw as APIDepartment[]
      } else if (raw && typeof raw === "object") {
        const obj = raw as Record<string, unknown>
        const candidates = [
          obj.departments,
          obj.data,
          obj.results,
          obj.items,
        ]
        const found = candidates.find((c) => Array.isArray(c)) as unknown[] | undefined
        if (found) {
          list = found as APIDepartment[]
        } else {
          list = [obj as unknown as APIDepartment]
        }
      }

      setDepartments(list.map(mapApiDepartment))
    } catch (e) {
      const isAbort = e instanceof DOMException && e.name === "AbortError"
      const message = e instanceof Error ? e.message : String(e)
      const likelyCors = message.toLowerCase().includes("failed to fetch") || message.toLowerCase().includes("networkerror")
      setError(isAbort ? "Request timed out while loading departments." : likelyCors ? "Network/CORS error while loading departments." : "Network error while loading departments.")
      console.error("Departments fetch failed", { message, isAbort, likelyCors })
      setDepartments([])
    } finally {
      if (!silent) setLoading(false)
    }
  }

  useEffect(() => {
    fetchDepartments()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const parseCrimes = (value: string): string[] =>
    value
      .split(",")
      .map((c) => c.trim())
      .filter((c) => c.length > 0)

  const handleCreateDepartment = async () => {
    setCreateError(null)
    setCreating(true)
    try {
      const base = (process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(/\/$/, "")
      const url = `${base}/api/departments`
      const headers: Record<string, string> = { "Content-Type": "application/json" }
      const token = getAuthToken()
      if (token) headers["Authorization"] = `Bearer ${token}`

      const payload = {
        name: newDepartment.name,
        description: newDepartment.description,
        crimes: parseCrimes(newDepartment.crimes),
        isActive: true,
      }

      const res = await fetch(url, { method: "POST", headers, body: JSON.stringify(payload) })
      if (!res.ok) {
        let msg = "Failed to create department."
        switch (res.status) {
          case 400:
            msg = "Invalid department data."
            break
          case 401:
            msg = "Unauthorized. Please sign in again."
            break
          case 403:
            msg = "Forbidden. You don't have access to create departments."
            break
          default:
            if (res.status >= 500) msg = "Server error while creating department."
        }
        throw new Error(msg)
      }
      const raw: unknown = await res.json().catch(() => null)
      let created: APIDepartment | null = null
      if (raw && typeof raw === "object") {
        const obj = raw as Record<string, unknown>
        const maybeList = Array.isArray(obj.departments) ? (obj.departments as APIDepartment[]) : null
        created = maybeList && maybeList.length ? maybeList[maybeList.length - 1] : (raw as APIDepartment)
      }
      if (!created) {
        // fallback to local (will be replaced by reload)
        const department: Department = {
          id: Date.now().toString(),
          name: newDepartment.name,
          description: newDepartment.description,
          crimes: parseCrimes(newDepartment.crimes),
          isActive: true,
        }
        setDepartments((prev) => [...prev, department])
      } else {
        setDepartments((prev) => [...prev, mapApiDepartment(created!, prev.length)])
      }
      setNewDepartment({ name: "", description: "", crimes: "" })
      setIsCreateDialogOpen(false)
      // Reload from backend to ensure authoritative state
      fetchDepartments({ silent: true })
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : "Unknown error while creating department.")
    } finally {
      setCreating(false)
    }
  }

  const handleEditDepartment = (department: Department) => {
    setSelectedDepartment(department)
    setEditDepartment({
      name: department.name,
      description: department.description,
      crimes: department.crimes.join(", "),
      isActive: department.isActive,
    })
    setIsEditDialogOpen(true)
  }

  const handleUpdateDepartment = async () => {
    if (!selectedDepartment) return
    setUpdateError(null)
    setUpdating(true)
    try {
      const base = (process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(/\/$/, "")
      const url = `${base}/api/departments/${encodeURIComponent(String(selectedDepartment.id))}`
      const headers: Record<string, string> = { "Content-Type": "application/json" }
      const token = getAuthToken()
      if (token) headers["Authorization"] = `Bearer ${token}`

      const payload = {
        id: selectedDepartment.id,
        name: editDepartment.name,
        description: editDepartment.description,
        crimes: parseCrimes(editDepartment.crimes),
        isActive: editDepartment.isActive,
      }

      const res = await fetch(url, { method: "PUT", headers, body: JSON.stringify(payload) })
      if (!res.ok) {
        let msg = "Failed to update department."
        switch (res.status) {
          case 400:
            msg = "Invalid department data."
            break
          case 401:
            msg = "Unauthorized. Please sign in again."
            break
          case 403:
            msg = "Forbidden. You don't have access to update departments."
            break
          case 404:
            msg = "Departments endpoint not found."
            break
          default:
            if (res.status >= 500) msg = "Server error while updating department."
        }
        throw new Error(msg)
      }
      const raw: unknown = await res.json().catch(() => null)
      let updated: APIDepartment | null = null
      if (raw && typeof raw === "object") {
        const obj = raw as Record<string, unknown>
        const maybeList = Array.isArray(obj.departments) ? (obj.departments as APIDepartment[]) : null
        // Try to find matching id in list if available
        if (maybeList) {
          updated = maybeList.find((d) => String(d.id) === String(selectedDepartment.id)) || null
        } else {
          updated = raw as APIDepartment
        }
      }
      if (updated) {
        const mapped = mapApiDepartment(updated, 0)
        setDepartments((prev) => prev.map((d) => (d.id === selectedDepartment.id ? mapped : d)))
      } else {
        // Fallback to local update (followed by reload)
        setDepartments((prev) =>
          prev.map((dept) =>
            dept.id === selectedDepartment.id
              ? {
                  ...dept,
                  name: editDepartment.name,
                  description: editDepartment.description,
                  crimes: parseCrimes(editDepartment.crimes),
                  isActive: editDepartment.isActive,
                }
              : dept,
          ),
        )
      }
      setIsEditDialogOpen(false)
      setSelectedDepartment(null)
      // Refresh list to ensure consistency
      fetchDepartments({ silent: true })
    } catch (e) {
      setUpdateError(e instanceof Error ? e.message : "Unknown error while updating department.")
    } finally {
      setUpdating(false)
    }
  }

  const handleDeleteDepartment = async (departmentId: string) => {
    setDeleteError(null)
    setDeletingIds((prev) => new Set(prev).add(departmentId))
    try {
      const base = (process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(/\/$/, "")
      const url = `${base}/api/departments/${encodeURIComponent(String(departmentId))}`
      const headers: Record<string, string> = {}
      const token = getAuthToken()
      if (token) headers["Authorization"] = `Bearer ${token}`

      const res = await fetch(url, { method: "DELETE", headers })
      if (!res.ok) {
        let msg = "Failed to delete department."
        switch (res.status) {
          case 400:
            msg = "Invalid delete request."
            break
          case 401:
            msg = "Unauthorized. Please sign in again."
            break
          case 403:
            msg = "Forbidden. You don't have access to delete departments."
            break
          case 404:
            msg = "Department not found."
            break
          default:
            if (res.status >= 500) msg = "Server error while deleting department."
        }
        throw new Error(msg)
      }

      // Optimistically remove locally then refresh
      setDepartments((prev) => prev.filter((dept) => dept.id !== departmentId))
      fetchDepartments({ silent: true })
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error while deleting department."
      setDeleteError(msg)
      console.error("Delete department failed", { departmentId, msg })
    } finally {
      setDeletingIds((prev) => {
        const next = new Set(prev)
        next.delete(departmentId)
        return next
      })
    }
  }

  const handleViewDepartment = (department: Department) => {
    setSelectedDepartment(department)
    setIsViewDialogOpen(true)
  }

  // Status is now managed only via the Edit dialog toggle

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">{t.departmentManagement.title}</h1>
          <p className="text-gray-600">{t.departmentManagement.manageDepartmentsAndCrimes}</p>
          {error && <p className="text-sm text-red-600 mt-1">{error}</p>}
          {deleteError && <p className="text-sm text-red-600 mt-1">{deleteError}</p>}
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              {t.departmentManagement.createDepartment}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t.departmentManagement.createNewDepartment}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {createError && (
                <p className="text-sm text-red-600 -mb-2">{createError}</p>
              )}
              <div>
                <Label htmlFor="name">{t.departmentManagement.departmentName}</Label>
                <Input
                  id="name"
                  value={newDepartment.name}
                  onChange={(e) => setNewDepartment({ ...newDepartment, name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="description">{t.departmentManagement.description}</Label>
                <Textarea
                  id="description"
                  value={newDepartment.description}
                  onChange={(e) => setNewDepartment({ ...newDepartment, description: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="crimes">
                  {t.departmentManagement.crimes} ({t.departmentManagement.separateWithCommas})
                </Label>
                <Textarea
                  id="crimes"
                  value={newDepartment.crimes}
                  onChange={(e) => setNewDepartment({ ...newDepartment, crimes: e.target.value })}
                  placeholder="Crime 1, Crime 2, Crime 3"
                />
              </div>
              <Button onClick={handleCreateDepartment} className="w-full" disabled={creating}>
                {creating ? "Creating..." : t.departmentManagement.createDepartment}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <Card>
          <CardContent className="py-8 text-center text-gray-500">Loading departments...</CardContent>
        </Card>
      ) : departments.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-gray-500">No departments found.</CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {departments.map((department) => (
            <Card key={department.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {department.name}
                      <Badge
                        variant={department.isActive ? "default" : "secondary"}
                        className="select-none"
                      >
                        {department.isActive ? t.departmentManagement.active : t.departmentManagement.inactive}
                      </Badge>
                    </CardTitle>
                    <p className="text-gray-600 mt-1">{department.description}</p>
                  </div>
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm" onClick={() => handleViewDepartment(department)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleEditDepartment(department)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm" disabled={deletingIds.has(department.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Department</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete this department? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeleteDepartment(department.id)}
                            disabled={deletingIds.has(department.id)}
                          >
                            {deletingIds.has(department.id) ? "Deleting..." : "Delete"}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div>
                  <h4 className="font-medium mb-2">{t.departmentManagement.crimes}:</h4>
                  <div className="flex flex-wrap gap-2">
                    {department.crimes.map((crime, index) => (
                      <Badge key={index} variant="outline">
                        {crime}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Department</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {updateError && (
              <p className="text-sm text-red-600 -mb-2">{updateError}</p>
            )}
            <div>
              <Label htmlFor="editName">Department Name</Label>
              <Input
                id="editName"
                value={editDepartment.name}
                onChange={(e) => setEditDepartment({ ...editDepartment, name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="editDescription">Description</Label>
              <Textarea
                id="editDescription"
                value={editDepartment.description}
                onChange={(e) => setEditDepartment({ ...editDepartment, description: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="editCrimes">Crimes (separate with commas)</Label>
              <Textarea
                id="editCrimes"
                value={editDepartment.crimes}
                onChange={(e) => setEditDepartment({ ...editDepartment, crimes: e.target.value })}
              />
            </div>
            <div className="flex items-center space-x-2">
              <input
                id="editActive"
                type="checkbox"
                className="h-4 w-4 accent-primary"
                checked={editDepartment.isActive}
                onChange={(e) => setEditDepartment({ ...editDepartment, isActive: e.target.checked })}
              />
              <Label htmlFor="editActive" className="cursor-pointer">
                {editDepartment.isActive ? t.departmentManagement.active : t.departmentManagement.inactive}
              </Label>
            </div>
            <div className="flex space-x-2">
              <Button onClick={handleUpdateDepartment} className="flex-1" disabled={updating}>
                {updating ? "Saving..." : "Update Department"}
              </Button>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} className="flex-1">
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Department Details</DialogTitle>
          </DialogHeader>
          {selectedDepartment && (
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium text-gray-500">Department Name</Label>
                <p className="text-lg font-semibold">{selectedDepartment.name}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-500">Description</Label>
                <p className="text-sm">{selectedDepartment.description}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-500">Status</Label>
                <Badge variant={selectedDepartment.isActive ? "default" : "secondary"}>
                  {selectedDepartment.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-500">Associated Crimes</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {selectedDepartment.crimes.map((crime, index) => (
                    <Badge key={index} variant="outline">
                      {crime}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
