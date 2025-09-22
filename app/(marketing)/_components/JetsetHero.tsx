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
    <section className="relative flex h-screen flex-col items-center justify-center text-center text-white">
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
      <div className="absolute inset-0 bg-black/40"></div>

      {/* Copy */}
      <div className="relative z-10">
        <h1 className="mb-4 text-4xl font-bold md:text-6xl">Ground Service Elevated</h1>
        <p className="mb-2 text-lg md:text-2xl">
          Premium airport transfers to and from DFW &amp; Love Field.
        </p>
        <p className="text-lg md:text-2xl">The Reason We’re Taking Off.</p>
      </div>
    </section>
  );
}
