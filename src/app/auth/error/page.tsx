// "use client"
// import { useSearchParams } from "next/navigation"
// import Link from "next/link"

// const ERRORS: Record<string, string> = {
//   Configuration:        "Error de configuración del servidor.",
//   AccessDenied:         "Acceso denegado.",
//   Verification:         "El enlace ha expirado o ya fue usado.",
//   OAuthAccountNotLinked:"Ya existe una cuenta con ese email. Usa tu método original.",
//   SubscriptionExpired:  "Tu suscripción ha vencido. Renuévala para acceder.",
//   Default:              "Ocurrió un error inesperado.",
// }

// export default function AuthErrorPage() {
//   const params = useSearchParams()
//   const error  = params.get("error") ?? "Default"
//   const msg    = ERRORS[error] ?? ERRORS.Default

//   return (
//     <div className="flex min-h-screen items-center justify-center bg-[#0c0c10] p-4">
//       <div className="w-full max-w-sm text-center">
//         <div className="text-5xl mb-4">⚠️</div>
//         <h1 className="text-xl font-black text-white mb-2">Error de autenticación</h1>
//         <p className="text-sm text-gray-400 mb-6">{msg}</p>
//         <Link href="/auth/signin"
//           className="rounded-xl bg-amber-500 px-6 py-3 text-sm font-bold text-white hover:bg-amber-600">
//           Volver al login
//         </Link>
//       </div>
//     </div>
//   )
// }
"use client";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

const ERRORS: Record<string, string> = {
  Configuration: "Error de configuración del servidor.",
  AccessDenied: "Acceso denegado.",
  Verification: "El enlace ha expirado o ya fue usado.",
  OAuthAccountNotLinked: "Ya existe una cuenta con ese email. Usa tu método original.",
  SubscriptionExpired: "Tu suscripción ha vencido. Renuévala para acceder.",
  Default: "Ocurrió un error inesperado.",
};

function ErrorContent() {
  const params = useSearchParams();
  const error = params.get("error") ?? "Default";
  const msg = ERRORS[error] ?? ERRORS.Default;

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0c0c10] p-4">
      <div className="w-full max-w-sm text-center">
        <div className="text-5xl mb-4">⚠️</div>
        <h1 className="text-xl font-black text-white mb-2">Error de autenticación</h1>
        <p className="text-sm text-gray-400 mb-6">{msg}</p>
        <Link
          href="/auth/signin"
          className="rounded-xl bg-amber-500 px-6 py-3 text-sm font-bold text-white hover:bg-amber-600"
        >
          Volver al login
        </Link>
      </div>
    </div>
  );
}

export default function AuthErrorPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-[#0c0c10] p-4">Cargando...</div>}>
      <ErrorContent />
    </Suspense>
  );
}