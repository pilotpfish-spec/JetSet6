"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

const heroImages = [
  "/hero/hero1.png", "/hero/hero2.png", "/hero/hero3.png", "/hero/hero4.png",
  "/hero/hero5.png", "/hero/hero6.png", "/hero/hero7.png", "/hero/hero8.png",
  "/hero/hero9.png", "/hero/hero10.png", "/hero/hero11.png", "/hero/hero12.png",
  "/hero/hero13.png", "/hero/hero14.png", "/hero/hero15.png", "/hero/hero16.jpg",
  "/hero/hero17.jpg", "/hero/hero18.jpg", "/hero/hero19.jpg",
];

export default function HomePage() {
  const [image, setImage] = useState(heroImages[0]);

  useEffect(() => {
    const random = heroImages[Math.floor(Math.random() * heroImages.length)];
    setImage(random);
  }, []);

  return (
    <main className="relative flex min-h-screen flex-col text-white">
      {/* Background */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${image})` }}
      >
        <div className="absolute inset-0 bg-black/30 backdrop-blur-sm"></div>
      </div>

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between bg-[#0a1a2f] px-8 py-4">
        <img src="/logo.png" alt="JetSet Direct Logo" className="h-12" />
        <nav className="flex space-x-6">
          <Link href="/">Home</Link>
          <Link href="/booking">Booking</Link>
          <Link href="/about">About</Link>
          <Link href="/contact">Contact</Link>
          <Link href="/login" className="font-semibold text-green-400">Login</Link>
        </nav>
      </header>

      {/* Hero content */}
      <section className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 text-center">
        <h1 className="mb-4 text-4xl font-bold">Ground Service Elevated</h1>
        <p className="mb-8 text-xl">The Reason We’re Taking Off.</p>
        <div className="flex space-x-6">
          <Link
            href="/quote"
            className="rounded-lg bg-white px-6 py-3 font-semibold text-black transition hover:bg-gray-200"
          >
            Quote
          </Link>
          <Link
            href="/book"
            className="rounded-lg bg-yellow-500 px-6 py-3 font-semibold text-black transition hover:bg-yellow-400"
          >
            Book
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/20 bg-black/30 py-6 text-center">
        <p>© {new Date().getFullYear()} JetSet Direct. All rights reserved.</p>
      </footer>
    </main>
  );
}
