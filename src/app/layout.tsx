import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SaveSquad",
  description: "Save solo. Win together.",
};

export const viewport: Viewport = {
  // Draw under the notch and home bar; safe-area padding below keeps content clear of them.
  viewportFit: "cover",
  themeColor: "#f4f3fb",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${jakarta.variable} h-full antialiased`}>
      <body className="min-h-full font-sans">
        {/* Mobile-first: the app lives in a phone-width column. */}
        <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col pt-[env(safe-area-inset-top)] pr-[env(safe-area-inset-right)] pl-[env(safe-area-inset-left)]">
          {children}
        </div>
      </body>
    </html>
  );
}
