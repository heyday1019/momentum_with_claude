## 변경 요약
<!-- 무엇을 / 왜 -->

## 영향 범위
- [ ] DB 마이그레이션 포함 → `supabase/migrations/` 추가 파일 명시
- [ ] 환경변수 추가/변경 → 변수명과 환경(Production/Development) 명시
- [ ] 외부 서비스 설정 변경 (Polar/OAuth/Supabase Auth 등)
- [ ] 운영 사용자 데이터에 영향 (마이그레이션 destructive)

## 검증
- [ ] develop 환경에서 핵심 플로우 확인
- [ ] (마이그레이션 있으면) dev Supabase에 apply 완료 + SELECT 확인
- [ ] CI 통과 확인
- [ ] DESIGN.md 토큰/컴포넌트 준수
- [ ] CLAUDE.md 커밋·푸시 규칙 준수
