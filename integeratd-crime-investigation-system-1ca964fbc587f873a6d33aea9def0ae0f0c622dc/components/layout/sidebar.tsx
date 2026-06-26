"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Home,
  Users,
  Building2,
  FileText,
  Download,
  FolderPlus,
  History,
  UserCheck,
  ClipboardList,
  Scale,
  Settings,
  LogOut,
  Menu,
  X,
} from "lucide-react"
import Image from "next/image"
interface SidebarProps {
  userRole: string
}

export function Sidebar({ userRole }: SidebarProps) {
  const [isOpen, setIsOpen] = useState(false)
  const router = useRouter()

  const handleLogout = () => {
    localStorage.removeItem("userRole")
    localStorage.removeItem("username")
    router.push("/")
  }

  const getMenuItems = () => {
    const commonItems = [
      { icon: Home, label: "Dashboard", href: "/dashboard" },
     // { icon: Settings, label: "Settings", href: "/settings" },
    ]

    switch (userRole) {
      case "admin":
        return [
          ...commonItems.slice(0, 1),
          { icon: Users, label: "User Management", href: "/admin/users" },
          { icon: Building2, label: "Case Departments", href: "/admin/departments" },
          { icon: FileText, label: "Reports", href: "/admin/reports" },
          { icon: Download, label: "Backup & Export", href: "/admin/backup" },
          ...commonItems.slice(1),
        ]
      case "pre_investigation":
        return [
          ...commonItems.slice(0, 1),
          { icon: FolderPlus, label: "Register Case", href: "/pre-investigation/register" },
          { icon: History, label: "Case History", href: "/pre-investigation/history" },
          ...commonItems.slice(1),
        ]
      case "department_head":
        return [
          ...commonItems.slice(0, 1),
          { icon: ClipboardList, label: "Pending Cases", href: "/department-head/pending" },
          { icon: UserCheck, label: "Assign Investigators", href: "/department-head/assign" },
          { icon: Scale, label: "Assign Prosecutor", href: "/department-head/assign-prosecutor" },
          { icon: ClipboardList, label: "Daily Activity", href: "/department-head/daily-activity" },
          ...commonItems.slice(1),
        ]
      case "investigator":
        return [
          ...commonItems.slice(0, 1),
          {
            icon: ClipboardList,
            label: "My Cases",
            href: "/investigator/my-cases",
          },
          { icon: FileText, label: "Reports", href: "/investigator/reports" },
          ...commonItems.slice(1),
        ];
      case "prosecutor":
        return [
          ...commonItems.slice(0, 1),
          { icon: Scale, label: "Review Cases", href: "/prosecutor/review" },
          { icon: FileText, label: "Case Decisions", href: "/prosecutor/decisions" },
          ...commonItems.slice(1),
        ]
      default:
        return commonItems
    }
  }

  const menuItems = getMenuItems()

  return (
    <>
      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-4 left-4 z-50 md:hidden bg-slate-800 text-white hover:bg-slate-700"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </Button>

      {/* Sidebar */}
      <div
        className={`fixed left-0 top-0 h-full w-64 bg-slate-900 text-white transform transition-transform duration-300 ease-in-out z-40 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0`}
      >
      <div className="p-6 border-b border-slate-700">
  <div className="flex items-center space-x-3">
    {/* Image wrapper */}
    <div className="relative w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16">
      <Image
        src="/images/i.png"
        alt="Ethiopia Federal Police Logo"
        fill
        className="object-contain"
        sizes="(max-width: 640px) 48px, (max-width: 768px) 56px, 64px"
        priority
      />
    </div>

    <div>
      <h2 className="font-semibold text-sm sm:text-base md:text-lg">
        Ethiopia Federal Police
      </h2>
      <p className="text-xs sm:text-sm text-slate-400">
        Crime Investigation
      </p>
    </div>
  </div>
</div>

        {/* Navigation */}
        <nav className="flex-1 p-4">
          <ul className="space-y-2">
            {menuItems.map((item, index) => (
              <li key={index}>
                <Button
                  variant="ghost"
                  className="w-full justify-start text-slate-300 hover:text-white hover:bg-slate-800"
                  onClick={() => {
                    router.push(item.href)
                    setIsOpen(false)
                  }}
                >
                  <item.icon className="mr-3 h-4 w-4" />
                  {item.label}
                </Button>
              </li>
            ))}
          </ul>
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-slate-700">
          <Button
            variant="ghost"
            className="w-full justify-start text-red-400 hover:text-red-300 hover:bg-slate-800"
            onClick={handleLogout}
          >
            <LogOut className="mr-3 h-4 w-4" />
            Logout
          </Button>
        </div>
      </div>

      {/* Overlay for mobile */}
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden" onClick={() => setIsOpen(false)} />
      )}
    </>
  )
}
