import type { Metadata } from "next";
import { DM_Mono, Syne } from "next/font/google";
import "./globals.css";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { AuthProvider } from "../lib/auth";

const dmMono = DM_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-dm-mono",
});
const syne = Syne({
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
  variable: "--font-syne",
});

export const metadata: Metadata = {
  title: "Tryhardly — Local gigs, real people",
  description:
    "The marketplace AI can't touch. Post local jobs or find paid work near you.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`dark ${dmMono.variable} ${syne.variable}`}
    >
      <body className="min-h-screen bg-zinc-950 text-zinc-100 antialiased">
        <AuthProvider>
          <Navbar />
          <main>{children}</main>
          <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}
