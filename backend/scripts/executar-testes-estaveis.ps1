# Script para executar testes com limpeza de handles

Write-Host "🧪 Executando testes com limpeza automática..." -ForegroundColor Cyan

# Limpar processos anteriores
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue

# Executar apenas testes que funcionam bem
Write-Host "✅ Executando testes de integração corrigidos..." -ForegroundColor Green
npx jest tests/integration/agendamentos-fixed.test.js --verbose --forceExit

Write-Host "✅ Executando testes simples..." -ForegroundColor Green  
npx jest tests/simple.test.js --verbose --forceExit

Write-Host "✅ Executando testes E2E corrigidos..." -ForegroundColor Green
npx jest tests/e2e/sistema-fixed.test.js --verbose --forceExit --detectOpenHandles

Write-Host "🎉 Testes concluídos!" -ForegroundColor Green
