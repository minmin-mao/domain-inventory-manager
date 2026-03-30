import "./global.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  icons: {
    icon: "/globe.svg",
    shortcut: "/globe.svg",
    apple: "/globe.svg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <main className="mx-auto w-full max-w-[1800px] px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>
      </body>
    </html>
  );
}
