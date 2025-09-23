import { Suspense } from "react";
export const dynamic = "force-dynamic";
export const revalidate = 0;

// Re-export metadata if the inner file defines it (safe even if not present)

import PageInner from "./_pageInner";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <PageInner />
    </Suspense>
  );
}
