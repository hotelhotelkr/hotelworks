/**
 * Render 서비스 자동 수정 스크립트
 * hotelworks-backend 서비스를 자동으로 설정합니다.
 */

import https from 'https';

const RENDER_API_KEY = process.env.RENDER_API_KEY || '';
const SERVICE_ID = 'srv-d5grpuer433s73bavmk0'; // hotelworks-backend 서비스 ID
const SERVICE_URL = 'https://hotelworks-backend.onrender.com';

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('🔧 Render 서비스 자동 수정');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

if (!RENDER_API_KEY) {
  console.log('❌ RENDER_API_KEY 환경 변수가 설정되지 않았습니다.\n');
  console.log('💡 Render API 키 생성 방법:');
  console.log('   1. https://dashboard.render.com/account/api-keys 접속');
  console.log('   2. "Create API Key" 클릭');
  console.log('   3. 키 이름 입력 후 생성');
  console.log('   4. 생성된 키를 복사\n');
  console.log('PowerShell에서:');
  console.log('   $env:RENDER_API_KEY="your-api-key"');
  console.log('   node fix-render-now.js\n');
  process.exit(1);
}

// Render API 호출
function renderApiRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.render.com',
      port: 443,
      path: path,
      method: method,
      headers: {
        'Authorization': `Bearer ${RENDER_API_KEY}`,
        'Accept': 'application/json',
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
            reject(new Error(`API Error: ${res.statusCode} - ${JSON.stringify(parsed)}`));
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
    console.log('1️⃣ 서비스 정보 확인 중...\n');
    
    const service = await renderApiRequest('GET', `/v1/services/${SERVICE_ID}`);
    console.log(`   ✅ 서비스: ${service.name}`);
    console.log(`   ✅ URL: ${service.serviceDetails?.url || SERVICE_URL}`);
    console.log(`   ✅ 상태: ${service.suspendedAt ? '일시 중지됨' : '실행 중'}\n`);

    console.log('2️⃣ 서비스 설정 업데이트 중...\n');
    
    // 서비스 설정 업데이트
    try {
      await renderApiRequest('PATCH', `/v1/services/${SERVICE_ID}`, {
        buildCommand: 'npm install',
        startCommand: 'node server.js',
        healthCheckPath: '/health'
      });
      console.log('   ✅ 빌드/시작 명령어 업데이트 완료');
    } catch (error) {
      console.log('   ⚠️ 설정 업데이트:', error.message);
    }

    console.log('\n3️⃣ 환경 변수 설정 중...\n');
    
    // 환경 변수 목록 가져오기
    const envVars = await renderApiRequest('GET', `/v1/services/${SERVICE_ID}/env-vars`);
    
    const requiredVars = {
      'NODE_ENV': 'production',
      'SUPABASE_URL': 'https://pnmkclrwmbmzrocyygwq.supabase.co',
      'SUPABASE_ANON_KEY': 'sb_publishable_WdzcqWms_a8Cq623qNPWwQ_okBbp28Q',
      'SUPABASE_SERVICE_ROLE_KEY': 'sb_secret_--g5k-uslPpXBLRMg7M6uA_k1jwlF5i',
      'SERVER_URL': SERVICE_URL,
      'WS_SERVER_URL': SERVICE_URL.replace('https://', 'wss://').replace('http://', 'ws://')
    };

    // 기존 PORT 환경 변수 제거 (Render가 자동 제공)
    const portVar = envVars.find(e => e.key === 'PORT');
    if (portVar) {
      try {
        await renderApiRequest('DELETE', `/v1/services/${SERVICE_ID}/env-vars/${portVar.id}`);
        console.log('   ✅ PORT 환경 변수 제거 (Render가 자동 제공)');
      } catch (error) {
        console.log('   ⚠️ PORT 변수 제거 실패:', error.message);
      }
    }

    // 환경 변수 설정
    for (const [key, value] of Object.entries(requiredVars)) {
      const existing = envVars.find(e => e.key === key);
      
      if (existing) {
        // 업데이트
        try {
          await renderApiRequest('PUT', `/v1/services/${SERVICE_ID}/env-vars/${existing.id}`, {
            value: value
          });
          console.log(`   ✅ ${key} (업데이트됨)`);
        } catch (error) {
          console.log(`   ⚠️ ${key} 업데이트 실패:`, error.message);
        }
      } else {
        // 새로 추가
        try {
          await renderApiRequest('POST', `/v1/services/${SERVICE_ID}/env-vars`, {
            key: key,
            value: value
          });
          console.log(`   ✅ ${key} (추가됨)`);
        } catch (error) {
          console.log(`   ⚠️ ${key} 추가 실패:`, error.message);
        }
      }
    }

    console.log('\n4️⃣ 서비스 재배포 시작...\n');
    
    try {
      await renderApiRequest('POST', `/v1/services/${SERVICE_ID}/deploys`, {
        clearCache: true
      });
      console.log('   ✅ 재배포 시작됨');
      console.log('   💡 배포 완료까지 몇 분 소요될 수 있습니다.');
    } catch (error) {
      console.log('   ⚠️ 자동 재배포 실패:', error.message);
      console.log('   💡 Render Dashboard에서 수동으로 "Manual Deploy"를 클릭하세요.');
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ 설정 완료!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('💡 다음 단계:');
    console.log('   1. Render Dashboard에서 배포 상태 확인');
    console.log('   2. 배포 완료 후 Health Check 테스트:');
    console.log(`      ${SERVICE_URL}/health`);
    console.log('   3. 서버 로그 확인 (오류가 있는 경우)\n');

  } catch (error) {
    console.error('\n❌ 오류 발생:', error.message);
    console.error('\n💡 Render Dashboard에서 수동으로 설정하세요.');
    console.error('   자세한 내용은 RENDER_QUICK_FIX.md 파일을 참고하세요.\n');
    process.exit(1);
  }
}

main();
