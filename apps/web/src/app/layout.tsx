import type { Metadata } from "next";
import "@/styles/globals.css";
import Providers from "./providers";
export const metadata: Metadata = { title: "Word Hunt", description: "Fast ranked word games against real players" };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body><Providers>{children}</Providers></body></html>;
}
