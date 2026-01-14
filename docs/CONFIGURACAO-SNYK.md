# 🔐 **CONFIGURAÇÃO DE SEGURANÇA - SNYK TOKEN**

## 📋 **Como Configurar o Snyk no GitHub**

### **1. Criar Conta no Snyk**
1. Acesse: https://snyk.io/
2. Faça cadastro gratuito (permite até 200 scans/mês)
3. Conecte com seu GitHub

### **2. Obter Token de API**
1. Acesse: https://app.snyk.io/account
2. Vá em **Settings** → **General** 
3. Copie o **Auth Token**

### **3. Configurar Secret no GitHub**
1. Vá no seu repositório GitHub
2. **Settings** → **Secrets and variables** → **Actions**
3. Clique em **New repository secret**
4. **Name**: `SNYK_TOKEN`
5. **Secret**: Cole o token copiado do Snyk
6. Salve

### **4. Verificar Pipeline**
Após configurar o secret, o pipeline automaticamente:
- ✅ Executará análise de vulnerabilidades
- ✅ Detectará dependências inseguras  
- ✅ Reportará issues de segurança
- ✅ Bloqueará deploys com vulnerabilidades críticas

## 🚨 **CONFIGURAÇÕES OBRIGATÓRIAS DE PRODUÇÃO**

Além do Snyk, configure estes secrets obrigatórios:

```bash
# Secrets obrigatórios para produção
JWT_SECRET=sua_chave_jwt_super_segura_32_chars_min
SESSION_SECRET=sua_chave_sessao_diferente_32_chars
DB_PASSWORD=senha_super_segura_do_mysql
ENCRYPTION_KEY=chave_criptografia_32_caracteres_exatos!!

# Microsoft AD Integration (Sistema v1.1.0)
MICROSOFT_CLIENT_ID=seu_client_id_azure_ad
MICROSOFT_CLIENT_SECRET=seu_client_secret_azure_ad
MICROSOFT_TENANT_ID=seu_tenant_id

# Configurações de CORS
ALLOWED_ORIGINS=https://sua-app.com,https://admin.sua-app.com

# Configurações de banco (opcionais)
DB_CONNECTION_LIMIT=20
DB_SSL=false

# Rate Limiting (Recomendado)
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW=900000
```

## ⚡ **Como Testar Localmente**

1. **Instalar Snyk CLI:**
```bash
npm install -g snyk
```

2. **Autenticar:**
```bash
snyk auth
```

3. **Testar o projeto:**
```bash
cd backend
snyk test
```

4. **Gerar relatório:**
```bash
snyk test --json > snyk-report.json
```

## 🛡️ **Outras Ferramentas Recomendadas**

### **GitHub Security**
- Dependabot (já habilitado automaticamente)
- Code scanning com CodeQL
- Secret scanning

### **Auditoria Manual**
```bash
# Auditoria NPM
npm audit

# Fix automático
npm audit fix

# Auditoria específica
npm audit --audit-level moderate
```

## 📊 **Monitoramento Contínuo**

O pipeline agora inclui:
- 🔍 **Snyk**: Vulnerabilidades em dependências
- 🔒 **NPM Audit**: Auditoria nativa do Node
- 📈 **Codecov**: Cobertura de testes
- 🧪 **Jest**: Testes automatizados
- 🎨 **ESLint/Prettier**: Qualidade de código

## 🛡️ **Boas Práticas de Segurança - Sistema v1.1.0**

### **Microsoft AD Integration**
```bash
# Configurações seguras para produção
MICROSOFT_REDIRECT_URI=https://sua-app.com/auth/callback
MICROSOFT_SCOPE=openid,profile,email,User.Read
```

### **Validação de Tokens JWT**
- ✅ Tokens expiram em 1h (configurável)
- ✅ Refresh tokens para sessões longas
- ✅ Revogação imediata ao logout
- ✅ Validação de issuer e audience

### **Rate Limiting por Perfil**
- 👑 **Admin**: 200 req/15min
- 👥 **Usuários**: 100 req/15min
- 🔐 **Login**: 5 tentativas/15min

### **Auditoria de Acesso**
- 📝 Log de todas as operações administrativas
- 🔍 Tracking de acessos por usuário
- ⚠️ Alertas para ações suspeitas
- 📊 Relatórios de uso mensal

---

**⚠️ IMPORTANTE**: Sem o `SNYK_TOKEN`, a análise de segurança será **pulada** mas não **falhará** o build. Configure o token para segurança completa.

---

_Versão 1.1.0 - Setembro 2025 | Configuração de Segurança Atualizada_