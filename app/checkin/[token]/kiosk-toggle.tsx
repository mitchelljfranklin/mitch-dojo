"use client";

import { useRouter } from "next/navigation";
import { usePathname } from "next/navigation";

import { Button } from "@/components/ui/button";

// Front-desk kiosk toggle: flips the ?kiosk=1 query param (so a tablet's
// bookmark keeps the mode) and drives the browser Fullscreen API alongside.
export function KioskToggle({ kiosk }: { kiosk: boolean }) {
  const router = useRouter();
  const pathname = usePathname();

  function toggle() {
    const params = new URLSearchParams(window.location.search);
    if (kiosk) {
      params.delete("kiosk");
      document.exitFullscreen?.().catch(() => undefined);
    } else {
      params.set("kiosk", "1");
      document.documentElement.requestFullscreen?.().catch(() => undefined);
    }
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  }

  return (
    <Button type="button" variant="outline" size="sm" onClick={toggle}>
      {kiosk ? "Exit kiosk" : "Kiosk mode"}
    </Button>
  );
}
