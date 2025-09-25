export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export default function Success() {
  return (
    <main className="px-4 py-14">
      <div className="mx-auto max-w-3xl bg-white shadow rounded p-8 text-center">
        <h1 className="text-2xl font-bold mb-2">Payment Successful 🎉</h1>
        <p>We’ve received your payment. A confirmation email is on its way.</p>
      </div>
    </main>
  );
}
