export type Gender = 'male' | 'female' | 'other'

export interface ProfileInput {
  name: string
  birthdate: string  // YYYY-MM-DD
  gender: Gender
}

export interface ProfileRow extends ProfileInput {
  id: string
  created_at: string
  updated_at: string
}

export type FortuneType = 'daily' | 'zodiac'

export interface DailyContent {
  headline: string
  body: string
  lucky_keyword: string
  categories: {
    love: string
    money: string
    health: string
    work: string
  }
}

export interface ZodiacContent {
  headline: string
  body: string
  zodiac_animal: string
  zodiac_sign: string
  lucky_keyword: string
}

export interface LottoResult {
  draw_number: number
  numbers: number[]
  comment: string
}

/**
 * 임시(viewer) 프로필 — DB 미저장, 일회성 호출에만 사용.
 * undefined이면 본인 프로필 + 캐시 정책 적용.
 */
export type ViewerProfile = ProfileInput | undefined
