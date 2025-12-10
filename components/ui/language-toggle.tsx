"use client";

import { useLocale } from "@/components/providers/locale-provider";
import { Button } from "./button";
import { Languages } from "lucide-react";

export function LanguageToggle() {
  const { locale, setLocale } = useLocale();
  const next = locale === "en" ? "vi" : "en";

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Toggle language"
      onClick={() => setLocale(next)}
      title={locale === "en" ? "Chuyển tiếng Việt" : "Switch to English"}
    >
      <Languages className="h-5 w-5" />
      <span className="sr-only">Language</span>
    </Button>
  );
}

