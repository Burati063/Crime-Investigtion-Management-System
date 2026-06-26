"use client"

import { LoginForm } from "@/components/auth/login-form"

import { Header } from "@/components/home/header"
import { Footer } from "@/components/home/footer"

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Fixed Header at top */}
      <div className="w-full shadow-sm z-10">
        <Header />
      </div>

      {/* Main content grows to fill space between header & footer */}
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <LoginForm />
        </div>
      </main>

      {/* Footer anchored at bottom */}
      <div className="w-full border-t mt-auto">
        <Footer />
      </div>
    </div>
  )
}