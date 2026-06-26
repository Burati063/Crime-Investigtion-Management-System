"use client"

import Link from "next/link"
import { useLanguage } from "@/contexts/language-context"
import { Facebook, Send, Youtube, Linkedin, MapPin, Phone, Mail } from "lucide-react"

export function Footer() {
  const { t } = useLanguage()

  return (
    <footer className="bg-gradient-to-br from-slate-800 via-slate-900 to-slate-900 border-slate-700 text-primary-foreground">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="flex flex-col md:flex-row md:justify-between ">
          {/* Legal Documents */}
          <div>
            <h3 className="text-lg font-semibold mb-4 text-secondary">{t("footer.legal")}</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/proclamations" className="hover:text-secondary transition-colors">
                  {t("footer.proclamations")}
                </Link>
              </li>
              <li>
                <Link href="/rules" className="hover:text-secondary transition-colors">
                  {t("footer.rules")}
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Information */}
          <div>
            <h3 className="text-lg font-semibold mb-4 text-secondary">{t("contact.title")}</h3>
            <div className="space-y-3">
              <div className="flex items-start space-x-2">
                <MapPin className="h-5 w-5 text-secondary mt-0.5 flex-shrink-0" />
                <a
                  href="https://maps.google.com/?q=Mexico+Adebabay,+Addis+Ababa,+Ethiopia"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm hover:text-secondary transition-colors"
                >
                  {t("contact.address")}
                </a>
              </div>
              <div className="flex items-center space-x-2">
                <Phone className="h-5 w-5 text-secondary" />
                <a href="tel:+251118886228" className="text-sm hover:text-secondary transition-colors">
                  {t("contact.phone")}
                </a>
              </div>
              <div className="flex items-center space-x-2">
                <Mail className="h-5 w-5 text-secondary" />
                <a
                  href="mailto:ethiopiafederalpolice@gmail.com"
                  className="text-sm hover:text-secondary transition-colors"
                >
                  {t("contact.email")}
                </a>
              </div>
            </div>
          </div>

          {/* Social Media */}
          <div>
            <h3 className="text-lg font-semibold mb-4 text-secondary">{t("footer.socialMedia")}</h3>
            <div className="space-y-3">
              <Link
                href="https://facebook.com/ethiopiafederalpolice"
                className="flex items-center space-x-2 hover:text-secondary transition-colors"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Facebook className="h-5 w-5" />
                <span className="text-sm">{t("footer.facebook")}</span>
              </Link>
              <Link
                href="https://t.me/ethiopiafederalpolice"
                className="flex items-center space-x-2 hover:text-secondary transition-colors"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Send className="h-5 w-5" />
                <span className="text-sm">{t("footer.telegram")}</span>
              </Link>
              <Link
                href="https://youtube.com/ethiopiafederalpolice"
                className="flex items-center space-x-2 hover:text-secondary transition-colors"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Youtube className="h-5 w-5" />
                <span className="text-sm">{t("footer.youtube")}</span>
              </Link>
              <Link
                href="https://linkedin.com/company/ethiopiafederalpolice"
                className="flex items-center space-x-2 hover:text-secondary transition-colors"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Linkedin className="h-5 w-5" />
                <span className="text-sm">{t("footer.linkedin")}</span>
              </Link>
            </div>
          </div>

        </div>

        <div className="border-t border-primary-foreground/20 mt-8 pt-8 text-center">
          <p className="text-sm">{t("footer.rights")}</p>
        </div>
      </div>
    </footer>
  )
}
