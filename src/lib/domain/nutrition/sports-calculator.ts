/**
 * sports-calculator.ts
 * Cálculo de gasto calórico por deporte usando MET (Metabolic Equivalent of Task)
 * Fuente: Compendium of Physical Activities (Ainsworth et al., 2011)
 *
 * Fórmula: kcal = MET × weightKg × hours × intensityScale
 * intensityScale: 0.6 (muy suave) → 1.4 (máximo esfuerzo)
 */

export interface SportDefinition {
  id:           string
  name:         string
  emoji:        string
  metBase:      number   // MET a intensidad moderada (referencia)
  metMin:       number   // MET mínimo (muy suave)
  metMax:       number   // MET máximo (máximo esfuerzo)
  category:     "team" | "individual" | "water" | "combat" | "work"
  description:  string
}

export const SPORTS: SportDefinition[] = [
  // ── Deportes de equipo ──────────────────────────────────────────────────────
  {
    id: "football",     name: "Fútbol",       emoji: "⚽",
    metBase: 7.0, metMin: 4.0, metMax: 10.0,
    category: "team",
    description: "Partido completo con sprints y cambios de dirección",
  },
  {
    id: "basketball",   name: "Baloncesto",   emoji: "🏀",
    metBase: 6.5, metMin: 4.0, metMax: 9.0,
    category: "team",
    description: "Partido con carreras, saltos y cambios de ritmo",
  },
  {
    id: "volleyball",   name: "Volleyball",   emoji: "🏐",
    metBase: 4.0, metMin: 3.0, metMax: 7.0,
    category: "team",
    description: "Partido competitivo o recreativo en cancha",
  },
  {
    id: "rugby",        name: "Rugby",        emoji: "🏉",
    metBase: 8.3, metMin: 5.0, metMax: 12.0,
    category: "team",
    description: "Alta intensidad física con contacto y carreras",
  },
  // ── Deportes individuales ──────────────────────────────────────────────────
  {
    id: "running",      name: "Running",      emoji: "🏃",
    metBase: 9.8, metMin: 6.0, metMax: 16.0,
    category: "individual",
    description: "Trote suave hasta carrera de alta velocidad",
  },
  {
    id: "cycling",      name: "Ciclismo",     emoji: "🚴",
    metBase: 8.0, metMin: 4.0, metMax: 14.0,
    category: "individual",
    description: "Ruta, montaña o bicicleta estática",
  },
  {
    id: "tennis",       name: "Tenis",        emoji: "🎾",
    metBase: 7.3, metMin: 4.5, metMax: 10.0,
    category: "individual",
    description: "Singles o dobles, recreativo o competitivo",
  },
  {
    id: "padel",        name: "Pádel",        emoji: "🏓",
    metBase: 6.0, metMin: 4.0, metMax: 8.5,
    category: "individual",
    description: "Partido en pista cerrada, alta actividad aeróbica",
  },
  {
    id: "athletics",    name: "Atletismo",    emoji: "🏅",
    metBase: 10.0, metMin: 6.0, metMax: 18.0,
    category: "individual",
    description: "Velocidad, fondo, saltos o lanzamientos",
  },
  {
    id: "rowing",       name: "Remo",         emoji: "🚣",
    metBase: 8.5, metMin: 5.0, metMax: 12.0,
    category: "water",
    description: "Remo en agua o ergómetro de remo",
  },
  // ── Deportes acuáticos ─────────────────────────────────────────────────────
  {
    id: "swimming",     name: "Natación",     emoji: "🏊",
    metBase: 7.0, metMin: 4.5, metMax: 11.0,
    category: "water",
    description: "Estilo libre, espalda, pecho o mariposa",
  },
  // ── Artes marciales y combate ──────────────────────────────────────────────
  {
    id: "martial_arts", name: "Artes marciales", emoji: "🥋",
    metBase: 7.8, metMin: 4.0, metMax: 12.0,
    category: "combat",
    description: "Judo, karate, boxeo, MMA, BJJ, taekwondo",
  },
  // ── Trabajo físico ─────────────────────────────────────────────────────────
  {
    id: "construction", name: "Construcción", emoji: "🏗️",
    metBase: 5.5, metMin: 3.5, metMax: 8.0,
    category: "work",
    description: "Trabajo físico de construcción, carga y obra",
  },
]

export const SPORT_CATEGORIES = {
  team:       { label: "Deportes de equipo",  emoji: "👥" },
  individual: { label: "Individuales",         emoji: "🏆" },
  water:      { label: "Acuáticos",            emoji: "💧" },
  combat:     { label: "Combate",              emoji: "🥊" },
  work:       { label: "Trabajo físico",       emoji: "🔨" },
} as const

/**
 * Convierte el slider de intensidad (1–20) a un factor de escala del MET.
 * 1  → 0.60 (muy suave — calentamiento, técnica)
 * 10 → 1.00 (intensidad moderada — referencia MET base)
 * 20 → 1.40 (máximo esfuerzo — competencia de élite)
 */
export function intensityToMETScale(intensity: number): number {
  // Interpolación lineal: [1,10] → [0.6,1.0], [10,20] → [1.0,1.4]
  if (intensity <= 10) {
    return 0.6 + (intensity - 1) * (0.4 / 9)
  }
  return 1.0 + (intensity - 10) * (0.4 / 10)
}

/**
 * Estima el gasto calórico de un deporte.
 *
 * @param sport           - Definición del deporte
 * @param weightKg        - Peso corporal en kg
 * @param durationMinutes - Duración en minutos
 * @param intensity       - Intensidad 1–20
 * @returns kcal estimadas
 */
export function calculateSportKcal(
  sport: SportDefinition,
  weightKg: number,
  durationMinutes: number,
  intensity: number
): number {
  const scale = intensityToMETScale(intensity)
  // MET efectivo clampado entre min y max del deporte
  const effectiveMET = Math.min(
    sport.metMax,
    Math.max(sport.metMin, sport.metBase * scale)
  )
  const hours = durationMinutes / 60
  return Math.round(effectiveMET * weightKg * hours)
}

/**
 * Descripción textual de la intensidad para UI.
 */
export function getIntensityDescription(intensity: number): {
  label: string
  sublabel: string
  color: string
} {
  if (intensity <= 3)  return { label: "Muy suave",       sublabel: "Técnica o calentamiento",      color: "#86efac" }
  if (intensity <= 6)  return { label: "Suave",           sublabel: "Puedes mantener conversación",  color: "#6ee7b7" }
  if (intensity <= 9)  return { label: "Moderado",        sublabel: "Ligeramente sin aliento",       color: "#fde047" }
  if (intensity <= 12) return { label: "Intenso",         sublabel: "Difícil mantener conversación", color: "#fb923c" }
  if (intensity <= 16) return { label: "Muy intenso",     sublabel: "Esfuerzo sostenido alto",       color: "#f87171" }
  return                      { label: "Máximo esfuerzo", sublabel: "Competencia o sprint total",    color: "#e879f9" }
}