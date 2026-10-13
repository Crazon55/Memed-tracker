import type { ReactNode } from "react";
import "./globals.css";

export const metadata = {
  title: "Meme'd Campaign Payout Tracker",
};

// Wraps every page in the app
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
