"use client"

import { useLanguage } from "@/contexts/language-context"
import { Header } from "@/components/home/header"
import { Footer } from "@/components/home/footer"
import { Shield, Users, Award, Target } from "lucide-react"

export default function AboutPage() {
  const { t } = useLanguage()

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="py-16">
        <div className="max-w-7xl mx-auto px-4">
          {/* Hero Section */}
          <div className="text-center mb-16">
            <h1 className="text-4xl font-bold text-slate-700 mb-6">{t("nav.about")}</h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">{t("about.description")}</p>
          </div>

          {/* Mission & Vision */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-16">
            <div className="bg-card p-8 rounded-lg shadow-lg">
              <div className="flex items-center mb-4">
                <Target className="h-8 w-8 text-slate-700 mr-3" />
                <h2 className="text-2xl font-bold text-slate-700">Our Mission</h2>
              </div>
              <p className="text-muted-foreground">
                To maintain law and order, protect citizens, and ensure justice throughout Ethiopia with the highest
                standards of professionalism and integrity.
              </p>
            </div>

            <div className="bg-card p-8 rounded-lg shadow-lg">
              <div className="flex items-center mb-4">
                <Shield className="h-8 w-8 text-slate-700 mr-3" />
                <h2 className="text-2xl font-bold text-slate-700">Our Vision</h2>
              </div>
              <p className="text-muted-foreground">
                To be a world-class police force that serves the Ethiopian people with courage, compassion, and
                unwavering commitment to justice and human rights.
              </p>
            </div>
          </div>

          {/* Core Values */}
          <div className="mb-16">
            <h2 className="text-3xl font-bold text-slate-700 text-center mb-12">Our Core Values</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Shield className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-slate-700 mb-2">Integrity</h3>
                <p className="text-muted-foreground">
                  We uphold the highest ethical standards in all our actions and decisions.
                </p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-slate-700 mb-2">Service</h3>
                <p className="text-muted-foreground">
                  We are dedicated to serving our community with compassion and respect.
                </p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Award className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-slate-700 mb-2">Excellence</h3>
                <p className="text-muted-foreground">
                  We strive for excellence in all aspects of our professional duties.
                </p>
              </div>
            </div>
          </div>

          {/* History Section */}
          <div className="bg-card p-8 rounded-lg shadow-lg">
            <h2 className="text-3xl font-bold text-slate-700 mb-6">Our History</h2>
            <p className="text-muted-foreground mb-4">
              The Ethiopia Federal Police has a rich history of serving the Ethiopian people. Established to maintain
              peace and security across the nation, we have evolved into a modern, professional law enforcement agency.
            </p>
            <p className="text-muted-foreground">
              Today, we continue to adapt and improve our services, incorporating modern technology and best practices
              to better serve our communities while maintaining our core values of courage, compassion, and justice.
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
