import RegisterPage from "@/app/_components/auth/RegisterPage"
import {Suspense} from "react"

export default function Page() 
{ 
    return (
         <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Cargando...</div>}>
    <RegisterPage />
  </Suspense>
 
)
 }