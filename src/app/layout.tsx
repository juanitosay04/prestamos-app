import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ToasterProvider } from "@/components/ui/ToasterProvider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "Préstamos JyJ",
    template: "%s | Préstamos JyJ"
  },
  description: "Plataforma ejecutiva de administración de préstamos e inversiones JyJ",
  icons: {
    icon: "/logo.png",
    shortcut: "/logo.png",
    apple: "/logo.png"
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="dark">
      <body className={`${inter.className} min-h-screen bg-background antialiased selection:bg-primary/30`}>
        <ToasterProvider />
        {children}
      </body>
    </html>
  );
}
