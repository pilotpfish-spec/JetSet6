"use client";

import { useEffect, useState } from "react";

const heroImages = [
  "/hero/hero1.png",
  "/hero/hero2.png",
  "/hero/hero3.png",
  "/hero/hero4.png",
  "/hero/hero5.png",
  "/hero/hero6.png",
  "/hero/hero7.png",
  "/hero/hero8.png",
  "/hero/hero9.png",
  "/hero/hero10.png",
  "/hero/hero11.png",
  "/hero/hero12.png",
  "/hero/hero13.png",
  "/hero/hero14.png",
  "/hero/hero15.png",
  "/hero/hero16.jpg",
  "/hero/hero17.jpg",
  "/hero/hero18.jpg",
  "/hero/hero19.jpg",
];

export default function JetsetHero() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % heroImages.length);
    }, 5000); // every 5s
    return () => clearInterval(timer);
  }, []);

  return (
    <section className="relative flex items-center justify-center text-center min-h-[70vh] overflow-hidden">
      {/* Background slideshow */}
      {heroImages.map((src, i) => (
        <div
          key={src}
          className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
            i === index ? "opacity-100" : "opacity-0"
          }`}
          style={{
            backgroundImage: `url(${src})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        ></div>
      ))}

      {/* Overlay */}
      <div className="absolute inset-0 bg-black bg-opacity-40 backdrop-blur-sm"></div>

      {/* Copy */}
      <div className="relative z-10 max-w-3xl px-6 py-12 text-white">
        <h1 className="text-5xl font-bold mb-4">Ground Service Elevated</h1>
        <p className="text-xl mb-2">
          Premium airport transfers to and from DFW &amp; Love Field.
        </p>
        <p className="text-sm opacity-85">The Reason We’re Taking Off.</p>
      </div>
    </section>
  );
}
