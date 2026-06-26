"use client"

import { useLanguage } from "@/contexts/language-context"
import { Header } from "@/components/home/header"
import { Footer } from "@/components/home/footer"
import { Star, Quote } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

const reviews = [
  {
    id: 1,
    name: "COMMANDER MULKUNE BEZUNEH",
    rating: 4,
    comment:
      "The Ethiopia Federal Police responded quickly to our emergency call. Their professionalism and dedication to helping our community is truly commendable.",
    date: "2024-01-15",
  },
  {
    id: 2,
    name: "Meseret ",
    rating: 5,
    comment:
      "I was impressed by the courteous and helpful attitude of the officers. They handled the situation with great care and professionalism.",
    date: "2024-01-10",
  },
  {
    id: 3,
    name: "Comissioner DEMELASH G/MICHAEL",
    rating: 4,
    comment:
      "The police officers were very helpful when I reported a theft. They followed up regularly and kept me informed throughout the investigation process.",
    date: "2024-01-08",
  },
  {
    id: 4,
    name: "Deputy Comissioner Melaku Fanta",
    rating: 4,
    comment:
      "Excellent service during a traffic incident. The officers were professional, efficient, and showed genuine concern for everyone involved.",
    date: "2024-01-05",
  },
  {
    id: 5,
    name: "Ato KASSA",
    rating: 5,
    comment:
      "The community outreach programs organized by the Ethiopia Federal Police have been very beneficial for our neighborhood. Great work!",
    date: "2024-01-03",
  },
  {
    id: 6,
    name: "DIRECTOR TAFA BEDANE",
    rating: 4,
    comment:
      "Professional and respectful officers. They handled a difficult situation in our area with patience and understanding.",
    date: "2023-12-28",
  },
]

export default function ReviewsPage() {
  const { t } = useLanguage()

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star key={i} className={`h-4 w-4 ${i < rating ? "text-yellow-400 fill-current" : "text-gray-300"}`} />
    ))
  }

  const averageRating = reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="py-16">
        <div className="max-w-7xl mx-auto px-4">
          {/* Hero Section */}
          <div className="text-center mb-16">
            <h1 className="text-4xl font-bold text-slate-700 mb-6">{t("nav.reviews")}</h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
              Read what our community members have to say about their experiences with the Ethiopia Federal Police.
            </p>

            {/* Rating Summary */}
          
          </div>

          {/* Reviews Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {reviews.map((review) => (
              <Card key={review.id} className="h-full">
                <CardContent className="p-6">
                  <div className="flex items-start space-x-4 mb-4">
                    <Avatar>
                      <AvatarFallback className="bg-slate-700 text-primary-foreground">
                        {review.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <h3 className="font-semibold text-primary">{review.name}</h3>
                      <div className="flex items-center space-x-1 mt-1">{renderStars(review.rating)}</div>
                      <p className="text-sm text-muted-foreground mt-1">{new Date(review.date).toLocaleDateString()}</p>
                    </div>
                  </div>

                  <div className="relative">
                    <Quote className="h-6 w-6 text-primary/20 absolute -top-2 -left-2" />
                    <p className="text-muted-foreground italic pl-4">"{review.comment}"</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Call to Action */}
          <div className="text-center mt-16">
            <div className="bg-primary/5 p-8 rounded-lg">
              <h2 className="text-2xl font-bold text-slate-700 mb-4">Share Your Experience</h2>
              <p className="text-muted-foreground mb-6">
                Your feedback helps us improve our services and better serve our community.
              </p>
              <p className="text-sm text-muted-foreground">
                Contact us at{" "}
                <a href="mailto:ethiopiafederalpolice@gmail.com" className="text-slate-700 hover:underline">
                  ethiopiafederalpolice@gmail.com
                </a>{" "}
                to share your review.
              </p>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
