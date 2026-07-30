import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ThemeToggle from "@/components/ThemeToggle";
import { AuthProvider } from "@/lib/auth";
import { CreditsProvider } from "@/lib/credits";
import { ThemeProvider } from "@/lib/theme";
import "./globals.css";

// Runs before hydration so the correct theme class is present for first
// paint — without this, the page would flash the wrong theme for a beat
// while React mounts and ThemeProvider reads localStorage.
const NO_FLASH_THEME_SCRIPT = `
(function () {
  try {
    var stored = localStorage.getItem("theme");
    var theme = stored === "light" || stored === "dark"
      ? stored
      : (window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
    if (theme === "dark") document.documentElement.classList.add("dark");
  } catch (e) {}
})();
`;

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Geonesis — text to NURBS 3D models",
  description:
    "Turn a text prompt into a NURBS-ready 3D model, powered by Tencent Hunyuan3D and our own mesh-to-NURBS pipeline.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      // The no-flash theme script (below) adds "dark" to this element before
      // React hydrates, so its class attribute never matches what the server
      // rendered — expected given the technique, not a real bug.
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: NO_FLASH_THEME_SCRIPT }} />
      </head>
      <body className="flex min-h-full flex-col bg-stone-50 text-stone-900 dark:bg-zinc-950 dark:text-zinc-50">
        <ThemeProvider>
          <AuthProvider>
            <CreditsProvider>
              <Navbar />
              <main className="flex flex-1 flex-col">{children}</main>
              <Footer />
              <ThemeToggle />
            </CreditsProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
