"use client";
import { useEffect, useState } from "react";

const heroImages = [
  "/hero/hero1.jpg",
  "/hero/hero2.jpg",
  "/hero/hero3.jpg",
  "/hero/hero4.jpg",
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

      {/* Content */}
      <section className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 text-center">
        <img src="/logo.png" alt="JetSet Direct Logo" className="mb-6 h-20" />
        <h1 className="mb-4 text-4xl font-bold">Ground Service Elevated</h1>
        <p className="text-xl">The Reason We’re Taking Off.</p>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/20 bg-black/30 py-6 text-center">
        <p>© {new Date().getFullYear()} JetSet Direct. All rights reserved.</p>
      </footer>
    </main>
  );
}
