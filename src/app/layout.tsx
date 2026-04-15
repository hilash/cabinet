import type { Metadata } from "next";
import { MulticaNavigationProvider } from "@/components/integrations/multica-navigation";
import { MulticaNotifications } from "@/components/integrations/multica-notifications";
import { MulticaProvider } from "@/components/integrations/multica-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeInitializer } from "@/components/layout/theme-initializer";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cabinet",
  description: "AI-first knowledge base and startup OS",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-CN"
      className="h-full antialiased"
      style={{
        "--font-sans": "\"SF Pro Text\", \"Helvetica Neue\", ui-sans-serif, system-ui, sans-serif",
        "--font-mono": "\"SF Mono\", \"JetBrains Mono\", ui-monospace, monospace",
        "--font-logo": "\"Iowan Old Style\", \"Times New Roman\", ui-serif, serif",
      } as Record<string, string>}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: `if(window.CabinetDesktop)document.documentElement.classList.add("electron-desktop")` }} />
      </head>
      <body className="min-h-full flex flex-col font-sans">
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <MulticaProvider>
            <MulticaNavigationProvider>
              <ThemeInitializer />
              {children}
            </MulticaNavigationProvider>
            <MulticaNotifications />
          </MulticaProvider>
        </ThemeProvider>
        <Toaster richColors position="bottom-right" />
      </body>
    </html>
  );
}
