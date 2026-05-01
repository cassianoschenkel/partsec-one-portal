import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Partsec One Portal",
  description: "Portal do cliente Partsec One",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
