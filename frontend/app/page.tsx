"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { getSession, homePathFor } from "../lib/auth";

// The home page only sends you somewhere: your own page if logged in, otherwise login
export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    const session = getSession();
    router.replace(session ? homePathFor(session.user.role) : "/login");
  }, [router]);

  return <p>Loading...</p>;
}
