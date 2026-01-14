# 📚 **DOCUMENTAÇÃO MESTRE DAS APIs - Sistema de Agenda**

**Versão**: 1.1.0  
**Base URL**: `http://localhost:3000` (desenvolvimento) | `https://api.example.com` (produção)  
**Autor**: Development Team  
**Última Atualização**: 19 de Setembro de 2025

> **🆕 Versão 1.1.0 - Mudanças de Autenticação:**
> - ✨ **Novo endpoint**: `/api/auth/login-usuario` para usuários gerais via Microsoft AD
> - 🔄 **Perfil atualizado**: Substituição de "loja" por "usuario" para acesso mais abrangente  
> - 🔧 **Compatibilidade**: Endpoint `/api/auth/login-loja` mantido para retrocompatibilidade
> - 👥 **Acesso ampliado**: Qualquer colaborador autenticado via Microsoft AD pode acessar o sistema

---

## 📋 **ÍNDICE**

1. [🎯 Visão Geral](#-visão-geral)
2. [🔐 Autenticação](#-autenticação)
3. [📋 Estrutura de Resposta](#-estrutura-de-resposta-padrão)
4. [🔐 APIs de Autenticação](#-apis-de-autenticação)
5. [📅 APIs de Agendamentos](#-apis-de-agendamentos)
6. [🏥 APIs de Health Check](#-apis-de-health-check)
7. [🧪 Guia de Testes](#-guia-de-testes)
8. [⚠️ Códigos de Erro](#-códigos-de-erro)
9. [🔒 Limites e Rate Limiting](#-limites-e-rate-limiting)
10. [🎭 Sistema de Máscaras Temporárias](#-sistema-de-máscaras-temporárias)
11. [📝 Exemplos de Integração](#-exemplos-de-integração)
12. [🛠️ Configuração e Deploy](#-configuração-e-deploy)
13. [📞 Suporte e Contato](#-suporte-e-contato)

---

## 🎯 **VISÃO GERAL**

O Sistema de Agenda oferece APIs RESTful modernas com arquitetura híbrida inovadora, combinando dados reais do sistema GEMCO com funcionalidades de máscaras temporárias para visualização e teste de cenários.

### **🔑 Características Principais:**
- 🛡️ **Segurança Enterprise** com rate limiting multicamadas
- 🎭 **Sistema de Máscaras Temporárias** (diferencial único)
- 🔄 **Arquitetura Híbrida** (dados reais + simulações)
- 📊 **Monitoramento Completo** com health checks
- 🔐 **Autenticação JWT** com sessões gerenciadas

---

## 🔐 **AUTENTICAÇÃO**

Todas as rotas da API (exceto health checks) requerem autenticação via **Bearer Token JWT**.

### **Header Obrigatório:**
```http
Authorization: Bearer <seu_jwt_token>
X-Session-Id: <id_da_sessao>
Content-Type: application/json
```

### **Como Obter Token:**
1. Fazer login via `POST /api/auth/login`
2. Usar token retornado no header `Authorization`
3. Token expira em 8 horas

---

## 📋 **ESTRUTURA DE RESPOSTA PADRÃO**

```json
{
  "success": true|false,
  "data": { ... },           // Presente apenas em sucesso
  "error": "mensagem",       // Presente apenas em erro
  "message": "info adicional",
  "timestamp": "2025-09-18T17:00:00.000Z",
  "code": "ERROR_CODE"       // Código específico do erro
}
```

---

# 🔐 **APIS DE AUTENTICAÇÃO**

## **POST** `/api/auth/login`
Realiza login no sistema com RE e senha.

### **Request:**
```http
POST /api/auth/login
Content-Type: application/json

{
  "re": "123456",
  "senha": "sua_senha"
}
```

### **Response (200 OK):**
```json
{
  "success": true,
  "message": "Login realizado com sucesso",
  "user": {
    "id": 1,
    "nome": "João Silva",
    "re": "123456",
    "perfil": "admin",
    "departamento": "LOGISTICA",
    "ativo": true
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": "8h"
}
```

### **Teste Manual:**
```bash
curl -X POST "http://localhost:3000/api/auth/login" \
     -H "Content-Type: application/json" \
     -d '{
       "re": "123456",
       "senha": "senha123"
     }'
```

### **Errors:**
- `400 Bad Request`: Dados inválidos
- `401 Unauthorized`: RE ou senha incorretos
- `429 Too Many Requests`: Muitas tentativas (5 max / 15 min)

### **Rate Limit:** 5 tentativas por IP a cada 15 minutos

---

## **POST** `/api/auth/login-usuario`
Autenticação automática para usuários gerais via Microsoft AD.

### **Request:**
```http
POST /api/auth/login-usuario
Content-Type: application/json

{
  "microsoftToken": "token_microsoft_opcional",
  "userInfo": { "tipo": "usuario" }
}
```

### **Response (200 OK):**
```json
{
  "success": true,
  "message": "Autenticação automática realizada com sucesso",
  "user": {
    "id": 5,
    "nome": "Usuário Geral",
    "perfil": "usuario",
    "ativo": true
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "authType": "microsoft",
  "expiresIn": "8h"
}
```

### **Teste Manual:**
```bash
curl -X POST "http://localhost:3000/api/auth/login-usuario" \
     -H "Content-Type: application/json" \
     -d '{
       "microsoftToken": "auto",
       "userInfo": {
         "tipo": "usuario"
       }
     }'
```

---

## **POST** `/api/auth/login-loja` *(Compatibilidade)*
Autenticação automática - mantida para compatibilidade com integrações existentes. **Recomenda-se usar `/login-usuario` para novas implementações.**

### **Request:**
```http
POST /api/auth/login-loja
Content-Type: application/json

{
  "microsoftToken": "token_microsoft_opcional",
  "userInfo": { "nome": "Usuario Geral" }
}
```

### **Response (200 OK):**
```json
{
  "success": true,
  "message": "Autenticação automática realizada com sucesso",
  "user": {
    "id": 5,
    "nome": "Usuário Geral",
    "perfil": "usuario",
    "ativo": true
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "authType": "microsoft",
  "expiresIn": "8h"
}
```

### **Teste Manual:**
```bash
curl -X POST "http://localhost:3000/api/auth/login-loja" \
     -H "Content-Type: application/json" \
     -d '{
       "microsoftToken": "token_opcional",
       "userInfo": {
         "nome": "Usuario Geral"
       }
     }'
```

---

## **GET** `/api/auth/check-microsoft`
Verifica se usuário já está autenticado via Microsoft.

### **Request:**
```http
GET /api/auth/check-microsoft
```

### **Response (200 OK):**
```json
{
  "success": true,
  "authenticated": true|false,
  "user": { ... }  // Se autenticado
}
```

### **Teste Manual:**
```bash
curl -X GET "http://localhost:3000/api/auth/check-microsoft"
```

---

## **POST** `/api/auth/logout`
Realiza logout e invalida o token atual.

### **Request:**
```http
POST /api/auth/logout
Authorization: Bearer <token>
```

### **Response (200 OK):**
```json
{
  "success": true,
  "message": "Logout realizado com sucesso"
}
```

---

# 📅 **APIS DE AGENDAMENTOS**

## **GET** `/api/agendamentos`
Lista agendamentos com suporte a máscaras temporárias.

### **Request:**
```http
GET /api/agendamentos?tipo=admin&mascaras=true&limit=50&offset=0
Authorization: Bearer <token>
X-Session-Id: <session_id>
```

### **Query Parameters:**
| Parâmetro | Tipo | Padrão | Descrição |
|-----------|------|--------|-----------|
| `tipo` | string | `usuario` | Tipo de usuário (`admin`, `usuario`) |
| `mascaras` | boolean | `true` | Incluir máscaras temporárias |
| `limit` | number | `50` | Limite de registros |
| `offset` | number | `0` | Offset para paginação |
| `status` | string | - | Filtrar por status |
| `fornecedor` | string | - | Filtrar por fornecedor |
| `data_inicio` | date | - | Data inicial (YYYY-MM-DD) |
| `data_fim` | date | - | Data final (YYYY-MM-DD) |

### **Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "produto": "PRODUTO TESTE",
      "descricao": "Descrição do produto",
      "fornecedor": "FORNECEDOR TESTE LTDA",
      "quantidade": 10,
      "data": "2025-09-25",
      "hora": "14:30",
      "status": "pendente",
      "origem": "ORIGINAL",
      "observacoes": "Observações do agendamento"
    }
  ],
  "total": 1,
  "page": 1,
  "mascarasAtivas": 0
}
```

### **Teste Manual:**
```bash
curl -X GET "http://localhost:3000/api/agendamentos?tipo=admin&mascaras=true" \
     -H "Authorization: Bearer SEU_TOKEN" \
     -H "X-Session-Id: sess_123456789"
```

---

## **POST** `/api/agendamentos`
Cria um novo agendamento temporário.

### **Request:**
```http
POST /api/agendamentos
Authorization: Bearer <token>
X-Session-Id: <session_id>
Content-Type: application/json

{
  "produto": "PRODUTO TESTE",
  "descricao": "Produto de teste via API",
  "fornecedor": "FORNECEDOR TESTE LTDA",
  "quantidade": 10,
  "data": "2025-09-25",
  "hora": "14:30",
  "observacoes": "Teste via API"
}
```

### **Response (201 Created):**
```json
{
  "success": true,
  "message": "Agendamento temporário criado com sucesso",
  "data": {
    "id": "temp_1632678900123",
    "produto": "PRODUTO TESTE",
    "quantidade": 10,
    "status": "temporario",
    "origem": "TEMPORARIO"
  }
}
```

### **Teste Manual:**
```bash
curl -X POST "http://localhost:3000/api/agendamentos" \
     -H "Authorization: Bearer SEU_TOKEN" \
     -H "Content-Type: application/json" \
     -H "X-Session-Id: sess_123456789" \
     -d '{
       "produto": "PRODUTO TESTE",
       "descricao": "Produto de teste via cURL",
       "fornecedor": "FORNECEDOR TESTE LTDA",
       "quantidade": 10,
       "data": "2025-09-25",
       "hora": "14:30",
       "observacoes": "Teste via API"
     }'
```

---

## **PUT** `/api/agendamentos/:id`
Atualiza um agendamento temporário existente.

### **Request:**
```http
PUT /api/agendamentos/temp_1632678900123
Authorization: Bearer <token>
X-Session-Id: <session_id>
Content-Type: application/json

{
  "quantidade": 25,
  "observacoes": "Quantidade atualizada"
}
```

### **Response (200 OK):**
```json
{
  "success": true,
  "message": "Agendamento temporário atualizado com sucesso",
  "data": {
    "id": "temp_1632678900123",
    "quantidade": 25,
    "observacoes": "Quantidade atualizada"
  }
}
```

### **Teste Manual:**
```bash
curl -X PUT "http://localhost:3000/api/agendamentos/temp_ID" \
     -H "Authorization: Bearer SEU_TOKEN" \
     -H "Content-Type: application/json" \
     -H "X-Session-Id: sess_123456789" \
     -d '{
       "quantidade": 25,
       "observacoes": "Quantidade atualizada"
     }'
```

---

## **POST** `/api/agendamentos/:id/aprovar`
Aprova um agendamento (apenas administradores).

### **Request:**
```http
POST /api/agendamentos/1/aprovar
Authorization: Bearer <token>
X-Session-Id: <session_id>
Content-Type: application/json

{
  "observacoes": "Aprovado - documentação completa"
}
```

### **Response (200 OK):**
```json
{
  "success": true,
  "message": "Agendamento aprovado com sucesso",
  "data": {
    "id": 1,
    "status": "aprovado",
    "aprovadoPor": "João Silva",
    "dataAprovacao": "2025-09-18T17:00:00.000Z"
  }
}
```

### **Teste Manual:**
```bash
curl -X POST "http://localhost:3000/api/agendamentos/1/aprovar" \
     -H "Authorization: Bearer SEU_TOKEN" \
     -H "Content-Type: application/json" \
     -H "X-Session-Id: sess_123456789" \
     -d '{
       "observacoes": "Aprovado - documentação completa"
     }'
```

---

## **POST** `/api/agendamentos/:id/rejeitar`
Rejeita um agendamento (apenas administradores).

### **Request:**
```http
POST /api/agendamentos/1/rejeitar
Authorization: Bearer <token>
X-Session-Id: <session_id>
Content-Type: application/json

{
  "motivo": "Documentação incompleta"
}
```

### **Response (200 OK):**
```json
{
  "success": true,
  "message": "Agendamento rejeitado com sucesso",
  "data": {
    "id": 1,
    "status": "rejeitado",
    "rejeitadoPor": "João Silva",
    "dataRejeicao": "2025-09-18T17:00:00.000Z",
    "motivo": "Documentação incompleta"
  }
}
```

### **Teste Manual:**
```bash
curl -X POST "http://localhost:3000/api/agendamentos/1/rejeitar" \
     -H "Authorization: Bearer SEU_TOKEN" \
     -H "Content-Type: application/json" \
     -H "X-Session-Id: sess_123456789" \
     -d '{
       "motivo": "Documentação incompleta"
     }'
```

---

## **DELETE** `/api/agendamentos/:id`
Remove um agendamento temporário.

### **Request:**
```http
DELETE /api/agendamentos/temp_1632678900123
Authorization: Bearer <token>
X-Session-Id: <session_id>
```

### **Response (200 OK):**
```json
{
  "success": true,
  "message": "Agendamento temporário removido com sucesso"
}
```

---

# 🏥 **APIS DE HEALTH CHECK**

## **GET** `/ping`
Health check básico - não requer autenticação.

### **Request:**
```http
GET /ping
```

### **Response (200 OK):**
```json
{
  "status": "ok",
  "timestamp": "2025-09-18T17:00:00.000Z",
  "environment": "development"
}
```

### **Teste Manual:**
```bash
curl -X GET "http://localhost:3000/ping"
```

---

## **GET** `/health`
Health check básico do sistema.

### **Response (200 OK):**
```json
{
  "status": "healthy",
  "timestamp": "2025-09-18T17:00:00.000Z",
  "uptime": 3600,
  "environment": "development",
  "version": "1.0.0",
  "system": {
    "memory": {
      "used": 45,
      "total": 128,
      "external": 12
    },
    "cpu": {
      "user": 1500,
      "system": 500
    }
  }
}
```

### **Teste Manual:**
```bash
curl -X GET "http://localhost:3000/health"
```

---

## **GET** `/health/detailed`
Health check detalhado (apenas para administradores).

### **Response (200 OK):**
```json
{
  "status": "healthy",
  "timestamp": "2025-09-18T17:00:00.000Z",
  "environment": "development",
  "security": {
    "secrets": {
      "environment": "development",
      "secretsLoaded": 4,
      "requiredSecrets": 2
    },
    "cors": {
      "environment": "development",
      "allowedOrigins": 10,
      "customOrigins": 0
    },
    "rateLimit": {
      "limits": {
        "general": { "windowMs": "15min", "max": 1000 },
        "login": { "windowMs": "15min", "max": 50 },
        "api": { "windowMs": "1min", "max": 100 }
      }
    }
  },
  "system": { /* detalhes do sistema */ },
  "environmentVariables": {
    "NODE_ENV": "development",
    "PORT": "3000",
    "DB_HOST": "localhost",
    "JWT_SECRET": "***CONFIGURED***",
    "DB_PASSWORD": "***CONFIGURED***"
  }
}
```

### **Teste Manual:**
```bash
curl -X GET "http://localhost:3000/health/detailed" \
     -H "Authorization: Bearer SEU_TOKEN"
```

---

## **GET** `/health/database`
Status específico do banco de dados.

### **Response (200 OK):**
```json
{
  "status": "healthy",
  "database": "agenda_mercadorias",
  "host": "localhost",
  "pool": {
    "limit": 20,
    "activeConnections": 3,
    "freeConnections": 17,
    "queuedRequests": 0
  },
  "timestamp": "2025-09-18T17:00:00.000Z"
}
```

### **Teste Manual:**
```bash
curl -X GET "http://localhost:3000/health/database" \
     -H "Authorization: Bearer SEU_TOKEN"
```

---

## **GET** `/health/rate-limits`
Informações sobre rate limiting atual.

### **Response (200 OK):**
```json
{
  "status": "healthy",
  "timestamp": "2025-09-18T17:00:00.000Z",
  "rateLimits": { /* configurações de limite */ },
  "clientInfo": {
    "ip": "127.0.0.1",
    "userAgent": "PostmanRuntime/7.28.4",
    "headers": ["content-type", "authorization", "user-agent"]
  }
}
```

### **Teste Manual:**
```bash
curl -X GET "http://localhost:3000/health/rate-limits" \
     -H "Authorization: Bearer SEU_TOKEN"
```

---

# 🧪 **GUIA DE TESTES**

## ⚙️ **Configuração Inicial**

### 1. Pré-requisitos
```bash
# Verificar se o servidor está rodando
curl http://localhost:3000/ping

# Resposta esperada: {"status":"ok","timestamp":"...","environment":"development"}
```

### 2. Variáveis de Ambiente para Testes
Configure estas variáveis no Postman ou em seus testes:

| Variável | Desenvolvimento | Produção |
|----------|----------------|-----------|
| `baseUrl` | `http://localhost:3000` | `https://api.example.com` |
| `authToken` | Preenchido após login | Preenchido após login |
| `sessionId` | Gerado automaticamente | Gerado automaticamente |

## 📦 **Postman Collection**

### Importar a Collection
1. Abra o Postman
2. Clique em "Import"
3. Selecione o arquivo `docs/postman-collection.json`
4. A collection "Sistema de Agenda - APIs" será criada

### Configurar Variáveis
1. Clique na collection
2. Vá para a aba "Variables"
3. Defina o `baseUrl` conforme seu ambiente

## 🎯 **Cenários de Teste**

### Cenário 1: Fluxo Completo do Administrador
1. ✅ **Login como admin** (`re: 123456`)
2. ✅ **Listar agendamentos existentes**
3. ✅ **Verificar máscaras temporárias**
4. ✅ **Aprovar um agendamento**
5. ✅ **Verificar status atualizado**
6. ✅ **Logout**

**Script de Teste:**
```bash
#!/bin/bash
BASE_URL="http://localhost:3000"

echo "🧪 Cenário 1: Fluxo Completo do Administrador"

# 1. Login
echo "🔐 Fazendo login como admin..."
TOKEN=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"re":"123456","senha":"senha123"}' | jq -r '.token')

echo "Token obtido: ${TOKEN:0:50}..."

# 2. Listar agendamentos
echo "📅 Listando agendamentos..."
curl -s "$BASE_URL/api/agendamentos?tipo=admin" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Session-Id: sess_$(date +%s)" | jq .

# 3. Health check
echo "🏥 Verificando saúde do sistema..."
curl -s "$BASE_URL/health/detailed" \
  -H "Authorization: Bearer $TOKEN" | jq .status

echo "✅ Cenário 1 concluído!"
```

### Cenário 2: Fluxo do Usuário Geral
1. ✅ **Login como usuário geral**
2. ✅ **Criar agendamento temporário**
3. ✅ **Atualizar agendamento**
4. ✅ **Listar para verificar mudanças**
5. ✅ **Excluir agendamento temporário**

**Script de Teste:**
```bash
#!/bin/bash
BASE_URL="http://localhost:3000"
SESSION_ID="sess_$(date +%s)"

echo "🧪 Cenário 2: Fluxo do Usuário Geral"

# 1. Login como usuário geral
echo "🔐 Fazendo login como usuário..."
TOKEN=$(curl -s -X POST "$BASE_URL/api/auth/login-usuario" \
  -H "Content-Type: application/json" \
  -d '{"userInfo":{"tipo":"usuario"}}' | jq -r '.token')

# 2. Criar agendamento temporário
echo "📋 Criando agendamento temporário..."
TEMP_ID=$(curl -s -X POST "$BASE_URL/api/agendamentos" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "X-Session-Id: $SESSION_ID" \
  -d '{
    "produto": "PRODUTO TESTE USUARIO",
    "fornecedor": "FORNECEDOR TESTE",
    "quantidade": 5,
    "data": "2025-09-25",
    "hora": "10:00"
  }' | jq -r '.data.id')

echo "Agendamento criado: $TEMP_ID"

# 3. Atualizar agendamento
echo "✏️ Atualizando agendamento..."
curl -s -X PUT "$BASE_URL/api/agendamentos/$TEMP_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "X-Session-Id: $SESSION_ID" \
  -d '{"quantidade": 10}' | jq .

# 4. Verificar mudanças
echo "🔍 Verificando mudanças..."
curl -s "$BASE_URL/api/agendamentos?mascaras=true" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Session-Id: $SESSION_ID" | jq '.data[] | select(.id=="'$TEMP_ID'")'

echo "✅ Cenário 2 concluído!"
```

### Cenário 3: Teste de Rate Limiting
1. ✅ **Fazer 6 tentativas de login falhadas** (deve bloquear na 6ª)
2. ✅ **Aguardar 15 minutos ou reiniciar servidor**
3. ✅ **Fazer 31 requests para `/api/agendamentos`** (deve limitar na 31ª)
4. ✅ **Verificar headers de rate limit**

**Script de Teste:**
```bash
#!/bin/bash
BASE_URL="http://localhost:3000"

echo "🧪 Cenário 3: Teste de Rate Limiting"

# 1. Testar rate limit de login
echo "🔐 Testando rate limit de login..."
for i in {1..6}; do
  echo "Tentativa $i..."
  RESPONSE=$(curl -s -w "%{http_code}" -X POST "$BASE_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"re":"123456","senha":"senha_errada"}')
  echo "Status: ${RESPONSE: -3}"
  if [[ "${RESPONSE: -3}" == "429" ]]; then
    echo "✅ Rate limit ativado na tentativa $i"
    break
  fi
  sleep 1
done

# 2. Verificar headers de rate limit
echo "🔍 Verificando headers de rate limit..."
curl -I "$BASE_URL/health/rate-limits" 2>/dev/null | grep -i "x-ratelimit"

echo "✅ Cenário 3 concluído!"
```

### Cenário 4: Teste de Segurança
1. ✅ **Tentar acessar endpoint sem token**
2. ✅ **Tentar usar token expirado**
3. ✅ **Verificar headers de segurança** (CORS, CSP)
4. ✅ **Testar validação de dados**

**Script de Teste:**
```bash
#!/bin/bash
BASE_URL="http://localhost:3000"

echo "🧪 Cenário 4: Teste de Segurança"

# 1. Acesso sem token
echo "🔒 Testando acesso sem token..."
STATUS=$(curl -s -w "%{http_code}" -X GET "$BASE_URL/api/agendamentos" -o /dev/null)
echo "Status sem token: $STATUS (deve ser 401)"

# 2. Token inválido
echo "🔒 Testando token inválido..."
STATUS=$(curl -s -w "%{http_code}" -X GET "$BASE_URL/api/agendamentos" \
  -H "Authorization: Bearer token_invalido" -o /dev/null)
echo "Status token inválido: $STATUS (deve ser 401)"

# 3. Headers de segurança
echo "🛡️ Verificando headers de segurança..."
curl -I "$BASE_URL/health" 2>/dev/null | grep -E "(Content-Security-Policy|X-Frame-Options|X-Content-Type-Options)"

# 4. Validação de dados
echo "📝 Testando validação de dados..."
TOKEN=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"re":"123456","senha":"senha123"}' | jq -r '.token')

STATUS=$(curl -s -w "%{http_code}" -X POST "$BASE_URL/api/agendamentos" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "X-Session-Id: sess_test" \
  -d '{"produto":""}' -o /dev/null)
echo "Status dados inválidos: $STATUS (deve ser 400 ou 422)"

echo "✅ Cenário 4 concluído!"
```

## 🔍 **Monitoramento Durante Testes**

### Health Checks Úteis

```bash
# Status geral do sistema
curl -X GET "http://localhost:3000/health/detailed" \
     -H "Authorization: Bearer SEU_TOKEN"

# Status específico do banco
curl -X GET "http://localhost:3000/health/database" \
     -H "Authorization: Bearer SEU_TOKEN"

# Informações sobre rate limits
curl -X GET "http://localhost:3000/health/rate-limits" \
     -H "Authorization: Bearer SEU_TOKEN"
```

### Logs Importantes
Monitore o console do servidor para:
- `✅ Login bem-sucedido para RE: XXXXXX`
- `🛡️ Rate limit aplicado para IP: X.X.X.X`
- `🎭 Máscara temporária criada: temp_XXXXXXX`
- `⚠️ Tentativa de login rejeitada`

## ⚠️ **Troubleshooting**

### Problemas Comuns

#### 1. "Token inválido ou expirado"
```bash
# Fazer novo login
curl -X POST "http://localhost:3000/api/auth/login" \
     -H "Content-Type: application/json" \
     -d '{"re": "123456", "senha": "senha123"}'
```

#### 2. "Rate limit excedido"
- **Login**: Aguarde 15 minutos ou reinicie o servidor
- **API**: Aguarde 1 minuto
- **Geral**: Aguarde 15 minutos

#### 3. "Erro de conexão"
```bash
# Verificar se o servidor está rodando
curl http://localhost:3000/ping

# Se não responder, iniciar o servidor
cd backend
npm start
```

#### 4. "Session ID inválido"
- Gere um novo Session ID: `sess_` + timestamp
- Use o mesmo Session ID para toda a sessão de máscaras

### Códigos de Status HTTP

| Código | Significado | Ação |
|--------|-------------|------|
| 200 | Sucesso | ✅ Continuar |
| 201 | Criado com sucesso | ✅ Continuar |
| 400 | Dados inválidos | 🔧 Verificar payload |
| 401 | Não autorizado | 🔑 Fazer login |
| 403 | Proibido | ⚠️ Verificar permissões |
| 429 | Rate limit excedido | ⏳ Aguardar |
| 500 | Erro interno | 🐛 Verificar logs |

---

# ⚠️ **CÓDIGOS DE ERRO**

## **4xx - Erros do Cliente**

| Código | Nome | Descrição | Ação Recomendada |
|--------|------|-----------|-------------------|
| 400 | Bad Request | Dados inválidos na requisição | Verificar formato dos dados |
| 401 | Unauthorized | Token ausente ou inválido | Fazer login novamente |
| 403 | Forbidden | Sem permissão para o recurso | Verificar perfil de usuário |
| 404 | Not Found | Recurso não encontrado | Verificar URL e ID |
| 422 | Unprocessable Entity | Validação falhou | Corrigir dados conforme mensagem |
| 429 | Too Many Requests | Rate limit excedido | Aguardar e tentar novamente |

## **5xx - Erros do Servidor**

| Código | Nome | Descrição | Ação Recomendada |
|--------|------|-----------|-------------------|
| 500 | Internal Server Error | Erro interno do servidor | Contatar suporte |
| 502 | Bad Gateway | Problema de conectividade | Verificar status do sistema |
| 503 | Service Unavailable | Serviço temporariamente indisponível | Aguardar e tentar novamente |

---

# 🔒 **LIMITES E RATE LIMITING**

## **Por Tipo de Endpoint:**

| Endpoint | Limite | Janela | Observações |
|----------|--------|--------|-------------|
| **Login** | 5 req | 15 min | Por IP, proteção brute force |
| **API Geral** | 30 req | 1 min | Operações CRUD |
| **Global** | 100 req | 15 min | Limite geral por IP |
| **Health Check** | Ilimitado | - | Monitoramento livre |

## **Por Perfil de Usuário (v1.1.0):**

| Perfil | Limite | Janela | Observações |
|--------|--------|--------|-------------|
| **Admin** | 200 req | 15 min | Acesso completo, limites maiores |
| **Usuario** | 100 req | 15 min | Usuários gerais via Microsoft AD |
| **Anônimo** | 10 req | 5 min | Apenas health checks e login |

## **Headers de Rate Limit:**
```http
X-RateLimit-Limit: 30
X-RateLimit-Remaining: 27
X-RateLimit-Reset: 1632678900
Retry-After: 60
```

---

# 🎭 **SISTEMA DE MÁSCARAS TEMPORÁRIAS**

## **Como Funciona:**

1. **Sessão Única**: Cada usuário recebe uma sessão única
2. **Máscaras Temporárias**: Modificações não persistem no GEMCO
3. **Visualização Híbrida**: Combina dados reais + máscaras
4. **Expiração Automática**: Máscaras expiram em 8 horas
5. **Isolamento**: Cada sessão vê apenas suas próprias máscaras

## **Tipos de Dados:**

- `ORIGINAL`: Dados reais do sistema GEMCO
- `TEMPORARIO`: Máscaras temporárias (IDs começam com `temp_`)

## **Casos de Uso:**

- 🧪 **Testes de Cenários** sem afetar dados reais
- 📊 **Demonstrações** para clientes
- 🎯 **Simulações** de carga de trabalho
- 🔍 **Análise de "E se?"** sem riscos

## **Teste do Sistema de Máscaras:**

```bash
# 1. Login e obter token
TOKEN=$(curl -s -X POST "http://localhost:3000/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"re":"123456","senha":"senha123"}' | jq -r '.token')

# 2. Gerar Session ID único
SESSION_ID="sess_$(date +%s)"

# 3. Criar máscara temporária
curl -X POST "http://localhost:3000/api/agendamentos" \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -H "X-Session-Id: $SESSION_ID" \
     -d '{
       "produto": "PRODUTO MÁSCARA",
       "fornecedor": "FORNECEDOR TESTE",
       "quantidade": 100
     }'

# 4. Verificar máscara na lista
curl -X GET "http://localhost:3000/api/agendamentos?mascaras=true" \
     -H "Authorization: Bearer $TOKEN" \
     -H "X-Session-Id: $SESSION_ID"

# 5. Testar isolamento - usar Session ID diferente
curl -X GET "http://localhost:3000/api/agendamentos?mascaras=true" \
     -H "Authorization: Bearer $TOKEN" \
     -H "X-Session-Id: sess_diferente"
```

---

# 📝 **EXEMPLOS DE INTEGRAÇÃO**

## **JavaScript/Fetch:**
```javascript
class AgendaAPI {
  constructor(baseUrl = 'http://localhost:3000') {
    this.baseUrl = baseUrl;
    this.token = localStorage.getItem('auth_token');
    this.sessionId = localStorage.getItem('session_id') || `sess_${Date.now()}`;
  }

  async login(re, senha) {
    const response = await fetch(`${this.baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ re, senha })
    });
    
    if (response.ok) {
      const data = await response.json();
      this.token = data.token;
      localStorage.setItem('auth_token', this.token);
      localStorage.setItem('session_id', this.sessionId);
      return data;
    }
    
    throw new Error('Login failed');
  }

  async getAgendamentos(filtros = {}) {
    const params = new URLSearchParams(filtros);
    
    const response = await fetch(`${this.baseUrl}/api/agendamentos?${params}`, {
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'X-Session-Id': this.sessionId
      }
    });
    
    return response.json();
  }

  async criarAgendamento(dados) {
    const response = await fetch(`${this.baseUrl}/api/agendamentos`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'X-Session-Id': this.sessionId,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(dados)
    });
    
    return response.json();
  }

  async healthCheck() {
    const response = await fetch(`${this.baseUrl}/health`);
    return response.json();
  }
}

// Exemplo de uso
const api = new AgendaAPI();

// Login
await api.login('123456', 'senha123');

// Buscar agendamentos
const agendamentos = await api.getAgendamentos({ 
  tipo: 'admin', 
  mascaras: true 
});

// Criar agendamento temporário
const novoAgendamento = await api.criarAgendamento({
  produto: 'PRODUTO JS',
  fornecedor: 'FORNECEDOR JS',
  quantidade: 5,
  data: '2025-09-25',
  hora: '15:00'
});
```

## **Python/Requests:**
```python
import requests
import json
from datetime import datetime

class AgendaAPI:
    def __init__(self, base_url='http://localhost:3000'):
        self.base_url = base_url
        self.token = None
        self.session_id = f"sess_{int(datetime.now().timestamp())}"
    
    def login(self, re, senha):
        """Faz login e obtém token JWT"""
        response = requests.post(f'{self.base_url}/api/auth/login', 
            json={'re': re, 'senha': senha})
        
        if response.status_code == 200:
            data = response.json()
            self.token = data['token']
            return data
        else:
            raise Exception(f"Login failed: {response.status_code}")
    
    def _get_headers(self):
        """Retorna headers padrão com autenticação"""
        return {
            'Authorization': f'Bearer {self.token}',
            'X-Session-Id': self.session_id,
            'Content-Type': 'application/json'
        }
    
    def get_agendamentos(self, **filtros):
        """Lista agendamentos com filtros opcionais"""
        response = requests.get(f'{self.base_url}/api/agendamentos', 
            headers=self._get_headers(),
            params=filtros)
        return response.json()
    
    def criar_agendamento(self, dados):
        """Cria um novo agendamento temporário"""
        response = requests.post(f'{self.base_url}/api/agendamentos', 
            headers=self._get_headers(),
            json=dados)
        return response.json()
    
    def aprovar_agendamento(self, id_agendamento, observacoes=""):
        """Aprova um agendamento"""
        response = requests.post(f'{self.base_url}/api/agendamentos/{id_agendamento}/aprovar', 
            headers=self._get_headers(),
            json={'observacoes': observacoes})
        return response.json()
    
    def health_check(self):
        """Verifica saúde da API"""
        response = requests.get(f'{self.base_url}/health')
        return response.json()

# Exemplo de uso
if __name__ == "__main__":
    # Inicializar API
    api = AgendaAPI()
    
    # Login
    try:
        login_result = api.login('123456', 'senha123')
        print(f"✅ Login realizado: {login_result['user']['nome']}")
        
        # Verificar saúde
        health = api.health_check()
        print(f"🏥 Status do sistema: {health['status']}")
        
        # Listar agendamentos
        agendamentos = api.get_agendamentos(tipo='admin', mascaras=True)
        print(f"📅 Total de agendamentos: {agendamentos.get('total', 0)}")
        
        # Criar agendamento de teste
        novo = api.criar_agendamento({
            'produto': 'PRODUTO PYTHON',
            'fornecedor': 'FORNECEDOR PYTHON LTDA',
            'quantidade': 15,
            'data': '2025-09-26',
            'hora': '16:00',
            'observacoes': 'Criado via Python SDK'
        })
        print(f"✅ Agendamento criado: {novo['data']['id']}")
        
    except Exception as e:
        print(f"❌ Erro: {e}")
```

## **cURL - Scripts de Automação:**

### Script Completo de Teste
```bash
#!/bin/bash

# Configurações
BASE_URL="http://localhost:3000"
RE="123456"
SENHA="senha123"
SESSION_ID="sess_$(date +%s)"

# Cores para output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🧪 Iniciando Teste Completo da API${NC}"

# Função para verificar status HTTP
check_status() {
    if [ "$1" -eq 200 ] || [ "$1" -eq 201 ]; then
        echo -e "${GREEN}✅ Sucesso (HTTP $1)${NC}"
        return 0
    else
        echo -e "${RED}❌ Falhou (HTTP $1)${NC}"
        return 1
    fi
}

# 1. Teste de conectividade
echo -e "\n${YELLOW}📡 1. Testando conectividade...${NC}"
STATUS=$(curl -s -w "%{http_code}" -o /tmp/response.json "$BASE_URL/ping")
check_status $STATUS

# 2. Login
echo -e "\n${YELLOW}🔐 2. Fazendo login...${NC}"
LOGIN_RESPONSE=$(curl -s -w "%{http_code}" -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"re\":\"$RE\",\"senha\":\"$SENHA\"}")

STATUS=${LOGIN_RESPONSE: -3}
RESPONSE_BODY=${LOGIN_RESPONSE%???}

if check_status $STATUS; then
    TOKEN=$(echo "$RESPONSE_BODY" | jq -r '.token')
    USER_NAME=$(echo "$RESPONSE_BODY" | jq -r '.user.nome')
    echo -e "${GREEN}👤 Usuário logado: $USER_NAME${NC}"
    echo -e "${GREEN}🔑 Token: ${TOKEN:0:30}...${NC}"
else
    echo -e "${RED}❌ Falha no login. Abortando testes.${NC}"
    exit 1
fi

# Headers para próximas requisições
AUTH_HEADERS=(
    -H "Authorization: Bearer $TOKEN"
    -H "X-Session-Id: $SESSION_ID"
    -H "Content-Type: application/json"
)

# 3. Verificar health
echo -e "\n${YELLOW}🏥 3. Verificando saúde do sistema...${NC}"
HEALTH_RESPONSE=$(curl -s "${AUTH_HEADERS[@]}" "$BASE_URL/health/detailed")
DB_STATUS=$(echo "$HEALTH_RESPONSE" | jq -r '.database.status // "unknown"')
echo -e "${GREEN}💾 Status do banco: $DB_STATUS${NC}"

# 4. Listar agendamentos
echo -e "\n${YELLOW}📅 4. Listando agendamentos...${NC}"
AGENDAMENTOS=$(curl -s "${AUTH_HEADERS[@]}" "$BASE_URL/api/agendamentos?tipo=admin&mascaras=true")
TOTAL=$(echo "$AGENDAMENTOS" | jq '.total // 0')
MASCARAS=$(echo "$AGENDAMENTOS" | jq '.mascarasAtivas // 0')
echo -e "${GREEN}📊 Total: $TOTAL agendamentos, $MASCARAS máscaras ativas${NC}"

# 5. Criar agendamento temporário
echo -e "\n${YELLOW}📋 5. Criando agendamento temporário...${NC}"
NOVO_AGENDAMENTO=$(curl -s "${AUTH_HEADERS[@]}" -X POST "$BASE_URL/api/agendamentos" \
  -d '{
    "produto": "PRODUTO TESTE CURL",
    "descricao": "Criado via script de teste",
    "fornecedor": "FORNECEDOR TESTE LTDA",
    "quantidade": 20,
    "data": "2025-09-26",
    "hora": "17:00",
    "observacoes": "Teste automatizado"
  }')

if TEMP_ID=$(echo "$NOVO_AGENDAMENTO" | jq -r '.data.id'); then
    echo -e "${GREEN}✅ Agendamento criado: $TEMP_ID${NC}"
    
    # 6. Atualizar agendamento
    echo -e "\n${YELLOW}✏️ 6. Atualizando agendamento...${NC}"
    curl -s "${AUTH_HEADERS[@]}" -X PUT "$BASE_URL/api/agendamentos/$TEMP_ID" \
      -d '{"quantidade": 25, "observacoes": "Quantidade atualizada via script"}' > /dev/null
    echo -e "${GREEN}✅ Agendamento atualizado${NC}"
    
    # 7. Verificar atualização
    echo -e "\n${YELLOW}🔍 7. Verificando atualização...${NC}"
    UPDATED=$(curl -s "${AUTH_HEADERS[@]}" "$BASE_URL/api/agendamentos?mascaras=true" | \
      jq ".data[] | select(.id==\"$TEMP_ID\") | .quantidade")
    echo -e "${GREEN}📊 Nova quantidade: $UPDATED${NC}"
    
    # 8. Remover agendamento temporário
    echo -e "\n${YELLOW}🗑️ 8. Removendo agendamento temporário...${NC}"
    curl -s "${AUTH_HEADERS[@]}" -X DELETE "$BASE_URL/api/agendamentos/$TEMP_ID" > /dev/null
    echo -e "${GREEN}✅ Agendamento removido${NC}"
else
    echo -e "${RED}❌ Falha ao criar agendamento${NC}"
fi

# 9. Teste de rate limit (apenas login para não quebrar outros endpoints)
echo -e "\n${YELLOW}🛡️ 9. Testando rate limit...${NC}"
echo "Fazendo 3 tentativas de login inválidas..."
for i in {1..3}; do
    STATUS=$(curl -s -w "%{http_code}" -X POST "$BASE_URL/api/auth/login" \
      -H "Content-Type: application/json" \
      -d '{"re":"123456","senha":"senha_errada"}' -o /dev/null)
    echo "Tentativa $i: HTTP $STATUS"
    if [ "$STATUS" -eq 429 ]; then
        echo -e "${GREEN}✅ Rate limit funcionando${NC}"
        break
    fi
    sleep 0.5
done

# 10. Logout
echo -e "\n${YELLOW}👋 10. Fazendo logout...${NC}"
curl -s -X POST "$BASE_URL/api/auth/logout" \
  -H "Authorization: Bearer $TOKEN" > /dev/null
echo -e "${GREEN}✅ Logout realizado${NC}"

echo -e "\n${GREEN}🎉 Todos os testes concluídos com sucesso!${NC}"

# Resumo final
echo -e "\n${YELLOW}📊 RESUMO DOS TESTES:${NC}"
echo -e "✅ Conectividade"
echo -e "✅ Autenticação (Login/Logout)"
echo -e "✅ Health Checks"
echo -e "✅ CRUD de Agendamentos"
echo -e "✅ Sistema de Máscaras Temporárias"
echo -e "✅ Rate Limiting"
echo -e "✅ Headers de Segurança"
```

## **Node.js SDK Completo:**
```javascript
const axios = require('axios');

class AgendaSDK {
    constructor(options = {}) {
        this.baseUrl = options.baseUrl || 'http://localhost:3000';
        this.token = options.token || null;
        this.sessionId = options.sessionId || `sess_${Date.now()}`;
        
        // Configurar axios instance
        this.http = axios.create({
            baseURL: this.baseUrl,
            timeout: options.timeout || 10000,
            headers: {
                'Content-Type': 'application/json',
            }
        });

        // Interceptor para adicionar token automaticamente
        this.http.interceptors.request.use(
            (config) => {
                if (this.token && !config.headers.Authorization) {
                    config.headers.Authorization = `Bearer ${this.token}`;
                    config.headers['X-Session-Id'] = this.sessionId;
                }
                return config;
            },
            (error) => Promise.reject(error)
        );

        // Interceptor para tratar respostas
        this.http.interceptors.response.use(
            (response) => response.data,
            (error) => {
                if (error.response?.status === 401) {
                    this.token = null; // Token expirado
                }
                throw new Error(
                    error.response?.data?.error || 
                    error.message || 
                    'Erro desconhecido'
                );
            }
        );
    }

    // Autenticação
    async login(re, senha) {
        try {
            const response = await this.http.post('/api/auth/login', { re, senha });
            this.token = response.token;
            return response;
        } catch (error) {
            throw new Error(`Login failed: ${error.message}`);
        }
    }

    async loginUsuario(userInfo = { tipo: 'usuario' }, microsoftToken = 'auto') {
        const response = await this.http.post('/api/auth/login-usuario', {
            userInfo,
            microsoftToken
        });
        this.token = response.token;
        return response;
    }

    async loginLoja(userInfo = {}, microsoftToken = null) {
        // DEPRECATED: Mantido para compatibilidade - use loginUsuario() para novos projetos
        const response = await this.http.post('/api/auth/login-loja', {
            userInfo,
            microsoftToken
        });
        this.token = response.token;
        return response;
    }

    async logout() {
        await this.http.post('/api/auth/logout');
        this.token = null;
    }

    async checkMicrosoft() {
        return await this.http.get('/api/auth/check-microsoft');
    }

    // Agendamentos
    async getAgendamentos(filtros = {}) {
        const params = new URLSearchParams(filtros);
        return await this.http.get(`/api/agendamentos?${params}`);
    }

    async criarAgendamento(dados) {
        return await this.http.post('/api/agendamentos', dados);
    }

    async atualizarAgendamento(id, dados) {
        return await this.http.put(`/api/agendamentos/${id}`, dados);
    }

    async aprovarAgendamento(id, observacoes = '') {
        return await this.http.post(`/api/agendamentos/${id}/aprovar`, {
            observacoes
        });
    }

    async rejeitarAgendamento(id, motivo) {
        return await this.http.post(`/api/agendamentos/${id}/rejeitar`, {
            motivo
        });
    }

    async excluirAgendamento(id) {
        return await this.http.delete(`/api/agendamentos/${id}`);
    }

    // Health Checks
    async ping() {
        return await this.http.get('/ping');
    }

    async healthCheck() {
        return await this.http.get('/health');
    }

    async detailedHealth() {
        return await this.http.get('/health/detailed');
    }

    async databaseHealth() {
        return await this.http.get('/health/database');
    }

    async rateLimitInfo() {
        return await this.http.get('/health/rate-limits');
    }

    // Utilitários
    isAuthenticated() {
        return !!this.token;
    }

    setToken(token) {
        this.token = token;
    }

    setSessionId(sessionId) {
        this.sessionId = sessionId;
    }

    // Método para testar conectividade completa
    async testConnection() {
        try {
            const ping = await this.ping();
            const health = await this.healthCheck();
            
            return {
                status: 'connected',
                ping: ping.status,
                health: health.status,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            return {
                status: 'error',
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }
}

// Exemplo de uso do SDK
async function exemploUso() {
    const api = new AgendaSDK({
        baseUrl: 'http://localhost:3000',
        timeout: 15000
    });

    try {
        // Testar conexão
        console.log('🔗 Testando conexão...');
        const connection = await api.testConnection();
        console.log('Conexão:', connection);

        // Login
        console.log('🔐 Fazendo login...');
        const loginResult = await api.login('123456', 'senha123');
        console.log('Login:', loginResult.user.nome);

        // Health check detalhado
        console.log('🏥 Verificando saúde do sistema...');
        const health = await api.detailedHealth();
        console.log('Sistema:', health.status);

        // Listar agendamentos
        console.log('📅 Buscando agendamentos...');
        const agendamentos = await api.getAgendamentos({
            tipo: 'admin',
            mascaras: true,
            limit: 10
        });
        console.log(`Encontrados ${agendamentos.total} agendamentos`);

        // Criar agendamento temporário
        console.log('📋 Criando agendamento...');
        const novo = await api.criarAgendamento({
            produto: 'PRODUTO NODE SDK',
            fornecedor: 'FORNECEDOR SDK LTDA',
            quantidade: 30,
            data: '2025-09-27',
            hora: '18:00',
            observacoes: 'Criado via Node.js SDK'
        });
        console.log('Criado:', novo.data.id);

        // Atualizar agendamento
        console.log('✏️ Atualizando agendamento...');
        await api.atualizarAgendamento(novo.data.id, {
            quantidade: 35,
            observacoes: 'Quantidade atualizada via SDK'
        });
        console.log('Atualizado com sucesso');

        // Excluir agendamento
        console.log('🗑️ Excluindo agendamento...');
        await api.excluirAgendamento(novo.data.id);
        console.log('Excluído com sucesso');

        // Logout
        console.log('👋 Fazendo logout...');
        await api.logout();
        console.log('Logout realizado');

        console.log('✅ Todos os testes concluídos!');

    } catch (error) {
        console.error('❌ Erro:', error.message);
    }
}

module.exports = AgendaSDK;

// Se executado diretamente, rodar exemplo
if (require.main === module) {
    exemploUso();
}
```

---

# 🛠️ **CONFIGURAÇÃO E DEPLOY**

## **Variáveis de Ambiente Obrigatórias:**

```env
# Produção
NODE_ENV=production
JWT_SECRET=sua_chave_jwt_segura_32_chars_minimo
SESSION_SECRET=chave_sessao_diferente_32_chars
DB_PASSWORD=senha_mysql_super_segura
ALLOWED_ORIGINS=https://app.com.br,https://admin.com.br

# Desenvolvimento
NODE_ENV=development
JWT_SECRET=dev_jwt_secret_change_in_prod
DB_HOST=localhost
DB_PORT=3306
DB_NAME=agenda_mercadorias
```

## **Configuração de Banco:**
```sql
CREATE DATABASE agenda_mercadorias;
-- Executar scripts em /backend/database/
```

## **Deploy com Docker:**
```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
EXPOSE 3000

CMD ["npm", "start"]
```

```yaml
# docker-compose.yml
version: '3.8'
services:
  api:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - JWT_SECRET=${JWT_SECRET}
      - DB_PASSWORD=${DB_PASSWORD}
    depends_on:
      - db
      
  db:
    image: mysql:8.0
    environment:
      MYSQL_DATABASE: agenda_mercadorias
      MYSQL_ROOT_PASSWORD: ${DB_PASSWORD}
    volumes:
      - mysql_data:/var/lib/mysql
      - ./backend/database/init.sql:/docker-entrypoint-initdb.d/init.sql

volumes:
  mysql_data:
```

---

# 📞 **SUPORTE E CONTATO**

- **Documentação Técnica**: `/docs/DOCUMENTACAO-TECNICA.md`
- **Configuração Snyk**: `/docs/CONFIGURACAO-SNYK.md`
- **Repositório**: https://github.com/tremedam/AgendaReceb_Mercadorias
- **Versão da API**: 1.1.0
- **Última Atualização**: 19 de Setembro de 2025

## **Links Úteis:**
- [Postman Collection](postman-collection.json)
- [OpenAPI Specification](openapi.yaml)
- [README Principal](../README.md)
- [Backend README](BACKEND-README.md)
- [Frontend README](FRONTEND-README.md)

## **Para Desenvolvedores:**
- **Issues**: Reporte bugs no GitHub
- **Pull Requests**: Contribuições são bem-vindas
- **Testes**: Execute `npm test` antes de enviar PRs
- **Documentação**: Mantenha docs atualizadas

---

**© 2025 Sistema de Agenda de Recebimento de Mercadorias**  
**APIs desenvolvidas com Node.js, Express, MySQL e arquitetura de segurança enterprise.**

---

# 🎯 **QUICK START**

Para começar rapidamente:

1. **Clone o repositório**
2. **Execute `npm install`** no backend
3. **Configure as variáveis de ambiente**
4. **Execute `npm start`**
5. **Teste com:** `curl http://localhost:3000/ping`
6. **Importe a Postman Collection** para testes completos

**Happy Coding! 🚀**