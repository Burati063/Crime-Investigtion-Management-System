"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
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
import { Plus, Edit, Trash2, Search, Eye } from "lucide-react"
import { useLanguage } from "@/lib/i18n"

interface User {
  id: string
  fullName: string
  username: string
  email: string
  role: string
  rank: string
  department: string
  status: string
  createdAt: string
}

// Shape returned by the backend API
interface APIUser {
  id?: string
  email: string
  username: string
  first_name?: string
  last_name?: string
  rank?: string
  status?: string | boolean
  created_at?: string | null
  role?: string | { name?: string }
  department?: string
}

// Department types from backend
interface APIDepartment {
  id: number
  name: string
  isActive?: boolean
  description?: string
  crimes?: string[]
}
interface DepartmentListResponse {
  departments?: APIDepartment[]
}

export function UserManagement() {
  const { t } = useLanguage()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  // Departments state
  const [departments, setDepartments] = useState<APIDepartment[]>([])
  const [departmentsLoading, setDepartmentsLoading] = useState<boolean>(false)
  const [departmentsError, setDepartmentsError] = useState<string | null>(null)

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

  const mapApiUser = (u: APIUser, idx: number): User => {
    const first = u.first_name || ""
    const last = u.last_name || ""
    const fullName = `${first} ${last}`.trim() || u.username || u.email
    const rawStatus = u.status
    let statusStr: string
    if (typeof rawStatus === "boolean") {
      statusStr = rawStatus ? "active" : "inactive"
    } else {
      const lower = (rawStatus || "").toString().trim().toLowerCase()
      if (["true", "active", "approved", "enabled"].includes(lower)) statusStr = "active"
      else if (["false", "inactive", "disabled", "blocked"].includes(lower)) statusStr = "inactive"
      else statusStr = lower || "inactive"
    }
    const role = typeof u.role === "string" ? u.role : u.role?.name || ""
    return {
      id: u.id || String(idx + 1),
      fullName,
      username: u.username,
      email: u.email,
      role: role || "",
      rank: u.rank || "",
      department: u.department || "",
      status: statusStr,
      createdAt: (u.created_at || "").toString().split("T")[0] || "",
    }
  }

  const fetchUsers = async () => {
    setError(null)
    setLoading(true)
    try {
      const base = (process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(/\/$/, "")
      const url = `${base}/api/users/`
      const headers: Record<string, string> = { "Content-Type": "application/json" }
      const token = getAuthToken()
      if (token) headers["Authorization"] = `Bearer ${token}`
      else {
        // If token is required, you might want to show an error; keeping the call without token in case endpoint is public.
      }
      const res = await fetch(url, { headers, method: "GET" })
      if (!res.ok) {
        let msg = "Failed to load users."
        switch (res.status) {
          case 400:
            msg = "Invalid request."
            break
          case 401:
            msg = "Unauthorized. Please sign in again."
            break
          case 403:
            msg = "Forbidden. You don't have access to view users."
            break
          case 404:
            msg = "Users endpoint not found."
            break
          default:
            if (res.status >= 500) msg = "Server error while loading users."
        }
        setError(msg)
        setUsers([])
        return
      }
      const data = (await res.json().catch(() => [])) as APIUser[]
      const list = Array.isArray(data) ? data : []
      setUsers(list.map(mapApiUser))
    } catch (e) {
      setError("Network error while loading users.")
      setUsers([])
    } finally {
      setLoading(false)
    }
  }

  const fetchDepartments = async () => {
    setDepartmentsError(null)
    setDepartmentsLoading(true)
    try {
      const base = (process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(/\/$/, "")
      const url = `${base}/api/departments`
      const headers: Record<string, string> = { "Content-Type": "application/json" }
      const token = getAuthToken()
      if (token) headers["Authorization"] = `Bearer ${token}`

      const res = await fetch(url, { headers, method: "GET" })
      if (!res.ok) {
        setDepartments([])
        return
      }
      const data = (await res.json().catch(() => ({}))) as DepartmentListResponse
      const list = Array.isArray(data?.departments) ? data.departments : []
      // Prefer only active departments when flag is provided
      const filtered = list.filter((d) => (typeof d.isActive === "boolean" ? d.isActive : true))
      setDepartments(filtered)
    } catch {
      setDepartments([])
      setDepartmentsError("Failed to load departments.")
    } finally {
      setDepartmentsLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
    fetchDepartments()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [updating, setUpdating] = useState<boolean>(false)
  const [updateError, setUpdateError] = useState<string | null>(null)
  const [newUser, setNewUser] = useState({
    firstName: "",
    lastName: "",
    username: "",
    email: "",
    role: "",
    rank: "",
    department: "",
    password: "",
  })
  const [creating, setCreating] = useState<boolean>(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [editUser, setEditUser] = useState({
    firstName: "",
    lastName: "",
    username: "",
    email: "",
    role: "",
    rank: "",
    department: "",
  })
  const [createErrors, setCreateErrors] = useState<Record<string, string>>({})
  const [editErrors, setEditErrors] = useState<Record<string, string>>({})
  const [editUserIsActive, setEditUserIsActive] = useState<boolean>(false) // retained for checkbox UI, derived from status
  const isActiveStatus = (status: string) => {
    const s = status.toLowerCase()
    return ["active", "approved", "enabled", "true"].includes(s)
  }

  const roles = ["admin", "pre_investigation", "department_head", "investigator", "prosecutor"]

  const ranks = [
    "Constable",
    "Assistant Sergeant",
    "Deputy Sergeant",
    "Sergeant",
    "Chief Sergeant",
    "Assistant Inspector",
    "Deputy Inspector",
    "Inspector",
    "Chief Inspector",
    "Deputy Commander",
    "Commander",
    "Assistant Commissioner",
    "Deputy Commissioner",
    "Commissioner",
    "Deputy Commissioner General",
    "Commissioner General"
  ]

  // departments now loaded dynamically from API

  const emailValid = (email: string) => /[^\s@]+@[^\s@]+\.[^\s@]+/.test(email)

  const validateCreate = () => {
    const errs: Record<string, string> = {}
    if (!newUser.firstName.trim()) errs.firstName = "First name is required"
    if (!newUser.lastName.trim()) errs.lastName = "Last name is required"
    if (!newUser.username.trim()) errs.username = "Username is required"
    if (!newUser.email.trim()) errs.email = "Email is required"
    else if (!emailValid(newUser.email)) errs.email = "Enter a valid email"
    if (!newUser.role.trim()) errs.role = "Role is required"
    if (!newUser.rank.trim()) errs.rank = "Rank is required"
    if (!newUser.department.trim()) errs.department = "Department is required"
    if (!newUser.password.trim()) errs.password = "Password is required"
    else if (newUser.password.length < 6) errs.password = "Password must be at least 6 characters"
    setCreateErrors(errs)
    return Object.keys(errs).length === 0
  }

  const validateEdit = () => {
    const errs: Record<string, string> = {}
    if (!editUser.firstName.trim()) errs.firstName = "First name is required"
    if (!editUser.lastName.trim()) errs.lastName = "Last name is required"
    if (!editUser.username.trim()) errs.username = "Username is required"
    if (!editUser.email.trim()) errs.email = "Email is required"
    else if (!emailValid(editUser.email)) errs.email = "Enter a valid email"
    if (!editUser.role.trim()) errs.role = "Role is required"
    if (!editUser.rank.trim()) errs.rank = "Rank is required"
    if (!editUser.department.trim()) errs.department = "Department is required"
    setEditErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleCreateUser = async () => {
    setCreateError(null)
    if (!validateCreate()) return
    setCreating(true)
    try {
      const base = (process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(/\/$/, "")
      const url = `${base}/api/users`
      const headers: Record<string, string> = { "Content-Type": "application/json" }
      const token = getAuthToken()
      if (token) headers["Authorization"] = `Bearer ${token}`

      const payload = {
        email: newUser.email,
        username: newUser.username,
        first_name: newUser.firstName || "",
        last_name: newUser.lastName || "",
        rank: newUser.rank,
        role: newUser.role,
        department: newUser.department, // attach selected department name
        password: newUser.password,
        status: "true",
      }

      const res = await fetch(url, { method: "POST", headers, body: JSON.stringify(payload) })
      if (!res.ok) {
        let msg = "Failed to create user."
        switch (res.status) {
          case 400:
            msg = "Invalid user data."
            break
          case 401:
            msg = "Unauthorized. Please sign in again."
            break
          case 403:
            msg = "Forbidden. You don't have access to create users."
            break
          default:
            if (res.status >= 500) msg = "Server error while creating user."
        }
        throw new Error(msg)
      }
      const apiUser = (await res.json().catch(() => null)) as APIUser | null
      if (apiUser) {
        setUsers((prev) => [...prev, mapApiUser(apiUser, prev.length)])
      } else {
        const user: User = {
          id: Date.now().toString(),
          fullName: `${newUser.firstName} ${newUser.lastName}`.trim(),
          username: newUser.username,
          email: newUser.email,
          role: newUser.role,
          rank: newUser.rank,
          department: newUser.department,
          status: "active",
          createdAt: new Date().toISOString().split("T")[0],
        }
        setUsers((prev) => [...prev, user])
      }
      setNewUser({ firstName: "", lastName: "", username: "", email: "", role: "", rank: "", department: "", password: "" })
      setIsCreateDialogOpen(false)
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : "Unknown error while creating user.")
    } finally {
      setCreating(false)
    }
  }

  const handleEditUser = (user: User) => {
    setSelectedUser(user)
    const parts = (user.fullName || "").trim().split(/\s+/)
    const firstName = parts[0] || ""
    const lastName = parts.slice(1).join(" ") || ""
    setEditUser({
      firstName,
      lastName,
      username: user.username,
      email: user.email,
      role: user.role,
      rank: user.rank,
      department: user.department,
    })
  setEditUserIsActive(isActiveStatus(user.status))
    setEditErrors({})
    setIsEditDialogOpen(true)
  }

  const handleUpdateUser = () => {
    if (!selectedUser) return
    if (!validateEdit()) return

    const base = (process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(/\/$/, "")
    const url = `${base}/api/users`

  // Take first and last name directly from fields
  const first_name = editUser.firstName || ""
  const last_name = editUser.lastName || ""

  // Status must be sent as specific string values understood by backend
  const status = editUserIsActive ? "active" : "inactive"

    const payload = {
      // Backend-required fields
      email: editUser.email,
      username: editUser.username,
      first_name,
      last_name,
      rank: editUser.rank,
      status, // stringified
      role: editUser.role,
      department: editUser.department,
      // Optionally include id if backend accepts it for routing
      id: selectedUser.id,
    }

    const headers: Record<string, string> = { "Content-Type": "application/json" }
    const token = getAuthToken()
    if (token) headers["Authorization"] = `Bearer ${token}`

    setUpdating(true)
    setUpdateError(null)
    fetch(url, {
      method: "PUT",
      headers,
      body: JSON.stringify(payload),
    })
      .then(async (res) => {
        if (!res.ok) {
          let msg = "Failed to update user."
          switch (res.status) {
            case 400:
              msg = "Invalid user data."
              break
            case 401:
              msg = "Unauthorized. Please sign in again."
              break
            case 403:
              msg = "Forbidden. You don't have access to update users."
              break
            case 404:
              msg = "Users endpoint not found."
              break
            default:
              if (res.status >= 500) msg = "Server error while updating user."
          }
          throw new Error(msg)
        }
        // If backend returns the updated user, prefer it; otherwise, fall back to local merge
        const data = await res
          .json()
          .catch(() => null as unknown as APIUser | null)
        return data
      })
      .then((apiUser) => {
        setUsers((prev) =>
          prev.map((u) => {
            if (u.id !== selectedUser.id) return u
            if (apiUser) return mapApiUser(apiUser, 0)
            // Fallback: merge local edits and reconstruct fullName
            const fullName = `${editUser.firstName} ${editUser.lastName}`.trim()
            return {
              ...u,
              fullName,
              username: editUser.username,
              email: editUser.email,
              role: editUser.role,
              rank: editUser.rank,
              department: editUser.department,
              status: editUserIsActive ? "active" : "inactive",
            }
          }),
        )
        setIsEditDialogOpen(false)
        setSelectedUser(null)
      })
      .catch((e: unknown) => {
        setUpdateError(e instanceof Error ? e.message : "Unknown error while updating user.")
      })
      .finally(() => setUpdating(false))
  }

  const handleDeleteUser = (userId: string) => {
    setUsers(users.filter((user) => user.id !== userId))
  }

  const handleViewUser = (user: User) => {
    setSelectedUser(user)
    setIsViewDialogOpen(true)
  }

  const filteredUsers = users.filter(
    (user) =>
      user.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.rank.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">{t.userManagement.title}</h1>
          <p className="text-gray-600">{t.userManagement.manageSystemUsers}</p>
          {error && <p className="text-sm text-red-600 mt-1">{error}</p>}
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button disabled={loading}>
              <Plus className="mr-2 h-4 w-4" />
              {t.userManagement.createUser}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t.userManagement.createNewUser}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {createError && (
                <p className="text-sm text-red-600 -mb-2">{createError}</p>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">First name</Label>
                  <Input
                    id="firstName"
                    value={newUser.firstName}
                    onChange={(e) => setNewUser({ ...newUser, firstName: e.target.value })}
                  />
                  {createErrors.firstName && (
                    <p className="text-xs text-red-600 mt-1">{createErrors.firstName}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="lastName">Last name</Label>
                  <Input
                    id="lastName"
                    value={newUser.lastName}
                    onChange={(e) => setNewUser({ ...newUser, lastName: e.target.value })}
                  />
                  {createErrors.lastName && (
                    <p className="text-xs text-red-600 mt-1">{createErrors.lastName}</p>
                  )}
                </div>
              </div>
              <div>
                <Label htmlFor="username">{t.userManagement.username}</Label>
                <Input
                  id="username"
                  value={newUser.username}
                  onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                />
                {createErrors.username && (
                  <p className="text-xs text-red-600 mt-1">{createErrors.username}</p>
                )}
              </div>
              <div>
                <Label htmlFor="email">{t.userManagement.email}</Label>
                <Input
                  id="email"
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                />
                {createErrors.email && (
                  <p className="text-xs text-red-600 mt-1">{createErrors.email}</p>
                )}
              </div>
              <div>
                <Label htmlFor="role">{t.userManagement.role}</Label>
                <Select onValueChange={(value) => setNewUser({ ...newUser, role: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder={t.userManagement.selectRole} />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((role) => (
                      <SelectItem key={role} value={role}>
                        {role}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {createErrors.role && (
                  <p className="text-xs text-red-600 mt-1">{createErrors.role}</p>
                )}
              </div>
              <div>
                <Label htmlFor="rank">Rank</Label>
                <Select onValueChange={(value) => setNewUser({ ...newUser, rank: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Rank" />
                  </SelectTrigger>
                  <SelectContent>
                    {ranks.map((rank) => (
                      <SelectItem key={rank} value={rank}>
                        {rank}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {createErrors.rank && (
                  <p className="text-xs text-red-600 mt-1">{createErrors.rank}</p>
                )}
              </div>
              <div>
                <Label htmlFor="department">{t.userManagement.department}</Label>
                <Select disabled={departmentsLoading} onValueChange={(value) => setNewUser({ ...newUser, department: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder={departmentsLoading ? "Loading departments..." : t.userManagement.selectDepartment} />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.name}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {departmentsError && (
                  <p className="text-xs text-red-600 mt-1">{departmentsError}</p>
                )}
                {createErrors.department && (
                  <p className="text-xs text-red-600 mt-1">{createErrors.department}</p>
                )}
              </div>
              <div>
                <Label htmlFor="password">{t.userManagement.password}</Label>
                <Input
                  id="password"
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                />
                {createErrors.password && (
                  <p className="text-xs text-red-600 mt-1">{createErrors.password}</p>
                )}
              </div>
              <Button onClick={handleCreateUser} className="w-full" disabled={creating}>
                {creating ? "Creating..." : t.userManagement.createUser}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>{t.userManagement.users}</CardTitle>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder={t.userManagement.searchUsers}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-64"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t.userManagement.fullName}</TableHead>
                  <TableHead>{t.userManagement.username}</TableHead>
                  <TableHead>{t.userManagement.email}</TableHead>
                  <TableHead>{t.userManagement.role}</TableHead>
                  <TableHead>Rank</TableHead>
                  <TableHead>{t.userManagement.department}</TableHead>
                  <TableHead>{t.userManagement.status}</TableHead>
                  <TableHead>{t.userManagement.actions}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-gray-500">
                      Loading users...
                    </TableCell>
                  </TableRow>
                ) : filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-gray-500">
                      No users found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.fullName}</TableCell>
                    <TableCell>{user.username}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.role}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {user.rank}
                      </Badge>
                    </TableCell>
                    <TableCell>{user.department}</TableCell>
                    <TableCell>
                      <Badge variant={isActiveStatus(user.status) ? "default" : "secondary"}>
                        {isActiveStatus(user.status) ? t.userManagement.active : t.userManagement.inactive}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm" onClick={() => handleViewUser(user)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleEditUser(user)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete user</AlertDialogTitle>
                              <AlertDialogDescription>Are you sure you want to delete this user? This action cannot be undone.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteUser(user.id)}>
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                )))
                }
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit user</DialogTitle>
          </DialogHeader>
          {updateError && (
            <p className="text-sm text-red-600 -mt-2">{updateError}</p>
          )}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="editFirstName">First name</Label>
                <Input
                  id="editFirstName"
                  value={editUser.firstName}
                  onChange={(e) => setEditUser({ ...editUser, firstName: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="editLastName">Last name</Label>
                <Input
                  id="editLastName"
                  value={editUser.lastName}
                  onChange={(e) => setEditUser({ ...editUser, lastName: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="editUsername">{t.userManagement.username}</Label>
              <Input
                id="editUsername"
                value={editUser.username}
                onChange={(e) => setEditUser({ ...editUser, username: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="editEmail">{t.userManagement.email}</Label>
              <Input
                id="editEmail"
                type="email"
                value={editUser.email}
                onChange={(e) => setEditUser({ ...editUser, email: e.target.value })}
              />
              {editErrors.email && (
                <p className="text-xs text-red-600 mt-1">{editErrors.email}</p>
              )}
            </div>
            <div>
              <Label htmlFor="editRole">{t.userManagement.role}</Label>
              <Select value={editUser.role} onValueChange={(value) => setEditUser({ ...editUser, role: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role} value={role}>
                      {role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {editErrors.role && (
                <p className="text-xs text-red-600 mt-1">{editErrors.role}</p>
              )}
            </div>
            <div>
              <Label htmlFor="editRank">Rank</Label>
              <Select value={editUser.rank} onValueChange={(value) => setEditUser({ ...editUser, rank: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ranks.map((rank) => (
                    <SelectItem key={rank} value={rank}>
                      {rank}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {editErrors.rank && (
                <p className="text-xs text-red-600 mt-1">{editErrors.rank}</p>
              )}
            </div>
            <div>
              <Label htmlFor="editDepartment">{t.userManagement.department}</Label>
              <Select
                disabled={departmentsLoading}
                value={editUser.department}
                onValueChange={(value) => setEditUser({ ...editUser, department: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.name}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {editErrors.department && (
                <p className="text-xs text-red-600 mt-1">{editErrors.department}</p>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox id="editActive" checked={editUserIsActive} onCheckedChange={(v) => setEditUserIsActive(!!v)} />
              <Label htmlFor="editActive" className="select-none cursor-pointer">
                {t.userManagement.status}: {editUserIsActive ? t.userManagement.active : t.userManagement.inactive}
              </Label>
            </div>
            <div className="flex space-x-2">
              <Button onClick={handleUpdateUser} className="flex-1" disabled={updating}>
                {updating ? "Saving..." : "Update user"}
              </Button>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} className="flex-1">
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>View user details</DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-500">{t.userManagement.fullName}</Label>
                  <p className="text-sm">{selectedUser.fullName}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">{t.userManagement.username}</Label>
                  <p className="text-sm">{selectedUser.username}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">{t.userManagement.email}</Label>
                  <p className="text-sm">{selectedUser.email}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">{t.userManagement.role}</Label>
                  <p className="text-sm">{selectedUser.role}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Rank</Label>
                  <Badge variant="outline" className="text-xs">
                    {selectedUser.rank}
                  </Badge>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">{t.userManagement.department}</Label>
                  <p className="text-sm">{selectedUser.department}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">{t.userManagement.status}</Label>
                  <Badge variant={isActiveStatus(selectedUser.status) ? "default" : "secondary"}>
                    {isActiveStatus(selectedUser.status) ? t.userManagement.active : t.userManagement.inactive}
                  </Badge>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Created At</Label>
                  <p className="text-sm">{selectedUser.createdAt}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}