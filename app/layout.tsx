import type { Metadata } from "next";
import { IBM_Plex_Mono, Newsreader } from "next/font/google";
import "./globals.css";

const serif = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  style: ["normal", "italic"],
});

const mono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Escrow Agent: protected deals from chat",
  description:
    "Paste the chat where you agreed the deal. It becomes a written agreement, PayPal holds the money, and the seller is paid only when the work matches.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${serif.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
