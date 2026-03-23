import { db }        from "@/server/db"
import { TRPCError } from "@trpc/server"
import type { PostType, PostVisibility } from "../../../generated/prisma"

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CreatePostInput {
  type:       PostType
  visibility: PostVisibility
  content?:   string
  imageUrls?: string[]
  recipeId?:  string
  planId?:    string
  challengeId?: string
  // Si type === CHECKIN → auto-adjuntar métricas del DailyLog de hoy
  attachDailyMetrics?: boolean
}

export interface GetFeedInput {
  cursor?:     string
  limit?:      number
  visibility?: PostVisibility
  userId?:     string  // filtrar por usuario específico
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toDateOnly(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

const POST_INCLUDE = {
  user: { select: { id: true, name: true, image: true, role: true } },
  reactions: {
    include: { user: { select: { id: true, name: true } } },
  },
  comments: {
    where:   { parentId: null },
    orderBy: { createdAt: "asc" as const },
    include: {
      user:    { select: { id: true, name: true, image: true } },
      replies: {
        orderBy: { createdAt: "asc" as const },
        include: {
          user: { select: { id: true, name: true, image: true } },
        },
      },
    },
  },
} as const

// ─── Service ──────────────────────────────────────────────────────────────────

export const CommunicationsService = {
  //-- Contacts
  async getAvailableContacts(userId: string) {
  const user = await db.user.findUnique({
    where:  { id: userId },
    select: { coachId: true, role: true },
  })
 
  const isCoach = user?.role === "COACH" || user?.role === "ADMIN"
 
  if (isCoach) {
    // Coach puede escribir a sus clientes
    return db.user.findMany({
      where:  { coachId: userId },
      select: { id: true, name: true, image: true, email: true },
    })
  }
 
  // USER puede escribir solo a su coach
  if (!user?.coachId) return []
  const coach = await db.user.findUnique({
    where:  { id: user.coachId },
    select: { id: true, name: true, image: true, email: true },
  })
  return coach ? [coach] : []
},

  // ── Posts ───────────────────────────────────────────────────────────────────

  async createPost(userId: string, input: CreatePostInput) {
    if (!input.content && (!input.imageUrls || input.imageUrls.length === 0)) {
      throw new TRPCError({
        code:    "BAD_REQUEST",
        message: "El post debe tener texto o al menos una imagen.",
      })
    }

    // Auto-adjuntar métricas del día si es check-in
    let metrics: {
      kcalIn?: number; kcalOut?: number; balance?: number
      weightKg?: number; proteinG?: number
    } = {}

    if (input.type === "CHECKIN" && input.attachDailyMetrics !== false) {
      const today   = toDateOnly(new Date())
      const [log, weight] = await Promise.all([
        db.dailyLog.findUnique({
          where: { userId_date: { userId, date: today } },
        }),
        db.weightLog.findFirst({
          where:   { userId },
          orderBy: { date: "desc" },
        }),
      ])

      if (log) {
        metrics = {
          kcalIn:   log.caloriesIn,
          kcalOut:  log.caloriesOut,
          balance:  log.balance,
          proteinG: log.proteinGrams,
        }
      }
      if (weight) metrics.weightKg = weight.weightKg
    }

    return db.post.create({
      data: {
        userId,
        type:        input.type,
        visibility:  input.visibility,
        content:     input.content     ?? null,
        imageUrls:   input.imageUrls   ?? [],
        recipeId:    input.recipeId    ?? null,
        planId:      input.planId      ?? null,
        challengeId: input.challengeId ?? null,
        ...metrics,
      },
      include: POST_INCLUDE,
    })
  },

  async deletePost(userId: string, postId: string) {
    const post = await db.post.findUnique({ where: { id: postId } })
    if (!post) throw new TRPCError({ code: "NOT_FOUND", message: "Post no encontrado." })

    // El autor o un coach pueden eliminar
    const user = await db.user.findUnique({
      where:  { id: userId },
      select: { role: true, id: true },
    })
    const isOwner = post.userId === userId
    const isCoach = user?.role === "COACH" || user?.role === "ADMIN"

    if (!isOwner && !isCoach) {
      throw new TRPCError({ code: "FORBIDDEN", message: "No puedes eliminar este post." })
    }

    return db.post.delete({ where: { id: postId } })
  },

  async featurePost(coachId: string, postId: string) {
    const post = await db.post.findUnique({
      where:   { id: postId },
      include: { user: { select: { coachId: true } } },
    })
    if (!post) throw new TRPCError({ code: "NOT_FOUND", message: "Post no encontrado." })
    if (post.user.coachId !== coachId) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Solo puedes destacar posts de tus clientes." })
    }

    return db.post.update({
      where: { id: postId },
      data:  {
        featuredBy: coachId,
        featuredAt: new Date(),
      },
    })
  },

  // ── Feed ────────────────────────────────────────────────────────────────────

async getFeed(userId: string, input: { limit?: number; cursor?: string; userId?: string }) {
  const limit = input.limit ?? 20
 
  const user = await db.user.findUnique({
    where:  { id: userId },
    select: { coachId: true, role: true },
  })
 
  const isCoach = user?.role === "COACH" || user?.role === "ADMIN"
 
  let visibleUserIds: string[]
 
  if (isCoach) {
    // COACH ve: sus posts + posts de sus clientes (coachId = userId)
    const clients = await db.user.findMany({
      where:  { coachId: userId },
      select: { id: true },
    })
    visibleUserIds = [userId, ...clients.map((c) => c.id)]
 
  } else {
    // USER ve: sus posts + posts de su coach + posts de compañeros del mismo coach
    const peers = user?.coachId
      ? await db.user.findMany({
          where:  { coachId: user.coachId },
          select: { id: true },
        })
      : []
    visibleUserIds = [
      userId,
      ...(user?.coachId ? [user.coachId] : []),
      ...peers.map((p) => p.id),
    ]
  }
 
  const where: Prisma.PostWhereInput = {
    OR: [
      { userId: { in: visibleUserIds } },
      { visibility: "PUBLIC" },
    ],
    ...(input.userId    ? { userId:    input.userId          } : {}),
    ...(input.cursor    ? { createdAt: { lt: new Date(input.cursor) } } : {}),
  }
 
  const posts = await db.post.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take:    limit + 1,
    include: POST_INCLUDE,
  })
 
  const hasMore    = posts.length > limit
  const items      = hasMore ? posts.slice(0, limit) : posts
  const nextCursor = hasMore ? items.at(-1)?.createdAt.toISOString() ?? null : null
 
  return { items, nextCursor, hasMore }
},

  async getUserPosts(userId: string, targetUserId: string) {
    return db.post.findMany({
      where:   { userId: targetUserId },
      orderBy: { createdAt: "desc" },
      take:    30,
      include: POST_INCLUDE,
    })
  },

  // ── Reactions ───────────────────────────────────────────────────────────────

  async toggleReaction(userId: string, postId: string, emoji: string) {
    const existing = await db.postReaction.findUnique({
      where: { postId_userId_emoji: { postId, userId, emoji } },
    })

    if (existing) {
      await db.postReaction.delete({ where: { id: existing.id } })
      return { added: false, emoji }
    }

    await db.postReaction.create({ data: { postId, userId, emoji } })
    return { added: true, emoji }
  },

  // ── Comments ─────────────────────────────────────────────────────────────────

  async addComment(userId: string, input: {
    postId:    string
    content:   string
    parentId?: string
    imageUrl?: string
  }) {
    if (!input.content.trim()) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "El comentario no puede estar vacío." })
    }

    return db.comment.create({
      data: {
        postId:   input.postId,
        userId,
        content:  input.content,
        parentId: input.parentId ?? null,
        imageUrl: input.imageUrl ?? null,
      },
      include: {
        user:    { select: { id: true, name: true, image: true } },
        replies: { include: { user: { select: { id: true, name: true, image: true } } } },
      },
    })
  },

  async deleteComment(userId: string, commentId: string) {
    const comment = await db.comment.findUnique({ where: { id: commentId } })
    if (!comment) throw new TRPCError({ code: "NOT_FOUND", message: "Comentario no encontrado." })
    if (comment.userId !== userId) {
      throw new TRPCError({ code: "FORBIDDEN", message: "No puedes eliminar este comentario." })
    }
    return db.comment.delete({ where: { id: commentId } })
  },

  // ── Challenges ───────────────────────────────────────────────────────────────

  async createChallenge(coachId: string, input: {
    title:       string
    description: string
    imageUrl?:   string
    startsAt:    Date
    endsAt:      Date
    targetAll?:  boolean
    targetIds?:  string[]
  }) {
    const user = await db.user.findUnique({
      where:  { id: coachId },
      select: { role: true },
    })
    if (!user || (user.role !== "COACH" && user.role !== "ADMIN")) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Solo los coaches pueden crear retos." })
    }

    return db.challenge.create({
      data: {
        coachId,
        title:       input.title,
        description: input.description,
        imageUrl:    input.imageUrl ?? null,
        startsAt:    input.startsAt,
        endsAt:      input.endsAt,
        targetAll:   input.targetAll ?? true,
        targetIds:   input.targetIds ?? [],
      },
    })
  },

  async getActiveChallenges(userId: string) {
    const user = await db.user.findUnique({
      where:  { id: userId },
      select: { coachId: true },
    })

    const now = new Date()

    return db.challenge.findMany({
      where: {
        coachId:  user?.coachId ?? undefined,
        startsAt: { lte: now },
        endsAt:   { gte: now },
      },
      include: {
        coach: { select: { id: true, name: true, image: true } },
        posts: {
          where:   { userId },
          select:  { id: true },
        },
      },
      orderBy: { endsAt: "asc" },
    })
  },

  // ── Direct Messages ──────────────────────────────────────────────────────────

  async sendMessage(fromId: string, toId: string, input: {
    content:  string
    imageUrl?: string
  }) {
    if (!input.content.trim()) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "El mensaje no puede estar vacío." })
    }

    // Verificar que pueden comunicarse (son coach↔cliente)
    const [fromUser, toUser] = await Promise.all([
      db.user.findUnique({ where: { id: fromId }, select: { coachId: true, role: true } }),
      db.user.findUnique({ where: { id: toId },   select: { coachId: true, role: true } }),
    ])

    const isCoachClient =
      fromUser?.coachId === toId ||
      toUser?.coachId   === fromId ||
      fromUser?.role    === "ADMIN" ||
      toUser?.role      === "ADMIN"

    if (!isCoachClient) {
      throw new TRPCError({
        code:    "FORBIDDEN",
        message: "Solo puedes mensajear a tu coach o tus clientes.",
      })
    }

    return db.directMessage.create({
      data: {
        fromId,
        toId,
        content:  input.content,
        imageUrl: input.imageUrl ?? null,
      },
      include: {
        from: { select: { id: true, name: true, image: true } },
      },
    })
  },

  async getConversation(userId: string, otherId: string) {
    const messages = await db.directMessage.findMany({
      where: {
        OR: [
          { fromId: userId, toId: otherId },
          { fromId: otherId, toId: userId },
        ],
      },
      orderBy: { createdAt: "asc" },
      take:    100,
      include: {
        from: { select: { id: true, name: true, image: true } },
      },
    })

    // Marcar como leídos
    await db.directMessage.updateMany({
      where: { fromId: otherId, toId: userId, readAt: null },
      data:  { readAt: new Date() },
    })

    return messages
  },

  async getConversationList(userId: string) {
    // Obtener la última conversación con cada persona
    const messages = await db.directMessage.findMany({
      where: {
        OR: [{ fromId: userId }, { toId: userId }],
      },
      orderBy: { createdAt: "desc" },
      include: {
        from: { select: { id: true, name: true, image: true } },
        to:   { select: { id: true, name: true, image: true } },
      },
    })

    // Agrupar por conversación (par de usuarios)
    const seen  = new Set<string>()
    const convos: typeof messages = []

    for (const msg of messages) {
      const otherId = msg.fromId === userId ? msg.toId : msg.fromId
      if (!seen.has(otherId)) {
        seen.add(otherId)
        convos.push(msg)
      }
    }

    // Unread count por conversación
    const unreadCounts = await db.directMessage.groupBy({
      by:    ["fromId"],
      where: { toId: userId, readAt: null },
      _count: { id: true },
    })

    const unreadMap = new Map(
      unreadCounts.map((u) => [u.fromId, u._count.id])
    )

    return convos.map((msg) => {
      const other = msg.fromId === userId ? msg.to : msg.from
      return {
        other,
        lastMessage:  msg,
        unreadCount:  unreadMap.get(other.id) ?? 0,
      }
    })
  },

  async getUnreadCount(userId: string) {
    return db.directMessage.count({
      where: { toId: userId, readAt: null },
    })
  },
}
