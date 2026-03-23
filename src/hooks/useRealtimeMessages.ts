// src/hooks/useRealtimeMessages.ts
import { useEffect } from "react"
import { createClient } from "@supabase/supabase-js"
import { api } from "@/trpc/react"

const supabase = createClient(
  process.env.DATABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export function useRealtimeMessages(otherId: string) {
  const utils = api.useUtils()

  useEffect(() => {
    const channel = supabase
      .channel(`dm:${otherId}`)
      .on(
        "postgres_changes",
        {
          event:  "INSERT",
          schema: "public",
          table:  "DirectMessage",
          // Solo mensajes que me involucran
          filter: `toId=eq.${otherId}`,
        },
        () => {
          // Invalida la query — React Query refetch automático
          void utils.communications.getConversation.invalidate({ otherId })
          void utils.communications.getConversationList.invalidate()
          void utils.communications.getUnreadCount.invalidate()
        }
      )
      .subscribe()

    return () => { void supabase.removeChannel(channel) }
  }, [otherId, utils])
}