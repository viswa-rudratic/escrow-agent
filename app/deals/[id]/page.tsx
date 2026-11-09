import { Suspense } from "react";
import DealClient from "./DealClient";

export default function Page() {
  return (
    <Suspense fallback={<main className="p-10">Loading…</main>}>
      <DealClient />
    </Suspense>
  );
}
