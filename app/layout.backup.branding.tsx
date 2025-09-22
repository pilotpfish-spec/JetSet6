// C:\JetSetNew6\app\layout.tsx
import "../styles/globals.css";
import type { Metadata } from "next";
import { SessionProvider } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";

export const metadata: Metadata = {
  title: "JetSet Direct",
  description: "Premium airport transfers to and from DFW & Love Field.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <SessionProvider>
          {/* Header */}
          <header
            style={{ backgroundColor: "#0a1a2f" }}
            className="w-full shadow-md"
          >
            <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
              {/* Logo */}
              <Link href="/" className="flex items-center space-x-2">
                <Image
                  src="/logo.png"
                  alt="JetSet Direct"
                  width={160}
                  height={50}
                  priority
                />
              </Link>

              {/* Navigation */}
              <nav className="flex space-x-8">
                <Link href="/" className="text-white hover:underline">
                  Home
                </Link>
                <Link href="/booking" className="text-white hover:underline">
                  Booking
                </Link>
                <Link href="/about" className="text-white hover:underline">
                  About
                </Link>
                <Link href="/contact" className="text-white hover:underline">
                  Contact
                </Link>
              </nav>
            </div>
          </header>

          {/* Main content */}
          <main>{children}</main>

          {/* Footer */}
          <footer
            style={{ backgroundColor: "#0a1a2f" }}
            className="mt-12 w-full py-6 text-center text-white"
          >
            <p>© {new Date().getFullYear()} JetSet Direct. All rights reserved.</p>
          </footer>
        </SessionProvider>
      </body>
    </html>
  );
}
