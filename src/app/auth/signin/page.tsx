import { SignInPage } from "@/app/_components/auth/SignInPage"
import { Suspense } from "react";

     export default function Page() {
  return(

      <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Cargando...</div>}>
   <SignInPage /> 
   </Suspense>
  )

     }