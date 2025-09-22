import "../styles/globals.css";
import { Inter } from "next/font/google";
import Link from "next/link";
import Image from "next/image";
import Providers from "./providers"; // ✅ add this import

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "JetSet Direct",
  description: "Ground Service Elevated. The Reason We’re Taking Off.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {/* Header */}
        <header className="flex justify-between items-center px-8 py-4 bg-[#0a0a23] text-white">
          <Link href="/" className="flex items-center space-x-3">
            <Image
              src="/logo.png"
              alt="JetSet Direct Logo"
              width={40}
              height={40}
              priority
            />
            <span className="text-2xl font-bold">JetSet Direct</span>
          </Link>
          <nav className="flex items-center space-x-6">
            <Link
              href="/booking"
              className="px-4 py-2 rounded-lg bg-white text-[#0a0a23] font-semibold hover:bg-gray-200 transition"
            >
              Book Now
            </Link>
            <Link href="/about" className="hover:underline">
              About
            </Link>
            <Link href="/contact" className="hover:underline">
              Contact
            </Link>
            <Link href="/login" className="hover:underline">
              Login
            </Link>
          </nav>
        </header>

        {/* Main content wrapped in Providers */}
        <Providers>
          <main>{children}</main>
        </Providers>

        {/* Footer */}
        <footer className="mt-12 py-6 bg-[#0a0a23] text-white text-center">
          <p className="text-sm">
            © {new Date().getFullYear()} JetSet Direct
          </p>
        </footer>
      </body>
    </html>
  );
}
