export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col bg-[#0a1a2f] text-white">
      <section className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <img src="/logo.png" alt="JetSet Direct Logo" className="mb-6 h-20" />
        <h1 className="mb-4 text-4xl font-bold">Ground Service Elevated</h1>
        <p className="text-xl">The Reason We’re Taking Off.</p>
      </section>
      <footer className="border-t border-white/20 py-6 text-center">
        <p>© {new Date().getFullYear()} JetSet Direct. All rights reserved.</p>
      </footer>
    </main>
  );
}
