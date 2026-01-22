# Git 한글 인코딩 문제 해결 가이드

## 적용된 설정

### 1. Git 전역 설정
다음 명령어들이 실행되었습니다:

```bash
git config --global core.quotepath false
git config --global core.precomposeunicode true
git config --global i18n.commitencoding utf-8
git config --global i18n.logoutputencoding utf-8
```

### 2. .gitattributes 파일 생성
프로젝트 루트에 `.gitattributes` 파일이 생성되어 모든 텍스트 파일이 UTF-8로 처리되도록 설정되었습니다.

## 설정 확인

다음 명령어로 설정을 확인할 수 있습니다:

```bash
git config --global --list | grep -i encoding
git config --global --list | grep -i quotepath
```

## 주의사항

1. **기존 커밋 메시지**: 이미 커밋된 메시지의 한글 깨짐은 수정되지 않습니다. 새로운 커밋부터 정상적으로 표시됩니다.

2. **파일 내용**: `.gitattributes` 파일이 추가되었으므로, 앞으로 커밋되는 모든 텍스트 파일은 UTF-8로 처리됩니다.

3. **GitHub 표시**: GitHub에서 한글이 정상적으로 표시되려면 브라우저의 인코딩도 UTF-8로 설정되어 있어야 합니다.

## 추가 조치 (필요시)

만약 여전히 한글이 깨진다면:

1. **로컬 Git 설정 확인**:
   ```bash
   git config --global core.quotepath false
   git config --global i18n.commitencoding utf-8
   ```

2. **PowerShell 인코딩 설정** (Windows):
   ```powershell
   [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
   $PSDefaultParameterValues['*:Encoding'] = 'utf8'
   ```

3. **Git Bash 사용**: PowerShell 대신 Git Bash를 사용하면 한글 인코딩 문제가 적을 수 있습니다.
