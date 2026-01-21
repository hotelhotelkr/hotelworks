# 🚀 Render 서비스 자동 수정 가이드

## 자동 수정 스크립트 실행

### 1단계: Render API 키 생성

1. https://dashboard.render.com/account/api-keys 접속
2. **Create API Key** 클릭
3. 키 이름 입력 (예: `hotelworks-fix`)
4. 생성된 키 복사

### 2단계: 스크립트 실행

PowerShell에서:

```powershell
# API 키 설정
$env:RENDER_API_KEY="your-api-key-here"

# 스크립트 실행
node fix-render-now.js
```

### 3단계: 배포 확인

스크립트가 자동으로:
- ✅ 서비스 설정 업데이트 (빌드/시작 명령어)
- ✅ 환경 변수 설정 (Supabase, SERVER_URL 등)
- ✅ PORT 환경 변수 제거 (Render가 자동 제공)
- ✅ 서비스 재배포 시작

배포 완료 후:
- `https://hotelworks-backend.onrender.com/health` 접속하여 확인

---

**API 키가 없으면 Render Dashboard에서 수동으로 설정하세요!** 📝
