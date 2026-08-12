"use client";

import { useEffect } from "react";

/** Revalidate a restored browser snapshot before showing tenant-scoped data. */
export function AuthNavigationGuard() {
  useEffect(() => {
    function handlePageShow(event: PageTransitionEvent) {
      if (event.persisted) window.location.reload();
    }

    window.addEventListener("pageshow", handlePageShow);
    return () => window.removeEventListener("pageshow", handlePageShow);
  }, []);

  return null;
}
