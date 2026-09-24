"use client";
import { AuthProvider } from "@/context/AuthContext";
import { SocketProvider } from "@/context/SocketContext";
export default function Providers({ children }: { children: React.ReactNode }) {
  return <AuthProvider><SocketProvider>{children}</SocketProvider></AuthProvider>;
}
