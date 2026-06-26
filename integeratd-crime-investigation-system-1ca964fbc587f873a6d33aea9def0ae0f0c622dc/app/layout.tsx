import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { Providers } from "./providers" 
import "./globals.css"

export const metadata: Metadata = {
  title: "Ethiopia Federal Police - Crime Investigation System",
  description: "Integrated Crime Investigation Management System",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" >
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}