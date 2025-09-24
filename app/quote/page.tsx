import { Suspense } from "react";
import QuoteClient from "./QuoteClient";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Loading quote…</div>}>
      <QuoteClient />
    </Suspense>
  );
}
