import type { Metadata } from "next";
import "./globals.css";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Ahmed Waregh — Backend & Platform Engineer",
  description:
    "Software Engineer focused on backend systems, platform infrastructure, and AI-driven products.",
  openGraph: {
    title: "Ahmed Waregh — Backend & Platform Engineer",
    description:
      "Software Engineer focused on backend systems, platform infrastructure, and AI-driven products.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Ahmed Waregh — Backend & Platform Engineer",
    description:
      "Software Engineer focused on backend systems, platform infrastructure, and AI-driven products.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-[#0a0a0a] text-[#ededed] min-h-screen font-sans">
        <Nav />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
