export type DreamPersonaKey = 'master' | 'fortune' | 'fairy'

export interface DreamPersonaMeta {
  key: DreamPersonaKey
  label: string
  caption: string
  image: string
  /** OpenRouter model identifier */
  model: string
}

export const DREAM_PERSONAS: DreamPersonaMeta[] = [
  { key: 'master',  label: 'GPT 도사',     caption: '깊이 있는 도가 통찰',     image: '/gpt-dog.png',         model: 'openai/gpt-4o-mini' },
  { key: 'fortune', label: 'Claude 점쟁이', caption: '신비로운 직관 풀이',      image: '/claude-cat.png',      model: 'anthropic/claude-haiku-4-5' },
  { key: 'fairy',   label: 'Gemini 선녀',  caption: '따뜻한 선녀의 위로',      image: '/gemini-raccoon.png',  model: 'google/gemini-2.5-flash' },
]
