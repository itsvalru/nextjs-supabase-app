"use client";

import { useEffect } from "react";
import { getOrCreateGuestId } from "@/lib/client-cookies";

export default function GuestIdProvider() {
  useEffect(() => {
    // Ensure every visitor has a guest_id cookie
    getOrCreateGuestId();
  }, []);

  return null; // This component doesn't render anything
}
