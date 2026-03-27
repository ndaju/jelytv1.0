import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import ClientProviders from "./ClientProviders";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata = {
  title: "JellyTV - Stream Your Media",
  description: "Modern media streaming platform",
};

export default function RootLayout({ children }) {
  return (
    <html lang="tr">
      <body className={`${inter.variable} font-sans antialiased`}>
        <ClientProviders>
          {children}
        </ClientProviders>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
