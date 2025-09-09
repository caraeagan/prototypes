import type { Metadata } from "next";
import { Lexend } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/session-provider";

const lexend = Lexend({
  subsets: ["latin"],
  variable: "--font-lexend",
});

export const metadata: Metadata = {
  title: "Marker Method",
  description: "Math assessment administration platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${lexend.variable} font-lexend antialiased`}
      >
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
