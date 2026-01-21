/**
 * Vercel 환경 변수 업데이트 스크립트
 * 기존 환경 변수의 값을 업데이트합니다.
 */

import https from 'https';

const VERCEL_TOKEN = 'I7Ax0uOBsF8YM6OgjhlnJRUw';
const PROJECT_NAME = 'hotelworks';

// 환경 변수
  const envVars = {
    SUPABASE_URL: 'https://pnmkclrwmbmzrocyygwq.supabase.co',
    SUPABASE_ANON_KEY: 'sb_publishable_WdzcqWms_a8Cq623qNPWwQ_okBbp28Q',
    SUPABASE_SERVICE_ROLE_KEY: 'sb_secret_--g5k-uslPpXBLRMg7M6uA_k1jwlF5i',
    VITE_WS_SERVER_URL: 'wss://hotelworks-websocket.onrender.com'
  };

const environments = ['production', 'preview', 'development'];

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('🔄 Vercel 환경 변수 업데이트');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

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
    // 1. 프로젝트 정보
    console.log('1️⃣ 프로젝트 정보 가져오기...');
    const project = await apiRequest('GET', `/v9/projects/${PROJECT_NAME}`);
    console.log(`   ✅ 프로젝트: ${project.name} (${project.id})\n`);

    // 2. 기존 환경 변수 목록 가져오기
    console.log('2️⃣ 기존 환경 변수 확인 중...\n');
    const envs = await apiRequest('GET', `/v10/projects/${project.id}/env`);

    // 3. 환경 변수 업데이트
    console.log('3️⃣ 환경 변수 업데이트 중...\n');

    for (const [key, expectedValue] of Object.entries(envVars)) {
      console.log(`   업데이트 중: ${key}`);
      
      // 해당 키의 환경 변수 찾기
      const existingEnvs = envs.envs?.filter(e => e.key === key) || [];
      
      for (const env of environments) {
        // 해당 환경의 변수 찾기
        const existing = existingEnvs.find(e => e.target?.includes(env));
        
        if (existing) {
          // 기존 변수 업데이트
          try {
            await apiRequest('PATCH', `/v10/projects/${project.id}/env/${existing.id}`, {
              value: expectedValue,
              target: existing.target // 기존 target 유지
            });
            console.log(`      ✅ ${env} (업데이트됨)`);
          } catch (error) {
            if (error.message.includes('same value')) {
              console.log(`      ✅ ${env} (이미 올바른 값)`);
            } else {
              console.log(`      ⚠️ ${env}: ${error.message}`);
            }
          }
        } else {
          // 새로 추가
          try {
            await apiRequest('POST', `/v10/projects/${project.id}/env`, {
              key,
              value: expectedValue,
              type: 'encrypted',
              target: [env]
            });
            console.log(`      ✅ ${env} (추가됨)`);
          } catch (error) {
            console.log(`      ⚠️ ${env}: ${error.message}`);
          }
        }
      }
      console.log('');
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ 환경 변수 업데이트 완료!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('💡 다음 단계:');
    console.log('   1. Vercel Dashboard에서 환경 변수 확인');
    console.log('   2. 프로젝트 재배포\n');

  } catch (error) {
    console.error('\n❌ 업데이트 실패:', error.message);
    console.error(error);
    process.exit(1);
  }
}

main();
