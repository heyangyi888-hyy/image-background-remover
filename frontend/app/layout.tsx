import type { Metadata } from "next";
import "./globals.css";
import Providers from "./providers";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Image Background Remover",
  description: "Remove background from images online, free and easy",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
