
// app/page.tsx
"use client"

import { HeroCarousel } from "@/components/home/hero-carousel"
import { Header } from "@/components/home/header"
import { Footer } from "@/components/home/footer"

import { Card, CardContent } from "@/components/ui/card"
import { Shield, Users, Award, Phone } from "lucide-react"
import { useLanguage } from "@/contexts/language-context"

export default function HomePage() {
  const { t, language } = useLanguage()

  const features = [
    {
      icon: Shield,
      titleEn: "Public Safety",
      titleAm: "የህዝብ ደህንነት",
      descriptionEn: "Ensuring the safety and security of all Ethiopian citizens",
      descriptionAm: "የሁሉም የኢትዮጵያ ዜጎች ደህንነት እና ጸጥታ ማረጋገጥ",
    },
    {
      icon: Users,
      titleEn: "Community Service",
      titleAm: "የማህበረሰብ አገልግሎት",
      descriptionEn: "Building strong relationships with communities across Ethiopia",
      descriptionAm: "በኢትዮጵያ ውስጥ ካሉ ማህበረሰቦች ጋር ጠንካራ ግንኙነት መገንባት",
    },
    {
      icon: Award,
      titleEn: "Professional Excellence",
      titleAm: "ሙያዊ ብቃት",
      descriptionEn: "Maintaining the highest standards of law enforcement",
      descriptionAm: "ከፍተኛ የህግ አስከባሪ ደረጃዎችን መጠበቅ",
    },
    {
      icon: Phone,
      titleEn: "Emergency Response",
      titleAm: "የአደጋ ጊዜ ምላሽ",
      descriptionEn: "24/7 emergency services for all citizens",
      descriptionAm: "ለሁሉም ዜጎች 24/7 የአደጋ ጊዜ አገልግሎቶች",
    },
  ]

  return (
    <div className="min-h-screen">
      <Header />

      {/* Hero Section */}
      <HeroCarousel />

      {/* About Section */}
      <section className="py-16 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4 text-slate-700">{t("about.title")}</h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto text-pretty">{t("about.description")}</p>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <Card key={index} className="text-center hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <feature.icon className="h-8 w-8 text-slate-700" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2 text-slate-700">
                    {language === "en" ? feature.titleEn : feature.titleAm}
                  </h3>
                 
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
