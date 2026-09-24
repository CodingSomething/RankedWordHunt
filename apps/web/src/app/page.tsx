"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function RootPage() {
  const router = useRouter();
  const { user, ready } = useAuth();
  useEffect(() => {
    if (ready) router.replace(user ? "/lobby" : "/login");
  }, [ready, user, router]);
  return null;
}
