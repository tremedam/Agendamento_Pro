# ⚙️ Backend - Sistema de Agenda de Recebimento de Mercadorias

Este documento descreve a estrutura e funcionamento do backend do Sistema de Agenda de Recebimento
de Mercadorias.

## 📁 Estrutura de Pastas

```
backend/
├── server-hibrido.js          # Servidor principal Express
├── setup-env.js               # Script de configuração de ambiente
├── package.json               # Dependências e scripts NPM
├── .env                       # Variáveis de ambiente (local)
├── .env.example              # Exemplo de configuração
├── database/                 # Camada de dados e persistência
│   ├── DatabaseManager.js   # Gerenciador principal do banco
│   ├── schema.sql           # Schema SQL completo
│   ├── init.sql             # Dados iniciais
│   ├── criar-banco.js       # Script de criação do banco
│   ├── setup.js             # Setup automatizado
│   └── agendamentos-temporarios.json  # Cache de máscaras
├── scripts/                  # Scripts utilitários
│   ├── setup-automatico.js  # Configuração automática
│   ├── setup-sqlite.js      # Configuração SQLite
│   └── migrar-dados-mockados.js  # Migração de dados
└── src/                      # Código fonte principal
    ├── config/              # Configurações do sistema
    ├── controllers/         # Controladores de rotas
    ├── middleware/          # Middlewares Express
    ├── models/              # Modelos de dados
    ├── routes/              # Definição de rotas
    ├── services/            # Lógica de negócios
    └── utils/               # Utilitários e helpers
```

---

## 🏗️ Arquitetura do Sistema

### 🎭 Sistema Híbrido

O backend implementa uma **arquitetura híbrida inovadora** que combina:

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend      │ ←→ │  Backend API     │ ←→ │  MySQL/GEMCO    │
│                 │    │                  │    │                 │
│ - Admin UI      │    │ - REST API       │    │ - Dados Reais   │
│ - Usuario UI    │    │ - Session Mgmt   │    │ - Histórico     │
│ - Auth          │    │ - Híbrido Logic  │    │ - Configurações │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                ↕️
                       ┌──────────────────┐
                       │ Máscaras Temp    │
                       │                  │
                       │ - JSON File      │
                       │ - Session Cache  │
                       │ - Visual Only    │
                       └──────────────────┘
```

**Componentes Principais**:

- **Dados GEMCO**: Sistema real de produção (imutável)
- **Máscaras Temporárias**: Modificações visuais não-persistentes
- **Session Manager**: Gerencia estado temporário por usuário
- **Database Manager**: Interface unificada para dados reais

---

## 🚀 Servidor Principal (`server-hibrido.js`)

### 📋 Funcionalidades

**Express.js Server** com as seguintes características:

- ✅ **CORS** configurado para desenvolvimento
- 🔐 **Session Management** integrado
- 📊 **Middleware de logging** personalizado
- 🛡️ **Tratamento de erros** centralizado
- 🔄 **Graceful shutdown** implementado

### 🌐 Endpoints Principais

| Método     | Endpoint                          | Descrição                            |
| ---------- | --------------------------------- | ------------------------------------ |
| `GET`      | `/api/health`                     | Health check do sistema              |
| `GET`      | `/api/info`                       | Informações da API                   |
| `GET`      | `/api/agendamentos`               | Listar agendamentos (com máscaras)   |
| `POST`     | `/api/agendamentos`               | Criar agendamento temporário         |
| `PUT`      | `/api/agendamentos/:id`           | Editar agendamento                   |
| `DELETE`   | `/api/agendamentos/:id`           | Remover agendamento                  |
| `POST`     | `/api/agendamentos/:id/aprovar`   | Aprovar agendamento                  |
| `POST`     | `/api/auth/login`                 | Autenticação de usuário              |
| `GET`      | `/api/gemco/dados`                | Dados originais do GEMCO             |
| ---------- | --------------------------------- | ------------------------------------ |

### ⚙️ Middlewares Implementados

```javascript
// CORS - Desenvolvimento amigável
app.use(
  cors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
  })
);

// Body parsing
app.use(express.json({ limit: '10mb' }));

// Session management
app.use(
  session({
    secret: process.env.JWT_SECRET,
    resave: false,
    saveUninitialized: false
  })
);

// Request logging
app.use((req, res, next) => {
  logger.debug(`${req.method} ${req.url}`);
  next();
});
```

---

## 💾 Camada de Dados (`/database`)

### 🗄️ DatabaseManager.js

**Gerenciador principal** que unifica acesso a dados reais e temporários:

**Funcionalidades**:

- 🔌 **Conexão MySQL** configurável por ambiente
- 🎭 **Integração com SessionManager** para máscaras
- 🔄 **Fallback gracioso** quando MySQL indisponível
- 📊 **CRUD completo** para agendamentos
- 🔍 **Busca inteligente** combinando dados reais + máscaras

**Método Principal**:

```javascript
async buscarAgendamentosComMascaras(sessaoId, tipoUsuario) {
  // 1. Buscar dados reais do GEMCO
  const dadosReais = await this.buscarAgendamentos();

  // 2. Aplicar máscaras temporárias
  const mascaras = this.sessionManager.listarAgendamentosTemporarios(sessaoId);

  // 3. Mesclar dados
  return this.aplicarMascaras(dadosReais, mascaras);
}
```

### 📄 Schema SQL (`schema.sql`)

**Estrutura completa do banco** com tabelas:

- 👥 **usuarios** - Gestão de usuários e perfis
- 🏢 **fornecedores** - Cadastro de fornecedores
- 📦 **agendamentos** - Agendamentos principais
- 📝 **agendamentos_detalhes** - Detalhes dos agendamentos
- ✅ **aprovacoes** - Workflow de aprovação
- 📊 **logs_sistema** - Auditoria completa

### 🔧 Scripts de Setup

**`criar-banco.js`** - Criação automática do banco **`setup.js`** - População com dados iniciais
**`init.sql`** - Dados de exemplo e configuração

---

## 🔧 Configuração (`/src/config`)

### ⏰ ConfiguracaoTempo.js

**Gerencia configurações temporais** do sistema:

```javascript
const configuracoes = {
  desenvolvimento: {
    duracao: 2, // 2 horas
    limpezaAutomatica: true,
    intervaloLimpeza: 30 // 30 minutos
  },
  producao: {
    duracao: 8, // 8 horas
    limpezaAutomatica: true,
    intervaloLimpeza: 60 // 1 hora
  }
};
```

**Funcionalidades**:

- ⏱️ **Duração de sessões** por ambiente
- 🧹 **Limpeza automática** de dados expirados
- 🔄 **Conversão de tempos** (horas ↔ ms)
- 📅 **Gestão de expiração** de máscaras

---

## 🎯 Controladores (`/src/controllers`)

### 🔐 authController.js

**Gerencia autenticação de usuários**:

```javascript
class AuthController {
  async login(req, res) {
    // Validar credenciais
    // Gerar JWT token
    // Criar sessão
    // Retornar dados do usuário
  }

  async logout(req, res) {
    // Invalidar token
    // Limpar sessão
    // Limpar máscaras temporárias
  }
}
```

---

## 🛡️ Middlewares (`/src/middleware`)

### 🔒 auth.js

**Middleware de autenticação JWT**:

- ✅ Validação de tokens
- 👤 Extração de dados do usuário
- ⏰ Verificação de expiração
- 🔄 Renovação automática

### ✔️ validation.js

**Middleware de validação de dados**:

- 📝 Validação de entrada usando express-validator
- 🛡️ Sanitização de dados
- ❌ Tratamento de erros de validação
- 📋 Mensagens de erro padronizadas

---

## 🛣️ Rotas (`/src/routes`)

### 📋 agendamentos.js

**Rotas principais do sistema** com funcionalidades híbridas:

```javascript
// GET /agendamentos - Buscar com máscaras aplicadas
router.get('/', obterSessaoUsuario, async (req, res) => {
  const dados = await serviceHibrido.buscarDadosComMascaras(req.sessaoId, req.tipoUsuario);
  res.json({ success: true, data: dados });
});

// POST /agendamentos - Criar temporário (não persiste no GEMCO)
router.post('/', [validacao], async (req, res) => {
  const id = await serviceHibrido.criarAgendamentoVisual(req.sessaoId, req.body);
  res.json({ success: true, id, tipo: 'TEMPORARIO' });
});
```

### 🔐 auth.js

**Rotas de autenticação** (v1.1.0):

- `POST /login` - Autenticação administrativa (RE + senha)
- `POST /login-usuario` - Autenticação usuários gerais (Microsoft AD)
- `POST /login-loja` - Compatibilidade (descontinuado, redirect para /login-usuario)
- `POST /logout` - Encerramento de sessão
- `GET /verify` - Verificação de token
- `POST /refresh` - Renovação de token
- `GET /me` - Dados do usuário atual

---

## 🔄 Serviços (`/src/services`)

### 🎭 AgendamentosServiceHibrido.js

**Serviço principal** que implementa a lógica híbrida:

**Operações Seguras** (Somente Leitura):

```javascript
async buscarDadosOriginais() {
  // Retorna dados puros do GEMCO (sem modificações)
}

async buscarDadosComMascaras(sessaoId, tipoUsuario) {
  // Retorna dados com máscaras aplicadas
}
```

**Operações Temporárias** (Não Persistem):

```javascript
async criarAgendamentoVisual(sessaoId, dados) {
  // Cria agendamento APENAS para visualização
  // Não afeta o GEMCO
}

async editarAgendamentoVisual(sessaoId, id, novosDados) {
  // Edita visualmente sem tocar nos dados reais
}

async aprovarAgendamentoVisual(sessaoId, id, usuarioId) {
  // Aprova APENAS visualmente
  // Para aprovar no GEMCO, usar sistema GEMCO diretamente
}
```

### 👥 SessionManager.js

**Gerenciador de sessões e máscaras temporárias**:

**Estrutura de Dados**:

```javascript
// Map<mesAno, Map<usuarioId, Map<id, agendamento>>>
this.agendamentosPorMes = new Map();
```

**Funcionalidades Principais**:

- 🗂️ **Organização por mês/ano** para performance
- 👤 **Isolamento por usuário** para segurança
- 💾 **Persistência em JSON** para recuperação
- ⏰ **Expiração automática** de máscaras
- 🧹 **Limpeza periódica** de dados antigos

### 🔐 authService.js

**Serviço de autenticação**:

- 🔑 Geração e validação de JWT
- 👤 Gestão de perfis de usuário
- 🔄 Renovação de tokens
- 📊 Log de atividades de autenticação

---

## 🔧 Utilitários (`/src/utils`)

### 📝 logger.js

**Sistema de logging profissional** que substitui console.log:

**Níveis de Log**:

- 🔍 **debug**: Apenas em desenvolvimento
- ℹ️ **info**: Informações gerais
- ⚠️ **warn**: Avisos importantes
- ❌ **error**: Erros críticos
- ✅ **success**: Operações bem-sucedidas
- 🔄 **process**: Processos em andamento

**Configuração Inteligente**:

```javascript
class Logger {
  constructor() {
    this.isDevelopment = process.env.NODE_ENV !== 'production';
    this.enabledLevels = {
      debug: this.isDevelopment, // Apenas dev
      info: this.isDevelopment, // Apenas dev
      warn: true, // Sempre
      error: true // Sempre
    };
  }
}
```

---

## 🗃️ Modelos (`/src/models`)

### 👤 userModel.js

**Modelo de dados do usuário**:

```javascript
class UserModel {
  static async findByEmail(email) {
    // Busca usuário por email
  }

  static async create(userData) {
    // Cria novo usuário
  }

  static async updateLastLogin(id) {
    // Atualiza último login
  }
}
```

---

## 📦 Dependências e Scripts

### 📋 package.json

**Dependências Principais**:

```json
{
  "dependencies": {
    "express": "^4.18.2", // Framework web
    "mysql2": "^3.6.3", // Driver MySQL
    "cors": "^2.8.5", // CORS middleware
    "bcrypt": "^5.1.1", // Hash de senhas
    "jsonwebtoken": "^9.0.2", // JWT tokens
    "express-validator": "^7.2.1", // Validação
    "dotenv": "^16.4.5" // Variáveis de ambiente
  }
}
```

**Scripts NPM**:

```json
{
  "scripts": {
    "start": "node server-hibrido.js",
    "dev": "node server-hibrido.js",
    "create-db": "node database/criar-banco.js",
    "setup": "node database/setup.js",
    "setup:env": "node setup-env.js",
    "dev:local": "npm run setup:env local && npm start"
  }
}
```

---

## ⚙️ Configuração de Ambiente

### 🔧 setup-env.js

**Script inteligente** para configuração de ambiente:

```bash
# Configurar para desenvolvimento local
npm run setup:env local

# Configurar para empresa
npm run setup:env empresa

# Iniciar com configuração local
npm run dev:local
```

**Funcionalidades**:

- 📋 **Backup automático** de configurações existentes
- 🔄 **Troca rápida** entre ambientes
- ✅ **Validação** de arquivos de configuração
- 💡 **Instruções** contextuais para setup

### 📄 Arquivos de Ambiente

**`.env.example`** - Template de configuração:

```env
# Configurações do Banco
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=SUA_SENHA_AQUI
DB_NAME=agenda_mercadorias

# JWT
JWT_SECRET=sua_chave_secreta_aqui

# Microsoft AD Integration (v1.1.0)
MICROSOFT_CLIENT_ID=seu_client_id_azure_ad
MICROSOFT_CLIENT_SECRET=seu_client_secret_azure_ad  
MICROSOFT_TENANT_ID=seu_tenant_id
MICROSOFT_REDIRECT_URI=http://localhost:3000/auth/callback

# Ambiente
NODE_ENV=development
PORT=3000

# Rate Limiting (Opcional)
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW=900000
```

---

## 🎭 Sistema de Máscaras Temporárias

### 🌟 Funcionalidade Inovadora

O sistema implementa **máscaras temporárias** que permitem:

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Dados GEMCO   │ +  │  Máscaras Temp  │ =  │ Visão do Usuário│
│                 │    │                 │    │                 │
│ • Agendamento A │    │ • A modificado  │    │ • A (modificado)│
│ • Agendamento B │    │ • C novo        │    │ • B (original)  │
│                 │    │                 │    │ • C (novo temp) │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### 🔄 Ciclo de Vida das Máscaras

1. **Criação**: Usuário cria/edita agendamento
2. **Armazenamento**: Dados salvos como máscara temporal
3. **Exibição**: Frontend mostra dados mascarados
4. **Expiração**: Máscaras expiram automaticamente
5. **Limpeza**: Sistema remove dados antigos

### 💾 Persistência Híbrida

```
GEMCO (MySQL) ←────────── Dados Reais (Imutáveis)
                          ↕️
JSON File ←─────────────── Máscaras Temporárias
                          ↕️
Memory Cache ←──────────── Sessões Ativas
```

---

## 🚀 Instalação e Setup

### 📋 Pré-requisitos

- **Node.js** >= 16.0.0
- **MySQL** >= 8.0 (para produção)
- **NPM** ou **Yarn**

### 🔧 Instalação

```bash
# 1. Instalar dependências
cd backend
npm install

# 2. Configurar ambiente
npm run setup:env local

# 3. Configurar banco (se MySQL disponível)
npm run create-db
npm run setup

# 4. Iniciar servidor
npm start
```

### 🗄️ Setup de Banco

**Automático**:

```bash
npm run install-complete  # Cria banco + popula dados
```

**Manual**:

```bash
mysql -u root -p < database/schema.sql
mysql -u root -p agenda_mercadorias < database/init.sql
```

---

## 🧪 Desenvolvimento e Debug

### 🔍 Logs de Debug

```javascript
// Habilitar logs detalhados
NODE_ENV=development npm start

// Logs por categoria
logger.debug('Info de desenvolvimento');  // Apenas em dev
logger.info('Info geral');                // Apenas em dev
logger.warn('Aviso importante');          // Sempre
logger.error('Erro crítico');             // Sempre
```

### 📊 Monitoramento

**Health Check**:

```bash
curl http://localhost:3000/api/health
```

**Info do Sistema**:

```bash
curl http://localhost:3000/api/info
```

### 🔧 Troubleshooting Comum

| Problema                | Solução                                      |
| ----------------------- | -------------------------------------------- |
| Erro de conexão MySQL   | Verificar se servidor MySQL está rodando     |
| JWT_SECRET não definido | Configurar .env com JWT_SECRET               |
| Porta 3000 ocupada      | Alterar PORT no .env                         |
| Permissões de banco     | Verificar usuário/senha MySQL                |
| Máscaras não funcionam  | Verificar se JSON file tem permissão escrita |

---

## 📊 Performance e Otimização

### ⚡ Otimizações Implementadas

- **Connection Pooling**: Reuso de conexões MySQL
- **Cache de Sessão**: Máscaras em memória
- **Lazy Loading**: Carregamento sob demanda
- **JSON Persistence**: Backup rápido de máscaras
- **Debouncing**: Reduz escritas frequentes

### 📈 Métricas Esperadas

- **Response Time**: < 200ms para consultas
- **Throughput**: 100+ req/s
- **Memory Usage**: < 100MB
- **CPU Usage**: < 30%

---

## 🔐 Segurança

### 🛡️ Medidas Implementadas

- **JWT Authentication**: Tokens seguros
- **CORS Configuration**: Origens controladas
- **Input Validation**: express-validator
- **SQL Injection Protection**: mysql2 prepared statements
- **Session Management**: Express-session
- **Password Hashing**: bcrypt

### 🔒 Melhores Práticas

- Variáveis sensíveis em .env
- Tokens com expiração
- Validação em todas as rotas
- Logs de auditoria
- Tratamento de erros padronizado

---

## 🔮 Arquitetura Futura

### 🆕 Melhorias Planejadas

- [ ] **Redis Cache**: Para sessions distribuídas
- [ ] **GraphQL API**: Queries mais flexíveis
- [ ] **WebSocket**: Real-time updates
- [ ] **Microservices**: Separação de responsabilidades
- [ ] **Docker**: Containerização
- [ ] **TypeScript**: Type safety
- [ ] **Unit Tests**: Cobertura de testes
- [ ] **API Documentation**: OpenAPI/Swagger

### 📊 Escalabilidade

```
┌─────────────────┐
│   Load Balancer │
└─────────┬───────┘
          │
    ┌─────┴─────┬─────────┐
    │           │         │
┌───▼───┐  ┌───▼───┐ ┌───▼───┐
│API #1 │  │API #2 │ │API #3 │
└───┬───┘  └───┬───┘ └───┬───┘
    │          │         │
    └──────────┼─────────┘
               │
        ┌──────▼──────┐
        │   Database  │
        │   Cluster   │
        └─────────────┘
```

---

## 📞 Suporte e Contato

**Documentação**: `/docs`  
**Issues**: Sistema interno  
**Wiki**: Confluence interno

---

## 📝 Changelog

### v1.1.0 (Atual) - Setembro 2025

- ✅ **Sistema de autenticação atualizado** - Perfil "usuario" substituindo "loja"
- ✅ **Microsoft AD Integration** - Auto-login corporativo via Azure AD
- ✅ **Endpoints atualizados** - `/login-usuario` para usuários gerais
- ✅ **Compatibilidade mantida** - Suporte a endpoints legados
- ✅ **Rate limiting** - Proteção por perfil de usuário
- ✅ **Auditoria avançada** - Tracking de acessos e operações

### v1.0.0 (Base)

- ✅ Sistema híbrido implementado
- ✅ Máscaras temporárias funcionais
- ✅ API REST completa
- ✅ Sistema de logging profissional
- ✅ Autenticação JWT
- ✅ Setup automatizado

---

_Versão 1.1.0 - Setembro 2025 | Sistema "usuario" + Microsoft AD_  
_Este documento é mantido pela equipe de backend._
