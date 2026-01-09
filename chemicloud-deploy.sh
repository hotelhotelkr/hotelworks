#!/bin/bash

# ========================================
# HotelWorks - ChemiCloud 배포 스크립트
# ========================================
# 
# 사용법:
#   1. ChemiCloud cPanel 터미널에서 실행
#   2. chmod +x chemicloud-deploy.sh
#   3. ./chemicloud-deploy.sh
# 
# 또는 로컬 PC에서 빌드 후 FTP 업로드 시 사용
# ========================================

set -e  # 에러 발생 시 중단

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 함수 정의
print_header() {
    echo ""
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo ""
}

print_step() {
    echo -e "${GREEN}➜${NC} $1"
}

print_info() {
    echo -e "${YELLOW}ℹ${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

# 시작
clear
print_header "HotelWorks - ChemiCloud 배포 스크립트"

# 현재 위치 확인
CURRENT_DIR=$(pwd)
print_info "현재 디렉토리: $CURRENT_DIR"

# 프로젝트 루트 확인
if [ ! -f "package.json" ]; then
    print_error "package.json 파일을 찾을 수 없습니다."
    print_error "프로젝트 루트 디렉토리에서 실행해주세요."
    exit 1
fi

print_success "프로젝트 확인 완료"

# ========================================
# Step 1: 환경 확인
# ========================================
print_header "Step 1: 환경 확인"

# Node.js 버전 확인
if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v)
    print_success "Node.js 버전: $NODE_VERSION"
else
    print_error "Node.js가 설치되어 있지 않습니다."
    print_info "ChemiCloud cPanel → Setup Node.js App에서 앱을 먼저 생성하세요."
    exit 1
fi

# npm 확인
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm -v)
    print_success "npm 버전: $NPM_VERSION"
else
    print_error "npm이 설치되어 있지 않습니다."
    exit 1
fi

# ========================================
# Step 2: .env 파일 확인
# ========================================
print_header "Step 2: 환경 변수 확인"

if [ ! -f ".env" ]; then
    print_error ".env 파일이 없습니다."
    
    if [ -f ".env.chemicloud" ]; then
        print_info ".env.chemicloud 템플릿 파일을 찾았습니다."
        read -p "템플릿을 복사하시겠습니까? (y/n): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            cp .env.chemicloud .env
            print_success ".env 파일 생성 완료"
            print_info "이제 .env 파일을 편집하여 실제 값으로 변경하세요:"
            print_info "  nano .env"
            exit 0
        fi
    else
        print_error ".env.chemicloud 템플릿 파일도 없습니다."
        print_info "먼저 환경 변수 파일을 생성해주세요."
        exit 1
    fi
else
    print_success ".env 파일 확인 완료"
    
    # .env 파일에서 중요한 값이 설정되었는지 확인
    if grep -q "CHANGEME" .env; then
        print_error ".env 파일에 CHANGEME 값이 남아있습니다!"
        print_info "실제 값으로 변경해주세요: nano .env"
        exit 1
    fi
    
    print_success ".env 파일 설정 완료"
fi

# ========================================
# Step 3: 의존성 설치
# ========================================
print_header "Step 3: 의존성 설치"

print_step "npm install 실행 중..."

# Node.js 버전 환경 활성화 (ChemiCloud)
if [ -d "$HOME/nodevenv" ]; then
    # hotelworks 앱의 Node.js 환경 찾기
    VENV_PATH=$(find $HOME/nodevenv -name "activate" | head -1)
    if [ -f "$VENV_PATH" ]; then
        print_info "Node.js 환경 활성화: $VENV_PATH"
        source $VENV_PATH
    fi
fi

npm install --production

if [ $? -eq 0 ]; then
    print_success "의존성 설치 완료"
else
    print_error "의존성 설치 실패"
    exit 1
fi

# ========================================
# Step 4: 프론트엔드 빌드
# ========================================
print_header "Step 4: 프론트엔드 빌드"

print_step "npm run build 실행 중..."
print_info "빌드 시간이 오래 걸릴 수 있습니다 (1-3분)"

npm run build

if [ $? -eq 0 ]; then
    print_success "프론트엔드 빌드 완료"
    
    # dist 폴더 확인
    if [ -d "dist" ]; then
        DIST_SIZE=$(du -sh dist | cut -f1)
        print_info "빌드 결과물 크기: $DIST_SIZE"
    fi
else
    print_error "프론트엔드 빌드 실패"
    exit 1
fi

# ========================================
# Step 5: 데이터베이스 확인
# ========================================
print_header "Step 5: 데이터베이스 확인"

print_info "데이터베이스 스키마는 phpMyAdmin에서 수동으로 적용해야 합니다."
print_info "  1. cPanel → phpMyAdmin 접속"
print_info "  2. 데이터베이스 선택"
print_info "  3. SQL 탭 → database/schema.sql 내용 붙여넣기"
print_info ""

read -p "데이터베이스 스키마를 이미 적용하셨나요? (y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_info "먼저 데이터베이스 스키마를 적용한 후 다시 실행해주세요."
    exit 0
fi

print_success "데이터베이스 확인 완료"

# ========================================
# Step 6: 파일 권한 설정
# ========================================
print_header "Step 6: 파일 권한 설정"

print_step "파일 권한 설정 중..."

# .env 파일 보호
if [ -f ".env" ]; then
    chmod 600 .env
    print_success ".env 파일 권한: 600"
fi

# 실행 파일 권한
chmod 755 server.js
print_success "server.js 권한: 755"

# dist 폴더 권한
if [ -d "dist" ]; then
    chmod -R 755 dist/
    print_success "dist/ 폴더 권한: 755"
fi

# ========================================
# Step 7: 애플리케이션 재시작
# ========================================
print_header "Step 7: 애플리케이션 재시작"

print_info "다음 방법 중 하나로 앱을 재시작하세요:"
print_info ""
print_info "방법 1: cPanel에서 재시작 (권장)"
print_info "  - cPanel → Setup Node.js App"
print_info "  - hotelworks 앱 옆 Actions → Restart"
print_info ""
print_info "방법 2: 터미널에서 재시작"

# tmp 디렉토리 생성 및 restart.txt 생성
if [ ! -d "tmp" ]; then
    mkdir -p tmp
fi

touch tmp/restart.txt
print_success "tmp/restart.txt 생성 (Passenger 재시작 트리거)"

# ========================================
# Step 8: 배포 완료
# ========================================
print_header "배포 완료!"

print_success "HotelWorks 배포가 완료되었습니다! 🎉"
print_info ""
print_info "다음 단계:"
print_info "  1. https://hotelworks.kr 접속"
print_info "  2. 로그인 테스트"
print_info "  3. 주문 생성/조회 테스트"
print_info "  4. WebSocket 실시간 동기화 테스트"
print_info ""

# 로그 확인 방법 안내
print_info "문제가 발생하면 로그를 확인하세요:"
print_info "  - cPanel → Setup Node.js App → View Log"
print_info "  - 또는: tail -f logs/*.log"
print_info ""

# .htaccess 파일 확인
if [ -f "../public_html/.htaccess" ]; then
    print_success ".htaccess 파일 존재 확인"
else
    print_info ".htaccess 파일이 없습니다."
    print_info ".htaccess.chemicloud 파일을 public_html에 복사하세요:"
    print_info "  cp .htaccess.chemicloud ~/public_html/.htaccess"
fi

print_info ""
print_success "배포 스크립트 완료!"
echo ""

