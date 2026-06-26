"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { useLanguage } from "@/contexts/language-context"

const slides = [
  {
    image: "/images/Ethiopia-Federal-Police-picture-1.jpg",
    titleEn: "Serving Our Community",
    titleAm: "ማህበረሰባችንን ማገልገል",
    subtitleEn: "Dedicated officers working to keep Ethiopia safe",
    subtitleAm: "ኢትዮጵያን ለመጠበቅ የሚሰሩ ቆራጥ መኮንኖች",
  },
  {
    image: "/images/Ethiopia-Federal-Police-picture-2.jpg",
    titleEn: "Professional Excellence",
    titleAm: "ሙያዊ ብቃት",
    subtitleEn: "Continuous training and development for our officers",
    subtitleAm: "ለመኮንኖቻችን ቀጣይ ስልጠና እና እድገት",
  },
  {
    image: "/images/Ethiopia-Federal-Police-picture-3.jpg",
    titleEn: "Community Partnership",
    titleAm: "የማህበረሰብ አጋርነት",
    subtitleEn: "Building trust through community engagement",
    subtitleAm: "በማህበረሰብ ተሳትፎ አማካኝነት እምነት መገንባት",
  },
]

export function HeroCarousel() {
  const [currentSlide, setCurrentSlide] = useState(0)
  const { language, t } = useLanguage()

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length)
    }, 5000)
    return () => clearInterval(timer)
  }, [])

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length)
  }

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length)
  }

  return (
    <div className="relative h-[600px] overflow-hidden">
      {slides.map((slide, index) => (
        <div
          key={index}
          className={`absolute inset-0 transition-opacity duration-1000 ${
            index === currentSlide ? "opacity-100" : "opacity-0"
          }`}
        >
          <img
            src={slide.image || "/placeholder.svg"}
            alt={language === "en" ? slide.titleEn : slide.titleAm}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-primary/70 flex items-center justify-center">
            <div className="text-center text-white max-w-4xl px-4">
              <h2 className="text-5xl font-bold mb-4 text-balance">
                {language === "en" ? slide.titleEn : slide.titleAm}
              </h2>
              <p className="text-xl mb-8 text-pretty">{language === "en" ? slide.subtitleEn : slide.subtitleAm}</p>
              <Button size="lg" variant="secondary" className="text-primary">
                {t("hero.cta")}
              </Button>
            </div>
          </div>
        </div>
      ))}

      {/* Navigation arrows */}
      <Button
        variant="ghost"
        size="sm"
        className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white hover:bg-white/20"
        onClick={prevSlide}
      >
        <ChevronLeft className="h-6 w-6" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white hover:bg-white/20"
        onClick={nextSlide}
      >
        <ChevronRight className="h-6 w-6" />
      </Button>

      {/* Slide indicators */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
        {slides.map((_, index) => (
          <button
            key={index}
            className={`w-3 h-3 rounded-full transition-colors ${
              index === currentSlide ? "bg-secondary" : "bg-white/50"
            }`}
            onClick={() => setCurrentSlide(index)}
          />
        ))}
      </div>
    </div>
  )
}
