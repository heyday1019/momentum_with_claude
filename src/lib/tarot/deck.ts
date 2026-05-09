import type { TarotCard, Suit } from './types'

/** Major Arcana 22장 (id 0..21, suit='major', rank=id) */
const MAJOR: TarotCard[] = [
  { id: 0,  rank: 0,  suit: 'major', name_kr: '바보',         name_en: 'The Fool',          upright: '새로운 시작과 순수한 도약',     reversed: '무모함과 준비 부족' },
  { id: 1,  rank: 1,  suit: 'major', name_kr: '마법사',       name_en: 'The Magician',      upright: '의지와 창조, 가능성의 발현',    reversed: '미숙한 시도와 현혹' },
  { id: 2,  rank: 2,  suit: 'major', name_kr: '여사제',       name_en: 'The High Priestess',upright: '직관과 내면의 지혜',           reversed: '비밀의 누설, 직관 외면' },
  { id: 3,  rank: 3,  suit: 'major', name_kr: '여황제',       name_en: 'The Empress',       upright: '풍요와 창조적 사랑',           reversed: '정체된 풍요와 의존' },
  { id: 4,  rank: 4,  suit: 'major', name_kr: '황제',         name_en: 'The Emperor',       upright: '권위와 안정, 단단한 통제력',    reversed: '경직된 통제와 폭압' },
  { id: 5,  rank: 5,  suit: 'major', name_kr: '교황',         name_en: 'The Hierophant',    upright: '전통과 정신적 가르침',          reversed: '맹목적 순응의 함정' },
  { id: 6,  rank: 6,  suit: 'major', name_kr: '연인',         name_en: 'The Lovers',        upright: '사랑과 조화로운 결합, 선택',    reversed: '부조화와 잘못된 선택' },
  { id: 7,  rank: 7,  suit: 'major', name_kr: '전차',         name_en: 'The Chariot',       upright: '의지로 이루는 추진과 승리',     reversed: '통제 상실과 방향 흐림' },
  { id: 8,  rank: 8,  suit: 'major', name_kr: '힘',           name_en: 'Strength',          upright: '내면의 용기와 부드러운 통제',   reversed: '자기 의심과 욕망의 폭주' },
  { id: 9,  rank: 9,  suit: 'major', name_kr: '은둔자',       name_en: 'The Hermit',        upright: '고독한 성찰과 내면의 빛',       reversed: '고립과 닫힌 마음' },
  { id: 10, rank: 10, suit: 'major', name_kr: '운명의 수레바퀴', name_en: 'Wheel of Fortune', upright: '운명의 흐름과 전환점',         reversed: '불운한 흐름과 저항' },
  { id: 11, rank: 11, suit: 'major', name_kr: '정의',         name_en: 'Justice',           upright: '균형과 진실, 인과의 결과',     reversed: '편향과 책임 회피' },
  { id: 12, rank: 12, suit: 'major', name_kr: '매달린 사람',  name_en: 'The Hanged Man',    upright: '시각의 전환과 헌신적 멈춤',     reversed: '헛된 희생과 정체' },
  { id: 13, rank: 13, suit: 'major', name_kr: '죽음',         name_en: 'Death',             upright: '끝맺음과 변형의 시작',          reversed: '변화의 거부와 매달림' },
  { id: 14, rank: 14, suit: 'major', name_kr: '절제',         name_en: 'Temperance',        upright: '조화와 인내의 연금술',          reversed: '과잉과 불균형, 인내 소진' },
  { id: 15, rank: 15, suit: 'major', name_kr: '악마',         name_en: 'The Devil',         upright: '속박과 어두운 욕망의 응시',     reversed: '속박에서의 이탈 시도' },
  { id: 16, rank: 16, suit: 'major', name_kr: '탑',           name_en: 'The Tower',         upright: '갑작스러운 붕괴와 깨달음',     reversed: '점진적 균열과 회피' },
  { id: 17, rank: 17, suit: 'major', name_kr: '별',           name_en: 'The Star',          upright: '희망과 치유, 영감의 빛',       reversed: '회의와 영감의 고갈' },
  { id: 18, rank: 18, suit: 'major', name_kr: '달',           name_en: 'The Moon',          upright: '환상과 무의식 속 진실',         reversed: '자기 기만과 두려움의 그림자' },
  { id: 19, rank: 19, suit: 'major', name_kr: '태양',         name_en: 'The Sun',           upright: '기쁨과 활력, 명료한 성취',     reversed: '흐려진 기쁨과 일시적 활력' },
  { id: 20, rank: 20, suit: 'major', name_kr: '심판',         name_en: 'Judgement',         upright: '부활과 각성의 부름',            reversed: '자책과 부름의 외면' },
  { id: 21, rank: 21, suit: 'major', name_kr: '세계',         name_en: 'The World',         upright: '완성과 충만한 도달',            reversed: '미완의 여정, 새로운 사이클' },
]

/** 마이너 슈트별 키워드 (rank 1..14, 14=King). [upright, reversed] */
const WANDS: Array<[string, string]> = [
  ['새로운 영감, 시작의 불꽃',         '지연된 영감과 헛된 열정'],
  ['미래의 결정과 시야 확장',           '불확실한 선택과 두려움'],
  ['계획의 항해와 협력',                '좌절된 계획과 고립'],
  ['축하와 안정, 가정의 기쁨',          '미진한 기쁨과 갈등의 씨앗'],
  ['경쟁과 충돌, 살아있는 토론',        '회피된 갈등과 협상의 시작'],
  ['승리와 인정, 환영',                 '자만과 과시'],
  ['방어와 도전 앞에 서기',             '압도와 굴복'],
  ['빠른 추진과 속도의 흐름',           '정체와 지연'],
  ['끈기와 회복력의 마지막 한 걸음',    '소진과 피해의식'],
  ['책임의 무게를 짊어짐',              '내려놓음과 분담'],
  ['새로운 메시지와 호기심',            '변덕과 미숙'],
  ['모험과 충동의 질주',                '무모함과 폭주'],
  ['카리스마와 따뜻한 리더십',          '질투와 통제 욕구'],
  ['비전과 추진력의 정점',              '폭군과 독선'],
]

const CUPS: Array<[string, string]> = [
  ['사랑의 시작과 감정의 충만',         '막힌 감정과 공허'],
  ['연결과 결합, 마음의 합',            '부조화와 단절'],
  ['우정과 함께하는 축제',              '과음과 가십'],
  ['권태와 무관심',                     '새 기회의 인식'],
  ['후회와 상실의 그림자',              '회복과 용서'],
  ['추억과 향수의 따뜻함',              '과거에 갇힘'],
  ['환상과 선택의 기로',                '명료해진 결정'],
  ['떠남과 더 깊은 의미 탐색',          '머무름의 두려움'],
  ['만족과 충족의 한 잔',                '자만과 표면적 행복'],
  ['가족의 행복과 조화로운 마무리',      '깨진 기대'],
  ['감성의 영감과 호기심',              '미숙한 감정'],
  ['낭만과 따뜻한 제안',                '변덕과 환상'],
  ['공감과 직관의 흐름',                '의존과 감정 휘말림'],
  ['감정의 균형과 외교',                '조작과 변덕'],
]

const SWORDS: Array<[string, string]> = [
  ['명료한 통찰과 진실의 검',           '혼란과 잘못된 판단'],
  ['교착과 결정의 회피',                '결단과 진실 직면'],
  ['슬픔과 상심의 자국',                '회복과 용서'],
  ['휴식과 회복의 시간',                '소진된 휴식'],
  ['갈등과 패배의 쓰라림',              '화해와 내려놓음'],
  ['떠남과 잔잔한 전환',                '거부된 변화'],
  ['회피와 계략',                       '들통난 계략'],
  ['속박된 사고에서의 멈춤',            '자유의 시도'],
  ['불안과 잠 못 이루는 밤',            '깨어남과 빛'],
  ['종결과 최저점, 새 사이클의 시작',   '회복의 첫 빛'],
  ['호기심과 진실 추구',                '비방과 험담'],
  ['돌진하는 사고와 결단',              '폭주와 무모함'],
  ['명료와 독립의 카리스마',            '냉정과 비판'],
  ['권위와 논리의 정점',                '권위주의와 차가움'],
]

const PENTACLES: Array<[string, string]> = [
  ['풍요의 씨앗과 기회',                '기회 놓침과 욕심'],
  ['균형의 곡예',                       '불균형과 산만'],
  ['협력과 숙련된 작업',                '미진한 작업과 불협'],
  ['안정과 보존, 가진 것의 지킴',       '인색과 집착'],
  ['결핍과 외로운 길',                  '회복의 빛이 비춤'],
  ['나눔과 균등의 손길',                '불평등과 갚음의 강요'],
  ['인내의 평가와 기다림',              '성급함과 조급'],
  ['정성과 숙련의 반복',                '게으름과 형식적 노력'],
  ['자급의 풍요와 독립',                '의존과 표면적 안락'],
  ['가문의 안정과 유산',                '가족 갈등과 단절'],
  ['학습과 호기심',                     '산만과 게으름'],
  ['책임감과 꾸준함의 발걸음',          '정체와 무기력'],
  ['보살핌과 따뜻한 풍요',              '무시와 자기 방치'],
  ['성공과 실질적 권위',                '보수적 탐욕'],
]

function rankNameKr(rank: number): string {
  if (rank === 1) return '에이스'
  if (rank >= 2 && rank <= 10) return String(rank)
  if (rank === 11) return '시종'
  if (rank === 12) return '기사'
  if (rank === 13) return '여왕'
  return '왕' // 14
}

function rankNameEn(rank: number): string {
  if (rank === 1) return 'Ace'
  if (rank === 2) return 'Two'
  if (rank === 3) return 'Three'
  if (rank === 4) return 'Four'
  if (rank === 5) return 'Five'
  if (rank === 6) return 'Six'
  if (rank === 7) return 'Seven'
  if (rank === 8) return 'Eight'
  if (rank === 9) return 'Nine'
  if (rank === 10) return 'Ten'
  if (rank === 11) return 'Page'
  if (rank === 12) return 'Knight'
  if (rank === 13) return 'Queen'
  return 'King' // 14
}

function suitNameKr(suit: Suit): string {
  if (suit === 'wands') return '완드'
  if (suit === 'cups') return '컵'
  if (suit === 'swords') return '소드'
  return '펜타클'
}

function suitNameEn(suit: Suit): string {
  if (suit === 'wands') return 'Wands'
  if (suit === 'cups') return 'Cups'
  if (suit === 'swords') return 'Swords'
  return 'Pentacles'
}

function buildMinorSuit(suit: Exclude<Suit, 'major'>, baseId: number, table: Array<[string, string]>): TarotCard[] {
  return table.map(([upright, reversed], i) => {
    const rank = i + 1
    return {
      id: baseId + i,
      rank,
      suit,
      name_kr: `${suitNameKr(suit)} ${rankNameKr(rank)}`,
      name_en: `${rankNameEn(rank)} of ${suitNameEn(suit)}`,
      upright,
      reversed,
    }
  })
}

const WANDS_CARDS = buildMinorSuit('wands', 22, WANDS)
const CUPS_CARDS = buildMinorSuit('cups', 36, CUPS)
const SWORDS_CARDS = buildMinorSuit('swords', 50, SWORDS)
const PENTACLES_CARDS = buildMinorSuit('pentacles', 64, PENTACLES)

/** 메이저 22장 + 마이너 56장 = 78장 */
export const FULL_DECK: readonly TarotCard[] = [
  ...MAJOR,
  ...WANDS_CARDS,
  ...CUPS_CARDS,
  ...SWORDS_CARDS,
  ...PENTACLES_CARDS,
] as const

export const DECK_BY_ID: Record<number, TarotCard> = Object.fromEntries(
  FULL_DECK.map(c => [c.id, c])
)

const pad2 = (n: number) => String(n).padStart(2, '0')

/**
 * 카드의 이미지 경로. `public/tarot/<slug>.jpg`에 동일한 슬러그로 저장한다.
 *  - major: `major-00` … `major-21`
 *  - minor: `<suit>-01` … `<suit>-14` (rank=1=Ace, 14=King)
 */
export function tarotImageSlug(card: TarotCard): string {
  if (card.suit === 'major') return `major-${pad2(card.id)}`
  return `${card.suit}-${pad2(card.rank)}`
}

export function tarotImageSrc(card: TarotCard): string {
  return `/tarot/${tarotImageSlug(card)}.jpg`
}

/** 기존 호환 alias — 메이저 아르카나만 추출 */
export const MAJOR_ARCANA = MAJOR as readonly TarotCard[]
export const MAJOR_ARCANA_BY_ID: Record<number, TarotCard> = Object.fromEntries(
  MAJOR.map(c => [c.id, c])
)
