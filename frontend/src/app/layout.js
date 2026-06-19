import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AccentProvider } from "@/components/AccentProvider";
import { AuthProvider } from "@/components/AuthProvider";
import AppLayout from "@/components/AppLayout";
import Toast from "@/components/Toast";

export const metadata = {
  title: "goon.ai — Ask better questions",
  description:
    "A research agent that plans, searches the web, reads the sources, and writes you a cited answer.",
  keywords: ["AI research", "search agent", "cited answers", "deep research"],
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;1,6..72,400;1,6..72,500&family=Instrument+Sans:ital,wght@0,400;0,500;0,600;1,400&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <ThemeProvider>
          <AccentProvider>
            <AuthProvider>
              <AppLayout>
                <div className="app-container">{children}</div>
              </AppLayout>
              <Toast />
            </AuthProvider>
          </AccentProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
