/**
 * Vercel 환경 변수 자동 설정 스크립트
 * 
 * 사용 방법:
 * 1. Vercel CLI 설치: npm install -g vercel
 * 2. Vercel 로그인: vercel login
 * 3. 이 스크립트 실행: node setup-vercel-env.js
 */

import { execSync } from 'child_process';

const envVars = {
  SUPABASE_URL: 'https://pnmkclrwmbmzrocyygwq.supabase.co',
  SUPABASE_ANON_KEY: 'sb_publishable_WdzcqWms_a8Cq623qNPWwQ_okBbp28Q',
  SUPABASE_SERVICE_ROLE_KEY: 'sb_secret_--g5k-uslPpXBLRMg7M6uA_k1jwlF5i',
  VITE_WS_SERVER_URL: 'wss://hotelworks.kr'
};

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('🚀 Vercel 환경 변수 설정');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// Vercel CLI 확인
try {
  execSync('vercel --version', { stdio: 'ignore' });
  console.log('✅ Vercel CLI가 설치되어 있습니다.\n');
} catch (error) {
  console.log('❌ Vercel CLI가 설치되지 않았습니다.');
  console.log('💡 다음 명령어로 설치하세요: npm install -g vercel\n');
  process.exit(1);
}

// 환경 변수 설정
console.log('📋 환경 변수 설정 중...\n');

for (const [key, value] of Object.entries(envVars)) {
  try {
    // Production 환경
    execSync(`vercel env add ${key} production`, {
      input: value + '\n',
      stdio: 'pipe'
    });
    console.log(`   ✅ ${key} (production)`);
    
    // Preview 환경
    execSync(`vercel env add ${key} preview`, {
      input: value + '\n',
      stdio: 'pipe'
    });
    console.log(`   ✅ ${key} (preview)`);
    
    // Development 환경
    execSync(`vercel env add ${key} development`, {
      input: value + '\n',
      stdio: 'pipe'
    });
    console.log(`   ✅ ${key} (development)`);
  } catch (error) {
    console.log(`   ⚠️ ${key}: ${error.message}`);
  }
}

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('✅ 환경 변수 설정 완료!');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
console.log('💡 다음 단계:');
console.log('   1. Vercel Dashboard에서 환경 변수 확인');
console.log('   2. 프로젝트 재배포\n');
