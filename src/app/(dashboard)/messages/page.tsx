export const metadata = { title: "Mensajes" }
import MessagesPage from "@/app/_components/domain/MessagesPage"
export default function MessagesPages() {
  return (
    <div className="min-h-screen bg-[#0c0c10] flex flex-col items-center justify-center text-center p-8">
      <MessagesPage/>
    </div>
  )
}