/**
 * Vercel 환경 변수 자동 설정 (간단 버전)
 * 
 * 사용 방법:
 * 1. Vercel 토큰 생성: https://vercel.com/account/tokens
 * 2. PowerShell에서: $env:VERCEL_TOKEN="your-token"; node auto-set-vercel-env.js
 * 3. 또는 토큰을 직접 입력하도록 안내
 */

import https from 'https';
import readline from 'readline';

// Vercel 토큰
let VERCEL_TOKEN = process.env.VERCEL_TOKEN || '';
const PROJECT_NAME = process.env.VERCEL_PROJECT_NAME || 'hotelworks';

// 환경 변수
const envVars = {
  SUPABASE_URL: 'https://pnmkclrwmbmzrocyygwq.supabase.co',
  SUPABASE_ANON_KEY: 'sb_publishable_WdzcqWms_a8Cq623qNPWwQ_okBbp28Q',
  SUPABASE_SERVICE_ROLE_KEY: 'sb_secret_--g5k-uslPpXBLRMg7M6uA_k1jwlF5i',
  VITE_WS_SERVER_URL: 'wss://hotelworks.kr'
};

const environments = ['production', 'preview', 'development'];

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('🚀 Vercel 환경 변수 자동 설정');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// 토큰 입력 요청 (동기 방식)
function getToken() {
  return new Promise((resolve) => {
    if (VERCEL_TOKEN) {
      resolve(VERCEL_TOKEN);
      return;
    }

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    console.log('💡 Vercel 토큰이 필요합니다.');
    console.log('   토큰 생성: https://vercel.com/account/tokens\n');
    
    rl.question('Vercel 토큰을 입력하세요: ', (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

// Vercel API 호출
function apiRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.vercel.com',
      port: 443,
      path: path,
      method: method,
      headers: {
        'Authorization': `Bearer ${VERCEL_TOKEN}`,
        'Content-Type': 'application/json'
      }
    };

    if (data) {
      const postData = JSON.stringify(data);
      options.headers['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsed);
          } else {
            reject(new Error(`API Error: ${res.statusCode} - ${parsed.error?.message || body}`));
          }
        } catch (e) {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(body);
          } else {
            reject(new Error(`API Error: ${res.statusCode} - ${body}`));
          }
        }
      });
    });

    req.on('error', reject);
    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

// 메인 실행
async function main() {
  try {
    // 토큰 확인
    VERCEL_TOKEN = await getToken();
    if (!VERCEL_TOKEN) {
      console.error('\n❌ 토큰이 필요합니다. 종료합니다.\n');
      process.exit(1);
    }

    // 1. 프로젝트 정보 가져오기
    console.log('1️⃣ 프로젝트 정보 가져오기...');
    const project = await apiRequest('GET', `/v9/projects/${PROJECT_NAME}`);
    console.log(`   ✅ 프로젝트 찾음: ${project.name} (${project.id})\n`);

    // 2. 환경 변수 설정
    console.log('2️⃣ 환경 변수 설정 중...\n');

    for (const [key, value] of Object.entries(envVars)) {
      console.log(`   설정 중: ${key}`);
      
      for (const env of environments) {
        try {
          await apiRequest('POST', `/v10/projects/${project.id}/env`, {
            key,
            value,
            type: 'encrypted',
            target: [env]
          });
          console.log(`      ✅ ${env}`);
        } catch (error) {
          if (error.message.includes('already exists') || error.message.includes('duplicate')) {
            console.log(`      ⚠️ ${env} (이미 존재함)`);
          } else {
            console.log(`      ❌ ${env}: ${error.message}`);
          }
        }
      }
      console.log('');
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ 환경 변수 설정 완료!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('💡 다음 단계:');
    console.log('   1. Vercel Dashboard에서 환경 변수 확인');
    console.log('   2. 프로젝트 재배포\n');

  } catch (error) {
    console.error('\n❌ 설정 실패:', error.message);
    console.error('\n💡 해결 방법:');
    console.error('   1. Vercel 토큰 확인: https://vercel.com/account/tokens');
    console.error('   2. 프로젝트 이름 확인 (기본값: hotelworks)');
    console.error('   3. VERCEL_PROJECT_NAME 환경 변수로 프로젝트 이름 지정 가능\n');
    process.exit(1);
  }
}

main();
