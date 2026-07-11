"use client";

import { SessionProvider } from "next-auth/react";
import React from "react";

export default function Providers({ children }: { children: React.ReactNode }) {
  // Refetch session every 50 minutes (3000 seconds) to ensure token stays fresh
  return <SessionProvider refetchInterval={3000}>{children}</SessionProvider>;
}
