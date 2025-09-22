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

export default function HomePage() {
  const [image, setImage] = useState<string>("");

  useEffect(() => {
    // Pick a random image once on mount
    const random = heroImages[Math.floor(Math.random() * heroImages.length)];
    setImage(random);
  }, []);

  return (
    <section
      className="relative flex h-[90vh] w-full items-center justify-center bg-[#0a0a23] text-white"
      style={
        image
          ? { backgroundImage: `url(${image})`, backgroundSize: "cover", backgroundPosition: "center" }
          : {}
      }
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/50" />

      {/* Content */}
      <div className="relative z-10 text-center">
        <h1 className="text-5xl font-bold mb-6">Ground Service Elevated</h1>
        <p className="text-xl mb-8">The Reason We’re Taking Off.</p>
        <a
          href="/booking"
          className="px-6 py-3 rounded-lg bg-white text-[#0a0a23] font-semibold hover:bg-gray-200 transition"
        >
          Book Now
        </a>
      </div>
    </section>
  );
}
