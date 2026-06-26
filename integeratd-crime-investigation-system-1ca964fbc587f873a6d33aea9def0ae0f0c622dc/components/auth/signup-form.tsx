"use client";

import type React from "react";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Eye, EyeOff } from "lucide-react";
import { useLanguage } from "@/contexts/language-context";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import Image from "next/image";
import Link from "next/link";

export function SignupForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    username: "",
    password: "",
    role: "",
    department: "",
    rank: "",
  });

  const { t } = useLanguage();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle signup logic here
    console.log("Signup data:", formData);
  };
  const ranks = [
    "Constable",
    "Assistant Sergeant",
    "Deputy Sergeant",
    "Sergeant",
    "Chief Sergeant",
    "Assistant Inspector",
    "Deputy Inspector",
    "Inspector",
    "Chief Inspector",
    "Deputy Commander",
    "Commander",
    "Assistant Commissioner",
    "Deputy Commissioner",
    "Commissioner",
    "Deputy Commissioner General",
    "Commissioner General",
  ];
  return (
    <Card className="bg-gradient-to-br from-slate-800 via-slate-900 to-slate-900 border-slate-700 shadow-xl">
      <CardHeader className="text-center pb-8">
        <div className="flex justify-between items-start mb-6">
          <div></div>
          <LanguageSwitcher />
        </div>
        {/* Logo Section */}
        <div className="flex justify-center mb-6">
          <div className="bg-white/10 p-4 rounded-full">
            <div className="w-16 h-16 relative">
              <Image
                src="/images/i.png"
                alt="Ethiopia Federal Police Logo"
                fill
                className="object-contain"
              />
            </div>
          </div>
        </div>
        <div className="mx-auto mb-6"></div>

        <h1 className="text-2xl font-semibold text-white mb-2">
          {t("auth.title")}
        </h1>
        <p className="text-lg text-slate-300">{t("auth.subtitle")}</p>
      </CardHeader>

      <CardContent className="space-y-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName" className="text-white">
              {t("auth.fullName")}
            </Label>
            <Input
              id="fullName"
              type="text"
              placeholder={t("auth.fullName")}
              value={formData.fullName}
              onChange={(e) =>
                setFormData({ ...formData, fullName: e.target.value })
              }
              className="bg-white/90 border-slate-300 text-gray-900 placeholder:text-gray-500"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="username" className="text-white">
              {t("auth.username")}
            </Label>
            <Input
              id="username"
              type="text"
              placeholder={t("auth.username")}
              value={formData.username}
              onChange={(e) =>
                setFormData({ ...formData, username: e.target.value })
              }
              className="bg-white/90 border-slate-300 text-gray-900 placeholder:text-gray-500"
              required
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="role" className="text-white">
                {t("auth.role")}
              </Label>
              <Select
                onValueChange={(value) =>
                  setFormData({ ...formData, role: value })
                }
              >
                <SelectTrigger className="bg-white/90 border-slate-300 text-gray-900">
                  <SelectValue placeholder={t("auth.selectRole")} />
                </SelectTrigger>
                <SelectContent className="bg-white border-gray-200">
                  <SelectItem value="admin">{t("roles.admin")}</SelectItem>
                  <SelectItem value="pre_investigation">
                    {t("roles.preInvestigation")}
                  </SelectItem>
                  <SelectItem value="department_head">
                    {t("roles.departmentHead")}
                  </SelectItem>
                  <SelectItem value="investigator">
                    {t("roles.investigator")}
                  </SelectItem>
                  <SelectItem value="prosecutor">
                    {t("roles.prosecutor")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="role" className="text-white">
                Rank
              </Label>
              <Select
                onValueChange={(value) =>
                  setFormData({ ...formData, rank: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Rank" />
                </SelectTrigger>
                <SelectContent>
                  {ranks.map((rank) => (
                    <SelectItem key={rank} value={rank}>
                      {rank}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-white">
              {t("auth.password")}
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder={t("auth.password")}
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                className="bg-white/90 border-slate-300 text-gray-900 placeholder:text-gray-500 pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="remember"
              className="border-slate-300 data-[state=checked]:bg-white data-[state=checked]:text-slate-800"
            />
            <Label htmlFor="remember" className="text-sm text-slate-300">
              {t("auth.rememberMe")}
            </Label>
          </div>

          <Button
            type="submit"
            className="w-full bg-white hover:bg-slate-50 text-slate-800 font-semibold"
          >
            {t("auth.signUp")}
          </Button>
        </form>

        <div className="text-center">
          <span className="text-slate-300">
            {t("auth.alreadyHaveAccount").split("?")[0]}?{" "}
          </span>
          <Link href="/auth/login">
            <button className="text-white hover:text-slate-300 font-semibold">
              {t("common.login")}
            </button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
