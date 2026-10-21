"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronUp } from "lucide-react";

import { Button } from "@/components/ui/button";

const SCROLL_THRESHOLD = 300;

export function ScrollToTop() {
  const translate = useTranslations("Common");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function onScroll() {
      setVisible(window.scrollY > SCROLL_THRESHOLD);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!visible) return null;

  return (
    <Button
      size="icon"
      variant="secondary"
      className="fixed right-6 bottom-6 z-50 shadow-md"
      aria-label={translate("scrollToTop")}
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
    >
      <ChevronUp className="size-5" />
    </Button>
  );
}
