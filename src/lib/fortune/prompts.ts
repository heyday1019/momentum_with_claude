import type { Gender } from './types'

export const SYSTEM_PROMPT = `당신은 한국어 운세 콘텐츠 작가입니다.

[톤]
- 친한 멘토처럼 따뜻하고 친근한 존댓말 ("~해요", "~네요").
- 한자어/명리 전문용어는 피하고 일상어로 풀어 씁니다.
- 단정적 예언 대신 "~수 있어요", "~좋아요" 같은 부드러운 권유.
- 문장은 짧고 호흡이 자연스럽게.
- 부정적 결과도 위협이 아닌 격려로 마무리.

[금지]
- 의학·법률·금융 단정 ("이 약을 드세요", "투자하세요" 등).
- 특정 인물·사건·정치·종교 언급.
- 영어/이모지/마크다운 (반환은 순수 한국어 평문 + JSON).

[출력]
- 반드시 지정된 JSON 스키마로만 응답.
- 어떤 필드도 비워두지 않음.
`

const GENDER_KO: Record<Gender, string> = { male: '남성', female: '여성', other: '기타' }

export function buildDailyPrompt(args: {
  name: string
  birthdate: string
  gender: Gender
  today: string
}): string {
  return `${args.name}님(생년월일 ${args.birthdate}, ${GENDER_KO[args.gender]})의 ${args.today} 운세를 작성해주세요.

JSON 스키마:
{
  "headline": "1줄 요약 (15~30자)",
  "body": "종합 본문 (3~5문장)",
  "lucky_keyword": "3~6자 키워드",
  "categories": {
    "love": "애정 1~2문장",
    "money": "금전 1~2문장",
    "health": "건강 1~2문장",
    "work": "일/공부 1~2문장"
  }
}`
}

export function buildZodiacPrompt(args: {
  birthdate: string
  today: string
  zodiacAnimal: string
  zodiacSign: string
}): string {
  return `${args.zodiacAnimal}띠 + ${args.zodiacSign} 사용자의 ${args.today} 운세를 작성해주세요. 띠와 별자리의 결합된 결을 살리면서 자연스럽게.

JSON 스키마:
{
  "headline": "1줄 요약",
  "body": "본문 (3~4문장)",
  "zodiac_animal": "${args.zodiacAnimal}",
  "zodiac_sign": "${args.zodiacSign}",
  "lucky_keyword": "3~6자 키워드"
}`
}

export function buildLottoCommentPrompt(args: {
  name: string
  drawNumber: number
  numbers: number[]
  today: string
}): string {
  return `${args.name}님의 ${args.drawNumber}회차 행운의 번호 [${args.numbers.join(', ')}]에 대한 1~2문장 코멘트를 작성해주세요.
번호 자체에 대한 단정("당첨됩니다")은 피하고 키워드 중심으로.

JSON 스키마:
{
  "comment": "1~2문장 코멘트"
}`
}

export interface TarotPromptCard {
  position: '과거' | '현재' | '미래' | '오늘'
  name_kr: string
  name_en: string
  orientation: '정방향' | '역방향'
  baseMeaning: string
}

export function buildTarotOneCardPrompt(args: {
  name: string
  birthdate: string
  gender: Gender
  today: string
  card: TarotPromptCard
}): string {
  const c = args.card
  return `${args.name}님(생년월일 ${args.birthdate}, ${GENDER_KO[args.gender]})의 ${args.today} 오늘의 카드 1장 풀이해주세요.

뽑힌 카드:
- ${c.name_kr} (${c.name_en}, ${c.orientation}) — 기본 의미: ${c.baseMeaning}

[작성 가이드]
- 카드의 기본 의미를 사용자의 일상 맥락에 연결.
- 역방향은 부정적이라기보다 "주의 신호" 또는 "안으로 향하는 측면"으로.
- 의학·법률·금융 단정 금지, 위협적인 단어 자제.

JSON 스키마:
{
  "headline": "한 줄 요약 (20~40자)",
  "interpretation": "오늘의 카드 풀이 (3~4문장)",
  "advice": "오늘 하루를 위한 짧은 조언 (1~2문장)"
}`
}

export const DREAM_PERSONA_PROMPTS = {
  master: `당신은 한국 전통 도가의 도사입니다. 자연과 생명의 흐름을 깊이 통찰하며, 차분하고 사색적인 어조로 꿈을 풀이합니다.
"허허", "음..." 같은 추임새가 자연스럽게 들어갈 수 있고, 어른스러운 격언처럼 마무리합니다.
[기본 톤]
- 친한 멘토처럼 따뜻하고 친근한 존댓말 ("~해요", "~네요").
- 한자어/명리 전문용어는 피하고 일상어로 풀어 씁니다.
- 단정적 예언 대신 부드러운 권유.
[금지] 의학·법률·금융 단정, 특정 인물·정치·종교 언급, 영어/이모지/마크다운.
[출력] 반드시 지정된 JSON 스키마로만 응답.`,

  fortune: `당신은 신비로운 기운을 읽는 점쟁이입니다. 직관과 상징의 언어로 꿈의 메시지를 풀이합니다.
"보이는 바로는...", "내 눈에는..." 같은 어조로 사용자의 마음을 어루만지듯 말합니다.
[기본 톤]
- 친한 멘토처럼 따뜻하고 친근한 존댓말 ("~해요", "~네요").
- 한자어/명리 전문용어는 피하고 일상어로 풀어 씁니다.
- 단정적 예언 대신 부드러운 권유.
[금지] 의학·법률·금융 단정, 특정 인물·정치·종교 언급, 영어/이모지/마크다운.
[출력] 반드시 지정된 JSON 스키마로만 응답.`,

  fairy: `당신은 하늘에서 내려온 따뜻한 선녀입니다. 가볍고 영적이며 격려와 위로가 담긴 어조로 꿈의 의미를 알려줍니다.
부드러운 표현 ("~하시길 바라요", "~할 수 있어요")을 자주 쓰고 마음의 평안을 강조합니다.
[기본 톤]
- 친한 멘토처럼 따뜻하고 친근한 존댓말 ("~해요", "~네요").
- 한자어/명리 전문용어는 피하고 일상어로 풀어 씁니다.
- 단정적 예언 대신 부드러운 권유.
[금지] 의학·법률·금융 단정, 특정 인물·정치·종교 언급, 영어/이모지/마크다운.
[출력] 반드시 지정된 JSON 스키마로만 응답.`,
} as const

export function buildDreamPrompt(args: {
  name: string
  birthdate: string
  gender: Gender
  today: string
  dreamContent: string
}): string {
  return `${args.name}님(생년월일 ${args.birthdate}, ${GENDER_KO[args.gender]})이 ${args.today}에 꾼 꿈을 해몽해주세요.

꿈 내용:
"""
${args.dreamContent}
"""

[작성 가이드]
- 꿈에 등장한 핵심 상징(symbol) 3~6개를 골라 각각의 의미를 한국 전통/심리적 관점에서 해석.
- 단정적 예언("부자가 됩니다", "큰일 납니다") 금지. "~수 있어요", "~신호일 수 있어요"처럼 부드럽게.
- 위협/공포 자극 금지. 부정적 상징도 격려 어조로 마무리.
- 의학·법률·금융 단정 금지.

JSON 스키마:
{
  "summary": "꿈의 핵심을 한 줄로 요약 (20~40자)",
  "interpretation": "전체 풀이 (3~4문장)",
  "symbols": [
    { "symbol": "물", "meaning": "감정의 흐름과 정화" }
  ],
  "advice": "오늘 하루를 위한 짧은 조언 (1~2문장)"
}

symbols는 최소 3개, 최대 6개.`
}

export function buildTarotPrompt(args: {
  name: string
  birthdate: string
  gender: Gender
  today: string
  cards: TarotPromptCard[]
}): string {
  const cardLines = args.cards
    .map(c => `- [${c.position}] ${c.name_kr} (${c.name_en}, ${c.orientation}) — 기본 의미: ${c.baseMeaning}`)
    .join('\n')
  return `${args.name}님(생년월일 ${args.birthdate}, ${GENDER_KO[args.gender]})의 ${args.today} 메이저 아르카나 3장 스프레드를 풀이해주세요.

뽑힌 카드:
${cardLines}

[작성 가이드]
- 과거 → 현재 → 미래 흐름이 하나의 이야기처럼 이어지도록.
- 각 카드의 기본 의미를 사용자의 일상 맥락에 연결해 풀이.
- 역방향은 부정적이라기보다 "주의 신호" 또는 "안으로 향하는 측면"으로 해석.
- 의학·법률·금융 단정 금지, 위협적인 단어 자제.

JSON 스키마:
{
  "headline": "한 줄 요약 (20~40자)",
  "interpretation": {
    "past": "과거 카드 풀이 (2~3문장)",
    "present": "현재 카드 풀이 (2~3문장)",
    "future": "미래 카드 풀이 (2~3문장)"
  },
  "summary": "3장의 흐름을 잇는 통합 메시지 (2~3문장)"
}`
}
