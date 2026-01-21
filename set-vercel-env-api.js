/**
 * Vercel API를 사용하여 환경 변수 자동 설정
 * 
 * 사용 방법:
 * 1. Vercel Dashboard > Settings > Tokens에서 토큰 생성
 * 2. 환경 변수에 VERCEL_TOKEN 설정 또는 아래에 직접 입력
 * 3. node set-vercel-env-api.js 실행
 */

import https from 'https';
import { readFileSync } from 'fs';

// Vercel 토큰 (환경 변수에서 가져오거나 직접 입력)
const VERCEL_TOKEN = process.env.VERCEL_TOKEN || '';

// 프로젝트 정보 (Vercel Dashboard에서 확인)
const VERCEL_TEAM_ID = process.env.VERCEL_TEAM_ID || ''; // 선택사항 (팀이 있는 경우)
const VERCEL_PROJECT_NAME = process.env.VERCEL_PROJECT_NAME || 'hotelworks'; // 프로젝트 이름

// 설정할 환경 변수
const envVars = {
  SUPABASE_URL: 'https://pnmkclrwmbmzrocyygwq.supabase.co',
  SUPABASE_ANON_KEY: 'sb_publishable_WdzcqWms_a8Cq623qNPWwQ_okBbp28Q',
  SUPABASE_SERVICE_ROLE_KEY: 'sb_secret_--g5k-uslPpXBLRMg7M6uA_k1jwlF5i',
  VITE_WS_SERVER_URL: 'wss://hotelworks.kr'
};

const environments = ['production', 'preview', 'development'];

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('🚀 Vercel 환경 변수 API 설정');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

if (!VERCEL_TOKEN) {
  console.error('❌ VERCEL_TOKEN이 설정되지 않았습니다.');
  console.error('\n💡 Vercel 토큰 생성 방법:');
  console.error('   1. https://vercel.com/account/tokens 접속');
  console.error('   2. "Create Token" 클릭');
  console.error('   3. 토큰 이름 입력 후 생성');
  console.error('   4. 다음 명령어로 설정:');
  console.error('      $env:VERCEL_TOKEN="your-token"');
  console.error('      node set-vercel-env-api.js\n');
  process.exit(1);
}

// Vercel API 호출 함수
function vercelApiRequest(method, path, data = null) {
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
          resolve(body);
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

// 프로젝트 정보 가져오기
async function getProject() {
  try {
    const path = VERCEL_TEAM_ID 
      ? `/v9/projects/${VERCEL_PROJECT_NAME}?teamId=${VERCEL_TEAM_ID}`
      : `/v9/projects/${VERCEL_PROJECT_NAME}`;
    
    const project = await vercelApiRequest('GET', path);
    return project;
  } catch (error) {
    console.error('❌ 프로젝트를 찾을 수 없습니다:', error.message);
    console.error('💡 프로젝트 이름을 확인하거나 VERCEL_PROJECT_NAME 환경 변수를 설정하세요.\n');
    throw error;
  }
}

// 환경 변수 추가
async function addEnvVar(projectId, key, value, environment) {
  try {
    const path = VERCEL_TEAM_ID
      ? `/v10/projects/${projectId}/env?teamId=${VERCEL_TEAM_ID}`
      : `/v10/projects/${projectId}/env`;
    
    const data = {
      key,
      value,
      type: 'encrypted',
      target: [environment]
    };

    await vercelApiRequest('POST', path, data);
    return true;
  } catch (error) {
    if (error.message.includes('already exists')) {
      // 이미 존재하는 경우 업데이트 시도
      try {
        await updateEnvVar(projectId, key, value, environment);
        return true;
      } catch (updateError) {
        throw new Error(`업데이트 실패: ${updateError.message}`);
      }
    }
    throw error;
  }
}

// 환경 변수 업데이트
async function updateEnvVar(projectId, key, value, environment) {
  try {
    // 먼저 기존 환경 변수 목록 가져오기
    const path = VERCEL_TEAM_ID
      ? `/v10/projects/${projectId}/env?teamId=${VERCEL_TEAM_ID}`
      : `/v10/projects/${projectId}/env`;
    
    const envs = await vercelApiRequest('GET', path);
    const existing = envs.envs?.find(e => e.key === key && e.target?.includes(environment));
    
    if (existing) {
      // 업데이트
      const updatePath = VERCEL_TEAM_ID
        ? `/v10/projects/${projectId}/env/${existing.id}?teamId=${VERCEL_TEAM_ID}`
        : `/v10/projects/${projectId}/env/${existing.id}`;
      
      await vercelApiRequest('PATCH', updatePath, {
        value,
        target: [environment]
      });
      return true;
    } else {
      // 새로 추가
      return await addEnvVar(projectId, key, value, environment);
    }
  } catch (error) {
    throw error;
  }
}

// 메인 실행
async function main() {
  try {
    // 프로젝트 정보 가져오기
    console.log('1️⃣ 프로젝트 정보 가져오기...');
    const project = await getProject();
    console.log(`   ✅ 프로젝트 찾음: ${project.name} (${project.id})\n`);
    
    // 환경 변수 설정
    console.log('2️⃣ 환경 변수 설정 중...\n');
    
    for (const [key, value] of Object.entries(envVars)) {
      console.log(`   설정 중: ${key}`);
      
      for (const env of environments) {
        try {
          await addEnvVar(project.id, key, value, env);
          console.log(`      ✅ ${env}`);
        } catch (error) {
          if (error.message.includes('already exists') || error.message.includes('업데이트')) {
            try {
              await updateEnvVar(project.id, key, value, env);
              console.log(`      ✅ ${env} (업데이트됨)`);
            } catch (updateError) {
              console.log(`      ⚠️ ${env}: ${updateError.message}`);
            }
          } else {
            console.log(`      ⚠️ ${env}: ${error.message}`);
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
    console.error('   2. 프로젝트 이름 확인');
    console.error('   3. VERCEL_TOKEN 환경 변수 설정\n');
    process.exit(1);
  }
}

main();
