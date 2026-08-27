import "@/index.css";
import "@/App.css";

export const metadata = {
  title: "LAPORAN STOK SCA",
  description: "LAPORAN STOK SCA — Mutasi & Laporan Stok Kertas & Tinta",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#2563eb",
};

export default function RootLayout({ children }) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;600;700;800&family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <noscript>Anda perlu mengaktifkan JavaScript untuk menjalankan aplikasi ini.</noscript>
        {children}
      </body>
    </html>
  );
}
