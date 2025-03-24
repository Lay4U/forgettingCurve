# 기억의 곡선 (Forgetting Curve App)

에빙하우스의 망각 곡선 이론을 활용한 학습 관리 애플리케이션입니다. 학습한 내용에 대해 최적의 복습 일정을 자동으로 계산하고 관리할 수 있습니다.

## 주요 기능

- **자동 복습 일정 생성**: 학습 내용 등록 시 망각 곡선 기반으로 복습 일정 자동 생성
- **개인화된 복습 알고리즘**: 사용자의 복습 결과에 따라 복습 주기 자동 조정
- **학습 내용 관리**: 과목별, 태그별로 학습 내용 분류 및 검색
- **진행도 대시보드**: 학습 및 복습 현황을 한눈에 파악
- **데이터 시각화**: 망각 곡선 그래프와 학습 통계 제공

## 기술 스택

- **프론트엔드**: Svelte/SvelteKit, Tailwind CSS
- **백엔드**: Firebase (Authentication, Firestore, Cloud Functions)
- **배포**: Vercel 또는 Firebase Hosting

## 개발 환경 설정

### 필수 요구사항

- Node.js (v14 이상)
- npm 또는 yarn
- Firebase 계정

### 설치 및 실행

```bash
# 프로젝트 클론
git clone https://github.com/yourusername/forgetting-curve-app.git
cd forgetting-curve-app

# 의존성 설치
npm install

# 개발 서버 실행
npm run dev

# 빌드
npm run build
```

### 환경 변수 설정

`.env` 파일을 생성하고 Firebase 설정을 추가하세요:

```
PUBLIC_FIREBASE_API_KEY=your_api_key
PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
PUBLIC_FIREBASE_PROJECT_ID=your_project_id
PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
PUBLIC_FIREBASE_APP_ID=your_app_id
PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id
```

## 프로젝트 구조

```
src/
├── app.css               # 글로벌 스타일
├── app.html              # HTML 템플릿
├── lib/                  # 유틸리티 및 공유 코드
│   ├── components/       # 재사용 컴포넌트
│   ├── firebase.js       # Firebase 설정
│   ├── stores/           # Svelte 스토어
│   ├── services/         # 비즈니스 로직
│   └── utils/            # 유틸리티 함수 (망각 곡선 알고리즘 등)
└── routes/               # 페이지 라우트
    ├── auth/             # 인증 관련 페이지
    ├── study/            # 학습 자료 관리
    ├── review/           # 복습 페이지
    └── profile/          # 사용자 프로필
```

## 개발 로드맵

### 1단계: 기본 기능 구현
- 기본 인증 시스템
- 학습 내용 등록/관리
- 기본 복습 일정 생성

### 2단계: 핵심 기능 확장
- 개인화된 복습 알고리즘
- 데이터 시각화
- 복습 완료 체크 및 평가

### 3단계: 고급 기능
- 공유 및 협업 기능
- 게이미피케이션 요소
- 프로그레시브 웹 앱(PWA) 지원
- 다국어 지원

## 기여 방법

1. 이 저장소를 포크합니다.
2. 새 브랜치를 생성합니다: `git checkout -b feature/amazing-feature`
3. 변경 사항을 커밋합니다: `git commit -m 'Add some amazing feature'`
4. 브랜치에 푸시합니다: `git push origin feature/amazing-feature`
5. 풀 리퀘스트를 제출합니다.

## 라이센스

MIT 라이센스를 따릅니다. 자세한 내용은 [LICENSE](LICENSE) 파일을 참조하세요.

## 연락처

프로젝트 관리자: [이메일 주소](mailto:your-email@example.com)

---

**기억의 곡선** - 효율적인 학습을 위한 최적의 복습 시스템 