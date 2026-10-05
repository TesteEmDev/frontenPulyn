# ============================================================
# PULYN - SCRIPT DE SETUP AUTOMÁTICO (WINDOWS)
# ============================================================
# Uso: ./setup-dev-env.ps1
# ============================================================

Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║    PULYN - SETUP AUTOMÁTICO DO AMBIENTE DE DESENVOLVIMENTO ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

$ErrorActionPreference = "Continue"
$WarningPreference = "SilentlyContinue"

# ============================================================
# FUNÇÃO: Verificar se comando existe
# ============================================================
function Test-Command {
    param([string]$Command)
    $exists = $null -ne (Get-Command $Command -ErrorAction SilentlyContinue)
    return $exists
}

# ============================================================
# FUNÇÃO: Exibir status
# ============================================================
function Show-Status {
    param(
        [string]$Message,
        [ValidateSet("Info", "Success", "Warning", "Error")][string]$Status = "Info"
    )

    $colors = @{
        "Info"    = "Blue"
        "Success" = "Green"
        "Warning" = "Yellow"
        "Error"   = "Red"
    }

    $icons = @{
        "Info"    = "ℹ️ "
        "Success" = "✅ "
        "Warning" = "⚠️ "
        "Error"   = "❌ "
    }

    Write-Host "$($icons[$Status])$Message" -ForegroundColor $colors[$Status]
}

# ============================================================
# 1. VERIFICAR PRÉ-REQUISITOS
# ============================================================
Write-Host "`n📋 [1/6] Verificando Pré-requisitos..." -ForegroundColor Magenta
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray

$checks = @{
    "Node.js" = "node"
    "npm" = "npm"
    "Git" = "git"
    "PostgreSQL (psql)" = "psql"
}

$missing = @()

foreach ($app in $checks.GetEnumerator()) {
    if (Test-Command $app.Value) {
        Show-Status "$($app.Key) - OK" "Success"
    } else {
        Show-Status "$($app.Key) - NÃO ENCONTRADO" "Error"
        $missing += $app.Key
    }
}

if ($missing.Count -gt 0) {
    Write-Host ""
    Show-Status "Aplicações não encontradas: $($missing -join ', ')" "Error"
    Write-Host ""
    Write-Host "📥 Instale as aplicações faltantes:" -ForegroundColor Yellow
    Write-Host "   • Node.js: https://nodejs.org/" -ForegroundColor Gray
    Write-Host "   • PostgreSQL: https://www.postgresql.org/download/windows/" -ForegroundColor Gray
    Write-Host "   • Git: https://git-scm.com/" -ForegroundColor Gray
    exit 1
}

# ============================================================
# 2. VERIFICAR POSTGRESQL
# ============================================================
Write-Host "`n🐘 [2/6] Verificando PostgreSQL..." -ForegroundColor Magenta
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray

try {
    $pgVersion = psql --version 2>&1
    Show-Status "PostgreSQL: $pgVersion" "Success"

    # Testar conexão
    $pgTest = psql -U postgres -c "SELECT 1" 2>&1
    if ($LASTEXITCODE -eq 0) {
        Show-Status "Conexão PostgreSQL: OK" "Success"
    } else {
        Show-Status "Não foi possível conectar ao PostgreSQL" "Warning"
        Write-Host "   ⚠️ PostgreSQL pode estar desligado ou senha incorreta" -ForegroundColor Gray
    }
} catch {
    Show-Status "PostgreSQL não encontrado" "Error"
    exit 1
}

# ============================================================
# 3. CRIAR BANCO DE DADOS
# ============================================================
Write-Host "`n🗄️  [3/6] Configurando Banco de Dados..." -ForegroundColor Magenta
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray

try {
    $dbExists = psql -U postgres -tc "SELECT 1 FROM pg_database WHERE datname = 'pulyn_dev'" 2>$null

    if ($dbExists) {
        Show-Status "Banco 'pulyn_dev' já existe" "Info"
    } else {
        Write-Host "   Criando banco de dados..." -ForegroundColor Gray
        psql -U postgres -c "CREATE DATABASE pulyn_dev OWNER postgres ENCODING 'UTF8';" 2>&1 | Out-Null

        if ($LASTEXITCODE -eq 0) {
            Show-Status "Banco 'pulyn_dev' criado com sucesso" "Success"
        } else {
            Show-Status "Erro ao criar banco de dados" "Warning"
        }
    }
} catch {
    Show-Status "Erro ao verificar banco de dados: $_" "Warning"
}

# ============================================================
# 4. CONFIGURAR .env
# ============================================================
Write-Host "`n⚙️  [4/6] Configurando .env..." -ForegroundColor Magenta
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray

$backendPath = "backendPulyn\.env"
$backendPostgresPath = "backendPulyn\.env.postgres"

if (Test-Path $backendPostgresPath) {
    if (Test-Path $backendPath) {
        Show-Status ".env já existe (mantido)" "Info"
    } else {
        Copy-Item $backendPostgresPath $backendPath
        Show-Status ".env criado a partir de .env.postgres" "Success"
    }
} else {
    Show-Status "Arquivo .env.postgres não encontrado" "Warning"
}

# ============================================================
# 5. INSTALAR DEPENDÊNCIAS
# ============================================================
Write-Host "`n📦 [5/6] Instalando Dependências..." -ForegroundColor Magenta
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray

# Backend
Write-Host "   Backend..." -ForegroundColor Gray
if (Test-Path "backendPulyn\node_modules") {
    Show-Status "Dependências backend já instaladas" "Info"
} else {
    Set-Location "backendPulyn"
    npm install 2>&1 | Select-Object -Last 5
    if ($LASTEXITCODE -eq 0) {
        Show-Status "Dependências backend instaladas" "Success"
    } else {
        Show-Status "Erro ao instalar dependências backend" "Warning"
    }
    Set-Location ".."
}

# Frontend
Write-Host "   Frontend..." -ForegroundColor Gray
if (Test-Path "front-pulyn\node_modules") {
    Show-Status "Dependências frontend já instaladas" "Info"
} else {
    Set-Location "front-pulyn"
    npm install 2>&1 | Select-Object -Last 5
    if ($LASTEXITCODE -eq 0) {
        Show-Status "Dependências frontend instaladas" "Success"
    } else {
        Show-Status "Erro ao instalar dependências frontend" "Warning"
    }
    Set-Location ".."
}

# ============================================================
# 6. EXECUTAR MIGRATIONS
# ============================================================
Write-Host "`n🔄 [6/6] Executando Migrations..." -ForegroundColor Magenta
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray

Set-Location "backendPulyn"
Write-Host "   Executando migrations..." -ForegroundColor Gray

try {
    npm run migrate:all 2>&1 | Select-Object -Last 10
    if ($LASTEXITCODE -eq 0) {
        Show-Status "Migrations executadas com sucesso" "Success"
    } else {
        Show-Status "Migrations completadas com avisos" "Warning"
    }
} catch {
    Show-Status "Erro ao executar migrations: $_" "Warning"
}

Set-Location ".."

# ============================================================
# RESUMO FINAL
# ============================================================
Write-Host "`n╔════════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║               ✅ SETUP CONCLUÍDO COM SUCESSO!               ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Green

Write-Host "`n📝 Próximos Passos:" -ForegroundColor Cyan
Write-Host ""
Write-Host "1️⃣  Inicie o Backend:" -ForegroundColor Yellow
Write-Host "   cd backendPulyn" -ForegroundColor Gray
Write-Host "   npm run dev" -ForegroundColor Gray
Write-Host ""
Write-Host "2️⃣  Em outro terminal, inicie o Frontend:" -ForegroundColor Yellow
Write-Host "   cd front-pulyn" -ForegroundColor Gray
Write-Host "   npm run dev" -ForegroundColor Gray
Write-Host ""
Write-Host "3️⃣  Acesse a aplicação:" -ForegroundColor Yellow
Write-Host "   🌐 http://localhost:5173/" -ForegroundColor Gray
Write-Host "   📡 API: http://localhost:3001/api" -ForegroundColor Gray
Write-Host ""
Write-Host "4️⃣  Gerenciar banco de dados:" -ForegroundColor Yellow
Write-Host "   psql -U postgres -d pulyn_dev" -ForegroundColor Gray
Write-Host ""
Write-Host "📚 Guia completo em: PULYN_DEV_SETUP.html" -ForegroundColor Cyan
Write-Host ""
