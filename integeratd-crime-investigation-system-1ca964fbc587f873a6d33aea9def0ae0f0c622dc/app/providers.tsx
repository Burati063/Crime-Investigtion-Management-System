// app/providers.tsx
"use client"

import { LanguageProvider as LanguageProvider1 } from "@/contexts/language-context"
import { LanguageProvider } from "@/lib/i18n"
import { ConfigProvider } from "@/contexts/config-context"

export function Providers({ children }: { children: React.ReactNode }) {
  return <LanguageProvider>
   <LanguageProvider1>
    <ConfigProvider>{children}</ConfigProvider>
   </LanguageProvider1>
  </LanguageProvider>
}