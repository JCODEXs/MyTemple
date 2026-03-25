import { Suspense } from "react";
import MPSubscribePage from "@/app/_components/domain/MPSubscribePage";

export default function Page() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Cargando...</div>}>
      <MPSubscribePage />
    </Suspense>
  );
}