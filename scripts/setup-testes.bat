@echo off
REM =============================================
REM SCRIPT DE INSTALACAO RAPIDA DOS TESTES - CMD
REM =============================================

echo.
echo CONFIGURANDO TESTES - SISTEMA DE AGENDA
echo ================================================
echo.

REM Verificar se estamos no diretorio correto
if not exist "backend" (
    echo Execute este script na raiz do projeto (onde esta a pasta backend)
    pause
    exit /b 1
)

echo Verificando estrutura do projeto...
echo.

REM Navegar para backend
cd backend

echo Instalando dependencias de teste...
echo.

REM Instalar dependencias de teste
call npm install --save-dev jest supertest @types/jest jest-environment-node mock-fs

echo.
echo Configurando ambiente de teste...

REM Criar .env.test
echo # CONFIGURACAO DE TESTE > .env.test
echo NODE_ENV=test >> .env.test
echo DB_NAME=agenda_mercadorias_test >> .env.test
echo DB_HOST=localhost >> .env.test
echo DB_PORT=3306 >> .env.test
echo DB_USER=root >> .env.test
echo DB_PASSWORD= >> .env.test
echo JWT_SECRET=test_secret_key_12345 >> .env.test
echo PORT=3001 >> .env.test

echo.
echo Estrutura de testes criada!

REM Voltar para raiz
cd ..

echo.
echo ================================================
echo INSTALACAO CONCLUIDA!
echo ================================================
echo.
echo COMANDOS DISPONIVEIS:
echo.
echo Backend:
echo   cd backend
echo   npm test                # Todos os testes
echo   npm run test:unit       # Testes unitarios
echo   npm run test:integration # Testes integracao
echo   npm run test:e2e        # Testes E2E
echo   npm run test:coverage   # Com cobertura
echo   npm run test:watch      # Modo watch
echo.
echo Frontend:
echo   Abrir: frontend/tests/index.html
echo.
echo Qualidade:
echo   npm run lint:check      # ESLint
echo   npm run format:check    # Prettier
echo.
echo PROXIMOS PASSOS:
echo.
echo 1. Execute: cd backend ^&^& npm test
echo 2. Verifique se todos os testes passam
echo 3. Configure MySQL se necessario
echo 4. Abra frontend/tests/index.html no navegador
echo 5. Commit as mudancas para ativar CI/CD
echo.
echo DOCUMENTACAO:
echo   Leia: docs/TESTES.md
echo.
echo Seu projeto agora esta no NIVEL PROFISSIONAL SENIOR!
echo.
pause
