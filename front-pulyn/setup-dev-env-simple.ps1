# PULYN - SETUP SIMPLES (Windows PowerShell 5.1)

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "PULYN - SETUP AUTOMATICO DO AMBIENTE DE DESENVOLVIMENTO" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# 1. VERIFICAR PostgreSQL
Write-Host "[1/5] Verificando PostgreSQL..." -ForegroundColor Magenta
$pgTest = psql --version 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "[OK] PostgreSQL encontrado: $pgTest" -ForegroundColor Green
} else {
    Write-Host "[ERRO] PostgreSQL nao encontrado. Instale: https://www.postgresql.org/download/windows/" -ForegroundColor Red
    exit 1
}

# 2. CRIAR BANCO DE DADOS
Write-Host ""
Write-Host "[2/5] Criando banco pulyn_dev..." -ForegroundColor Magenta
psql -U postgres -c "CREATE DATABASE pulyn_dev OWNER postgres ENCODING 'UTF8';" 2>&1 | Out-Null
if ($LASTEXITCODE -eq 0 -or $LASTEXITCODE -eq 256) {
    Write-Host "[OK] Banco pulyn_dev pronto" -ForegroundColor Green
} else {
    Write-Host "[AVISO] Banco pode ja existir" -ForegroundColor Yellow
}

# 3. CONFIGURAR .env
Write-Host ""
Write-Host "[3/5] Configurando .env..." -ForegroundColor Magenta
if (-not (Test-Path "backendPulyn\.env")) {
    if (Test-Path "backendPulyn\.env.postgres") {
        Copy-Item "backendPulyn\.env.postgres" "backendPulyn\.env"
        Write-Host "[OK] .env criado a partir de .env.postgres" -ForegroundColor Green
    } else {
        Write-Host "[AVISO] .env.postgres nao encontrado" -ForegroundColor Yellow
    }
} else {
    Write-Host "[INFO] .env ja existe" -ForegroundColor Blue
}

# 4. INSTALAR DEPENDENCIAS
Write-Host ""
Write-Host "[4/5] Instalando dependencias..." -ForegroundColor Magenta

if (-not (Test-Path "backendPulyn\node_modules")) {
    Write-Host "  - Backend..." -ForegroundColor Gray
    Set-Location "backendPulyn"
    npm install 2>&1 | Select-Object -Last 3
    Set-Location ".."
    Write-Host "[OK] Backend pronto" -ForegroundColor Green
} else {
    Write-Host "[INFO] Backend ja tem node_modules" -ForegroundColor Blue
}

if (-not (Test-Path "front-pulyn\node_modules")) {
    Write-Host "  - Frontend..." -ForegroundColor Gray
    Set-Location "front-pulyn"
    npm install 2>&1 | Select-Object -Last 3
    Set-Location ".."
    Write-Host "[OK] Frontend pronto" -ForegroundColor Green
} else {
    Write-Host "[INFO] Frontend ja tem node_modules" -ForegroundColor Blue
}

# 5. MIGRATIONS
Write-Host ""
Write-Host "[5/5] Executando migrations..." -ForegroundColor Magenta
Set-Location "backendPulyn"
npm run migrate:all 2>&1 | Select-Object -Last 5
Write-Host "[OK] Migrations concluidas" -ForegroundColor Green
Set-Location ".."

# RESUMO
Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host "SETUP CONCLUIDO COM SUCESSO!" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
Write-Host ""
Write-Host "PROXIMOS PASSOS:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Terminal 1 - BACKEND:" -ForegroundColor Cyan
Write-Host "   cd backendPulyn" -ForegroundColor Gray
Write-Host "   npm run dev" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Terminal 2 - FRONTEND:" -ForegroundColor Cyan
Write-Host "   cd front-pulyn" -ForegroundColor Gray
Write-Host "   npm run dev" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Acesse:" -ForegroundColor Cyan
Write-Host "   http://localhost:5173" -ForegroundColor Gray
Write-Host ""
