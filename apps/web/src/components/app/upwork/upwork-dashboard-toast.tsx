"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

/**
 * Shows a toast when the user returns from Upwork OAuth (success or error).
 * Reads ?upwork_connected=true or ?upwork_error=... and clears the URL.
 */
export function UpworkDashboardToast() {
  const searchParams = useSearchParams();
  const shown = useRef(false);

  useEffect(() => {
    if (shown.current) return;
    const connected = searchParams.get("upwork_connected");
    const error = searchParams.get("upwork_error");
    if (connected === "true") {
      shown.current = true;
      toast.success("Upwork connected", {
        description: "Your Upwork account is now linked.",
      });
      const url = new URL(window.location.href);
      url.searchParams.delete("upwork_connected");
      window.history.replaceState({}, "", url.pathname + url.search);
    } else if (error) {
      shown.current = true;
      toast.error("Upwork connection failed", {
        description: decodeURIComponent(error),
      });
      const url = new URL(window.location.href);
      url.searchParams.delete("upwork_error");
      window.history.replaceState({}, "", url.pathname + url.search);
    }
  }, [searchParams]);

  return null;
}
