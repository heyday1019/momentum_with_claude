export class OpenRouterError extends Error {
  constructor(message: string, public status?: number) { super(message) }
}

export async function callFortuneModel<T>(opts: { userPrompt: string }): Promise<T> {
  if (opts.userPrompt.includes('회차') && opts.userPrompt.includes('행운의 번호')) {
    return { comment: '키워드는 "환한 길"이에요. 부드러운 시도가 잘 어울립니다.' } as T
  }
  if (opts.userPrompt.match(/[가-힣]+띠/)) {
    return {
      headline: '두 흐름이 맞물려 자존감이 차오르는 하루예요',
      body: '띠와 별자리의 기운이 자연스럽게 맞물려요. 무리하지 말고 평소의 결을 지켜주세요.',
      zodiac_animal: '돼지',
      zodiac_sign: '사자자리',
      lucky_keyword: '느긋함',
    } as T
  }
  return {
    headline: '사람과의 인연이 평소보다 따뜻하게 다가오는 하루예요',
    body: '오전엔 가벼운 대화에서 의외의 힌트가 나옵니다. 오후엔 미뤄두었던 메시지를 보내기 좋은 시점이에요. 저녁엔 작은 약속이 마음을 정리해주는 시간이 될 거예요.',
    lucky_keyword: '느린 대답',
    categories: {
      love: '다정함이 자연스럽게 새어 나오는 날이에요.',
      money: '큰 결정은 미루고, 작은 정리부터 시작해보세요.',
      health: '어깨를 한 번씩 풀어주세요. 잠은 평소보다 일찍 자는 게 좋아요.',
      work: '협업 자리에서 의외의 진척이 있어요. 메모를 챙겨두세요.',
    },
  } as T
}
