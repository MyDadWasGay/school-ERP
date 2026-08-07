import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = { title: "School ERP", description: "A secure, multi-campus school operations platform." };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
