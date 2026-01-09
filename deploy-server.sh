#!/bin/bash

# HotelWorks 자동 배포 스크립트 (Ubuntu/Debian)
# 사용법: sudo bash deploy-server.sh

set -e  # 에러 발생 시 중단

echo "🚀 HotelWorks 자동 배포를 시작합니다..."

# 색상 정의
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

print_step() {
    echo -e "${BLUE}==>${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# 1. 시스템 업데이트
print_step "시스템 패키지 업데이트 중..."
apt-get update -y
apt-get upgrade -y
print_success "시스템 업데이트 완료"

# 2. Node.js 설치
print_step "Node.js 18.x 설치 중..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt-get install -y nodejs
    print_success "Node.js $(node -v) 설치 완료"
else
    print_success "Node.js $(node -v) 이미 설치됨"
fi

# 3. MySQL 설치
print_step "MySQL 설치 중..."
if ! command -v mysql &> /dev/null; then
    apt-get install -y mysql-server
    systemctl start mysql
    systemctl enable mysql
    print_success "MySQL 설치 완료"
else
    print_success "MySQL 이미 설치됨"
fi

# 4. PM2 설치
print_step "PM2 설치 중..."
if ! command -v pm2 &> /dev/null; then
    npm install -g pm2
    print_success "PM2 설치 완료"
else
    print_success "PM2 이미 설치됨"
fi

# 5. Nginx 설치
print_step "Nginx 설치 중..."
if ! command -v nginx &> /dev/null; then
    apt-get install -y nginx
    systemctl start nginx
    systemctl enable nginx
    print_success "Nginx 설치 완료"
else
    print_success "Nginx 이미 설치됨"
fi

# 6. Git 설치
print_step "Git 설치 중..."
if ! command -v git &> /dev/null; then
    apt-get install -y git
    print_success "Git 설치 완료"
else
    print_success "Git 이미 설치됨"
fi

# 7. 방화벽 설정
print_step "방화벽 설정 중..."
apt-get install -y ufw
ufw allow 'Nginx Full'
ufw allow OpenSSH
ufw --force enable
print_success "방화벽 설정 완료"

# 8. 프로젝트 디렉토리 생성
print_step "프로젝트 디렉토리 생성 중..."
INSTALL_DIR="/var/www/hotelworks"
mkdir -p $INSTALL_DIR
print_success "디렉토리 생성: $INSTALL_DIR"

echo ""
print_success "=========================================="
print_success "기본 설치 완료!"
print_success "=========================================="
echo ""
echo "다음 단계:"
echo "1. GitHub에서 코드 클론:"
echo "   cd $INSTALL_DIR"
echo "   git clone https://github.com/YOUR_USERNAME/hotelworks.git ."
echo ""
echo "2. MySQL 데이터베이스 설정:"
echo "   sudo mysql_secure_installation  # MySQL 보안 설정"
echo "   sudo mysql < $INSTALL_DIR/database/schema.sql"
echo ""
echo "3. .env 파일 생성:"
echo "   nano $INSTALL_DIR/.env"
echo ""
echo "4. 애플리케이션 빌드 및 실행:"
echo "   cd $INSTALL_DIR"
echo "   npm install"
echo "   npm run build"
echo "   pm2 start server.js --name hotelworks"
echo ""
print_success "설치 스크립트 실행 완료!"

