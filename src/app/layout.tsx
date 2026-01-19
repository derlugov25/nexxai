import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nexx AI",
  description: "Our AI creates stunning lightning animations in real-time"
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-black text-white antialiased">{children}</body>
    </html>
  );
}


