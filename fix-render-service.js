/**
 * Render 서비스 설정 확인 및 수정 스크립트
 * 
 * 이 스크립트는 Render API를 사용하여 서비스 설정을 확인하고 수정합니다.
 * 
 * 사용 방법:
 * 1. Render API 키 생성: https://dashboard.render.com/account/api-keys
 * 2. 환경 변수 설정: $env:RENDER_API_KEY="your-key"
 * 3. node fix-render-service.js 실행
 */

import https from 'https';

const RENDER_API_KEY = process.env.RENDER_API_KEY || '';

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('🔧 Render 서비스 설정 확인 및 수정');
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
  console.log('   node fix-render-service.js\n');
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

// 서비스 확인 및 수정
async function fixService() {
  try {
    console.log('1️⃣ 서비스 목록 확인 중...\n');
    
    const services = await renderApiRequest('GET', '/v1/services');
    
    // hotelworks 관련 서비스 찾기
    const hotelworksServices = services.filter(s => 
      s.name?.includes('hotelworks') || s.name?.includes('hotel')
    );
    
    if (hotelworksServices.length === 0) {
      console.log('   ⚠️ hotelworks 관련 서비스를 찾을 수 없습니다.');
      console.log('   💡 Render Dashboard에서 수동으로 서비스를 생성하세요.\n');
      return;
    }
    
    console.log(`   ✅ ${hotelworksServices.length}개의 서비스 발견:\n`);
    
    for (const service of hotelworksServices) {
      console.log(`   📦 ${service.name} (${service.id})`);
      console.log(`      상태: ${service.suspendedAt ? '일시 중지됨' : '실행 중'}`);
      console.log(`      URL: ${service.serviceDetails?.url || 'N/A'}`);
      console.log('');
    }
    
    // hotelworks-backend 또는 hotelworks-websocket 찾기
    const targetService = hotelworksServices.find(s => 
      s.name === 'hotelworks-backend' || s.name === 'hotelworks-websocket'
    );
    
    if (!targetService) {
      console.log('   ⚠️ hotelworks-backend 또는 hotelworks-websocket 서비스를 찾을 수 없습니다.');
      console.log('   💡 Render Dashboard에서 수동으로 서비스를 생성하세요.\n');
      return;
    }
    
    console.log(`2️⃣ 서비스 상세 정보 확인 중: ${targetService.name}\n`);
    
    const serviceDetails = await renderApiRequest('GET', `/v1/services/${targetService.id}`);
    
    console.log('   현재 설정:');
    console.log(`      Build Command: ${serviceDetails.buildCommand || 'N/A'}`);
    console.log(`      Start Command: ${serviceDetails.startCommand || 'N/A'}`);
    console.log(`      Health Check Path: ${serviceDetails.healthCheckPath || 'N/A'}`);
    console.log('');
    
    // 환경 변수 확인
    console.log('3️⃣ 환경 변수 확인 중...\n');
    
    const envVars = await renderApiRequest('GET', `/v1/services/${targetService.id}/env-vars`);
    
    const requiredVars = {
      'NODE_ENV': 'production',
      'SUPABASE_URL': 'https://pnmkclrwmbmzrocyygwq.supabase.co',
      'SUPABASE_ANON_KEY': 'sb_publishable_WdzcqWms_a8Cq623qNPWwQ_okBbp28Q',
      'SUPABASE_SERVICE_ROLE_KEY': 'sb_secret_--g5k-uslPpXBLRMg7M6uA_k1jwlF5i'
    };
    
    const serviceUrl = serviceDetails.serviceDetails?.url || `https://${targetService.name}.onrender.com`;
    const wsUrl = serviceUrl.replace('https://', 'wss://').replace('http://', 'ws://');
    
    const allVars = {
      ...requiredVars,
      'SERVER_URL': serviceUrl,
      'WS_SERVER_URL': wsUrl
    };
    
    console.log('   필요한 환경 변수:');
    for (const [key, expectedValue] of Object.entries(allVars)) {
      const existing = envVars.find(e => e.key === key);
      if (existing) {
        const isCorrect = existing.value === expectedValue;
        console.log(`      ${key}: ${isCorrect ? '✅' : '⚠️'} ${existing.value}`);
        if (!isCorrect) {
          console.log(`         예상 값: ${expectedValue}`);
        }
      } else {
        console.log(`      ${key}: ❌ 설정되지 않음`);
      }
    }
    console.log('');
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ 서비스 정보 확인 완료!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('💡 다음 단계:');
    console.log('   1. Render Dashboard에서 서비스 설정 확인');
    console.log('   2. 환경 변수가 올바르게 설정되어 있는지 확인');
    console.log('   3. Build Command: npm install');
    console.log('   4. Start Command: node server.js');
    console.log('   5. Health Check Path: /health');
    console.log('   6. 서비스 재배포\n');

  } catch (error) {
    console.error('\n❌ 확인 실패:', error.message);
    console.error('\n💡 Render Dashboard에서 수동으로 확인하세요.\n');
    process.exit(1);
  }
}

// 메인 실행
fixService();
