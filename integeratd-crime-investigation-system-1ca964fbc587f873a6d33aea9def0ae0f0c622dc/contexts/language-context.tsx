// contexts/language-context.tsx
"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"

type Language = "en" | "am"

interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: string) => string
}

const translations = {
  en: {
    site: {
      title: "Ethiopia Federal Police",
      motto: "Protect with courage, serve with compassion!",
    },
    nav: {
      home: "Home",
      about: "About Us",
      contact: "Contact Us",
      reviews: "Reviews",
      login: "Login",
      signup: "Sign Up",
    },
    hero: {
      title: "Protecting Ethiopia with Honor",
      subtitle: "Dedicated to serving our community with integrity and professionalism",
      cta: "Learn More",
    },
    about: {
      title: "About Ethiopia Federal Police",
      description: "The Ethiopia Federal Police is committed to maintaining law and order, protecting citizens, and ensuring justice throughout Ethiopia.",
    },
    contact: {
      title: "Contact Information",
      address: "Mexico Adebabay, Addis Ababa, Ethiopia",
      phone: "+251 118 886 228",
      email: "ethiopiafederalpolice@gmail.com",
    },
    footer: {
      legal: "Legal Documents",
      proclamations: "Proclamations",
      rules: "Rules and Regulations",
      facebook: "Crime Investigation Facebook Page",
      rights: "© 2025 Ethiopia Federal Police. All rights reserved.",
      socialMedia: "Social Media",
      youtube: "YouTube",
      telegram: "Telegram",
      linkedin: "LinkedIn",
    },
    auth: {
      title: "Welcome",
      subtitle: "Please sign in or create an account",
      fullName: "Full Name",
      identifier: "Email or Username",
      username: "Username",
      password: "Password",
      role: "Role",
      department: "Department",
      selectRole: "Select a role",
      rememberMe: "Remember Me",
      forgotPassword: "Forgot Password?",
      signUp: "Sign Up",
      signIn: "Sign In",
      alreadyHaveAccount: "Already have an account?",
      dontHaveAccount: "Don’t have an account?",
    },
    roles: {
      admin: "Admin",
      preInvestigation: "Pre-investigation",
      departmentHead: "Department Head",
      investigator: "Investigator",
      prosecutor: "Prosecutor",
    },
    common: {
      login: "Login",
      signup: "Sign Up",
    },
  },

  am: {
    site: {
      title: "የኢትዮጵያ ፌዴራል ፖሊስ",
      motto: "በጀግንነት መጠበቅ በሰባዊነት ማገልገል!",
    },
    nav: {
      home: "መነሻ",
      about: "ስለ እኛ",
      contact: "አግኙን",
      reviews: "ግምገማዎች",
      login: "ግባ",
      signup: "ተመዝገብ",
    },
    hero: {
      title: "ኢትዮጵያን በክብር መጠበቅ",
      subtitle: "ማህበረሰባችንን በታማኝነት እና በሙያዊነት ለማገልገል ቆርጠናል",
      cta: "ተጨማሪ ይወቁ",
    },
    about: {
      title: "ስለ የኢትዮጵያ ፌዴራል ፖሊስ",
      description: "የኢትዮጵያ ፌዴራል ፖሊስ ሕግና ስርዓትን ለማስከበር፣ ዜጎችን ለመጠበቅ እና በኢትዮጵያ ውስጥ ፍትህን ለማረጋገጥ ቆርጦ ይሰራል።",
    },
    contact: {
      title: "የመገኛ አድራሻ",
      address: "ሜክሲኮ አደባባይ፣ አዲስ አበባ፣ ኢትዮጵያ",
      phone: "+251 118 886 228",
      email: "ethiopiafederalpolice@gmail.com",
    },
    footer: {
      legal: "ሕጋዊ ሰነዶች",
      proclamations: "አዋጆች",
      rules: "ደንቦች እና ዝግጅቶች",
      facebook: "የወንጀል ምርመራ ፌስቡክ ገጽ",
      rights: "© 2025 የኢትዮጵያ ፌዴራል ፖሊስ። ሁሉም መብቶች የተጠበቁ ናቸው።",
      socialMedia: "ማህበራዊ ድረገጽ",
      youtube: "ዩቲዩብ",
      telegram: "ቴሌግራም",
      linkedin: "ሊንኪድን",
    },
    auth: {
      title: "እንኳን በደህና መጡ",
      subtitle: "እባክዎ ይግቡ ወይም አካውንት ይፍጠሩ",
      fullName: "ሙሉ ስም",
      identifier: "ኢሜይል ወይም የተጠቃሚ ስም",
      username: "የተጠቃሚ ስም",
      password: "የይለፍ ቃል",
      role: "ሚና",
      department: "ክፍል",
      selectRole: "ሚና ይምረጡ",
      rememberMe: "አስታውሰኝ",
      forgotPassword: "የይለፍ ቃል ረሱ?",
      signUp: "ተመዝገብ",
      signIn: "ግባ",
      alreadyHaveAccount: "አካውንት አለዎት?",
      dontHaveAccount: "አካውንት የለዎትም?",
    },
    roles: {
      admin: "አስተዳዳሪ",
      preInvestigation: "ቅድመ-ምርመራ",
      departmentHead: "የክፍል ኃላፊ",
      investigator: "መርማሪ",
      prosecutor: "ዐቃቤ ሕግ",
    },
    common: {
      login: "ግባ",
      signup: "ተመዝገብ",
    },
  },
};


const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>("en")

  useEffect(() => {
    // Only run on client side
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem("language") as Language
      if (saved && (saved === "en" || saved === "am")) {
        setLanguage(saved)
      }
    }
  }, [])

  const handleSetLanguage = (lang: Language) => {
    setLanguage(lang)
    if (typeof window !== 'undefined') {
      localStorage.setItem("language", lang)
    }
  }
const t = (key: string): string => {
  const keys = key.split(".");
  let value: any = translations[language];

  for (const k of keys) {
    if (value && typeof value === "object" && k in value) {
      value = value[k];
    } else {
      return key;
    }
  }

  return typeof value === "string" ? value : key;
}

  return (
    <LanguageContext.Provider value={{ language, setLanguage: handleSetLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider")
  }
  return context
}
