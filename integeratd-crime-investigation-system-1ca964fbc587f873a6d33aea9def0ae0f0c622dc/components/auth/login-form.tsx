"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Eye, EyeOff } from "lucide-react"
import { useRouter } from "next/navigation"
import { useLanguage } from "@/contexts/language-context"
import { LanguageSwitcher } from "@/components/ui/language-switcher"
import Image from "next/image"
import Link from "next/link"
// base URL used directly where needed; see lib/config
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { da } from "date-fns/locale"

export function LoginForm(){
  const [showPassword, setShowPassword] = useState(false)
  const [identifier, setIdentifier] = useState("")
  const [password, setPassword] = useState("")
  const [rememberMe, setRememberMe] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const { t } = useLanguage()

  const isEmail = (value: string) => /[^\s@]+@[^\s@]+\.[^\s@]+/.test(value)
  const isUsername = (value: string) => /^[a-zA-Z0-9._-]{3,30}$/.test(value)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Basic validation for identifier as email or username
    if (!identifier || !(isEmail(identifier) || isUsername(identifier))) {
      setError("Please enter a valid email or username.")
      return
    }
    if (!password) {
      setError("Please enter your password.")
      return
    }

    try {
      setIsLoading(true)
  // Prefer a single full login URL from env; fallback to base + path if not set
  const url =
    `${process.env.NEXT_PUBLIC_API_BASE_URL || ""}/api/auth/login`
    
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ identifier, password }),
      })


      if (!res.ok) {
        // Map common status codes to messages
        let message = "Login failed. Please try again."
        switch (res.status) {
          case 400:
            message = "Invalid request. Check your input and try again."
            break
          case 401:
            message = "Invalid credentials. Please check your identifier and password."
            break
          case 403:
            message = "You don't have permission to sign in."
            break
          case 404:
            message = "User not found."
            break
          case 422:
            message = "Validation error. Please review your input."
            break
          case 429:
            message = "Too many attempts. Please wait and try again."
            break
          default:
            if (res.status >= 500) message = "Server error. Please try again later."
        }
        setError(message)
        return
      }

      const data = await res.json().catch(() => ({}))
      const user = data?.user || null
      if (!user) {
        setError("Unexpected response from server. Please try again.")
        return
      }

      // Persist user info (clean before write to avoid stale data)
      try {
        // Remove any previous auth-related items first
        localStorage.removeItem("user")
        localStorage.removeItem("userRole")
        localStorage.removeItem("username")
        localStorage.removeItem("rememberMe")
        
        localStorage.removeItem("token")

        // Write fresh values
        localStorage.setItem("user", JSON.stringify(user))
        const role = user.role ?? null
        const uname = user.username
        const token = user.access_token || data.access_token || user.token || null
        if (role) localStorage.setItem("userRole", role)
        if (uname) localStorage.setItem("username", String(uname))
        if (token) localStorage.setItem("token", token)
        if (rememberMe) localStorage.setItem("rememberMe", "true")
      } catch {
        // Ignore storage errors
      }

      router.push("/dashboard")
    } catch (err) {
      setError("Network error. Please check your connection and try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="bg-gradient-to-br from-slate-800 via-slate-900 to-slate-900 border-slate-700 shadow-xl">
      <CardHeader className="text-center pb-8">
        <div className="flex justify-between items-start mb-6">
          <div></div>
          <LanguageSwitcher />
        </div>
 {/* Logo Section */}
 <div className="flex justify-center mb-6">
          <div className="bg-white/10 p-2 rounded-full">
            <div className="w-20 h-20 relative">
              <Image
                src="/images/i.png" 
                alt="Ethiopia Federal Police Logo"
                fill
                className="object-contain"
              />
            </div>
          </div>
        </div>

        <h1 className="text-2xl font-semibold text-white mb-2">{t("auth.title")}</h1>
        <p className="text-lg text-slate-300">{t("auth.subtitle")}</p>
      </CardHeader>

      <CardContent className="space-y-6">
        <form onSubmit={handleLogin} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="identifier" className="text-white">
              {/* Fallback to English if translation key is missing */}
              {t("auth.identifier") !== "auth.identifier" ? t("auth.identifier") : "Email or Username"}
            </Label>
            <Input
              id="identifier"
              type="text"
              placeholder={t("auth.identifier") !== "auth.identifier" ? t("auth.identifier") : "Email or Username"}
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              className="bg-white/90 border-slate-300 text-gray-900 placeholder:text-gray-500"
              required
              autoComplete="username"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-white">
              {t("auth.password")}
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder={t("auth.password")}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-white/90 border-slate-300 text-gray-900 placeholder:text-gray-500 pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          {/*
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="remember"
                checked={rememberMe}
                onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                className="border-slate-300 data-[state=checked]:bg-white data-[state=checked]:text-slate-800"
              />
              <Label htmlFor="remember" className="text-sm text-slate-300">
                {t("auth.rememberMe")}
              </Label>
            </div>
            <button type="button" className="text-sm text-slate-300 hover:text-white">
              {t("auth.forgotPassword")}
            </button>
          </div>
          */}

          <Button type="submit" disabled={isLoading} className="w-full bg-white hover:bg-slate-50 text-slate-800 font-semibold disabled:opacity-70">
            {isLoading ? "Signing in..." : t("auth.signIn")}
          </Button>
        </form>

        {/*
          <div className="text-center">
          <span className="text-slate-300">{t("auth.dontHaveAccount").split("?")[0]}?  </span>
          <Link href="/auth/signup">
            <button className="text-white hover:text-slate-300 font-semibold">
            {t("common.signup")}
            </button>
          </Link>
        </div>
        */}
      </CardContent>
    </Card>
  )
}
