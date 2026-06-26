// lib/config.ts
// Centralized app configuration
// - Reads base URL from environment variables
// - Safe for both server and client (browser) usage

// Next.js only exposes env vars prefixed with NEXT_PUBLIC_ to the browser.
// For server-only code, prefer API_BASE_URL; for client, use NEXT_PUBLIC_API_BASE_URL.

export const isServer = typeof window === "undefined"

function normalizeBaseUrl(url: string): string {
  // Remove trailing slash for consistency
  return url.replace(/\/$/, "")
}

function resolveBaseUrl(): string {
  if (isServer) {
    // Server-side: can use non-exposed env vars
    const serverUrl = process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL
    if (serverUrl && serverUrl.length > 0) return normalizeBaseUrl(serverUrl)
    // Fallback to NEXT_PUBLIC_ if provided, else default to relative
    return ""
  }

  // Client-side: only NEXT_PUBLIC_ is available
  const clientUrl = process.env.NEXT_PUBLIC_API_BASE_URL
  if (clientUrl && clientUrl.length > 0) return normalizeBaseUrl(clientUrl)
  // Default to same-origin relative base
  return ""
}

// Resolved at import time – safe for edge/runtime too.
export const BASE_URL: string = resolveBaseUrl()

// Helper to construct absolute API URLs consistently
export function withBase(path: string): string {
  if (!path) return BASE_URL
  // If path is already absolute (http/https), return as-is
  if (/^https?:\/\//i.test(path)) return path
  const base = BASE_URL
  if (!base) return path.startsWith("/") ? path : `/${path}`
  return `${base}${path.startsWith("/") ? path : `/${path}`}`
}

// Convenience accessor
export function getBaseUrl(): string {
  return BASE_URL
}

export type AppConfig = {
  baseUrl: string
}

export const config: AppConfig = {
  baseUrl: BASE_URL,
}
