import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Saundarya Studio — Visual Effect Engineering",
  description:
    "Client-side studio for dithered, ASCII, halftone/risograph and noisy gradient mesh images, videos and interactive UI components. Curated assets, shader-level before/after comparison, and one-click code export.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){try{if(localStorage.getItem('saundarya-theme')==='dark'){document.documentElement.classList.add('dark')}}catch(e){}})();",
          }}
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-paper font-sans text-ink antialiased">{children}</body>
    </html>
  );
}