import type { ReactNode } from "react";

export const metadata = {
  title: "Meme'd Campaign Payout Tracker",
};

// Wraps every page in the app
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "sans-serif", maxWidth: 800, margin: "0 auto", padding: 16 }}>
        {children}
      </body>
    </html>
  );
}
