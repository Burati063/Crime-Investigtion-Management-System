"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/language-context";
import { Menu, X, Globe } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Image from "next/image";

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { language, setLanguage, t } = useLanguage();

  return (
    <header className="bg-gradient-to-br from-slate-800 via-slate-900 to-slate-900 border-slate-700 text-primary-foreground shadow-lg">
      {/* Main header */}
      <div className="py-4 px-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Logo and title */}
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center">
              <div className="w-16 h-16 relative">
                <Image
                  src="/images/i.png"
                  alt="Ethiopia Federal Police Logo"
                  fill
                  className="object-contain"
                />
              </div>
            </div>
            <div>
              <h1 className="text-2xl font-bold">{t("site.title")}</h1>
              <p className="text-secondary text-sm italic">{t("site.motto")}</p>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link href="/" className="hover:text-secondary transition-colors">
              {t("nav.home")}
            </Link>
            <Link
              href="/about"
              className="hover:text-secondary transition-colors"
            >
              {t("nav.about")}
            </Link>
            <Link
              href="/contact"
              className="hover:text-secondary transition-colors"
            >
              {t("nav.contact")}
            </Link>
            <Link
              href="/reviews"
              className="hover:text-secondary transition-colors"
            >
              {t("nav.reviews")}
            </Link>
            <div className="flex items-center space-x-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-primary-foreground hover:bg-primary/20"
                  >
                    <Globe className="h-4 w-4 mr-2" />
                    {language === "en" ? "EN" : "አማ"}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => setLanguage("en")}>
                    English
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setLanguage("am")}>
                    አማርኛ
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button variant="secondary" asChild>
                <Link href="/auth/login">{t("nav.login")}</Link>
              </Button>
             
             {/* <Button
                variant="outline"
                className="border-secondary text-secondary hover:bg-secondary hover:text-primary bg-transparent"
                asChild
              >
                <Link href="/auth/signup">{t("nav.signup")}</Link>
              </Button>

             */}
            </div>
          </nav>

          {/* Mobile menu button */}
          <Button
            variant="ghost"
            size="sm"
            className="md:hidden text-primary-foreground"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </Button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <nav className="md:hidden mt-4 pb-4 border-t border-primary-foreground/20">
            <div className="flex flex-col space-y-4 pt-4">
              <Link href="/" className="hover:text-secondary transition-colors">
                {t("nav.home")}
              </Link>
              <Link
                href="/about"
                className="hover:text-secondary transition-colors"
              >
                {t("nav.about")}
              </Link>
              <Link
                href="/contact"
                className="hover:text-secondary transition-colors"
              >
                {t("nav.contact")}
              </Link>
              <Link
                href="/reviews"
                className="hover:text-secondary transition-colors"
              >
                {t("nav.reviews")}
              </Link>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-primary-foreground hover:bg-primary/20 justify-start"
                  >
                    <Globe className="h-4 w-4 mr-2" />
                    {language === "en" ? "English" : "አማርኛ"}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => setLanguage("en")}>
                    English
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setLanguage("am")}>
                    አማርኛ
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <div className="flex flex-col space-y-2 pt-2">
                <Button variant="secondary" asChild>
                  <Link href="auth/login">{t("nav.login")}</Link>
                </Button>
          {/*      
                <Button
                  variant="outline"
                  className="border-secondary text-secondary hover:bg-secondary hover:text-primary bg-transparent"
                  asChild
                >
                  <Link href="/signup">{t("nav.signup")}</Link>
                </Button>
          */}
              </div>
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}
