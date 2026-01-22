# Git 커밋 메시지 한글 깨짐 수정 가이드

## 문제 상황
GitHub에서 커밋 메시지의 한글이 깨져 보이는 경우, 과거 커밋 메시지가 UTF-8이 아닌 인코딩으로 저장된 것입니다.

## 해결 방법

### 옵션 A: 최근 커밋만 수정 (권장)

#### 1. 백업 생성
```bash
git branch backup-before-rebase-$(date +%Y%m%d-%H%M%S)
```

#### 2. Interactive Rebase 시작
```bash
git rebase -i HEAD~20
```

#### 3. 편집기에서 수정
- 수정할 커밋 앞의 `pick`을 `reword`(또는 `r`)로 변경
- 저장 후 종료

#### 4. 각 커밋 메시지 수정
- 편집기가 열리면 한글로 정상 입력
- 저장 후 종료

#### 5. 강제 푸시
```bash
git push --force-with-lease
```

### 복구 방법

문제 발생 시:
```bash
# Rebase 취소
git rebase --abort

# 또는 백업 브랜치로 복구
git reset --hard backup-before-rebase-YYYYMMDD-HHMMSS
```

## 주의사항

⚠️ **중요**: 
- 이 작업은 Git 히스토리를 재작성합니다
- 협업 중이라면 팀원과 상의 후 진행하세요
- `--force-with-lease`는 안전한 강제 푸시입니다 (다른 사람이 푸시한 내용이 있으면 실패)

## 참고

- `.gitattributes` 파일이 이미 추가되어 있어 앞으로의 커밋은 정상적으로 표시됩니다
- 과거 커밋만 수정하면 됩니다
