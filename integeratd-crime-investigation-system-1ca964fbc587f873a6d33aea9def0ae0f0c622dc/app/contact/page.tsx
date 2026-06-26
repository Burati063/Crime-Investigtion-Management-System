"use client"

import { useLanguage } from "@/contexts/language-context"
import { Header } from "@/components/home/header"
import { Footer } from "@/components/home/footer"
import { MapPin, Phone, Mail, Clock, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function ContactPage() {
  const { t } = useLanguage()

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="py-16">
        <div className="max-w-7xl mx-auto px-4">
          {/* Hero Section */}
          <div className="text-center mb-16">
            <h1 className="text-4xl font-bold text-slate-700 mb-6">{t("nav.contact")}</h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Get in touch with the Ethiopia Federal Police. We're here to serve and protect our community.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Contact Information */}
            <div>
              <h2 className="text-2xl font-bold text-slate-700 mb-8">Contact Information</h2>

              <div className="space-y-6">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-start space-x-4">
                      <MapPin className="h-6 w-6 text-slate-700 mt-1" />
                      <div>
                        <h3 className="font-semibold text-slate-700 mb-1">Address</h3>
                        <a
                          href="https://maps.google.com/?q=Mexico+Adebabay,+Addis+Ababa,+Ethiopia"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-slate-700 transition-colors"
                        >
                          {t("contact.address")}
                        </a>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-start space-x-4">
                      <Phone className="h-6 w-6 text-slate-700 mt-1" />
                      <div>
                        <h3 className="font-semibold text-slate-700 mb-1">Phone</h3>
                        <a
                          href="tel:+251118886228"
                          className="text-muted-foreground hover:text-slate-700 transition-colors"
                        >
                          {t("contact.phone")}
                        </a>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-start space-x-4">
                      <Mail className="h-6 w-6 text-slate-700 mt-1" />
                      <div>
                        <h3 className="font-semibold text-slate-700 mb-1">Email</h3>
                        <a
                          href="mailto:ethiopiafederalpolice@gmail.com"
                          className="text-muted-foreground hover:text-slate-700 transition-colors"
                        >
                          {t("contact.email")}
                        </a>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-start space-x-4">
                      <Clock className="h-6 w-6 text-slate-700 mt-1" />
                      <div>
                        <h3 className="font-semibold text-slate-700 mb-1">Office Hours</h3>
                        <div className="text-muted-foreground">
                          <p>Monday - Friday: 8:00 AM - 6:00 PM</p>
                          <p>Saturday: 9:00 AM - 4:00 PM</p>
                          <p>Sunday: Closed</p>
                          <p className="text-slate-700 font-medium mt-2">Emergency: 24/7</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Contact Form */}
            <div>
              <Card>
                <CardHeader>
                  <CardTitle className="text-2xl text-slate-700">Send us a Message</CardTitle>
                </CardHeader>
                <CardContent>
                  <form className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="firstName" className="block text-sm font-medium text-slate-700 mb-2">
                          First Name
                        </label>
                        <Input id="firstName" placeholder="Enter your first name" />
                      </div>
                      <div>
                        <label htmlFor="lastName" className="block text-sm font-medium text-slate-700 mb-2">
                          Last Name
                        </label>
                        <Input id="lastName" placeholder="Enter your last name" />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-2">
                        Email
                      </label>
                      <Input id="email" type="email" placeholder="Enter your email" />
                    </div>

                    <div>
                      <label htmlFor="phone" className="block text-sm font-medium text-slate-700 mb-2">
                        Phone Number
                      </label>
                      <Input id="phone" type="tel" placeholder="Enter your phone number" />
                    </div>

                    <div>
                      <label htmlFor="subject" className="block text-sm font-medium text-slate-700 mb-2">
                        Subject
                      </label>
                      <Input id="subject" placeholder="Enter the subject" />
                    </div>

                    <div>
                      <label htmlFor="message" className="block text-sm font-medium text-slate-700 mb-2">
                        Message
                      </label>
                      <Textarea id="message" placeholder="Enter your message" rows={6} />
                    </div>

                    <Button type="submit" className="w-full bg-slate-700 hover:bg-slate-800">
                      <Send className="h-4 w-4 mr-2" />
                      Send Message
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
