import type { Metadata } from "next";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://momentum-with-claude.vercel.app";

export type LandingSlug = "fortune" | "tarot" | "dream" | "lotto";

export type LandingFeature = { title: string; body: string };
export type LandingFaq = { q: string; a: string };

export type LandingContent = {
  slug: LandingSlug;
  category: string;
  title: string;
  lead: string;
  metaTitle: string;
  metaDescription: string;
  primaryCta: { href: string; label: string };
  secondaryCta?: { href: string; label: string };
  features: LandingFeature[];
  example: { heading: string; body: string };
  faqs: LandingFaq[];
  serviceType: string;
};

export const LANDINGS: Record<LandingSlug, LandingContent> = {
  fortune: {
    slug: "fortune",
    category: "오늘의 운세",
    title: "오늘의 운세 — 매일 자정 도착하는 한 줄의 인사이트",
    lead:
      "이름과 생년월일을 바탕으로 매일 자정 새로 도착하는 따뜻한 운세. 친한 멘토가 옆에서 짚어주듯, 가볍게 들여다보세요.",
    metaTitle: "오늘의 운세 · 매일 자정 갱신",
    metaDescription:
      "Momentum의 오늘의 운세는 이름과 생년월일을 바탕으로 매일 자정 새로 도착하는 한국형 AI 운세입니다. 띠 · 별자리 운세와 로또 번호 추천을 한 곳에서 만나보세요.",
    primaryCta: { href: "/login", label: "지금 시작하기" },
    features: [
      {
        title: "매일 자정 자동 갱신",
        body: "0시 정각에 새 카드가 도착해요. 아침에 열어보면 오늘의 한 줄이 기다리고 있어요.",
      },
      {
        title: "3종 운세 카드",
        body: "오늘의 운세, 띠 운세, 별자리 운세를 한 화면에서 가볍게 둘러볼 수 있어요.",
      },
      {
        title: "따뜻한 멘토 톤",
        body: "단정하지 않아요. 미신적 표현 대신 오늘 하루를 짚어주는 한 문장으로 다가갑니다.",
      },
      {
        title: "행운의 로또 번호",
        body: "오늘의 흐름에 맞춘 5조합을 함께 골라드려요. 가볍게 한번 시도해보세요.",
      },
    ],
    example: {
      heading: "이런 식으로 도착해요",
      body: "오늘의 키워드는 ‘균형’. 새로운 제안 앞에서 발을 빼지 않되, 과한 야망은 잠시 내려놓아도 좋은 날이에요. 누군가와 짧은 대화 한 통이 의외의 실마리를 만들어 줄 거예요.",
    },
    faqs: [
      {
        q: "운세는 언제 갱신되나요?",
        a: "한국 표준시(KST) 기준 매일 자정 0시 정각에 새 카드로 갱신됩니다. 같은 날 다시 열어봐도 카드는 그대로예요.",
      },
      {
        q: "이름과 생년월일은 왜 필요해요?",
        a: "오늘의 운세 카드를 사용자에 맞춰 짚어주기 위해 사용됩니다. 광고 추적이나 외부 제공에는 쓰이지 않아요.",
      },
      {
        q: "무료로 시작할 수 있나요?",
        a: "회원가입 시 기본 크레딧이 지급되어 일정 횟수 무료로 운세를 확인할 수 있어요. 더 보고 싶다면 크레딧을 충전하실 수 있습니다.",
      },
    ],
    serviceType: "DailyHoroscopeService",
  },

  tarot: {
    slug: "tarot",
    category: "타로 리딩",
    title: "타로 3장 리딩 — 과거 · 현재 · 미래의 흐름",
    lead:
      "마음 속에 질문 하나를 떠올리고 카드 세 장을 뽑으면, 흐름을 차분히 풀어드립니다. 78장 풀덱을 활용한 AI 타로 리딩.",
    metaTitle: "타로 3장 리딩 · 과거 현재 미래",
    metaDescription:
      "Momentum 타로 리딩은 78장 메이저·마이너 아르카나를 모두 활용한 한국어 AI 타로입니다. 과거 · 현재 · 미래 3장 또는 1장 모드로 흐름을 풀어드려요.",
    primaryCta: { href: "/login", label: "타로 한번 뽑아보기" },
    features: [
      {
        title: "78장 풀덱",
        body: "메이저 22장, 마이너 56장 — 정통 타로 덱을 그대로 사용합니다.",
      },
      {
        title: "과거 · 현재 · 미래 3장",
        body: "한 질문을 시간의 흐름으로 풀어내는 가장 클래식한 스프레드.",
      },
      {
        title: "1장 모드",
        body: "짧은 질문에는 한 장이면 충분해요. 오늘의 카드처럼 가볍게.",
      },
      {
        title: "카드별 의미 해석",
        body: "정·역방향까지 짚어 카드가 말하는 결을 차분히 옮겨드립니다.",
      },
    ],
    example: {
      heading: "이렇게 풀려요",
      body: "첫 카드 ‘별’ — 다시 차오르는 희망. 두 번째 카드 ‘바보’ — 지금 새로운 한 걸음. 세 번째 카드 ‘세계’ — 마무리에서 오는 통합. 흐름은 미루지 말되, 가볍게 한 발 디뎌도 좋은 결을 가리키고 있어요.",
    },
    faqs: [
      {
        q: "타로 결과는 정확한가요?",
        a: "타로는 결정을 대신해주지 않아요. Momentum은 오늘의 흐름을 짚어주는 도구로 결과를 활용해주시길 안내합니다.",
      },
      {
        q: "한 번에 몇 장 뽑나요?",
        a: "기본은 3장(과거·현재·미래)이며, 한 장 모드도 선택할 수 있어요.",
      },
      {
        q: "같은 질문을 다시 해도 되나요?",
        a: "가능하지만 같은 날 반복해서 같은 질문을 던지면 메시지가 흐려질 수 있어요. 하루 정도 두고 다시 보는 걸 권합니다.",
      },
    ],
    serviceType: "TarotReadingService",
  },

  dream: {
    slug: "dream",
    category: "꿈 해몽",
    title: "꿈 해몽 — 어젯밤 꿈의 상징을 차분히 풀어드려요",
    lead:
      "꿈을 적어 보내면 등장 인물·장소·감정·상징을 짚어 흐름을 풀어드립니다. 일기로 모아 패턴을 들여다볼 수도 있어요.",
    metaTitle: "꿈 해몽 · AI 상징 풀이",
    metaDescription:
      "Momentum 꿈 해몽은 어젯밤 꿈의 인물·장소·감정·상징을 AI가 한국어로 풀어주는 서비스입니다. 꿈 일기로 모아 자기 패턴을 들여다볼 수도 있어요.",
    primaryCta: { href: "/login", label: "꿈 풀이 받아보기" },
    features: [
      {
        title: "상징 분석",
        body: "물 · 동물 · 사람 · 장소 등 자주 등장하는 상징을 짚어 풀어드려요.",
      },
      {
        title: "감정의 흐름",
        body: "꿈 속 감정의 결을 따라가며 깨어난 뒤의 마음과 연결합니다.",
      },
      {
        title: "꿈 일기 저장",
        body: "풀이를 일기로 모아 시간이 지난 뒤 패턴을 다시 들여다볼 수 있어요.",
      },
      {
        title: "AI 한국어 해석",
        body: "전통 해몽 데이터와 현대 심리 해석을 함께 참고해 따뜻한 톤으로 옮깁니다.",
      },
    ],
    example: {
      heading: "예시 풀이",
      body: "맑은 물에 발을 담그는 꿈은 종종 감정의 정리와 연결돼요. 멈춰 있던 마음이 다시 흘러가도 좋다는 신호일 수 있어요. 만약 누군가가 함께 있었다면, 그 사람과의 관계에서 풀어줄 매듭이 하나 남아 있을지도 몰라요.",
    },
    faqs: [
      {
        q: "어떤 꿈도 풀이가 되나요?",
        a: "내용이 흐릿하거나 짧아도 괜찮아요. 기억나는 키워드 몇 개만 적어주셔도 풀이를 시도합니다.",
      },
      {
        q: "같은 꿈을 자주 꿔요. 의미가 있을까요?",
        a: "반복되는 꿈은 풀리지 않은 감정이나 미뤄둔 결정을 가리키는 경우가 많아요. 꿈 일기로 모아 비교해 보세요.",
      },
      {
        q: "꿈 일기는 어디서 볼 수 있나요?",
        a: "로그인 후 꿈 페이지에서 ‘꿈 일기 보기’로 들어가면 지난 풀이를 한눈에 모아볼 수 있어요.",
      },
    ],
    serviceType: "DreamInterpretationService",
  },

  lotto: {
    slug: "lotto",
    category: "행운의 로또 번호",
    title: "행운의 로또 번호 — 오늘의 흐름에 맞춘 5조합",
    lead:
      "오늘의 사주와 운세 흐름을 반영해 행운의 번호 5조합을 골라드려요. 가볍게 한번 시도해 보세요.",
    metaTitle: "행운의 로또 번호 · 매일 추천 5조합",
    metaDescription:
      "Momentum의 행운의 로또 번호는 오늘의 사주·운세 흐름을 반영해 5조합을 매일 새로 추천합니다. 회차별 당첨 패턴이 아닌, 오늘의 결에 맞춘 가벼운 도구.",
    primaryCta: { href: "/login", label: "오늘의 번호 받기" },
    features: [
      {
        title: "매일 5조합",
        body: "그날의 흐름에 맞춰 자동으로 5조합이 채워집니다. 매일 새롭게요.",
      },
      {
        title: "보너스 번호 포함",
        body: "본 번호 6개와 함께 보너스 번호 후보도 함께 골라드립니다.",
      },
      {
        title: "오늘의 흐름 반영",
        body: "사주·요일·계절의 결을 반영해 단순 난수와는 다른 결을 만들어요.",
      },
      {
        title: "기록 보관",
        body: "지난 추천 조합을 다시 돌아볼 수 있어, 가벼운 재미로 모아볼 수 있어요.",
      },
    ],
    example: {
      heading: "오늘의 추천 예시",
      body: "조합 1 — 3, 11, 22, 27, 33, 41 (보너스 17). 조합 2 — 5, 9, 14, 19, 28, 36 (보너스 11). 매일 새로 갱신되니, 마음에 드는 조합을 골라 가볍게 한번 시도해보세요.",
    },
    faqs: [
      {
        q: "어떻게 번호가 골라지나요?",
        a: "사용자의 사주 · 요일 · 오늘의 운세 키워드를 시드로 사용해 5조합을 자동 생성합니다. 통계적 당첨 예측이 아니라 ‘오늘의 결’에 맞춘 가벼운 추천이에요.",
      },
      {
        q: "매일 바뀌나요?",
        a: "네, 한국 표준시 0시에 새 조합으로 갱신됩니다.",
      },
      {
        q: "당첨을 보장하나요?",
        a: "보장하지 않아요. 운에 의존하는 게임에는 정해진 정답이 없습니다. 가벼운 마음으로 즐겨주세요.",
      },
    ],
    serviceType: "LottoNumberSuggestionService",
  },
};

export function buildLandingMetadata(slug: LandingSlug): Metadata {
  const c = LANDINGS[slug];
  return {
    title: c.metaTitle,
    description: c.metaDescription,
    alternates: { canonical: `/${slug}` },
    openGraph: {
      title: `${c.metaTitle} · Momentum`,
      description: c.metaDescription,
      url: `/${slug}`,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `${c.metaTitle} · Momentum`,
      description: c.metaDescription,
    },
  };
}

export function buildServiceSchema(slug: LandingSlug) {
  const c = LANDINGS[slug];
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: c.metaTitle,
    serviceType: c.serviceType,
    description: c.metaDescription,
    provider: {
      "@type": "Organization",
      name: "Momentum",
      url: SITE_URL,
    },
    areaServed: { "@type": "Country", name: "대한민국" },
    url: `${SITE_URL}/${slug}`,
    inLanguage: "ko-KR",
  };
}

export function buildFaqSchema(slug: LandingSlug) {
  const c = LANDINGS[slug];
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: c.faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
}

export function buildBreadcrumbSchema(slug: LandingSlug) {
  const c = LANDINGS[slug];
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Momentum", item: SITE_URL },
      {
        "@type": "ListItem",
        position: 2,
        name: c.category,
        item: `${SITE_URL}/${slug}`,
      },
    ],
  };
}
