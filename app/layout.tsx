import type { Metadata } from "next";

import { Toaster } from "sonner";
import { APP_CONFIG } from "@/lib/config/app";
import "./globals.css";

/**
 * The two faces the prototype uses. Inter Tight carries the interface;
 * Archivo is display only, headings and figures. Archivo's width axis is
 * loaded because the compact setting is what gives the design its editorial
 * feel — without it the headings read wide and generic.
 */
const interTight = { variable: "" };

const archivo = { variable: "" };

export const metadata: Metadata = {
  title: `${APP_CONFIG.name} — Rental Property Operating System`,
  description: APP_CONFIG.description,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${interTight.variable} ${archivo.variable}`}>
      <body className="bg-paper text-neutral-900 antialiased">
        {children}
        <Toaster position="top-right" richColors closeButton />
      </body>
    </html>
  );
}
