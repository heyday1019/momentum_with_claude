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
