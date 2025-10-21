import "./globals.css";
import "../styles/theme.css";
import "../styles/animations.css";
import "../styles/components.css";
import Script from "next/script";

export const metadata = {
  title: "NovaWave Finance — Dashboard",
  description: "Neumorphic finance dashboard built with Next.js",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5, user-scalable=yes" />
        <meta name="theme-color" content="#050b1b" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        {children}
        <Script src="https://unpkg.com/lucide@latest" strategy="beforeInteractive" />
        <Script src="https://cdn.jsdelivr.net/npm/chart.js" strategy="beforeInteractive" />
        <Script src="/js/utils.js" strategy="afterInteractive" />
        <Script src="/js/chart.js" strategy="afterInteractive" />
        <Script src="/js/interactions.js" strategy="afterInteractive" />
        <Script src="/js/mobile-interactions.js" strategy="afterInteractive" />
      </body>
    </html>
  );
}
