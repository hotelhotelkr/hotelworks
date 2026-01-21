/**
 * Vercel 환경 변수 확인 스크립트
 * 현재 설정된 환경 변수를 확인합니다.
 */

import https from 'https';

let VERCEL_TOKEN = process.env.VERCEL_TOKEN || '';
const PROJECT_NAME = process.env.VERCEL_PROJECT_NAME || 'hotelworks';

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('🔍 Vercel 환경 변수 확인');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

if (!VERCEL_TOKEN) {
  console.log('💡 Vercel 토큰이 필요합니다.');
  console.log('   토큰 생성: https://vercel.com/account/tokens\n');
  console.log('토큰을 입력하세요 (또는 Enter로 종료):');
  
  const readline = await import('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  VERCEL_TOKEN = await new Promise((resolve) => {
    rl.question('Vercel 토큰: ', (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });

  if (!VERCEL_TOKEN) {
    console.log('\n❌ 토큰이 필요합니다.\n');
    process.exit(1);
  }
}

// Vercel API 호출
function apiRequest(method, path) {
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
          reject(new Error(`Parse Error: ${body}`));
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

// 메인 실행
async function main() {
  try {
    // 프로젝트 정보
    console.log('1️⃣ 프로젝트 정보 가져오기...');
    const project = await apiRequest('GET', `/v9/projects/${PROJECT_NAME}`);
    console.log(`   ✅ 프로젝트: ${project.name} (${project.id})\n`);

    // 환경 변수 목록
    console.log('2️⃣ 환경 변수 확인 중...\n');
    const envs = await apiRequest('GET', `/v10/projects/${project.id}/env`);

    // 필요한 환경 변수
    const requiredVars = {
      'SUPABASE_URL': 'https://pnmkclrwmbmzrocyygwq.supabase.co',
      'SUPABASE_ANON_KEY': 'sb_publishable_WdzcqWms_a8Cq623qNPWwQ_okBbp28Q',
      'SUPABASE_SERVICE_ROLE_KEY': 'sb_secret_--g5k-uslPpXBLRMg7M6uA_k1jwlF5i',
      'VITE_WS_SERVER_URL': 'wss://hotelworks.kr'
    };

    console.log('📋 현재 설정된 환경 변수:\n');

    const foundVars = {};
    const environments = ['production', 'preview', 'development'];

    if (envs.envs && envs.envs.length > 0) {
      for (const envVar of envs.envs) {
        if (requiredVars.hasOwnProperty(envVar.key)) {
          if (!foundVars[envVar.key]) {
            foundVars[envVar.key] = {};
          }
          
          for (const env of environments) {
            if (envVar.target?.includes(env)) {
              foundVars[envVar.key][env] = {
                id: envVar.id,
                value: envVar.value ? '***설정됨***' : '없음',
                needsUpdate: envVar.value !== requiredVars[envVar.key]
              };
            }
          }
        }
      }
    }

    // 결과 출력
    for (const [key, expectedValue] of Object.entries(requiredVars)) {
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`📌 ${key}`);
      console.log(`   올바른 값: ${expectedValue}`);
      
      if (foundVars[key]) {
        for (const env of environments) {
          if (foundVars[key][env]) {
            const status = foundVars[key][env].needsUpdate ? '⚠️ 업데이트 필요' : '✅ 정상';
            console.log(`   ${env}: ${status}`);
          } else {
            console.log(`   ${env}: ❌ 없음`);
          }
        }
      } else {
        console.log(`   ❌ 모든 환경에 없음`);
      }
      console.log('');
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ 확인 완료!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('💡 업데이트가 필요한 변수는 Vercel Dashboard에서 수정하세요.\n');

  } catch (error) {
    console.error('\n❌ 확인 실패:', error.message);
    console.error('\n💡 해결 방법:');
    console.error('   1. Vercel 토큰 확인');
    console.error('   2. 프로젝트 이름 확인\n');
    process.exit(1);
  }
}

main();
