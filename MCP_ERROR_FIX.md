# 🔧 Supabase MCP 오류 해결 가이드

## ⚠️ 오류 내용

```
Authorize API access
Failed to fetch details for API authorization request
Please retry your authorization request from the requesting app

Error: OAuth authorization request does not exist
```

## 📌 중요 사항

**MCP 서버는 Cursor IDE의 기능이며, 실제 애플리케이션과는 별개입니다.**

현재 HotelWorks 프로젝트는 **Supabase 클라이언트를 직접 코드에 통합**했으므로, **MCP 서버 없이도 정상 작동**합니다.

## ✅ 해결 방법

### 방법 1: MCP 서버 재설정 (권장)

1. **Cursor 설정 열기**
   - `Ctrl + ,` (설정)
   - 또는 `File` > `Preferences` > `Settings`

2. **MCP 서버 설정 확인**
   - 검색창에 "MCP" 입력
   - Supabase MCP 서버 설정 확인

3. **인증 재시도**
   - MCP 서버 설정에서 "Reconnect" 또는 "Reauthorize" 클릭
   - Supabase 로그인 후 인증 완료

### 방법 2: MCP 서버 비활성화 (간단)

MCP 서버가 필요하지 않다면 비활성화:

1. **Cursor 설정 열기**
2. **MCP 서버 목록에서 Supabase MCP 비활성화**
3. **재시작**

### 방법 3: 수동 설정 파일 수정

MCP 설정 파일 위치 (Windows):
```
%APPDATA%\Cursor\User\globalStorage\mcp-settings.json
```

또는:
```
C:\Users\[사용자명]\AppData\Roaming\Cursor\User\globalStorage\mcp-settings.json
```

설정 파일에서 Supabase MCP 서버 설정을 확인하고, 필요시 제거하거나 재설정하세요.

## 🎯 확인 사항

### 애플리케이션은 정상 작동합니다

현재 프로젝트는 다음 방식으로 Supabase에 연결됩니다:

- ✅ `database/db.js` - Supabase 클라이언트 직접 사용
- ✅ 환경 변수 또는 하드코딩된 키 사용
- ✅ MCP 서버 불필요

### 테스트 방법

```bash
# 서버 시작
npm run dev:all

# 연결 확인
# 브라우저에서 http://localhost:3001/health 접속
```

## 💡 참고

- **MCP 서버**: Cursor IDE의 AI 기능을 위한 것 (선택사항)
- **Supabase 클라이언트**: 실제 애플리케이션에서 사용 (필수, 이미 설정됨)

MCP 오류가 있어도 **애플리케이션은 정상 작동**합니다!

---

**결론**: MCP 서버는 Cursor의 편의 기능일 뿐이며, 실제 애플리케이션과는 무관합니다. 
현재 설정으로도 모든 기능이 정상 작동합니다! 🎉
