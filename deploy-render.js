/**
 * Render.com WebSocket 서버 자동 배포 스크립트
 * 
 * 사용 방법:
 * 1. Render API 키 생성: https://dashboard.render.com/account/api-keys
 * 2. 환경 변수 설정: $env:RENDER_API_KEY="your-key"
 * 3. node deploy-render.js 실행
 */

import https from 'https';

const RENDER_API_KEY = process.env.RENDER_API_KEY || '';

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('🚀 Render WebSocket 서버 배포');
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
  console.log('   node deploy-render.js\n');
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
            reject(new Error(`API Error: ${res.statusCode} - ${parsed.error || body}`));
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

// 서비스 생성 또는 업데이트
async function deployService() {
  try {
    console.log('1️⃣ 기존 서비스 확인 중...');
    
    // 기존 서비스 목록 확인
    const services = await renderApiRequest('GET', '/v1/services');
    const existing = services.find(s => s.name === 'hotelworks-websocket');
    
    if (existing) {
      console.log(`   ✅ 기존 서비스 발견: ${existing.id}`);
      console.log(`   💡 Render Dashboard에서 환경 변수를 업데이트하세요.\n`);
      console.log('   서비스 URL:', existing.serviceDetails?.url || '확인 필요');
      return existing;
    }

    console.log('   ⚠️ 기존 서비스가 없습니다.');
    console.log('   💡 Render Dashboard에서 수동으로 생성해야 합니다.\n');
    console.log('   다음 단계:');
    console.log('   1. https://dashboard.render.com 접속');
    console.log('   2. New > Web Service');
    console.log('   3. GitHub 저장소 연결');
    console.log('   4. render-websocket.yaml 파일 참고하여 설정\n');
    
    return null;
  } catch (error) {
    console.error('❌ 서비스 확인 실패:', error.message);
    console.error('\n💡 Render Dashboard에서 수동으로 생성하세요.\n');
    return null;
  }
}

// 환경 변수 설정
async function setEnvironmentVariables(serviceId) {
  if (!serviceId) {
    console.log('⚠️ 서비스 ID가 없어 환경 변수를 설정할 수 없습니다.');
    return;
  }

  console.log('2️⃣ 환경 변수 설정 중...\n');

  const envVars = {
    NODE_ENV: 'production',
    PORT: '10000',
    SUPABASE_URL: 'https://pnmkclrwmbmzrocyygwq.supabase.co',
    SUPABASE_ANON_KEY: 'sb_publishable_WdzcqWms_a8Cq623qNPWwQ_okBbp28Q',
    SUPABASE_SERVICE_ROLE_KEY: 'sb_secret_--g5k-uslPpXBLRMg7M6uA_k1jwlF5i',
    SERVER_URL: 'https://hotelworks-websocket.onrender.com',
    WS_SERVER_URL: 'wss://hotelworks-websocket.onrender.com'
  };

  for (const [key, value] of Object.entries(envVars)) {
    try {
      await renderApiRequest('POST', `/v1/services/${serviceId}/env-vars`, {
        key,
        value
      });
      console.log(`   ✅ ${key}`);
    } catch (error) {
      if (error.message.includes('already exists')) {
        // 업데이트 시도
        try {
          // 기존 환경 변수 목록 가져오기
          const envs = await renderApiRequest('GET', `/v1/services/${serviceId}/env-vars`);
          const existing = envs.find(e => e.key === key);
          if (existing) {
            await renderApiRequest('PUT', `/v1/services/${serviceId}/env-vars/${existing.id}`, {
              value
            });
            console.log(`   ✅ ${key} (업데이트됨)`);
          }
        } catch (updateError) {
          console.log(`   ⚠️ ${key}: ${updateError.message}`);
        }
      } else {
        console.log(`   ⚠️ ${key}: ${error.message}`);
      }
    }
  }
  console.log('');
}

// 메인 실행
async function main() {
  try {
    const service = await deployService();
    
    if (service) {
      await setEnvironmentVariables(service.id);
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Render 배포 준비 완료!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('💡 Render Dashboard에서 서비스를 생성하거나 확인하세요:');
    console.log('   https://dashboard.render.com\n');

  } catch (error) {
    console.error('\n❌ 배포 실패:', error.message);
    console.error('\n💡 Render Dashboard에서 수동으로 배포하세요.\n');
    process.exit(1);
  }
}

main();
