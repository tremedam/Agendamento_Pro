# =============================================
# SCRIPT DE INSTALACAO RAPIDA DOS TESTES
# =============================================

Write-Host "CONFIGURANDO TESTES - SISTEMA DE AGENDA" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan

# Verificar se estamos no diretorio correto
if (-not (Test-Path "backend")) {
    Write-Host "Execute este script na raiz do projeto (onde esta a pasta backend)" -ForegroundColor Red
    exit 1
}

Write-Host "Verificando estrutura do projeto..." -ForegroundColor Yellow

# Navegar para backend
Set-Location backend

Write-Host "Instalando dependencias de teste..." -ForegroundColor Yellow

# Instalar dependencias de teste
npm install --save-dev jest supertest "@types/jest" jest-environment-node mock-fs

Write-Host "Configurando Jest no package.json..." -ForegroundColor Yellow

# O Jest ja foi configurado no package.json atraves dos arquivos anteriores

Write-Host "Criando ambiente de teste..." -ForegroundColor Yellow

# Criar .env.test
$envTestContent = @"
# CONFIGURACAO DE TESTE
NODE_ENV=test
DB_NAME=agenda_mercadorias_test
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
JWT_SECRET=test_secret_key_12345
PORT=3001
"@

$envTestContent | Out-File -FilePath ".env.test" -Encoding UTF8

Write-Host "Estrutura de testes criada!" -ForegroundColor Green

# Voltar para raiz
Set-Location ..

Write-Host ""
Write-Host "INSTALACAO CONCLUIDA!" -ForegroundColor Green
Write-Host "========================" -ForegroundColor Green
Write-Host ""
Write-Host "COMANDOS DISPONIVEIS:" -ForegroundColor White
Write-Host ""
Write-Host "Backend:" -ForegroundColor Cyan
Write-Host "  cd backend" -ForegroundColor White
Write-Host "  npm test                # Todos os testes" -ForegroundColor White
Write-Host "  npm run test:unit       # Testes unitarios" -ForegroundColor White
Write-Host "  npm run test:integration # Testes integracao" -ForegroundColor White
Write-Host "  npm run test:e2e        # Testes E2E" -ForegroundColor White
Write-Host "  npm run test:coverage   # Com cobertura" -ForegroundColor White
Write-Host "  npm run test:watch      # Modo watch" -ForegroundColor White
Write-Host ""
Write-Host "Frontend:" -ForegroundColor Cyan
Write-Host "  Abrir: frontend/tests/index.html" -ForegroundColor White
Write-Host ""
Write-Host "Qualidade:" -ForegroundColor Cyan
Write-Host "  npm run lint:check      # ESLint" -ForegroundColor White
Write-Host "  npm run format:check    # Prettier" -ForegroundColor White
Write-Host ""
Write-Host "PROXIMOS PASSOS:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Execute: cd backend && npm test" -ForegroundColor White
Write-Host "2. Verifique se todos os testes passam" -ForegroundColor White
Write-Host "3. Configure MySQL se necessario" -ForegroundColor White
Write-Host "4. Abra frontend/tests/index.html no navegador" -ForegroundColor White
Write-Host "5. Commit as mudancas para ativar CI/CD" -ForegroundColor White
Write-Host ""
Write-Host "DOCUMENTACAO:" -ForegroundColor Yellow
Write-Host "  Leia: docs/TESTES.md" -ForegroundColor White
Write-Host ""
Write-Host "Seu projeto agora esta no NIVEL PROFISSIONAL SENIOR!" -ForegroundColor Green
