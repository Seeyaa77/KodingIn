import type { Metadata } from "next";
import "./globals.css";
import { KodingkuProvider } from "@/context/KodingkuContext";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "KodingIn | Developer Community Platform",
  description: "A modern developer community for sharing tutorials, debugging code, and showcasing projects. Built with Next.js and Supabase.",
  keywords: ["kodingin", "developer community", "programming", "code tutorials", "open source", "developer platform"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full bg-bg-app text-text-primary font-sans flex flex-col">
        <KodingkuProvider>
          <Navbar />
          {children}
        </KodingkuProvider>
      </body>
    </html>
  );
}
