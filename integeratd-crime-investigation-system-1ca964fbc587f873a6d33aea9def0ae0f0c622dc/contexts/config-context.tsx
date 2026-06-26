"use client"

import React from "react"
import { BASE_URL } from "@/lib/config"

type ConfigContextValue = {
  baseUrl: string
}

const ConfigContext = React.createContext<ConfigContextValue>({
  baseUrl: "",
})

export function ConfigProvider({ children }: { children: React.ReactNode }) {
  return (
    <ConfigContext.Provider value={{ baseUrl: BASE_URL }}>
      {children}
    </ConfigContext.Provider>
  )
}

export function useBaseUrl() {
  const ctx = React.useContext(ConfigContext)
  if (!ctx) throw new Error("useBaseUrl must be used within ConfigProvider")
  return ctx.baseUrl
}
