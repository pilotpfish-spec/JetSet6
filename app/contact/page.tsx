"use client";

export default function ContactPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#0a0a23] text-white px-6 py-12">
      <div className="max-w-2xl w-full text-center">
        <h1 className="text-4xl font-bold mb-6">Contact Us</h1>
        <p className="text-lg mb-8">
          We’d love to hear from you. Whether you have questions about booking,
          pricing, or anything else — we’re here to help.
        </p>

        <div className="space-y-4">
          <p>
            <span className="font-semibold">Phone:</span>{" "}
            <a href="tel:1-800-555-1234" className="hover:underline">
              1-800-555-1234
            </a>
          </p>
          <p>
            <span className="font-semibold">Email:</span>{" "}
            <a
              href="mailto:patrick@jetsetdirect.com"
              className="hover:underline"
            >
              patrick@jetset.com
            </a>
          </p>
          <p>
            <span className="font-semibold">Website:</span>{" "}
            <a
              href="https://jetsetdirect.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline"
            >
              jetsetdirect.com
            </a>
          </p>
        </div>

        <div className="mt-10">
          <p className="text-sm text-gray-300">
            JetSet Direct — Ground Service Elevated. The Reason We’re Taking Off.
          </p>
        </div>
      </div>
    </main>
  );
}
