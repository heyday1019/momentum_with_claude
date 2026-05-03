const ANIMALS = ['원숭이', '닭', '개', '돼지', '쥐', '소', '호랑이', '토끼', '용', '뱀', '말', '양']

export function zodiacAnimal(birthdate: string): string {
  const year = parseInt(birthdate.slice(0, 4), 10)
  return ANIMALS[year % 12]
}

/**
 * 별자리 — 양력 생일 기준.
 * 12/22 ~ 1/19 = 염소자리 (특수 처리 — 연말 연시 경계)
 * 그 외는 [시작월, 시작일, 다음구간_월, 다음구간_일, 이름] 매칭.
 */
const SIGN_RANGES: Array<[number, number, number, number, string]> = [
  [1, 20, 2, 19, '물병자리'],
  [2, 19, 3, 21, '물고기자리'],
  [3, 21, 4, 20, '양자리'],
  [4, 20, 5, 21, '황소자리'],
  [5, 21, 6, 22, '쌍둥이자리'],
  [6, 22, 7, 23, '게자리'],
  [7, 23, 8, 23, '사자자리'],
  [8, 23, 9, 23, '처녀자리'],
  [9, 23, 10, 24, '천칭자리'],
  [10, 24, 11, 23, '전갈자리'],
  [11, 23, 12, 22, '사수자리'],
]

export function zodiacSign(birthdate: string): string {
  const month = parseInt(birthdate.slice(5, 7), 10)
  const day = parseInt(birthdate.slice(8, 10), 10)
  // 12/22 ~ 1/19 염소자리
  if ((month === 12 && day >= 22) || (month === 1 && day < 20)) return '염소자리'
  for (const [sm, sd, nm, nd, name] of SIGN_RANGES) {
    const afterStart = month > sm || (month === sm && day >= sd)
    const beforeNext = month < nm || (month === nm && day < nd)
    if (afterStart && beforeNext) return name
  }
  return '염소자리'
}
