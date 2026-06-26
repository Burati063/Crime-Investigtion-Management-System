"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Search,
  User,
  FileText,
  Eye,
  UserPlus,
  Users,
  UserCheck,
  UserX,
  Box,
  Trash2,
  X,
  Send,
  CheckCircle,
  Download,
} from "lucide-react";
import { FileUpload } from "@/components/investigator/FileUpload";

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
  assignedDate: string;
  deadline: string;
  department: string;
  priority: "High" | "Medium" | "Low" | "Critical";
  description?: string;
  assignedBy: string;
  progress: number;
  persons?: Person[];
  exhibits?: Exhibit[];
}

interface ApiCaseItem {
  id?: string | number;
  crNumber?: string | number;
  derNumber?: string | number;
  title?: string;
  status?: string;
  assignedDate?: string;
  deadline?: string;
  department?: string;
  priority?: string;
  description?: string;
  assignedBy?: string;
  progress?: number;
  persons?: Person[];
  exhibits?: Exhibit[];
  [key: string]: unknown;
}

interface ApiCasesResponse {
  cases?: ApiCaseItem[];
  count?: number;
  [key: string]: unknown;
}

export default function MyCases() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [submittedCase, setSubmittedCase] = useState<Case | null>(null);
  const [caseSubmitting, setCaseSubmitting] = useState(false);
  const [caseSubmitError, setCaseSubmitError] = useState<string | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [currentTab, setCurrentTab] = useState("person");
  const [personFile, setPersonFile] = useState<File | null>(null);
  const [exhibitFile, setExhibitFile] = useState<File | null>(null);
  // Person detail view state
  const [isPersonDetailOpen, setIsPersonDetailOpen] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [downloadingFileId, setDownloadingFileId] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  // Exibition (Exhibit) detail & download states (prefixed as requested)
  const [isExibitionDetailOpen, setIsExibitionDetailOpen] = useState(false);
  const [exibitionSelectedExhibit, setExibitionSelectedExhibit] = useState<Exhibit | null>(null);
  const [exibitionDownloadingFileId, setExibitionDownloadingFileId] = useState<string | null>(null);
  const [exibitionDownloadError, setExibitionDownloadError] = useState<string | null>(null);
  // Person submission states
  const [personSubmitting, setPersonSubmitting] = useState(false);
  const [personSubmitError, setPersonSubmitError] = useState<string | null>(null);
  const [personSubmitSuccess, setPersonSubmitSuccess] = useState<string | null>(null);
  const [personFormErrors, setPersonFormErrors] = useState<Record<string, string>>({});
  // Exhibit submission states
  const [exhibitSubmitting, setExhibitSubmitting] = useState(false);
  const [exhibitSubmitError, setExhibitSubmitError] = useState<string | null>(null);
  const [exhibitSubmitSuccess, setExhibitSubmitSuccess] = useState<string | null>(null);
  const [exhibitFormErrors, setExhibitFormErrors] = useState<Record<string, string>>({});

  // Person form state
  const [personForm, setPersonForm] = useState({
    type: "",
    fullName: "",
    dateOfBirth: "",

    age: 0,
    gender: "",
    nationality: "",
    houseNumber: "",
    address: "",
    region: "",
    nation: "",
    woreda: "",
    kebele: "",
    residentId: "",
    maritalStatus: "",
    educationStatus: "",
    workStatus: "",
    phoneNumber: "",
    description: "",
  });

  // Exhibit form state
  const [exhibitForm, setExhibitForm] = useState({
    personId: "",
    name: "",
    description: "",
    quantity: 1,
    registeredDate: "",
  });

  const [cases, setCases] = useState<Case[]>([]);
  const [casesLoading, setCasesLoading] = useState<boolean>(false);
  const [casesError, setCasesError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const getAuthToken = (): string | null => {
    try {
      const raw = localStorage.getItem("user");
      const user = raw ? JSON.parse(raw) : null;
      return (
        user?.token ||
        user?.access_token ||
        user?.accessToken ||
        user?.jwt ||
        localStorage.getItem("token") ||
        null
      );
    } catch {
      return localStorage.getItem("token");
    }
  };

  const normalizePriority = (p?: string): Case["priority"] => {
    if (!p) return "Medium";
    const v = p.toLowerCase();
    if (["critical", "urgent"].includes(v)) return "Critical";
    if (v === "high") return "High";
    if (v === "medium") return "Medium";
    if (v === "low") return "Low";
    return "Medium";
  };

  const mapApiCase = (c: ApiCaseItem, idx: number): Case => ({
    id: c.id != null ? String(c.id) : String(idx + 1),
    crNumber: c.crNumber != null ? String(c.crNumber) : `CR-${idx + 1}`,
    derNumber: c.derNumber != null ? String(c.derNumber) : `DER-${idx + 1}`,
    title: c.title || "Untitled Case",
    status: c.status || "Unknown",
    assignedDate: c.assignedDate || "",
    deadline: c.deadline || "",
    department: c.department || "",
    priority: normalizePriority(c.priority),
    description: c.description || "",
    assignedBy: c.assignedBy || "",
    progress: typeof c.progress === "number" ? c.progress : 0,
    persons: Array.isArray(c.persons) ? c.persons : [],
    exhibits: Array.isArray(c.exhibits) ? c.exhibits : [],
  });

  const fetchCases = useCallback(async (opts?: { silent?: boolean }): Promise<Case[]> => {
    const silent = opts?.silent;
    if (!silent) setCasesLoading(true);
    setCasesError(null);
    try {
      const base = (process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(/\/$/, "");
      const url = `${base}/api/cases/investigator/assigned_cases`;
      const headers: Record<string, string> = { Accept: "application/json" };
      const token = getAuthToken();
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      const res = await fetch(url, { method: "GET", headers, signal: controller.signal });
      clearTimeout(timeout);
      if (!res.ok) {
        let msg = "Failed to load cases.";
        if (res.status === 401) msg = "Unauthorized. Please login again.";
        else if (res.status === 403) msg = "Forbidden. You cannot view these cases.";
        else if (res.status === 404) msg = "Cases endpoint not found.";
        else if (res.status >= 500) msg = "Server error while retrieving cases.";
        console.error("Investigator cases API error", { status: res.status, statusText: res.statusText });
        setCases([]);
        setCasesError(msg);
        return [];
      }
      const raw: unknown = await res.json().catch(() => null);
      let list: ApiCaseItem[] = [];
      if (raw && typeof raw === "object") {
        const obj = raw as ApiCasesResponse;
        if (Array.isArray(obj.cases)) list = obj.cases;
      }
      const mapped = list.map(mapApiCase);
      setCases(mapped);
      return mapped;
    } catch (err) {
      if ((err as Error)?.name === "AbortError") setCasesError("Request timed out while loading cases.");
      else setCasesError("Unexpected error loading cases.");
      setCases([]);
      return [];
    } finally {
      setCasesLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchCases();
  }, [fetchCases]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchCases({ silent: true });
  };

  const filteredCases = useMemo(
    () =>
      cases.filter((case_) => {
        const term = searchTerm.toLowerCase();
        const matchesSearch =
          case_.title.toLowerCase().includes(term) ||
          case_.crNumber.toLowerCase().includes(term) ||
          case_.derNumber.toLowerCase().includes(term);
        const matchesStatus = statusFilter === "all" || case_.status === statusFilter;
        const matchesPriority = priorityFilter === "all" || case_.priority === priorityFilter;
        return matchesSearch && matchesStatus && matchesPriority;
      }),
    [cases, searchTerm, statusFilter, priorityFilter]
  );

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "High":
        return "bg-red-100 text-red-800 border-red-200";
      case "Medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "Low":
        return "bg-green-100 text-green-800 border-green-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "In Progress":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "Evidence Collection":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "Interview Phase":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "Initial Review":
        return "bg-gray-100 text-gray-800 border-gray-200";
      case "Submitted":
        return "bg-green-100 text-green-800 border-green-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const calculateAge = (dateOfBirth: string) => {
    if (!dateOfBirth) return 0;
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birthDate.getDate())
    ) {
      age--;
    }
    return age;
  };

  const handlePersonFormChange = (field: string, value: string) => {
    setPersonForm((prev) => {
      const updated = { ...prev, [field]: value };
      if (field === "dateOfBirth") {
        updated.age = calculateAge(value);
      }
      return updated;
    });
  };

  const handleAddPerson = () => {
    if (!selectedCase || personSubmitting) return;

    setPersonSubmitError(null);
    setPersonSubmitSuccess(null);

    // Validation rules (fields marked * in UI)
    const requiredFields: Array<keyof typeof personForm> = [
      "type",
      "fullName",
      "dateOfBirth",
      "gender",
      "nationality",
      "address",
      "region",
      "nation",
      "woreda",
      "kebele",
      "residentId",
      "maritalStatus",
      "educationStatus",
      "workStatus",
      "phoneNumber",
      //"description",
    ];
    const errors: Record<string, string> = {};
    requiredFields.forEach((f) => {
      if (!personForm[f] || String(personForm[f]).trim() === "") {
        errors[f] = "Required";
      }
    });
    // Simple phone validation (basic digits length check)
    if (personForm.phoneNumber && personForm.phoneNumber.replace(/\D/g, "").length < 7) {
      errors.phoneNumber = "Enter a valid phone number";
    }
    if (Object.keys(errors).length) {
      setPersonFormErrors(errors);
      setPersonSubmitError("Please fix the highlighted fields.");
      return;
    }
    setPersonFormErrors({});

    // Build FormData (backend expects case_der_number + full_name)
    const fd = new FormData();
    const derNumber = selectedCase.derNumber; // explicitly required
    if (!derNumber) {
      setPersonSubmitError("Missing case DER number. Cannot submit.");
      return;
    }
    fd.append("case_der_number", derNumber);
    fd.append("type", personForm.type);
    fd.append("full_name", personForm.fullName);
    fd.append("date_of_birth", personForm.dateOfBirth);
    fd.append("age", String(personForm.age || 0));
    fd.append("gender", personForm.gender);
    fd.append("nationality", personForm.nationality);
    fd.append("house_number", personForm.houseNumber);
    fd.append("address", personForm.address);
    fd.append("region", personForm.region);
    fd.append("nation", personForm.nation);
    fd.append("woreda", personForm.woreda);
    fd.append("kebele", personForm.kebele);
    fd.append("resident_id", personForm.residentId);
    fd.append("marital_status", personForm.maritalStatus);
    fd.append("education_status", personForm.educationStatus);
    fd.append("work_status", personForm.workStatus);
    fd.append("phone_number", personForm.phoneNumber);
    fd.append("description", personForm.description);
    if (personFile) {
      fd.append("file", personFile);
    }

    const base = (process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(/\/$/, "");
    const url = `${base}/api/persons`;
    const token = getAuthToken();

    setPersonSubmitting(true);
    (async () => {
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          body: fd,
        });
        if (!res.ok) {
          let msg = "Failed to register person.";
          if (res.status === 400) msg = "Validation error from server.";
          else if (res.status === 401) msg = "Unauthorized. Please login again.";
          else if (res.status === 403) msg = "Forbidden.";
            else if (res.status >= 500) msg = "Server error registering person.";
          setPersonSubmitError(msg);
          return;
        }
        let created: any = null;
        try {
          created = await res.json();
        } catch {
          // ignore if no JSON
        }
        // Map response to Person type; fallback to form values
        const newPerson: Person = {
          id: created?.id ? String(created.id) : Date.now().toString(),
          type: (created?.type || personForm.type) as Person["type"],
          fullName: created?.full_name || created?.fullName || personForm.fullName,
          dateOfBirth: created?.date_of_birth || created?.dateOfBirth || personForm.dateOfBirth,
            age: created?.age != null ? Number(created.age) : personForm.age,
          gender: created?.gender || personForm.gender,
          nationality: created?.nationality || personForm.nationality,
          houseNumber: created?.house_number || created?.houseNumber || personForm.houseNumber,
          address: created?.address || personForm.address,
          region: created?.region || personForm.region,
          nation: created?.nation || personForm.nation,
          woreda: created?.woreda || personForm.woreda,
          kebele: created?.kebele || personForm.kebele,
          residentId: created?.resident_id || created?.residentId || personForm.residentId,
          maritalStatus: created?.marital_status || created?.maritalStatus || personForm.maritalStatus,
          educationStatus: created?.education_status || created?.educationStatus || personForm.educationStatus,
          workStatus: created?.work_status || created?.workStatus || personForm.workStatus,
          phoneNumber: created?.phone_number || created?.phoneNumber || personForm.phoneNumber,
          description: created?.description || personForm.description,
          fileUrl: created?.file_url || created?.fileUrl,
        };

        // Update cases list
        setCases((prev) =>
          prev.map((case_) =>
            case_.id === selectedCase.id
              ? { ...case_, persons: [...(case_.persons || []), newPerson] }
              : case_
          )
        );

        // Update selectedCase reference
        setSelectedCase((prev) =>
          prev
            ? { ...prev, persons: [...(prev.persons || []), newPerson] }
            : prev
        );

        // Reset form
        setPersonForm({
          type: "",
          fullName: "",
          dateOfBirth: "",
          age: 0,
          gender: "",
          nationality: "",
          houseNumber: "",
          address: "",
          region: "",
          nation: "",
          woreda: "",
          kebele: "",
          residentId: "",
          maritalStatus: "",
          educationStatus: "",
          workStatus: "",
          phoneNumber: "",
          description: "",
        });
        setPersonFile(null);
        setPersonSubmitSuccess("Person registered successfully.");

        // Refresh cases from server to ensure we show canonical data
        try {
          const currentCaseId = selectedCase.id;
          const refreshed = await fetchCases({ silent: true });
            const updated = refreshed.find(c => c.id === currentCaseId);
            if (updated) setSelectedCase(updated);
        } catch {
          // ignore refresh errors; optimistic UI already updated
        }
      } catch (e) {
        setPersonSubmitError("Unexpected error while registering person.");
      } finally {
        setPersonSubmitting(false);
      }
    })();
  };

  const handleAddExhibit = () => {
    if (!selectedCase || exhibitSubmitting) return;

    setExhibitSubmitError(null);
    setExhibitSubmitSuccess(null);

    // Validation
    const required: Array<keyof typeof exhibitForm> = [
      "personId",
      "name",
      "description",
      "registeredDate",
    ];
    const errors: Record<string, string> = {};
    required.forEach((f) => {
      if (!exhibitForm[f] || String(exhibitForm[f]).trim() === "") {
        errors[f] = "Required";
      }
    });
    if (!exhibitForm.quantity || exhibitForm.quantity < 1) {
      errors.quantity = "Must be at least 1";
    }
    const relatedPerson = selectedCase.persons?.find((p) => p.id === exhibitForm.personId);
    if (!relatedPerson) {
      errors.personId = "Select a valid person";
    }
    if (Object.keys(errors).length) {
      setExhibitFormErrors(errors);
      setExhibitSubmitError("Please fix the highlighted exhibit fields.");
      return;
    }
    setExhibitFormErrors({});

    // Build FormData for backend (includes optional file)
    const fd = new FormData();
    const derNumber = selectedCase.derNumber;
    if (!derNumber) {
      setExhibitSubmitError("Missing case DER number. Cannot submit exhibit.");
      return;
    }
    fd.append("case_der_number", derNumber);
    fd.append("name", exhibitForm.name);
    fd.append("description", exhibitForm.description);
    fd.append("quantity", String(exhibitForm.quantity));
    if (relatedPerson) {
      // Backend expects numeric? We send raw but try to keep numeric if possible
      fd.append("related_person_id", /^(\d+)$/.test(relatedPerson.id) ? relatedPerson.id : relatedPerson.id);
      fd.append("related_person_name", relatedPerson.fullName);
    }
    fd.append("registered_date", exhibitForm.registeredDate);
    if (exhibitFile) {
      fd.append("file", exhibitFile);
    }

    const base = (process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(/\/$/, "");
    const url = `${base}/api/exhibits`;
    const token = getAuthToken();

    setExhibitSubmitting(true);
    (async () => {
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          body: fd,
        });
        if (!res.ok) {
          let msg = "Failed to register exhibit.";
          if (res.status === 400) msg = "Validation error from server.";
          else if (res.status === 401) msg = "Unauthorized. Please login again.";
          else if (res.status === 403) msg = "Forbidden.";
          else if (res.status >= 500) msg = "Server error registering exhibit.";
          setExhibitSubmitError(msg);
          return;
        }
        let created: any = null;
        try { created = await res.json(); } catch {}
        const newExhibit: Exhibit = {
          id: created?.id ? String(created.id) : Date.now().toString(),
          name: created?.name || exhibitForm.name,
          description: created?.description || exhibitForm.description,
            quantity: created?.quantity != null ? Number(created.quantity) : exhibitForm.quantity,
          registeredDate: created?.registered_date || created?.registeredDate || exhibitForm.registeredDate,
          relatedPersonId: created?.related_person_id != null ? String(created.related_person_id) : exhibitForm.personId,
          relatedPersonName: created?.related_person_name || relatedPerson?.fullName || "",
          fileUrl: created?.file_url || created?.fileUrl,
        };

        // Optimistic update
        setCases((prev) => prev.map((c) => c.id === selectedCase.id ? { ...c, exhibits: [...(c.exhibits || []), newExhibit] } : c));
        setSelectedCase((prev) => prev ? { ...prev, exhibits: [...(prev.exhibits || []), newExhibit] } : prev);

        // Reset form
        setExhibitForm({ personId: "", name: "", description: "", quantity: 1, registeredDate: "" });
        setExhibitFile(null);
        setExhibitSubmitSuccess("Exhibit registered successfully.");

        // Refresh canonical data
        try {
          const currentCaseId = selectedCase.id;
          const refreshed = await fetchCases({ silent: true });
          const updated = refreshed.find(c => c.id === currentCaseId);
          if (updated) setSelectedCase(updated);
        } catch {}
      } catch (e) {
        setExhibitSubmitError("Unexpected error while registering exhibit.");
      } finally {
        setExhibitSubmitting(false);
      }
    })();
  };

  const handleRejectCase = (caseId: string) => {
    setCases((prev) =>
      prev.map((case_) =>
        case_.id === caseId ? { ...case_, status: "Rejected" } : case_
      )
    );
  };
  const handleSubmitCase = async (case_: Case) => {
    if (caseSubmitting) return;
    setCaseSubmitError(null);
    if (!case_ || !case_.id) {
      setCaseSubmitError("Invalid case selection.");
      return;
    }
    if (!case_.persons || case_.persons.length === 0) {
      setCaseSubmitError("Add at least one person before submitting the case.");
      return;
    }
    const base = (process.env.NEXT_PUBLIC_API_BASE_URL || '').replace(/\/$/, '');
    const url = `${base}/api/cases/investigator/submitcase`;
    const token = getAuthToken();
    setCaseSubmitting(true);
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ case_id: case_.id })
      });
      if (!res.ok) {
        let msg = 'Failed to submit case.';
        if (res.status === 400) msg = 'Submission validation failed.';
        else if (res.status === 401) msg = 'Unauthorized. Please login again.';
        else if (res.status === 403) msg = 'Forbidden to submit this case.';
        else if (res.status === 404) msg = 'Submit endpoint not found.';
        else if (res.status >= 500) msg = 'Server error submitting case.';
        setCaseSubmitError(msg);
        return;
      }
      // Attempt to parse response (optional)
      let data: any = null;
      try { data = await res.json(); } catch {}
      // Update local state to Submitted
      setCases(prev => prev.map(c => c.id === case_.id ? { ...c, status: 'Submitted' } : c));
      setSelectedCase(prev => prev && prev.id === case_.id ? { ...prev, status: 'Submitted' } : prev);
      const submitted = { ...case_, status: 'Submitted' };
      setSubmittedCase(submitted);
      setIsSubmitModalOpen(true);
    } catch (e) {
      setCaseSubmitError('Unexpected error submitting case.');
    } finally {
      setCaseSubmitting(false);
    }
  };

  const getPersonTypeColor = (type: string) => {
    switch (type) {
      case "witness":
        return "bg-blue-100 text-blue-800";
      case "accuser":
        return "bg-yellow-100 text-yellow-800";
      case "accused":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const handleDownloadPersonFile = async (person: Person) => {
    if (!person.fileUrl || downloadingFileId) return;
    setDownloadError(null);
    setDownloadingFileId(person.id);
    try {
      const base = (process.env.NEXT_PUBLIC_API_BASE_URL || '').replace(/\/$/, '');
      const endpoint = `${base}/api/files?url=${encodeURIComponent(person.fileUrl)}`;
      const token = getAuthToken();
      const res = await fetch(endpoint, {
        method: 'GET',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!res.ok) {
        let msg = 'Failed to download file.';
        if (res.status === 401) msg = 'Unauthorized to download file.';
        else if (res.status === 403) msg = 'Forbidden to access this file.';
        else if (res.status === 404) msg = 'File not found on server.';
        throw new Error(msg);
      }
      const blob = await res.blob();
      // Try to determine filename
      let filename = 'attachment';
      const disposition = res.headers.get('Content-Disposition');
      if (disposition && /filename\*=UTF-8''([^;]+)|filename="?([^";]+)"?/i.test(disposition)) {
        const match = disposition.match(/filename\*=UTF-8''([^;]+)|filename="?([^";]+)"?/i);
        filename = decodeURIComponent(match?.[1] || match?.[2] || filename);
      } else {
        // fallback from original fileUrl path
        try {
          const urlObj = new URL(person.fileUrl);
          const last = urlObj.pathname.split('/').filter(Boolean).pop();
          if (last) filename = last;
        } catch {}
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
    } catch (e: any) {
      setDownloadError(e?.message || 'Unexpected error downloading file.');
    } finally {
      setDownloadingFileId(null);
    }
  };

  const handleDownloadExibitionFile = async (exhibit: Exhibit) => {
    if (!exhibit.fileUrl || exibitionDownloadingFileId) return;
    setExibitionDownloadError(null);
    setExibitionDownloadingFileId(exhibit.id);
    try {
      const base = (process.env.NEXT_PUBLIC_API_BASE_URL || '').replace(/\/$/, '');
      const endpoint = `${base}/api/files?url=${encodeURIComponent(exhibit.fileUrl)}`;
      const token = getAuthToken();
      const res = await fetch(endpoint, {
        method: 'GET',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!res.ok) {
        let msg = 'Failed to download file.';
        if (res.status === 401) msg = 'Unauthorized to download file.';
        else if (res.status === 403) msg = 'Forbidden to access this file.';
        else if (res.status === 404) msg = 'File not found on server.';
        throw new Error(msg);
      }
      const blob = await res.blob();
      let filename = 'exhibit-attachment';
      const disposition = res.headers.get('Content-Disposition');
      if (disposition && /filename\*=UTF-8''([^;]+)|filename="?([^";]+)"?/i.test(disposition)) {
        const match = disposition.match(/filename\*=UTF-8''([^;]+)|filename="?([^";]+)"?/i);
        filename = decodeURIComponent(match?.[1] || match?.[2] || filename);
      } else {
        try {
          const urlObj = new URL(exhibit.fileUrl);
          const last = urlObj.pathname.split('/').filter(Boolean).pop();
          if (last) filename = last;
        } catch {}
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
    } catch (e: any) {
      setExibitionDownloadError(e?.message || 'Unexpected error downloading file.');
    } finally {
      setExibitionDownloadingFileId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Cases</h1>
          <p className="text-gray-600">
            Manage your assigned cases and investigations
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search cases by title, CR number, or DER number..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                  disabled={casesLoading}
                />
              </div>
            </div>
            <Button variant="outline" onClick={handleRefresh} disabled={casesLoading || refreshing}>
              {refreshing || casesLoading ? "Loading..." : "Refresh"}
            </Button>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="In Progress">In Progress</SelectItem>
                <SelectItem value="Evidence Collection">
                  Evidence Collection
                </SelectItem>
                <SelectItem value="Interview Phase">Interview Phase</SelectItem>
                <SelectItem value="Initial Review">Initial Review</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Filter by priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="High">High</SelectItem>
                <SelectItem value="Medium">Medium</SelectItem>
                <SelectItem value="Low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Cases List */}
      <div className="grid gap-6">
        {casesLoading && (
          <Card>
            <CardContent className="pt-6 text-sm text-gray-500">Loading cases...</CardContent>
          </Card>
        )}
        {!casesLoading && casesError && (
          <Card>
            <CardContent className="pt-6 text-sm text-red-600">
              {casesError}
              <Button variant="link" className="px-1" onClick={() => fetchCases({ silent: true })}>Retry</Button>
            </CardContent>
          </Card>
        )}
        {!casesLoading && !casesError && filteredCases.length === 0 && (
          <Card>
            <CardContent className="pt-6 text-sm text-gray-500">No cases found.</CardContent>
          </Card>
        )}
        {!casesLoading && !casesError && filteredCases.map((case_) => (
          <Card key={case_.id} className="hover:shadow-lg transition-shadow">
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-xl font-semibold text-gray-900">
                      {case_.title}
                    </h3>
                    <Badge className={getPriorityColor(case_.priority)}>
                      {case_.priority}
                    </Badge>
                    <Badge className={getStatusColor(case_.status)}>
                      {case_.status}
                    </Badge>
                  </div>

                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex flex-wrap gap-4">
                      <span>
                        <strong>CR Number:</strong> {case_.crNumber}
                      </span>
                      <span>
                        <strong>DER Number:</strong> {case_.derNumber}
                      </span>
                    </div>
                    <div>
                      <strong>Description:</strong> {case_.description}
                    </div>
                    <div className="flex flex-wrap gap-4">
                      <span>
                        <strong>Department:</strong> {case_.department}
                      </span>
                      <span>
                        <strong>Assigned:</strong> {case_.assignedDate ? new Date(case_.assignedDate).toLocaleDateString() : "-"}
                      </span>
                      <span>
                        <strong>Deadline:</strong> {case_.deadline ? new Date(case_.deadline).toLocaleDateString() : "-"}
                      </span>
                    </div>
                    {case_.persons && case_.persons.length > 0 && (
                      <div>
                        <strong>Registered Persons:</strong>{" "}
                        {case_.persons.length}(
                        {
                          case_.persons.filter((p) => p.type === "witness")
                            .length
                        }{" "}
                        witnesses,
                        {
                          case_.persons.filter((p) => p.type === "accuser")
                            .length
                        }{" "}
                        accusers,
                        {
                          case_.persons.filter((p) => p.type === "accused")
                            .length
                        }{" "}
                        accused)
                      </div>
                    )}
                    {case_.exhibits && case_.exhibits.length > 0 && (
                      <div>
                        <strong>Registered Exhibits:</strong>{" "}
                        {case_.exhibits.length}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <Button
                    onClick={() => {
                      setSelectedCase(case_);
                      setIsDetailOpen(true);
                    }}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Go Detail
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleRejectCase(case_.id)}
                    className="border-red-300 text-red-600 hover:bg-red-50"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Reject
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      {/* Custom Modal Overlay - Replace your Dialog component with this */}
      {isDetailOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9998]"
            onClick={() => setIsDetailOpen(false)}
          />

          {/* Modal Container */}
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 pointer-events-none">
            <div
              className="bg-white rounded-xl shadow-2xl w-full max-w-7xl max-h-[95vh] overflow-hidden pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="px-6 py-4 border-b bg-gradient-to-r from-slate-800 to-slate-700 text-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText className="h-6 w-6" />
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                    <span className="text-xl font-semibold">
                      Case Registration System
                    </span>
                    <span className="text-slate-200 text-sm font-normal">
                      {selectedCase?.title}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setIsDetailOpen(false)}
                  className="text-white/80 hover:text-white hover:bg-white/20 rounded-lg p-2 transition-all"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Modal Content - Scrollable */}
              <div className="overflow-y-auto max-h-[calc(95vh-80px)]">
                {selectedCase && (
                  <div className="px-6 py-4 space-y-6">
                    {/* Case Numbers - Enhanced Mobile Layout */}
                    <div className="bg-gradient-to-r from-slate-700 to-slate-600 text-white p-4 sm:p-6 rounded-lg shadow-lg">
                      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        Case Information
                      </h3>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-slate-200">
                            CR Number
                          </label>
                          <Input
                            value={selectedCase.crNumber}
                            readOnly
                            className="bg-white/15 border-white/20 text-white placeholder-white/70 focus:bg-white/20 transition-all"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-slate-200">
                            DER Number
                          </label>
                          <Input
                            value={selectedCase.derNumber}
                            readOnly
                            className="bg-white/15 border-white/20 text-white placeholder-white/70 focus:bg-white/20 transition-all"
                          />
                        </div>
                      </div>

                      {/* Case Status and Priority */}
                      <div className="mt-4 flex flex-wrap gap-3">
                        <Badge className="bg-white/20 text-white border-white/30 px-3 py-1">
                          Status: {selectedCase.status}
                        </Badge>
                        <Badge className="bg-white/20 text-white border-white/30 px-3 py-1">
                          Priority: {selectedCase.priority}
                        </Badge>
                        <Badge className="bg-white/20 text-white border-white/30 px-3 py-1">
                          Progress: {selectedCase.progress}%
                        </Badge>
                      </div>
                    </div>

                    {/* Enhanced Tabs with Better Mobile Support */}
                    <Tabs
                      value={currentTab}
                      onValueChange={setCurrentTab}
                      className="w-full"
                    >
                      <div className="sticky top-0 z-10 bg-white border-b pb-2">
                        <TabsList className="grid w-full grid-cols-2 h-12 bg-slate-100">
                          <TabsTrigger
                            value="person"
                            className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all"
                          >
                            <Users className="h-4 w-4" />
                            <span className="hidden sm:inline">
                              Person Registration
                            </span>
                            <span className="sm:hidden">Persons</span>
                            {selectedCase.persons &&
                              selectedCase.persons.length > 0 && (
                                <Badge
                                  variant="secondary"
                                  className="ml-1 text-xs"
                                >
                                  {selectedCase.persons.length}
                                </Badge>
                              )}
                          </TabsTrigger>
                          <TabsTrigger
                            value="exhibit"
                            className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all"
                          >
                            <Box className="h-4 w-4" />
                            <span className="hidden sm:inline">
                              Exhibit Registration
                            </span>
                            <span className="sm:hidden">Exhibits</span>
                            {selectedCase.exhibits &&
                              selectedCase.exhibits.length > 0 && (
                                <Badge
                                  variant="secondary"
                                  className="ml-1 text-xs"
                                >
                                  {selectedCase.exhibits.length}
                                </Badge>
                              )}
                          </TabsTrigger>
                        </TabsList>
                      </div>

                      {/* Person Registration Tab */}
                      <TabsContent value="person" className="space-y-6 mt-6">
                        <Card className="shadow-lg border-t-4 border-t-slate-600">
                          <CardHeader className="bg-gradient-to-r from-slate-700 to-slate-600 text-white rounded-t-lg">
                            <CardTitle className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                              <span className="flex items-center gap-2">
                                <User className="h-5 w-5" />
                                Register New Person
                              </span>
                              <div className="flex flex-wrap gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-white border-white/50 hover:bg-white hover:text-slate-700 transition-all"
                                  onClick={() =>
                                    handlePersonFormChange("type", "witness")
                                  }
                                >
                                  <Eye className="h-4 w-4 mr-1" />
                                  <span className="hidden xs:inline">
                                    Add
                                  </span>{" "}
                                  Witness
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-white border-white/50 hover:bg-white hover:text-slate-700 transition-all"
                                  onClick={() =>
                                    handlePersonFormChange("type", "accuser")
                                  }
                                >
                                  <UserCheck className="h-4 w-4 mr-1" />
                                  <span className="hidden xs:inline">
                                    Add
                                  </span>{" "}
                                  Accuser
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-white border-white/50 hover:bg-white hover:text-slate-700 transition-all"
                                  onClick={() =>
                                    handlePersonFormChange("type", "accused")
                                  }
                                >
                                  <UserX className="h-4 w-4 mr-1" />
                                  <span className="hidden xs:inline">
                                    Add
                                  </span>{" "}
                                  Accused
                                </Button>
                              </div>
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="pt-6 space-y-8">
                            {/* Demographic Information */}
                            <div className="space-y-4">
                              <div className="flex items-center gap-2 mb-4">
                                <div className="h-1 w-8 bg-slate-600 rounded"></div>
                                <h4 className="font-semibold text-slate-700 text-lg">
                                  Demographic Information
                                </h4>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                <Select
                                  value={personForm.type}
                                  onValueChange={(value) =>
                                    handlePersonFormChange("type", value)
                                  }
                                >
                                  <SelectTrigger className="h-12">
                                    <SelectValue placeholder="Select Person Type *" />
                                  </SelectTrigger>
                                  <SelectContent className="z-[10000]">
                                    <SelectItem value="witness">
                                      👁️ Witness
                                    </SelectItem>
                                    <SelectItem value="accuser">
                                      ✓ Accuser
                                    </SelectItem>
                                    <SelectItem value="accused">
                                      ⚠️ Accused
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                                <div className="sm:col-span-1 lg:col-span-3">
                                  <Input
                                    className="h-12"
                                    placeholder="Enter full name *"
                                    value={personForm.fullName}
                                    onChange={(e) =>
                                      handlePersonFormChange(
                                        "fullName",
                                        e.target.value
                                      )
                                    }
                                  />
                                </div>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                <Input
                                  className="h-12"
                                  type="date"
                                  value={personForm.dateOfBirth}
                                  onChange={(e) =>
                                    handlePersonFormChange(
                                      "dateOfBirth",
                                      e.target.value
                                    )
                                  }
                                />
                                <Input
                                  className="h-12 bg-gray-50"
                                  placeholder="Age (auto-calculated)"
                                  value={personForm.age || ""}
                                  readOnly
                                />
                                <Select
                                  value={personForm.gender}
                                  onValueChange={(value) =>
                                    handlePersonFormChange("gender", value)
                                  }
                                >
                                  <SelectTrigger className="h-12">
                                    <SelectValue placeholder="Select Gender *" />
                                  </SelectTrigger>
                                  <SelectContent className="z-[10000]">
                                    <SelectItem value="Male">Male</SelectItem>
                                    <SelectItem value="Female">
                                      Female
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                                <Input
                                  className="h-12"
                                  placeholder="Enter nationality *"
                                  value={personForm.nationality}
                                  onChange={(e) =>
                                    handlePersonFormChange(
                                      "nationality",
                                      e.target.value
                                    )
                                  }
                                />
                              </div>
                            </div>

                            {/* Address Information */}
                            <div className="space-y-4">
                              <div className="flex items-center gap-2 mb-4">
                                <div className="h-1 w-8 bg-slate-600 rounded"></div>
                                <h4 className="font-semibold text-slate-700 text-lg">
                                  Address Information
                                </h4>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                <Input
                                  className="h-12"
                                  placeholder="House Number"
                                  value={personForm.houseNumber}
                                  onChange={(e) =>
                                    handlePersonFormChange(
                                      "houseNumber",
                                      e.target.value
                                    )
                                  }
                                />
                                <div className="sm:col-span-1 lg:col-span-3">
                                  <Input
                                    className="h-12"
                                    placeholder="Enter address *"
                                    value={personForm.address}
                                    onChange={(e) =>
                                      handlePersonFormChange(
                                        "address",
                                        e.target.value
                                      )
                                    }
                                  />
                                </div>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                <Input
                                  className="h-12"
                                  placeholder="Enter region *"
                                  value={personForm.region}
                                  onChange={(e) =>
                                    handlePersonFormChange(
                                      "region",
                                      e.target.value
                                    )
                                  }
                                />
                                <Input
                                  className="h-12"
                                  placeholder="Enter nation *"
                                  value={personForm.nation}
                                  onChange={(e) =>
                                    handlePersonFormChange(
                                      "nation",
                                      e.target.value
                                    )
                                  }
                                />
                                <Input
                                  className="h-12"
                                  placeholder="Enter woreda *"
                                  value={personForm.woreda}
                                  onChange={(e) =>
                                    handlePersonFormChange(
                                      "woreda",
                                      e.target.value
                                    )
                                  }
                                />
                                <Input
                                  className="h-12"
                                  placeholder="Enter kebele *"
                                  value={personForm.kebele}
                                  onChange={(e) =>
                                    handlePersonFormChange(
                                      "kebele",
                                      e.target.value
                                    )
                                  }
                                />
                              </div>
                            </div>

                            {/* Additional Information */}
                            <div className="space-y-4">
                              <div className="flex items-center gap-2 mb-4">
                                <div className="h-1 w-8 bg-slate-600 rounded"></div>
                                <h4 className="font-semibold text-slate-700 text-lg">
                                  Additional Information
                                </h4>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                <Input
                                  className="h-12"
                                  placeholder="Resident ID Number *"
                                  value={personForm.residentId}
                                  onChange={(e) =>
                                    handlePersonFormChange(
                                      "residentId",
                                      e.target.value
                                    )
                                  }
                                />
                                {personFormErrors.residentId && (
                                  <p className="text-xs text-red-600 -mt-2">{personFormErrors.residentId}</p>
                                )}
                                <Select
                                  value={personForm.maritalStatus}
                                  onValueChange={(value) =>
                                    handlePersonFormChange(
                                      "maritalStatus",
                                      value
                                    )
                                  }
                                >
                                  <SelectTrigger className="h-12">
                                    <SelectValue placeholder="Select Marital Status *" />
                                  </SelectTrigger>
                                  <SelectContent className="z-[10000]">
                                    <SelectItem value="Single">
                                      Single
                                    </SelectItem>
                                    <SelectItem value="Married">
                                      Married
                                    </SelectItem>
                                    <SelectItem value="Divorced">
                                      Divorced
                                    </SelectItem>
                                    <SelectItem value="Widowed">
                                      Widowed
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                                <Select
                                  value={personForm.educationStatus}
                                  onValueChange={(value) =>
                                    handlePersonFormChange(
                                      "educationStatus",
                                      value
                                    )
                                  }
                                >
                                  <SelectTrigger className="h-12">
                                    <SelectValue placeholder="Select Education Status *" />
                                  </SelectTrigger>
                                  <SelectContent className="z-[10000]">
                                    <SelectItem value="No Formal Education">
                                      No Formal Education
                                    </SelectItem>
                                    <SelectItem value="Primary School">
                                      Primary School
                                    </SelectItem>
                                    <SelectItem value="Secondary School">
                                      Secondary School
                                    </SelectItem>
                                    <SelectItem value="Diploma">
                                      Diploma
                                    </SelectItem>
                                    <SelectItem value="Bachelor's Degree">
                                      Bachelor's Degree
                                    </SelectItem>
                                    <SelectItem value="Master's Degree">
                                      Master's Degree
                                    </SelectItem>
                                    <SelectItem value="Doctorate">
                                      Doctorate
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
                                <Select
                                  value={personForm.workStatus}
                                  onValueChange={(value) =>
                                    handlePersonFormChange("workStatus", value)
                                  }
                                >
                                  <SelectTrigger className="h-12">
                                    <SelectValue placeholder="Select Work Status *" />
                                  </SelectTrigger>
                                  <SelectContent className="z-[10000]">
                                    <SelectItem value="Employed">
                                      Employed
                                    </SelectItem>
                                    <SelectItem value="Unemployed">
                                      Unemployed
                                    </SelectItem>
                                    <SelectItem value="Student">
                                      Student
                                    </SelectItem>
                                    <SelectItem value="Retired">
                                      Retired
                                    </SelectItem>
                                    <SelectItem value="Self-Employed">
                                      Self-Employed
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                                <Input
                                  className="h-12"
                                  placeholder="Phone Number *"
                                  value={personForm.phoneNumber}
                                  onChange={(e) =>
                                    handlePersonFormChange(
                                      "phoneNumber",
                                      e.target.value
                                    )
                                  }
                                />
                                {personFormErrors.phoneNumber && (
                                  <p className="text-xs text-red-600 -mt-2">{personFormErrors.phoneNumber}</p>
                                )}

                              
                                <div className="flex ">
                                  <FileUpload onFileSelect={setPersonFile} />
                                  {personFile && (
                                    <div className="text-xs text-green-700 mt-2">
                                      Selected file: {personFile.name}
                                    </div>
                                  )}
                                </div>

                                <div className="sm:col-span-2 lg:col-span-2">
                                  <Button
                                    onClick={handleAddPerson}
                                    className="w-full h-12 bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white shadow-lg transition-all duration-200"
                                    disabled={
                                      personSubmitting ||
                                      !personForm.type ||
                                      !personForm.fullName
                                    }
                                  >
                                    <UserPlus className="h-5 w-5 mr-2" />
                                    {personSubmitting ? "Saving..." : "Add Person"}
                                  </Button>
                                  {(personSubmitError || personSubmitSuccess) && (
                                    <div className="mt-2 text-xs">
                                      {personSubmitError && (
                                        <p className="text-red-600">{personSubmitError}</p>
                                      )}
                                      {personSubmitSuccess && (
                                        <p className="text-green-600">{personSubmitSuccess}</p>
                                      )}
                                    </div>
                                  )}
                                  {(personFormErrors.type || personFormErrors.fullName) && (
                                    <div className="mt-1 text-xs text-red-600">
                                      {personFormErrors.type && <p>Person type is required.</p>}
                                      {personFormErrors.fullName && <p>Full name is required.</p>}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Registered Persons - Enhanced Mobile View */}
                            {selectedCase.persons &&
                              selectedCase.persons.length > 0 && (
                                <div className="space-y-4">
                                  <div className="flex items-center gap-2 mb-4">
                                    <div className="h-1 w-8 bg-teal-600 rounded"></div>
                                    <h4 className="font-semibold text-slate-700 text-lg">
                                      Registered Persons (
                                      {selectedCase.persons.length})
                                    </h4>
                                  </div>

                                  {/* Desktop Table View */}
                                  <div className="hidden lg:block overflow-x-auto">
                                    <table className="w-full border border-gray-200 rounded-lg overflow-hidden">
                                      <thead>
                                        <tr className="bg-slate-50">
                                          <th className="border-r border-gray-200 p-4 text-left font-semibold text-slate-700">
                                            Type
                                          </th>
                                          <th className="border-r border-gray-200 p-4 text-left font-semibold text-slate-700">
                                            Name
                                          </th>
                                          <th className="border-r border-gray-200 p-4 text-left font-semibold text-slate-700">
                                            ID Number
                                          </th>
                                          <th className="border-r border-gray-200 p-4 text-left font-semibold text-slate-700">
                                            Phone
                                          </th>
                                          <th className="p-4 text-center font-semibold text-slate-700">
                                            Actions
                                          </th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {selectedCase.persons.map(
                                          (person, index) => (
                                            <tr
                                              key={person.id}
                                              className={
                                                index % 2 === 0
                                                  ? "bg-white"
                                                  : "bg-slate-25"
                                              }
                                            >
                                              <td className="border-r border-gray-200 p-4">
                                                <Badge
                                                  className={`${getPersonTypeColor(
                                                    person.type
                                                  )} font-medium`}
                                                >
                                                  {person.type
                                                    .charAt(0)
                                                    .toUpperCase() +
                                                    person.type.slice(1)}
                                                </Badge>
                                              </td>
                                              <td className="border-r border-gray-200 p-4 font-medium">
                                                {person.fullName}
                                              </td>
                                              <td className="border-r border-gray-200 p-4 text-gray-600">
                                                {person.residentId}
                                              </td>
                                              <td className="border-r border-gray-200 p-4 text-gray-600">
                                                {person.phoneNumber}
                                              </td>
                                              <td className="p-4">
                                                <div className="flex justify-center">
                                                  <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="mr-2"
                                                    onClick={() => {
                                                      setSelectedPerson(person);
                                                      setIsPersonDetailOpen(true);
                                                    }}
                                                  >
                                                    <Eye className="h-4 w-4" />
                                                  </Button>
                                                  <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="text-red-600 hover:bg-red-50"
                                                  >
                                                    <Trash2 className="h-4 w-4" />
                                                  </Button>
                                                </div>
                                              </td>
                                            </tr>
                                          )
                                        )}
                                      </tbody>
                                    </table>
                                  </div>

                                  {/* Mobile Card View */}
                                  <div className="lg:hidden space-y-4">
                                    {selectedCase.persons.map((person) => (
                                      <Card
                                        key={person.id}
                                        className="shadow-sm border-l-4 border-l-teal-500"
                                      >
                                        <CardContent className="p-4">
                                          <div className="flex items-start justify-between mb-3">
                                            <div className="flex items-center gap-2">
                                              <Badge
                                                className={`${getPersonTypeColor(
                                                  person.type
                                                )} font-medium`}
                                              >
                                                {person.type
                                                  .charAt(0)
                                                  .toUpperCase() +
                                                  person.type.slice(1)}
                                              </Badge>
                                            </div>
                                            <div className="flex gap-2">
                                              <Button
                                                size="sm"
                                                variant="outline"
                                                className="h-8 w-8 p-0"
                                                onClick={() => {
                                                  setSelectedPerson(person);
                                                  setIsPersonDetailOpen(true);
                                                }}
                                              >
                                                <Eye className="h-3 w-3" />
                                              </Button>
                                              <Button
                                                size="sm"
                                                variant="outline"
                                                className="text-red-600 h-8 w-8 p-0"
                                              >
                                                <Trash2 className="h-3 w-3" />
                                              </Button>
                                            </div>
                                          </div>
                                          <h5 className="font-semibold text-lg mb-2">
                                            {person.fullName}
                                          </h5>
                                          <div className="space-y-1 text-sm text-gray-600">
                                            <p>
                                              <span className="font-medium">
                                                ID:
                                              </span>{" "}
                                              {person.residentId}
                                            </p>
                                            <p>
                                              <span className="font-medium">
                                                Phone:
                                              </span>{" "}
                                              {person.phoneNumber}
                                            </p>
                                            <p>
                                              <span className="font-medium">
                                                Address:
                                              </span>{" "}
                                              {person.address}
                                            </p>
                                          </div>
                                        </CardContent>
                                      </Card>
                                    ))}
                                  </div>
                                </div>
                              )}
                          </CardContent>
                        </Card>
                      </TabsContent>

                      {/* Exhibit Registration Tab */}
                      <TabsContent value="exhibit" className="space-y-6 mt-6">
                        <Card className="shadow-lg border-t-4 border-t-slate-600">
                          <CardHeader className="bg-gradient-to-r from-slate-700 to-slate-600 text-white rounded-t-lg">
                            <CardTitle className="flex items-center gap-2">
                              <Box className="h-5 w-5" />
                              Exhibit Registration
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="pt-6 space-y-8">
                            {/* Case Description */}
                            <div className="space-y-2">
                              <label className="block text-sm font-semibold text-slate-700 mb-2">
                                Case Description *
                              </label>
                              <Textarea
                                rows={4}
                                placeholder="Enter detailed case description"
                                value={selectedCase.description || ""}
                                readOnly
                                className="bg-gray-50 border-gray-300 resize-none"
                              />
                            </div>

                            {/* Exhibit Form */}
                            <div className="space-y-4">
                              <div className="flex items-center gap-2 mb-4">
                                <div className="h-1 w-8 bg-slate-600 rounded"></div>
                                <h4 className="font-semibold text-slate-700 text-lg">
                                  Exhibit Information
                                </h4>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <Select
                                  value={exhibitForm.personId}
                                  onValueChange={(value) =>
                                    setExhibitForm((prev) => ({
                                      ...prev,
                                      personId: value,
                                    }))
                                  }
                                >
                                  <SelectTrigger className="h-12">
                                    <SelectValue placeholder="Select related person *" />
                                  </SelectTrigger>
                                  <SelectContent className="z-[10000]">
                                    {selectedCase.persons?.map((person) => (
                                      <SelectItem
                                        key={person.id}
                                        value={person.id}
                                      >
                                        <div className="flex items-center gap-2">
                                          <Badge
                                            className={`${getPersonTypeColor(
                                              person.type
                                            )} text-xs`}
                                          >
                                            {person.type
                                              .charAt(0)
                                              .toUpperCase() +
                                              person.type.slice(1)}
                                          </Badge>
                                          {person.fullName}
                                        </div>
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <Input
                                  className="h-12"
                                  placeholder="Enter exhibit name *"
                                  value={exhibitForm.name}
                                  onChange={(e) =>
                                    setExhibitForm((prev) => ({
                                      ...prev,
                                      name: e.target.value,
                                    }))
                                  }
                                />
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
                                <div className="sm:col-span-2 lg:col-span-3">
                                  <Textarea
                                    rows={3}
                                    placeholder="Enter detailed exhibit description *"
                                    value={exhibitForm.description}
                                    onChange={(e) =>
                                      setExhibitForm((prev) => ({
                                        ...prev,
                                        description: e.target.value,
                                      }))
                                    }
                                    className="resize-none"
                                  />
                                </div>
                                <Input
                                  className="h-12"
                                  type="number"
                                  placeholder="Quantity *"
                                  min="1"
                                  value={exhibitForm.quantity}
                                  onChange={(e) =>
                                    setExhibitForm((prev) => ({
                                      ...prev,
                                      quantity: parseInt(e.target.value) || 1,
                                    }))
                                  }
                                />
                                <Input
                                  className="h-12"
                                  type="date"
                                  value={exhibitForm.registeredDate}
                                  onChange={(e) =>
                                    setExhibitForm((prev) => ({
                                      ...prev,
                                      registeredDate: e.target.value,
                                    }))
                                  }
                                />
                                <div>
                                  <FileUpload onFileSelect={setExhibitFile} />
                                  {exhibitFile && (
                                    <div className="text-xs text-green-700 mt-2">
                                      Selected file: {exhibitFile.name}
                                    </div>
                                  )}
                                </div>

                                <div className="flex flex-col gap-2 sm:col-span-1">
                                  <Button
                                    onClick={handleAddExhibit}
                                    className="h-12 bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white shadow-lg transition-all duration-200"
                                    disabled={
                                      exhibitSubmitting ||
                                      !exhibitForm.personId ||
                                      !exhibitForm.name ||
                                      !exhibitForm.description
                                    }
                                  >
                                    <Box className="h-4 w-4 mr-2" />
                                    {exhibitSubmitting ? 'Saving...' : (
                                      <>
                                        <span className="hidden sm:inline">Add Exhibit</span>
                                        <span className="sm:hidden">Add</span>
                                      </>
                                    )}
                                  </Button>
                                  {(exhibitSubmitError || exhibitSubmitSuccess) && (
                                    <div className="text-xs">
                                      {exhibitSubmitError && <p className="text-red-600">{exhibitSubmitError}</p>}
                                      {exhibitSubmitSuccess && <p className="text-green-600">{exhibitSubmitSuccess}</p>}
                                    </div>
                                  )}
                                  {(exhibitFormErrors.personId || exhibitFormErrors.name || exhibitFormErrors.description || exhibitFormErrors.quantity || exhibitFormErrors.registeredDate) && (
                                    <div className="text-xs text-red-600">
                                      {exhibitFormErrors.personId && <p>Related person required.</p>}
                                      {exhibitFormErrors.name && <p>Name required.</p>}
                                      {exhibitFormErrors.description && <p>Description required.</p>}
                                      {exhibitFormErrors.quantity && <p>{exhibitFormErrors.quantity}</p>}
                                      {exhibitFormErrors.registeredDate && <p>Registration date required.</p>}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Registered Exhibits */}
                            {selectedCase.exhibits &&
                              selectedCase.exhibits.length > 0 && (
                                <div className="space-y-4">
                                  <div className="flex items-center gap-2 mb-4">
                                    <div className="h-1 w-8 bg-teal-600 rounded"></div>
                                    <h4 className="font-semibold text-slate-700 text-lg">
                                      Registered Exhibits (
                                      {selectedCase.exhibits.length})
                                    </h4>
                                  </div>

                                  <div className="grid gap-4">
                                    {selectedCase.exhibits.map((exhibit) => (
                                      <Card
                                        key={exhibit.id}
                                        className="border-l-4 border-l-teal-500 shadow-sm hover:shadow-md transition-shadow"
                                      >
                                        <CardContent className="p-4 sm:p-6">
                                          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                                            <div className="flex-1 space-y-3">
                                              <div className="flex flex-wrap items-center gap-2">
                                                <h5 className="font-semibold text-lg text-slate-800">
                                                  {exhibit.name}
                                                </h5>
                                                <Badge
                                                  variant="secondary"
                                                  className="px-2 py-1"
                                                >
                                                  Qty: {exhibit.quantity}
                                                </Badge>
                                              </div>

                                              <div className="space-y-2 text-sm">
                                                <p className="text-gray-700">
                                                  <span className="font-medium text-slate-700">
                                                    Description:
                                                  </span>
                                                  <span className="ml-1">
                                                    {exhibit.description}
                                                  </span>
                                                </p>
                                                <p className="text-gray-700">
                                                  <span className="font-medium text-slate-700">
                                                    Related to:
                                                  </span>
                                                  <span className="ml-1">
                                                    {exhibit.relatedPersonName}
                                                  </span>
                                                </p>
                                                <p className="text-xs text-gray-500">
                                                  <span className="font-medium">
                                                    Registered:
                                                  </span>
                                                  <span className="ml-1">
                                                    {new Date(
                                                      exhibit.registeredDate
                                                    ).toLocaleDateString()}
                                                  </span>
                                                </p>
                                              </div>
                                            </div>

                                            <div className="flex gap-2 self-start">
                                              <Button
                                                size="sm"
                                                variant="outline"
                                                className="mr-1"
                                                onClick={() => {
                                                  setExibitionSelectedExhibit(exhibit);
                                                  setIsExibitionDetailOpen(true);
                                                }}
                                              >
                                                <Eye className="h-4 w-4" />
                                              </Button>
                                              <Button
                                                size="sm"
                                                variant="outline"
                                                className="text-red-600 hover:bg-red-50"
                                              >
                                                <Trash2 className="h-4 w-4" />
                                              </Button>
                                            </div>
                                          </div>
                                        </CardContent>
                                      </Card>
                                    ))}
                                  </div>
                                </div>
                              )}
                          </CardContent>
                        </Card>
                      </TabsContent>
                    </Tabs>

                    {/* Enhanced Save Button */}
                    <div className="sticky bottom-0 bg-white/95 backdrop-blur-sm border-t pt-4 mt-8">
                      <div className="flex flex-col sm:flex-row gap-3 sm:justify-center items-stretch">
                        <Button
                          size="lg"
                          onClick={() => selectedCase && handleSubmitCase(selectedCase)}
                          disabled={
                            caseSubmitting ||
                            !selectedCase ||
                            !selectedCase.persons ||
                            selectedCase.persons.length === 0 ||
                            selectedCase.status === 'Submitted'
                          }
                          className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white shadow-lg transition-all duration-200 px-8 py-3 disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          <Send className="h-5 w-5 mr-2" />
                          {selectedCase?.status === 'Submitted' ? 'Already Submitted' : (caseSubmitting ? 'Submitting...' : 'Submit Case')}
                        </Button>
                        <Button
                          size="lg"
                          variant="outline"
                          onClick={() => setIsDetailOpen(false)}
                          className="border-slate-300 hover:bg-slate-50 px-8 py-3"
                        >
                          <X className="h-5 w-5 mr-2" />
                          Close
                        </Button>
                      </div>
                      {caseSubmitError && (
                        <p className="mt-2 text-center text-sm text-red-600">{caseSubmitError}</p>
                      )}
                      {!caseSubmitError && selectedCase?.persons && selectedCase.persons.length === 0 && selectedCase.status !== 'Submitted' && (
                        <p className="mt-2 text-center text-xs text-slate-500">Add at least one person to enable submission.</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Submission Success Modal */}
      {isSubmitModalOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[10000]"
            onClick={() => setIsSubmitModalOpen(false)}
          />

          {/* Modal Container */}
          <div className="fixed inset-0 z-[10001] flex items-center justify-center p-4 pointer-events-none">
            <div
              className="bg-white rounded-xl shadow-2xl w-full max-w-md pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="px-6 py-4 border-b bg-gradient-to-r from-green-600 to-green-700 text-white rounded-t-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-6 w-6" />
                    <span className="text-xl font-semibold">
                      Case Submitted
                    </span>
                  </div>
                  <button
                    onClick={() => setIsSubmitModalOpen(false)}
                    className="text-white/80 hover:text-white hover:bg-white/20 rounded-lg p-2 transition-all"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Modal Content */}
              <div className="p-6 space-y-4">
                <div className="text-center">
                  <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
                    <CheckCircle className="h-8 w-8 text-green-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Successfully Submitted!
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Your case has been submitted successfully and is now under
                    review.
                  </p>
                </div>

                {submittedCase && (
                  <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                    <div className="text-sm">
                      <span className="font-medium text-gray-700">
                        Case Title:
                      </span>
                      <span className="ml-2 text-gray-900">
                        {submittedCase.title}
                      </span>
                    </div>
                    <div className="text-sm">
                      <span className="font-medium text-gray-700">
                        CR Number:
                      </span>
                      <span className="ml-2 text-gray-900">
                        {submittedCase.crNumber}
                      </span>
                    </div>
                    <div className="text-sm">
                      <span className="font-medium text-gray-700">Status:</span>
                      <Badge className="ml-2 bg-green-100 text-green-800 border-green-200">
                        Submitted
                      </Badge>
                    </div>
                  </div>
                )}

                <div className="flex justify-center pt-4">
                  <Button
                    onClick={() => setIsSubmitModalOpen(false)}
                    className="bg-green-600 hover:bg-green-700 px-6"
                  >
                    Close
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Person Detail Modal */}
      {isPersonDetailOpen && selectedPerson && (
        <>
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[11000]"
            onClick={() => setIsPersonDetailOpen(false)}
          />
          <div className="fixed inset-0 z-[11001] flex items-center justify-center p-4 pointer-events-none">
            <div
              className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden pointer-events-auto flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-6 py-4 border-b bg-gradient-to-r from-slate-700 to-slate-600 text-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <User className="h-5 w-5" />
                  <span className="text-lg font-semibold">Person Details</span>
                  <Badge className={getPersonTypeColor(selectedPerson.type)}>
                    {selectedPerson.type.charAt(0).toUpperCase() + selectedPerson.type.slice(1)}
                  </Badge>
                </div>
                <button
                  onClick={() => setIsPersonDetailOpen(false)}
                  className="text-white/80 hover:text-white hover:bg-white/20 rounded-lg p-2 transition-all"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="overflow-y-auto p-6 space-y-6">
                <Card className="border shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <FileText className="h-4 w-4" /> Core Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                    <div><span className="font-medium text-slate-700">Full Name:</span> <span className="ml-1 text-slate-900">{selectedPerson.fullName || 'null'}</span></div>
                    <div><span className="font-medium text-slate-700">Resident ID:</span> <span className="ml-1 text-slate-900">{selectedPerson.residentId || 'null'}</span></div>
                    <div><span className="font-medium text-slate-700">Type:</span> <span className="ml-1 text-slate-900">{selectedPerson.type || 'null'}</span></div>
                    <div><span className="font-medium text-slate-700">Gender:</span> <span className="ml-1 text-slate-900">{selectedPerson.gender || 'null'}</span></div>
                    <div><span className="font-medium text-slate-700">Date of Birth:</span> <span className="ml-1 text-slate-900">{selectedPerson.dateOfBirth || 'null'}</span></div>
                    <div><span className="font-medium text-slate-700">Age:</span> <span className="ml-1 text-slate-900">{selectedPerson.age ?? 'null'}</span></div>
                    <div><span className="font-medium text-slate-700">Phone:</span> <span className="ml-1 text-slate-900">{selectedPerson.phoneNumber || 'null'}</span></div>
                    <div><span className="font-medium text-slate-700">Nationality:</span> <span className="ml-1 text-slate-900">{selectedPerson.nationality || 'null'}</span></div>
                  </CardContent>
                </Card>
                <Card className="border shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <User className="h-4 w-4" /> Address
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                    <div><span className="font-medium text-slate-700">House #:</span> <span className="ml-1 text-slate-900">{selectedPerson.houseNumber || 'null'}</span></div>
                    <div className="sm:col-span-1"><span className="font-medium text-slate-700">Address:</span> <span className="ml-1 text-slate-900 break-words">{selectedPerson.address || 'null'}</span></div>
                    <div><span className="font-medium text-slate-700">Region:</span> <span className="ml-1 text-slate-900">{selectedPerson.region || 'null'}</span></div>
                    <div><span className="font-medium text-slate-700">Nation:</span> <span className="ml-1 text-slate-900">{selectedPerson.nation || 'null'}</span></div>
                    <div><span className="font-medium text-slate-700">Woreda:</span> <span className="ml-1 text-slate-900">{selectedPerson.woreda || 'null'}</span></div>
                    <div><span className="font-medium text-slate-700">Kebele:</span> <span className="ml-1 text-slate-900">{selectedPerson.kebele || 'null'}</span></div>
                  </CardContent>
                </Card>
                <Card className="border shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <User className="h-4 w-4" /> Additional
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                    <div><span className="font-medium text-slate-700">Marital Status:</span> <span className="ml-1 text-slate-900">{selectedPerson.maritalStatus || 'null'}</span></div>
                    <div><span className="font-medium text-slate-700">Education Status:</span> <span className="ml-1 text-slate-900">{selectedPerson.educationStatus || 'null'}</span></div>
                    <div><span className="font-medium text-slate-700">Work Status:</span> <span className="ml-1 text-slate-900">{selectedPerson.workStatus || 'null'}</span></div>
                    <div className="sm:col-span-2"><span className="font-medium text-slate-700">Description:</span> <span className="ml-1 text-slate-900 break-words">{selectedPerson.description || 'null'}</span></div>
                  </CardContent>
                </Card>
                <Card className="border shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <FileText className="h-4 w-4" /> Attachments
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm">
                    {selectedPerson.fileUrl ? (
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-3 flex-wrap">
                          <Badge variant="secondary" className="text-xs">File Available</Badge>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={downloadingFileId === selectedPerson.id}
                            onClick={() => handleDownloadPersonFile(selectedPerson)}
                            className="inline-flex items-center gap-2"
                          >
                            <Download className="h-4 w-4" />
                            {downloadingFileId === selectedPerson.id ? 'Downloading...' : 'Download File'}
                          </Button>
                        </div>
                        {downloadError && (
                          <p className="text-xs text-red-600">{downloadError}</p>
                        )}
                      </div>
                    ) : (
                      <span className="text-slate-500">null</span>
                    )}
                  </CardContent>
                </Card>
              </div>
              <div className="border-t bg-slate-50 px-6 py-4 flex justify-end">
                <Button
                  variant="outline"
                  className="mr-2"
                  onClick={() => {
                    setSelectedPerson(null);
                    setIsPersonDetailOpen(false);
                  }}
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
      {/* Exibition (Exhibit) Detail Modal */}
      {isExibitionDetailOpen && exibitionSelectedExhibit && (
        <>
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[11500]"
            onClick={() => {
              setIsExibitionDetailOpen(false);
              setExibitionSelectedExhibit(null);
            }}
          />
          <div className="fixed inset-0 z-[11501] flex items-center justify-center p-4 pointer-events-none">
            <div
              className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden pointer-events-auto flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-6 py-4 border-b bg-gradient-to-r from-slate-700 to-slate-600 text-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Box className="h-5 w-5" />
                  <span className="text-lg font-semibold">Exhibit Details</span>
                </div>
                <button
                  onClick={() => {
                    setIsExibitionDetailOpen(false);
                    setExibitionSelectedExhibit(null);
                  }}
                  className="text-white/80 hover:text-white hover:bg-white/20 rounded-lg p-2 transition-all"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="overflow-y-auto p-6 space-y-6">
                <Card className="border shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <FileText className="h-4 w-4" /> Core Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                    <div><span className="font-medium text-slate-700">Name:</span> <span className="ml-1 text-slate-900 break-words">{exibitionSelectedExhibit.name || 'null'}</span></div>
                    <div><span className="font-medium text-slate-700">Quantity:</span> <span className="ml-1 text-slate-900">{exibitionSelectedExhibit.quantity ?? 'null'}</span></div>
                    <div className="sm:col-span-2"><span className="font-medium text-slate-700">Description:</span> <span className="ml-1 text-slate-900 break-words">{exibitionSelectedExhibit.description || 'null'}</span></div>
                  </CardContent>
                </Card>
                <Card className="border shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <Users className="h-4 w-4" /> Related Person
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                    <div><span className="font-medium text-slate-700">Person Name:</span> <span className="ml-1 text-slate-900 break-words">{exibitionSelectedExhibit.relatedPersonName || 'null'}</span></div>
                    <div><span className="font-medium text-slate-700">Person ID:</span> <span className="ml-1 text-slate-900">{exibitionSelectedExhibit.relatedPersonId || 'null'}</span></div>
                  </CardContent>
                </Card>
                <Card className="border shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <FileText className="h-4 w-4" /> Registration
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm space-y-2">
                    <div><span className="font-medium text-slate-700">Registered Date:</span> <span className="ml-1 text-slate-900">{exibitionSelectedExhibit.registeredDate ? new Date(exibitionSelectedExhibit.registeredDate).toLocaleDateString() : 'null'}</span></div>
                  </CardContent>
                </Card>
                <Card className="border shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <FileText className="h-4 w-4" /> Attachment
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm">
                    {exibitionSelectedExhibit.fileUrl ? (
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-3 flex-wrap">
                          <Badge variant="secondary" className="text-xs">File Available</Badge>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={exibitionDownloadingFileId === exibitionSelectedExhibit.id}
                            onClick={() => handleDownloadExibitionFile(exibitionSelectedExhibit)}
                            className="inline-flex items-center gap-2"
                          >
                            <Download className="h-4 w-4" />
                            {exibitionDownloadingFileId === exibitionSelectedExhibit.id ? 'Downloading...' : 'Download File'}
                          </Button>
                        </div>
                        {exibitionDownloadError && (
                          <p className="text-xs text-red-600">{exibitionDownloadError}</p>
                        )}
                      </div>
                    ) : (
                      <span className="text-slate-500">null</span>
                    )}
                  </CardContent>
                </Card>
              </div>
              <div className="border-t bg-slate-50 px-6 py-4 flex justify-end">
                <Button
                  variant="outline"
                  className="mr-2"
                  onClick={() => {
                    setExibitionSelectedExhibit(null);
                    setIsExibitionDetailOpen(false);
                  }}
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
