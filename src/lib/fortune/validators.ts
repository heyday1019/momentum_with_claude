import type { ProfileInput } from './types'

/** 폼 + URL searchParams 양쪽에서 재사용. 통과면 null, 실패면 한국어 에러 메시지 */
export function validateProfileInput(input: ProfileInput): string | null {
  if (!input.name || input.name.trim().length === 0) return '이름을 입력해주세요'
  if (input.name.length > 30) return '이름은 30자 이하로 입력해주세요'
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.birthdate)) return '생년월일 형식이 올바르지 않아요'
  const d = new Date(input.birthdate)
  if (Number.isNaN(d.getTime())) return '생년월일이 유효하지 않아요'
  if (d < new Date('1900-01-01') || d > new Date()) return '생년월일은 1900년 이후, 오늘 이전이어야 해요'
  if (!['male', 'female', 'other'].includes(input.gender)) return '성별 선택이 올바르지 않아요'
  return null
}
