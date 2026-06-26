"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Database, Download, Calendar } from "lucide-react"
import { useLanguage } from "@/lib/i18n"
import { withBase } from "@/lib/config"
import { useToast } from "@/hooks/use-toast"

export function BackupExport() {
  const { t } = useLanguage()
  const { toast } = useToast()
  const [isBackingUp, setIsBackingUp] = useState(false)
  const [backupProgress, setBackupProgress] = useState<number | null>(null)
  const [selectedTables, setSelectedTables] = useState<string[]>([])
  const [exportFormat, setExportFormat] = useState("json")
  const [backups, setBackups] = useState<BackupEntry[]>([])

  // Types
  interface TableDef {
    id: string
    name: string
    records?: number
  }

  interface BackupEntry {
    id: string
    createdAt: string // ISO
    sizeBytes: number
    tables: string[]
    format: string
    fileName: string
    // raw JSON/text data representation (already stringified for json; placeholder for others)
    data: string
  }

  const [tables, setTables] = useState<TableDef[]>([])
  const [loadingTables, setLoadingTables] = useState(false)
  const [tablesError, setTablesError] = useState<string | null>(null)
  const [lastFetchedAt, setLastFetchedAt] = useState<string | null>(null)

  // Helpers to persist backup history (simple localStorage — could be replaced with API later)
  const STORAGE_KEY = "cis.backups"

  const loadBackups = () => {
    if (typeof window === "undefined") return
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return
      const parsed: BackupEntry[] = JSON.parse(raw)
      setBackups(parsed)
    } catch (e) {
      console.warn("Failed to load backups", e)
    }
  }

  const saveBackups = (next: BackupEntry[]) => {
    if (typeof window === "undefined") return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    } catch (e) {
      console.warn("Failed to save backups", e)
    }
  }

  const fetchTables = async () => {
    setLoadingTables(true)
    setTablesError(null)
    try {
      const token = typeof window !== 'undefined' ? (localStorage.getItem('token') || localStorage.getItem('authToken')) : null
      const res = await fetch(withBase('/api/backup/tables'), {
        cache: 'no-store',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      })
      if (!res.ok) throw new Error(`Failed to load tables: ${res.status}`)
      const data = await res.json()
      const loaded: TableDef[] = (data.tables || []).map((t: any) => ({ id: t.id, name: t.name, records: t.records }))
      setTables(loaded)
      setLastFetchedAt(new Date().toLocaleTimeString())
    } catch (e: any) {
      setTablesError(e.message || 'Error loading tables')
    } finally {
      setLoadingTables(false)
    }
  }

  useEffect(() => {
    loadBackups()
    fetchTables()
  }, [])

  const handleBackup = async () => {
    if (loadingTables) return
    if (!selectedTables.length) {
      toast({ title: "No tables selected", description: "Please choose at least one table to back up.", variant: "destructive" })
      return
    }
    // Allow backend default format if user leaves it blank ("format": "")
    const allowedFormats = ["json", "csv", "xml", "sql"] as const
    if (exportFormat !== "" && !allowedFormats.includes(exportFormat as any)) {
      toast({ title: "Invalid format", description: `Format '${exportFormat}' is not supported.`, variant: "destructive" })
      return
    }
    setIsBackingUp(true)
    setBackupProgress(null) // Real API call: we don't have granular progress yet
    try {
      const token = typeof window !== 'undefined' ? (localStorage.getItem('token') || localStorage.getItem('authToken')) : null
      const res = await fetch(withBase('/api/backup/dynamic_export'), {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        // Body MUST match required shape: { "tables": [...], "format": "" | <value> }
        body: JSON.stringify({ tables: selectedTables, format: exportFormat ?? "" })
      })
      if (!res.ok) {
        const bodyText = await res.text()
        console.error('Backup failed', bodyText)
        if (res.status === 401 || res.status === 403) {
          toast({ title: "Unauthorized", description: "You don't have permission to create backups.", variant: "destructive" })
        } else {
          let detail: string | undefined
          try { detail = JSON.parse(bodyText)?.error } catch {}
          toast({ title: "Backup failed", description: detail || bodyText || `Status ${res.status}`, variant: "destructive" })
        }
        setIsBackingUp(false)
        return
      }
      const blob = await res.blob()
      const fileName = res.headers.get('X-Backup-Filename') || `backup-${Date.now()}.${exportFormat}`
      const createdAt = new Date().toISOString()
      const reader = new FileReader()
      reader.onload = () => {
        const text = reader.result as string
        // Safe UUID generation (polyfill for environments where crypto.randomUUID is unavailable)
        const safeRandomUUID = () => {
          try {
            if (typeof crypto !== 'undefined') {
              // Modern API
              if (typeof (crypto as any).randomUUID === 'function') {
                return (crypto as any).randomUUID()
              }
              // Fallback using getRandomValues to build a RFC4122 v4 UUID
              if (typeof crypto.getRandomValues === 'function') {
                const bytes = new Uint8Array(16)
                crypto.getRandomValues(bytes)
                // Per RFC 4122 section 4.4
                bytes[6] = (bytes[6] & 0x0f) | 0x40 // version 4
                bytes[8] = (bytes[8] & 0x3f) | 0x80 // variant 10
                const byteToHex: string[] = []
                for (let i = 0; i < 256; ++i) byteToHex.push((i + 0x100).toString(16).substring(1))
                const bth = byteToHex
                return (
                  bth[bytes[0]] + bth[bytes[1]] + bth[bytes[2]] + bth[bytes[3]] + '-' +
                  bth[bytes[4]] + bth[bytes[5]] + '-' +
                  bth[bytes[6]] + bth[bytes[7]] + '-' +
                  bth[bytes[8]] + bth[bytes[9]] + '-' +
                  bth[bytes[10]] + bth[bytes[11]] + bth[bytes[12]] + bth[bytes[13]] + bth[bytes[14]] + bth[bytes[15]]
                )
              }
            }
          } catch {
            // swallow and continue to math fallback
          }
          // Very last-resort (not cryptographically strong) fallback
          return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
            const r = Math.random() * 16 | 0
            const v = c === 'x' ? r : (r & 0x3) | 0x8
            return v.toString(16)
          })
        }
        const newEntry: BackupEntry = {
          id: safeRandomUUID(),
            createdAt,
            sizeBytes: blob.size,
            tables: selectedTables,
            format: exportFormat,
            fileName,
            data: text,
        }
        const nextBackups = [newEntry, ...backups].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        setBackups(nextBackups)
        saveBackups(nextBackups)
        handleDownload(newEntry)
        toast({ title: "Backup created", description: `${fileName} • ${humanFileSize(blob.size)} • ${selectedTables.length} table${selectedTables.length>1?'s':''}` })
        setIsBackingUp(false)
      }
      reader.readAsText(blob)
    } catch (e: unknown) {
      console.error('Error creating backup', e)
      const msg = typeof e === 'object' && e && 'message' in e ? (e as any).message : 'Unexpected error while creating backup'
      toast({ title: "Error", description: msg, variant: "destructive" })
      setIsBackingUp(false)
    }
  }

  const handleTableSelection = (tableId: string, checked: boolean) => {
    if (checked) {
      setSelectedTables([...selectedTables, tableId])
    } else {
      setSelectedTables(selectedTables.filter((id) => id !== tableId))
    }
  }

  const selectAllTables = () => {
    setSelectedTables(tables.map((table) => table.id))
  }

  const clearSelection = () => {
    setSelectedTables([])
  }

  const humanFileSize = (bytes: number) => {
    if (bytes === 0) return "0 B"
    const k = 1024
    const sizes = ["B", "KB", "MB", "GB", "TB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${(bytes / Math.pow(k, i)).toFixed( (i === 0) ? 0 : 1)} ${sizes[i]}`
  }

  const handleDownload = (entry: BackupEntry) => {
    const blob = new Blob([entry.data], { type: entry.format === "json" ? "application/json" : "text/plain" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = entry.fileName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const clearHistory = () => {
    setBackups([])
    saveBackups([])
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Backup & Export</h1>
          <p className="text-gray-600">Backup system data and export reports</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Database className="mr-2 h-5 w-5" />
              Database Backup
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Export Format</label>
              <Select value={exportFormat} onValueChange={setExportFormat}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="json">JSON</SelectItem>
                  <SelectItem value="csv">CSV</SelectItem>
                  <SelectItem value="xml">XML</SelectItem>
                  <SelectItem value="sql">SQL</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <div className="flex flex-wrap gap-2 justify-between items-center mb-2">
                <label className="text-sm font-medium">Select Tables</label>
                <div className="flex items-center gap-2">
                  {lastFetchedAt && !loadingTables && !tablesError && (
                    <span className="text-[10px] text-muted-foreground">Updated {lastFetchedAt}</span>
                  )}
                  <span className="text-xs text-muted-foreground">{selectedTables.length} selected</span>
                  <Button variant="outline" size="sm" onClick={fetchTables} disabled={loadingTables}>
                    {loadingTables ? 'Refreshing...' : 'Refresh'}
                  </Button>
                  <Button variant="outline" size="sm" onClick={selectAllTables} disabled={loadingTables || tables.length === 0}>
                    Select All
                  </Button>
                  <Button variant="outline" size="sm" onClick={clearSelection} disabled={loadingTables || selectedTables.length === 0}>
                    Clear
                  </Button>
                </div>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {loadingTables && <p className="text-sm text-muted-foreground">Loading tables...</p>}
                {tablesError && !loadingTables && (
                  <p className="text-sm text-red-600">{tablesError}</p>
                )}
                {!loadingTables && !tablesError && tables.length === 0 && (
                  <p className="text-sm text-muted-foreground">No tables available.</p>
                )}
                {tables.map((table) => (
                  <div key={table.id} className="flex items-center space-x-3 p-2 border rounded">
                    <Checkbox
                      checked={selectedTables.includes(table.id)}
                      onCheckedChange={(checked) => handleTableSelection(table.id, checked as boolean)}
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{table.name}</p>
                      {typeof table.records === 'number' && (
                        <p className="text-xs text-gray-500">{table.records} records</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {isBackingUp && (
              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex justify-between">
                  <span>Requesting backup from server...</span>
                  {backupProgress !== null && <span>{backupProgress}%</span>}
                </div>
                {backupProgress !== null && <Progress value={backupProgress} />}
              </div>
            )}

            <Button onClick={handleBackup} disabled={selectedTables.length === 0 || isBackingUp || loadingTables || tables.length === 0} className="w-full">
              <Download className="mr-2 h-4 w-4" />
              {isBackingUp ? "Creating Backup..." : "Create Backup"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center">
              <Calendar className="mr-2 h-5 w-5" />
              Backup History
            </CardTitle>
            {backups.length > 0 && (
              <Button variant="outline" size="sm" onClick={clearHistory}>
                Clear History
              </Button>
            )}
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
              {backups.length === 0 && (
                <p className="text-sm text-muted-foreground">No backups yet. Create your first backup to see it listed here.</p>
              )}
              {backups.map((b) => {
                const date = new Date(b.createdAt)
                return (
                  <div key={b.id} className="p-3 border rounded space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{date.toLocaleString()}</p>
                        <p className="text-xs text-gray-500">
                          {humanFileSize(b.sizeBytes)} • {b.tables.length} {b.tables.length === 1 ? "table" : "tables"} • {b.format.toUpperCase()}
                        </p>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => handleDownload(b)}>
                        <Download className="h-3 w-3 mr-1" /> Download
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {b.tables.map(tid => {
                        const tbl = tables.find(t => t.id === tid)
                        return (
                          <span key={tid} className="rounded bg-muted px-2 py-0.5 text-[10px] font-medium">
                            {tbl ? tbl.name : tid}
                          </span>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
