"use client"

import { useState, useRef, useEffect, useMemo } from "react"
import { toast }    from "sonner"
import { api }      from "@/trpc/react"
import { UploadButton } from "@/utils/uploadthing"
import type { RouterOutputs } from "@/trpc/react"
import type { UploadThingError } from "uploadthing/server"

type Post        = RouterOutputs["communications"]["getFeed"]["items"][number]
type Message     = RouterOutputs["communications"]["getConversation"][number]
type Convo       = RouterOutputs["communications"]["getConversationList"][number]
type Challenge   = RouterOutputs["communications"]["getActiveChallenges"][number]

const REACTION_EMOJIS = ["❤️", "🔥", "🏆", "💪", "👏"] as const

const POST_TYPE_META = {
  CHECKIN:     { label: "Check-in",    emoji: "📋", color: "text-blue-400 bg-blue-500/20"   },
  ACHIEVEMENT: { label: "Logro",       emoji: "🏆", color: "text-amber-400 bg-amber-500/20" },
  QUESTION:    { label: "Pregunta",    emoji: "❓", color: "text-purple-400 bg-purple-500/20"},
  CHALLENGE:   { label: "Reto",        emoji: "⚡", color: "text-orange-400 bg-orange-500/20"},
  SHARE:       { label: "Compartido",  emoji: "🔗", color: "text-green-400 bg-green-500/20" },
  FREE:        { label: "Post",        emoji: "💬", color: "text-gray-400 bg-gray-500/20"   },
}

const TABS = ["feed", "messages", "challenges"] as const
type Tab = typeof TABS[number]

// ─── Image upload zone ────────────────────────────────────────────────────────

function ImageUploadZone({
  imageUrls,
  onChange,
}: {
  imageUrls: string[]
  onChange:  (urls: string[]) => void
}) {
  return (
    <div className="space-y-2">
      {/* Previews */}
      {imageUrls.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {imageUrls.map((url, i) => (
            <div key={url} className="group relative h-20 w-20 overflow-hidden rounded-xl border border-white/10">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="h-full w-full object-cover" />
              <button
                onClick={() => onChange(imageUrls.filter((_, idx) => idx !== i))}
                className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Upload button */}
      {imageUrls.length < 6 && (
        <div className="flex items-center justify-center rounded-2xl border-2 border-dashed border-white/20 bg-white/5 px-4 py-5 hover:border-amber-500/50 hover:bg-white/8 transition-colors">
          <div className="flex flex-col items-center gap-2 text-center">
            <span className="text-2xl">📸</span>
            <p className="text-xs text-gray-500">PNG, JPG · máx 4 MB · hasta 6 fotos</p>
            <UploadButton
              endpoint="imageUploader"
              onClientUploadComplete={(res) => {
                const url = res[0]?.ufsUrl ?? res[0]?.url
                if (url) onChange([...imageUrls, url])
              }}
                   onUploadError={(e: UploadThingError
                                  ) => {
               toast.error(`Error al subir imagen: ${e.message}`)
             }}
              appearance={{
                button: "rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-white hover:bg-amber-600 ut-uploading:bg-amber-300 ut-uploading:cursor-not-allowed",
                allowedContent: "hidden",
              }}
              content={{
                button({ ready, isUploading }) {
                  if (isUploading) return "⏳ Subiendo..."
                  if (ready)       return "📤 Subir foto"
                  return "Cargando..."
                },
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Create post modal ────────────────────────────────────────────────────────

function CreatePostModal({ onClose }: { onClose: () => void }) {
  const utils = api.useUtils()
  const [type,        setType]        = useState<keyof typeof POST_TYPE_META>("FREE")
  const [visibility,  setVisibility]  = useState<"PRIVATE" | "PUBLIC">("PRIVATE")
  const [content,     setContent]     = useState("")
  const [imageUrls,   setImageUrls]   = useState<string[]>([])
  const [attachMetrics, setAttachMetrics] = useState(true)

  const createPost = api.communications.createPost.useMutation({
    onSuccess: () => {
      void utils.communications.getFeed.invalidate()
      toast.success("Post publicado ✓")
      onClose()
    },
    onError: (e) => toast.error(e.message),
  })

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center"
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-lg rounded-t-3xl bg-[#0c0c10] shadow-2xl ring-1 ring-white/10 sm:rounded-3xl overflow-hidden"
        style={{ maxHeight: "90vh" }}>

        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <h3 className="font-black text-white">Nuevo post</h3>
          <button onClick={onClose} className="rounded-full bg-white/10 p-1.5 text-gray-400">✕</button>
        </div>

        <div className="overflow-y-auto p-5 space-y-4" style={{ maxHeight: "70vh" }}>
          {/* Type selector */}
          <div className="flex flex-wrap gap-2">
            {(Object.entries(POST_TYPE_META) as [keyof typeof POST_TYPE_META, typeof POST_TYPE_META[keyof typeof POST_TYPE_META]][]).map(([t, meta]) => (
              <button key={t} onClick={() => setType(t)}
                className={`rounded-full px-3 py-1.5 text-xs font-bold transition-all ${
                  type === t ? meta.color : "bg-white/5 text-gray-500 hover:bg-white/10"
                }`}>
                {meta.emoji} {meta.label}
              </button>
            ))}
          </div>

          {/* Content */}
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={
              type === "CHECKIN"     ? "¿Cómo te fue hoy? Comparte tu progreso..." :
              type === "ACHIEVEMENT" ? "¡Cuéntanos tu logro!" :
              type === "QUESTION"    ? "¿Qué quieres preguntar?" :
              "¿Qué quieres compartir?"
            }
            rows={3}
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white
              placeholder-gray-600 focus:border-amber-500 focus:outline-none resize-none"
          />

          {/* Images */}
          <ImageUploadZone imageUrls={imageUrls} onChange={setImageUrls} />

          {/* Check-in metrics toggle */}
          {type === "CHECKIN" && (
            <label className="flex items-center gap-3 rounded-xl bg-blue-500/10 border border-blue-500/20 px-4 py-3 cursor-pointer">
              <div className={`relative h-5 w-9 rounded-full transition-colors ${attachMetrics ? "bg-blue-500" : "bg-white/20"}`}
                onClick={() => setAttachMetrics((v) => !v)}>
                <div className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                  attachMetrics ? "translate-x-4" : "translate-x-0.5"
                }`} />
              </div>
              <div>
                <p className="text-xs font-bold text-blue-300">Adjuntar métricas del día</p>
                <p className="text-[10px] text-blue-400/60">Kcal, balance, peso automáticamente</p>
              </div>
            </label>
          )}

          {/* Visibility */}
          <div className="flex gap-2">
            {(["PRIVATE", "PUBLIC"] as const).map((v) => (
              <button key={v} onClick={() => setVisibility(v)}
                className={`flex-1 rounded-xl py-2 text-xs font-bold transition-all ${
                  visibility === v
                    ? "bg-amber-500 text-white"
                    : "bg-white/5 text-gray-500 hover:bg-white/10"
                }`}>
                {v === "PRIVATE" ? "🔒 Privado (coach)" : "🌍 Comunidad"}
              </button>
            ))}
          </div>

          <button
            onClick={() => createPost.mutate({ type, visibility, content: content || undefined, imageUrls, attachDailyMetrics: attachMetrics })}
            disabled={createPost.isPending || (!content.trim() && imageUrls.length === 0)}
            className="w-full rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 py-3.5 text-sm font-bold text-white
              hover:from-amber-600 hover:to-orange-600 disabled:opacity-40 transition-all">
            {createPost.isPending ? "Publicando..." : "Publicar ✓"}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Post card ────────────────────────────────────────────────────────────────

function PostCard({ post, currentUserId }: { post: Post; currentUserId: string }) {
  const utils = api.useUtils()
  const [showComments, setShowComments] = useState(false)
  const [commentText,  setCommentText]  = useState("")
  const [replyTo,      setReplyTo]      = useState<string | null>(null)
  const meta = POST_TYPE_META[post.type] ?? POST_TYPE_META.FREE

  // ── toggleReaction — optimistic update ──────────────────────────────────────
  const toggleReaction = api.communications.toggleReaction.useMutation({
    onMutate: async ({ postId, emoji }) => {
      await utils.communications.getFeed.cancel()
      const prev = utils.communications.getFeed.getInfiniteData({ limit: 20 })

      utils.communications.getFeed.setInfiniteData({ limit: 20 }, (old) => {
        if (!old) return old
        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            items: page.items.map((p) => {
              if (p.id !== postId) return p
              const alreadyReacted = p.reactions.some(
                (r) => r.emoji === emoji && r.userId === currentUserId,
              )
              return {
                ...p,
                reactions: alreadyReacted
                  ? p.reactions.filter(
                      (r) => !(r.emoji === emoji && r.userId === currentUserId),
                    )
                  : [
                      ...p.reactions,
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      { id: `opt-${Date.now()}`, emoji, userId: currentUserId, postId, createdAt: new Date() } as any,
                    ],
              }
            }),
          })),
        }
      })
      return { prev }
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) utils.communications.getFeed.setInfiniteData({ limit: 20 }, ctx.prev)
      toast.error("No se pudo guardar la reacción")
    },
    onSettled: () => void utils.communications.getFeed.invalidate(),
  })

  // ── addComment — optimistic update ───────────────────────────────────────────
  const addComment = api.communications.addComment.useMutation({
    onMutate: async ({ postId, content, parentId }) => {
      await utils.communications.getFeed.cancel()
      const prev = utils.communications.getFeed.getInfiniteData({ limit: 20 })

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tempEntry = { id: `opt-${Date.now()}`, content, postId, userId: currentUserId, parentId: parentId ?? null, createdAt: new Date(), user: { id: currentUserId, name: null }, replies: [] } as any

      utils.communications.getFeed.setInfiniteData({ limit: 20 }, (old) => {
        if (!old) return old
        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            items: page.items.map((p) => {
              if (p.id !== postId) return p
              if (parentId) {
                return {
                  ...p,
                  comments: p.comments.map((c) =>
                    c.id === parentId ? { ...c, replies: [...c.replies, tempEntry] } : c,
                  ),
                }
              }
              return { ...p, comments: [...p.comments, tempEntry] }
            }),
          })),
        }
      })

      // Limpiar form de inmediato (UX optimista)
      setCommentText("")
      setReplyTo(null)
      return { prev }
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) utils.communications.getFeed.setInfiniteData({ limit: 20 }, ctx.prev)
      toast.error("No se pudo publicar el comentario")
    },
    onSettled: () => void utils.communications.getFeed.invalidate(),
  })

  // Group reactions by emoji
  const reactionGroups = useMemo(() => {
    const groups = new Map<string, { count: number; userReacted: boolean }>()
    for (const r of post.reactions) {
      const existing = groups.get(r.emoji) ?? { count: 0, userReacted: false }
      groups.set(r.emoji, {
        count:       existing.count + 1,
        userReacted: existing.userReacted || r.userId === currentUserId,
      })
    }
    return groups
  }, [post.reactions, currentUserId])

  const hasMetrics = post.kcalIn || post.balance || post.weightKg

  return (
    <div className="rounded-2xl bg-white/5 ring-1 ring-white/10 overflow-hidden">
      {/* Header */}
      <div className="flex items-start gap-3 p-4">
        <div className="h-9 w-9 flex-shrink-0 rounded-xl bg-gradient-to-br from-amber-400/30 to-orange-500/30
          flex items-center justify-center text-sm font-black text-amber-400">
          {post.user.name?.[0]?.toUpperCase() ?? "?"}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-bold text-white">{post.user.name}</p>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${meta.color}`}>
              {meta.emoji} {meta.label}
            </span>
            {post.featuredBy && (
              <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-400">
                ⭐ Destacado
              </span>
            )}
          </div>
          <p className="text-[10px] text-gray-600 mt-0.5">
            {new Date(post.createdAt).toLocaleDateString("es-CO", {
              weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"
            })}
          </p>
        </div>
      </div>

      {/* Content */}
      {post.content && (
        <p className="px-4 pb-3 text-sm text-gray-200 leading-relaxed">{post.content}</p>
      )}

      {/* Images */}
      {post?.imageUrls?.length > 0 && (
        <div className={`grid gap-1 px-4 pb-3 ${
          post?.imageUrls?.length === 1 ? "grid-cols-1" :
          post?.imageUrls?.length === 2 ? "grid-cols-2" : "grid-cols-3"
        }`}>
          {post?.imageUrls?.map((url) => (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img key={url} src={url} alt=""
              className={`w-full rounded-xl object-cover ${
                post.imageUrls.length === 1 ? "max-h-72" : "h-28"
              }`} />
          ))}
        </div>
      )}

      {/* Auto-metrics (check-in) */}
      {hasMetrics && (
        <div className="mx-4 mb-3 grid grid-cols-4 gap-2 rounded-xl bg-blue-500/10 border border-blue-500/20 p-3">
          {[
            { label: "Consumido", value: post.kcalIn  ? `${post.kcalIn.toFixed(0)} kcal`   : null, color: "text-emerald-400" },
            { label: "Balance",   value: post.balance  ? `${post.balance > 0 ? "+" : ""}${post.balance.toFixed(0)}`  : null, color: post.balance && post.balance < 0 ? "text-blue-400" : "text-orange-400" },
            { label: "Peso",      value: post.weightKg ? `${post.weightKg.toFixed(1)} kg`  : null, color: "text-white"      },
            { label: "Proteína",  value: post.proteinG ? `${post.proteinG.toFixed(0)}g`    : null, color: "text-blue-300"   },
          ].filter((s) => s.value).map((s) => (
            <div key={s.label} className="text-center">
              <p className={`text-sm font-black ${s.color}`}>{s.value}</p>
              <p className="text-[9px] text-gray-600">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Reactions */}
      <div className="flex items-center gap-2 px-4 py-2 border-t border-white/5 flex-wrap">
        {REACTION_EMOJIS.map((emoji) => {
          const group = reactionGroups.get(emoji)
          return (
            <button key={emoji}
              onClick={() => toggleReaction.mutate({ postId: post.id, emoji })}
              className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs transition-all ${
                group?.userReacted
                  ? "bg-amber-500/20 ring-1 ring-amber-500/50"
                  : "bg-white/5 hover:bg-white/10"
              }`}>
              <span>{emoji}</span>
              {group && <span className="font-bold text-gray-300">{group.count}</span>}
            </button>
          )
        })}
        <button onClick={() => setShowComments((v) => !v)}
          className="ml-auto flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-1 text-xs text-gray-400 hover:bg-white/10 transition-colors">
          💬 {post.comments.length}
        </button>
      </div>

      {/* Comments */}
      {showComments && (
        <div className="border-t border-white/5 px-4 pb-4 space-y-3 pt-3">
          {post.comments.map((comment) => (
            <div key={comment.id}>
              <div className="flex gap-2">
                <div className="h-6 w-6 flex-shrink-0 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-bold text-gray-400">
                  {comment.user.name?.[0]?.toUpperCase() ?? "?"}
                </div>
                <div className="flex-1 rounded-xl bg-white/5 px-3 py-2">
                  <p className="text-[10px] font-bold text-gray-400">{comment.user.name}</p>
                  <p className="text-xs text-gray-200 mt-0.5">{comment.content}</p>
                </div>
              </div>
              {/* Replies */}
              {comment.replies.map((reply) => (
                <div key={reply.id} className="ml-8 mt-1.5 flex gap-2">
                  <div className="h-5 w-5 flex-shrink-0 rounded-full bg-white/10 flex items-center justify-center text-[9px] font-bold text-gray-500">
                    {reply.user.name?.[0]?.toUpperCase() ?? "?"}
                  </div>
                  <div className="flex-1 rounded-xl bg-white/5 px-3 py-2">
                    <p className="text-[10px] font-bold text-gray-500">{reply.user.name}</p>
                    <p className="text-xs text-gray-300 mt-0.5">{reply.content}</p>
                  </div>
                </div>
              ))}
              <button onClick={() => setReplyTo(replyTo === comment.id ? null : comment.id)}
                className="ml-8 mt-1 text-[10px] text-gray-600 hover:text-amber-400 transition-colors">
                Responder
              </button>
            </div>
          ))}

          {/* Comment input */}
          <div className="flex gap-2">
            <input
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder={replyTo ? "Escribe una respuesta..." : "Escribe un comentario..."}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && commentText.trim()) {
                  e.preventDefault()
                  addComment.mutate({
                    postId:   post.id,
                    content:  commentText,
                    parentId: replyTo ?? undefined,
                  })
                }
              }}
              className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white
                placeholder-gray-600 focus:border-amber-500 focus:outline-none"
            />
            <button
              onClick={() => commentText.trim() && addComment.mutate({
                postId:   post.id,
                content:  commentText,
                parentId: replyTo ?? undefined,
              })}
              disabled={!commentText.trim() || addComment.isPending}
              className="rounded-xl bg-amber-500 px-3 text-xs font-bold text-white hover:bg-amber-600 disabled:opacity-40">
              ↑
            </button>
          </div>
          {replyTo && (
            <button onClick={() => setReplyTo(null)} className="text-[10px] text-gray-600 hover:text-red-400">
              Cancelar respuesta
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ─── DM conversation ──────────────────────────────────────────────────────────

function DMConversation({ convo, currentUserId }: { convo: Convo; currentUserId: string }) {
  const utils     = api.useUtils()
  const bottomRef = useRef<HTMLDivElement>(null)
  const [text,     setText]     = useState("")
  const [imageUrl, setImageUrl] = useState("")

  const other = convo.other

  const { data: messages = [] } = api.communications.getConversation.useQuery(
    { otherId: other.id },
    { refetchInterval: 5000 }  // poll cada 5s (sin WebSockets)
  )

  // ── sendMessage — optimistic update ─────────────────────────────────────────
  const sendMessage = api.communications.sendMessage.useMutation({
    onMutate: async ({ toId, content, imageUrl: imgUrl }) => {
      await utils.communications.getConversation.cancel({ otherId: toId })
      const prev = utils.communications.getConversation.getData({ otherId: toId })

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tempMsg = { id: `opt-${Date.now()}`, content, imageUrl: imgUrl ?? null, fromId: currentUserId, toId, createdAt: new Date(), readAt: null } as any

      utils.communications.getConversation.setData(
        { otherId: toId },
        (old) => [...(old ?? []), tempMsg as Message],
      )

      // Limpiar form de inmediato (UX optimista)
      setText("")
      setImageUrl("")
      return { prev, toId }
    },
    onError: (e, _v, ctx) => {
      if (ctx?.prev)
        utils.communications.getConversation.setData({ otherId: ctx.toId }, ctx.prev)
      toast.error(e.message)
    },
    onSettled: (_d, _e, { toId }) => {
      void utils.communications.getConversation.invalidate({ otherId: toId })
      void utils.communications.getConversationList.invalidate()
    },
  })

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages.length])

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-white/10 p-4 flex-shrink-0">
        <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-amber-400/30 to-orange-500/30
          flex items-center justify-center text-sm font-black text-amber-400">
          {other.name?.[0]?.toUpperCase() ?? "?"}
        </div>
        <p className="font-bold text-white">{other.name}</p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg) => {
          const isMine = msg.fromId === currentUserId
          return (
            <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                isMine ? "bg-amber-500 text-white" : "bg-white/10 text-gray-200"
              }`}>
                {msg.imageUrl && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={msg.imageUrl} alt="" className="mb-2 max-h-40 rounded-xl object-cover" />
                )}
                <p className="text-sm leading-relaxed">{msg.content}</p>
                <p className={`text-[10px] mt-1 ${isMine ? "text-white/60" : "text-gray-600"}`}>
                  {new Date(msg.createdAt).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-white/10 p-3 flex-shrink-0 space-y-2">
        {imageUrl && (
          <div className="relative w-16">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageUrl} alt="" className="h-16 w-16 rounded-xl object-cover" />
            <button onClick={() => setImageUrl("")}
              className="absolute -right-1 -top-1 rounded-full bg-red-500 p-0.5 text-white text-[10px]">✕</button>
          </div>
        )}
        <div className="flex gap-2">
          <UploadButton
            endpoint="imageUploader"
            onClientUploadComplete={(res) => {
              const url = res[0]?.ufsUrl ?? res[0]?.url
              if (url) setImageUrl(url)
            }}
             onUploadError={(e: UploadThingError
                                 ) => {
              toast.error(`Error al subir imagen: ${e.message}`)
            }}
            appearance={{
              button: "rounded-xl bg-white/10 px-3 py-2.5 text-sm text-gray-400 hover:bg-white/20 ut-uploading:opacity-50",
              allowedContent: "hidden",
              container: "w-auto",
            }}
            content={{ button: () => "📸" }}
          />
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Escribe un mensaje..."
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && text.trim()) {
                e.preventDefault()
                sendMessage.mutate({ toId: other.id, content: text, imageUrl: imageUrl || undefined })
              }
            }}
            className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white
              placeholder-gray-600 focus:border-amber-500 focus:outline-none"
          />
          <button
            onClick={() => text.trim() && sendMessage.mutate({ toId: other.id, content: text, imageUrl: imageUrl || undefined })}
            disabled={!text.trim() || sendMessage.isPending}
            className="rounded-xl bg-amber-500 px-4 text-sm font-bold text-white hover:bg-amber-600 disabled:opacity-40">
            ↑
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function MessagesPage() {
  const [tab,          setTab]          = useState<Tab>("feed")
  const [showCreate,   setShowCreate]   = useState(false)
  const [activeConvo,  setActiveConvo]  = useState<Convo | null>(null)

  const { data: session } = api.userProfile.get.useQuery()
  const currentUserId     = session?.userId ?? ""

  const { data: feed,   fetchNextPage, hasNextPage, isFetchingNextPage } =
    api.communications.getFeed.useInfiniteQuery(
      { limit: 20 },
      { getNextPageParam: (last) => last.nextCursor ?? undefined,
        staleTime: 30_000 }
    )

  const { data: convos   = [] } = api.communications.getConversationList.useQuery(
    undefined, { refetchInterval: 10_000 }
  )
  const { data: challenges = [] } = api.communications.getActiveChallenges.useQuery(
    undefined, { staleTime: 5 * 60_000 }
  )
  const { data: unread = 0 } = api.communications.getUnreadCount.useQuery(
    undefined, { refetchInterval: 10_000 }
  )

  const allPosts = feed?.pages.flatMap((p) => p.items) ?? []

  return (
    <div className="min-h-screen bg-[#0c0c10] text-white">
      <div className="mx-auto max-w-5xl">

        {/* Header */}
        <div className="sticky top-0 z-10 bg-[#0c0c10]/95 backdrop-blur-xl border-b border-white/10 px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-xl font-black text-white">💬 Comunidad</h1>
            {tab === "feed" && (
              <button onClick={() => setShowCreate(true)}
                className="rounded-xl bg-amber-500 px-4 py-2 text-sm font-bold text-white hover:bg-amber-600 transition-colors">
                + Post
              </button>
            )}
          </div>

          {/* Tabs */}
          <div className="flex rounded-xl bg-white/5 p-1 gap-1">
            {([
              { id: "feed",       label: "🌐 Feed"      },
              { id: "messages",   label: `💬 Mensajes${unread > 0 ? ` (${unread})` : ""}` },
              { id: "challenges", label: "⚡ Retos"     },
            ] as { id: Tab; label: string }[]).map((t) => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`flex-1 rounded-lg py-2 text-xs font-bold transition-all ${
                  tab === t.id
                    ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow"
                    : "text-gray-500 hover:text-gray-300"
                }`}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── FEED ── */}
        {tab === "feed" && (
          <div className="p-4 space-y-4">
            {allPosts.length === 0 ? (
              <div className="flex flex-col items-center py-16 text-center">
                <span className="text-6xl">🌐</span>
                <h3 className="mt-4 text-lg font-bold text-gray-400">El feed está vacío</h3>
                <p className="text-sm text-gray-600 mt-1">Sé el primero en publicar algo</p>
                <button onClick={() => setShowCreate(true)}
                  className="mt-5 rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-amber-600">
                  Crear post
                </button>
              </div>
            ) : (
              <>
                {allPosts.map((post) => (
                  <PostCard key={post.id} post={post} currentUserId={currentUserId} />
                ))}
                {hasNextPage && (
                  <button onClick={() => fetchNextPage()} disabled={isFetchingNextPage}
                    className="w-full rounded-xl bg-white/5 py-3 text-sm text-gray-400 hover:bg-white/10 disabled:opacity-50">
                    {isFetchingNextPage ? "Cargando..." : "Ver más"}
                  </button>
                )}
              </>
            )}
          </div>
        )}

        {/* ── MESSAGES ── */}
        {tab === "messages" && (
          <div className="flex h-[calc(100vh-120px)]">
            {/* Conversation list */}
            <div className={`w-full border-r border-white/10 overflow-y-auto ${activeConvo ? "hidden sm:block sm:w-72" : ""}`}>
              {convos.length === 0 ? (
                <div className="flex flex-col items-center py-16 text-center px-4">
                  <span className="text-4xl">💬</span>
                  <p className="mt-3 text-sm text-gray-500">Sin conversaciones</p>
                  <p className="text-xs text-gray-600 mt-1">Los mensajes con tu coach aparecerán aquí</p>
                </div>
              ) : (
                <div className="divide-y divide-white/5">
                  {convos.map((convo) => (
                    <button key={convo.other.id}
                      onClick={() => setActiveConvo(convo)}
                      className={`w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-white/5 transition-colors ${
                        activeConvo?.other.id === convo?.other.id ? "bg-white/10" : ""
                      }`}>
                      <div className="h-10 w-10 flex-shrink-0 rounded-xl bg-gradient-to-br from-amber-400/30 to-orange-500/30
                        flex items-center justify-center text-sm font-black text-amber-400 relative">
                        {convo?.other.name?.[0]?.toUpperCase() ?? "?"}
                        {convo?.unreadCount > 0 && (
                          <div className="absolute -right-1 -top-1 h-4 w-4 rounded-full bg-amber-500 flex items-center justify-center text-[9px] font-black text-white">
                            {convo?.unreadCount}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-white truncate">{convo?.other.name}</p>
                        <p className="text-xs text-gray-500 truncate">{convo?.lastMessage.content}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Conversation view */}
            {activeConvo ? (
              <div className="flex-1 flex flex-col">
                <button onClick={() => setActiveConvo(null)}
                  className="sm:hidden px-4 py-2 text-xs text-gray-500 hover:text-white text-left">
                  ← Volver
                </button>
                <div className="flex-1 overflow-hidden">
                  <DMConversation convo={activeConvo} currentUserId={currentUserId} />
                </div>
              </div>
            ) : (
              <div className="hidden sm:flex flex-1 items-center justify-center">
                <p className="text-gray-600 text-sm">Selecciona una conversación</p>
              </div>
            )}
          </div>
        )}

        {/* ── CHALLENGES ── */}
        {tab === "challenges" && (
          <div className="p-4 space-y-4">
            {challenges.length === 0 ? (
              <div className="flex flex-col items-center py-16 text-center">
                <span className="text-6xl">⚡</span>
                <h3 className="mt-4 text-lg font-bold text-gray-400">Sin retos activos</h3>
                <p className="text-sm text-gray-600 mt-1">Tu coach publicará retos semanales aquí</p>
              </div>
            ) : (
              challenges.map((challenge) => {
                const daysLeft = Math.max(0, Math.ceil(
                  (new Date(challenge.endsAt).getTime() - Date.now()) / 86400000
                ))
                const hasParticipated = challenge.posts.length > 0

                return (
                  <div key={challenge.id} className="rounded-2xl ring-1 ring-white/10 overflow-hidden">
                    {challenge.imageUrl && (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={challenge.imageUrl} alt="" className="h-40 w-full object-cover" />
                    )}
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div>
                          <p className="font-black text-white">{challenge.title}</p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            Por {challenge.coach.name} · {daysLeft} días restantes
                          </p>
                        </div>
                        {hasParticipated && (
                          <span className="rounded-full bg-green-500/20 px-2.5 py-1 text-[10px] font-bold text-green-400 flex-shrink-0">
                            ✓ Participaste
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-300 leading-relaxed mb-4">{challenge.description}</p>
                      {!hasParticipated && (
                        <button
                          onClick={() => {
                            setTab("feed")
                            setShowCreate(true)
                          }}
                          className="w-full rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 py-2.5 text-sm font-bold text-white hover:from-amber-600 hover:to-orange-600 transition-all">
                          ⚡ Responder al reto
                        </button>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}
      </div>

      {showCreate && <CreatePostModal onClose={() => setShowCreate(false)} />}
    </div>
  )
}
