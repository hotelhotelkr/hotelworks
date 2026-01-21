# Vercel 환경 변수 자동 설정 (간단 버전)
# Vercel 토큰만 있으면 자동으로 설정됩니다

Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "🚀 Vercel 환경 변수 자동 설정" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`n" -ForegroundColor Cyan

# Vercel 토큰 확인
$token = $env:VERCEL_TOKEN
if (-not $token) {
    Write-Host "❌ VERCEL_TOKEN 환경 변수가 설정되지 않았습니다.`n" -ForegroundColor Red
    Write-Host "💡 Vercel 토큰 생성 방법:" -ForegroundColor Yellow
    Write-Host "   1. https://vercel.com/account/tokens 접속" -ForegroundColor White
    Write-Host "   2. 'Create Token' 클릭" -ForegroundColor White
    Write-Host "   3. 토큰 이름 입력 후 생성" -ForegroundColor White
    Write-Host "   4. 생성된 토큰을 복사`n" -ForegroundColor White
    Write-Host "토큰을 입력하세요:" -ForegroundColor Yellow
    $token = Read-Host "VERCEL_TOKEN"
    if (-not $token) {
        Write-Host "`n❌ 토큰이 필요합니다. 종료합니다.`n" -ForegroundColor Red
        exit 1
    }
    $env:VERCEL_TOKEN = $token
}

Write-Host "✅ 토큰 확인됨`n" -ForegroundColor Green

# 프로젝트 이름 확인
$projectName = Read-Host "프로젝트 이름 (기본값: hotelworks)"
if (-not $projectName) {
    $projectName = "hotelworks"
}

# 환경 변수 설정
$envVars = @{
    "SUPABASE_URL" = "https://pnmkclrwmbmzrocyygwq.supabase.co"
    "SUPABASE_ANON_KEY" = "sb_publishable_WdzcqWms_a8Cq623qNPWwQ_okBbp28Q"
    "SUPABASE_SERVICE_ROLE_KEY" = "sb_secret_--g5k-uslPpXBLRMg7M6uA_k1jwlF5i"
    "VITE_WS_SERVER_URL" = "wss://hotelworks.kr"
}

$environments = @("production", "preview", "development")

Write-Host "`n📋 환경 변수 설정 중...`n" -ForegroundColor Yellow

# Node.js 스크립트 실행
$nodeScript = @"
import https from 'https';

const token = '$token';
const projectName = '$projectName';
const envVars = $($envVars | ConvertTo-Json -Compress);
const environments = $($environments | ConvertTo-Json -Compress);

function apiRequest(method, path, data) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'api.vercel.com',
            port: 443,
            path: path,
            method: method,
            headers: {
                'Authorization': \`Bearer \${token}\`,
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
                        reject(new Error(\`API Error: \${res.statusCode} - \${parsed.error?.message || body}\`));
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

(async () => {
    try {
        // 프로젝트 정보 가져오기
        const project = await apiRequest('GET', \`/v9/projects/\${projectName}\`);
        console.log(\`✅ 프로젝트 찾음: \${project.name} (\${project.id})\\n\`);

        // 환경 변수 설정
        for (const [key, value] of Object.entries(envVars)) {
            console.log(\`설정 중: \${key}\`);
            for (const env of environments) {
                try {
                    await apiRequest('POST', \`/v10/projects/\${project.id}/env\`, {
                        key,
                        value,
                        type: 'encrypted',
                        target: [env]
                    });
                    console.log(\`   ✅ \${env}\`);
                } catch (error) {
                    if (error.message.includes('already exists')) {
                        console.log(\`   ⚠️ \${env} (이미 존재)\`);
                    } else {
                        console.log(\`   ❌ \${env}: \${error.message}\`);
                    }
                }
            }
            console.log('');
        }
        console.log('✅ 환경 변수 설정 완료!');
    } catch (error) {
        console.error('❌ 오류:', error.message);
        process.exit(1);
    }
})();
"@

# 임시 파일 생성
$tempFile = [System.IO.Path]::GetTempFileName() + ".js"
$nodeScript | Out-File -FilePath $tempFile -Encoding UTF8

try {
    Write-Host "Node.js 스크립트 실행 중...`n" -ForegroundColor Yellow
    node $tempFile
} catch {
    Write-Host "`n❌ 실행 실패: $_`n" -ForegroundColor Red
    Write-Host "💡 대신 Vercel Dashboard에서 수동으로 설정하세요:" -ForegroundColor Yellow
    Write-Host "   https://vercel.com/dashboard`n" -ForegroundColor Cyan
} finally {
    Remove-Item $tempFile -ErrorAction SilentlyContinue
}

Write-Host "`n💡 다음 단계:" -ForegroundColor Yellow
Write-Host "   1. Vercel Dashboard에서 환경 변수 확인" -ForegroundColor White
Write-Host "   2. 프로젝트 재배포`n" -ForegroundColor White
