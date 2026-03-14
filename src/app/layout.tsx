import type { Metadata } from "next";
import "./globals.css";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Ahmed Waregh — Frontend / Platform Engineer",
  description:
    "5+ years designing and shipping frontends for complex, data-heavy systems. Latency budgets, design systems, end-to-end.",
  openGraph: {
    title: "Ahmed Waregh — Frontend / Platform Engineer",
    description:
      "5+ years designing and shipping frontends for complex, data-heavy systems. Latency budgets, design systems, end-to-end.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Ahmed Waregh — Frontend / Platform Engineer",
    description:
      "5+ years designing and shipping frontends for complex, data-heavy systems. Latency budgets, design systems, end-to-end.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-[#f0f7ff] text-[#1a2f45] min-h-screen font-sans">
        <Nav />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}

