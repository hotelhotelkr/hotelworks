#!/bin/bash

# MySQL 데이터베이스 설정 스크립트
# 사용법: sudo bash setup-mysql.sh

set -e

echo "🗄️ MySQL 데이터베이스 설정을 시작합니다..."

# 사용자 입력 받기
read -p "데이터베이스 이름 [hotelworks]: " DB_NAME
DB_NAME=${DB_NAME:-hotelworks}

read -p "데이터베이스 사용자명 [hotelworks_user]: " DB_USER
DB_USER=${DB_USER:-hotelworks_user}

read -sp "데이터베이스 비밀번호: " DB_PASSWORD
echo ""

if [ -z "$DB_PASSWORD" ]; then
    echo "❌ 비밀번호는 필수입니다!"
    exit 1
fi

# MySQL 루트 비밀번호 입력
read -sp "MySQL 루트 비밀번호: " MYSQL_ROOT_PASSWORD
echo ""

# MySQL 명령 실행
echo "데이터베이스 생성 중..."
mysql -u root -p"$MYSQL_ROOT_PASSWORD" <<EOF
CREATE DATABASE IF NOT EXISTS $DB_NAME CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS '$DB_USER'@'localhost' IDENTIFIED BY '$DB_PASSWORD';
GRANT ALL PRIVILEGES ON $DB_NAME.* TO '$DB_USER'@'localhost';
FLUSH PRIVILEGES;
EOF

echo "✅ 데이터베이스 설정 완료!"
echo ""
echo "데이터베이스 정보:"
echo "  이름: $DB_NAME"
echo "  사용자: $DB_USER"
echo "  호스트: localhost"
echo ""
echo ".env 파일에 다음 내용을 추가하세요:"
echo ""
echo "DB_HOST=localhost"
echo "DB_PORT=3306"
echo "DB_USER=$DB_USER"
echo "DB_PASSWORD=$DB_PASSWORD"
echo "DB_NAME=$DB_NAME"

