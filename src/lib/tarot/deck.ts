import type { TarotCard } from './types'

/** Major Arcana 22장 (id 0..21) */
export const MAJOR_ARCANA: readonly TarotCard[] = [
  { id: 0,  name_kr: '바보',         name_en: 'The Fool',          upright: '새로운 시작과 순수한 도약',     reversed: '무모함과 준비 부족' },
  { id: 1,  name_kr: '마법사',       name_en: 'The Magician',      upright: '의지와 창조, 가능성의 발현',    reversed: '미숙한 시도와 현혹' },
  { id: 2,  name_kr: '여사제',       name_en: 'The High Priestess',upright: '직관과 내면의 지혜',           reversed: '비밀의 누설, 직관 외면' },
  { id: 3,  name_kr: '여황제',       name_en: 'The Empress',       upright: '풍요와 창조적 사랑',           reversed: '정체된 풍요와 의존' },
  { id: 4,  name_kr: '황제',         name_en: 'The Emperor',       upright: '권위와 안정, 단단한 통제력',    reversed: '경직된 통제와 폭압' },
  { id: 5,  name_kr: '교황',         name_en: 'The Hierophant',    upright: '전통과 정신적 가르침',          reversed: '맹목적 순응의 함정' },
  { id: 6,  name_kr: '연인',         name_en: 'The Lovers',        upright: '사랑과 조화로운 결합, 선택',    reversed: '부조화와 잘못된 선택' },
  { id: 7,  name_kr: '전차',         name_en: 'The Chariot',       upright: '의지로 이루는 추진과 승리',     reversed: '통제 상실과 방향 흐림' },
  { id: 8,  name_kr: '힘',           name_en: 'Strength',          upright: '내면의 용기와 부드러운 통제',   reversed: '자기 의심과 욕망의 폭주' },
  { id: 9,  name_kr: '은둔자',       name_en: 'The Hermit',        upright: '고독한 성찰과 내면의 빛',       reversed: '고립과 닫힌 마음' },
  { id: 10, name_kr: '운명의 수레바퀴', name_en: 'Wheel of Fortune', upright: '운명의 흐름과 전환점',         reversed: '불운한 흐름과 저항' },
  { id: 11, name_kr: '정의',         name_en: 'Justice',           upright: '균형과 진실, 인과의 결과',     reversed: '편향과 책임 회피' },
  { id: 12, name_kr: '매달린 사람',  name_en: 'The Hanged Man',    upright: '시각의 전환과 헌신적 멈춤',     reversed: '헛된 희생과 정체' },
  { id: 13, name_kr: '죽음',         name_en: 'Death',             upright: '끝맺음과 변형의 시작',          reversed: '변화의 거부와 매달림' },
  { id: 14, name_kr: '절제',         name_en: 'Temperance',        upright: '조화와 인내의 연금술',          reversed: '과잉과 불균형, 인내 소진' },
  { id: 15, name_kr: '악마',         name_en: 'The Devil',         upright: '속박과 어두운 욕망의 응시',     reversed: '속박에서의 이탈 시도' },
  { id: 16, name_kr: '탑',           name_en: 'The Tower',         upright: '갑작스러운 붕괴와 깨달음',     reversed: '점진적 균열과 회피' },
  { id: 17, name_kr: '별',           name_en: 'The Star',          upright: '희망과 치유, 영감의 빛',       reversed: '회의와 영감의 고갈' },
  { id: 18, name_kr: '달',           name_en: 'The Moon',          upright: '환상과 무의식 속 진실',         reversed: '자기 기만과 두려움의 그림자' },
  { id: 19, name_kr: '태양',         name_en: 'The Sun',           upright: '기쁨과 활력, 명료한 성취',     reversed: '흐려진 기쁨과 일시적 활력' },
  { id: 20, name_kr: '심판',         name_en: 'Judgement',         upright: '부활과 각성의 부름',            reversed: '자책과 부름의 외면' },
  { id: 21, name_kr: '세계',         name_en: 'The World',         upright: '완성과 충만한 도달',            reversed: '미완의 여정, 새로운 사이클' },
] as const

export const MAJOR_ARCANA_BY_ID: Record<number, TarotCard> = Object.fromEntries(
  MAJOR_ARCANA.map(c => [c.id, c])
)
