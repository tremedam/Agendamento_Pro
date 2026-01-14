# 🛠️ **LOGGING E TESTES - Sistema de Agenda**

Esta documentação unificada abrange os aspectos técnicos fundamentais do sistema: **Logging** e **Testes**.

---

## 📋 **ÍNDICE**

1. [Sistema de Logging](#-sistema-de-logging)
   - [Configuração](#configuração-de-ambiente)
   - [Níveis de Log](#níveis-de-log-disponíveis)
   - [Como Usar](#como-usar-o-logger)
   - [Controle Dinâmico](#controle-dinâmico)
2. [Sistema de Testes](#-sistema-de-testes)
   - [Visão Geral](#visão-geral)
   - [Configuração Inicial](#configuração-inicial)
   - [Tipos de Testes](#tipos-de-testes)
   - [Executando Testes](#executando-testes)
3. [Integração Logging + Testes](#-integração-logging--testes)
4. [CI/CD e Automação](#-cicd-e-automação)
5. [Troubleshooting](#-troubleshooting)
6. [Boas Práticas](#-boas-práticas)

---

## 📝 **SISTEMA DE LOGGING**

### **Configuração de Ambiente**

#### Para Desenvolvimento:
```bash
NODE_ENV=development
```
- ✅ Todos os logs habilitados (debug, info, warn, error)
- 🎨 Logs com timestamp e formatação detalhada
- 🌈 Console colorido com emojis

#### Para Produção:
```bash
NODE_ENV=production
```
- ⚡ Apenas logs de warn e error habilitados
- 🚀 Logs sem formatação desnecessária
- 📈 Melhor performance

#### Para Testes:
```bash
NODE_ENV=test
```
- 🔇 Logs minimizados para não poluir saída dos testes
- 📊 Apenas erros críticos são exibidos

### **Níveis de Log Disponíveis**

|   Nível   | Desenvolvimento | Produção | Testes | Descrição |
|-----------|-----------------|----------|--------|-----------|
|  `debug`  | ✅ | ❌ | ❌ | Informações detalhadas de desenvolvimento |
|  `info`   | ✅ | ❌ | ❌ | Informações gerais da aplicação |
| `success` | ✅ | ❌ | ✅ | Confirmações de operações bem-sucedidas |
| `process` | ✅ | ❌ | ❌ | Indicadores de processos em andamento |
|  `warn`   | ✅ | ✅ | ✅ | Avisos importantes |
|  `error`  | ✅ | ✅ | ✅ | Erros críticos |

### **Como Usar o Logger**

```javascript
const logger = require('../src/utils/logger');

// Logs apenas em desenvolvimento
logger.debug('Informação detalhada para debug');
logger.info('Operação realizada com sucesso');
logger.success('Conexão estabelecida');
logger.process('Processando dados...');

// Logs sempre habilitados (warn/error)
logger.warn('Atenção: recurso não disponível');
logger.error('Erro crítico na aplicação', error);

// Em testes - use success para marcos importantes
logger.success('✅ Teste passou: dados inseridos corretamente');
```

### **Controle Dinâmico**

```javascript
// Desabilitar todos os logs
logger.silent();

// Habilitar/desabilitar nível específico
logger.setLevel('debug', false);
logger.setLevel('info', true);

// Útil em testes para debug específico
if (process.env.TEST_DEBUG === 'true') {
  logger.setLevel('debug', true);
}
```

---

## 🧪 **SISTEMA DE TESTES**

### **Visão Geral**

#### **Por que Testes?**
- ✅ **Garantir qualidade** do código
- 🐛 **Detectar bugs** antes da produção
- 🔒 **Manter estabilidade** durante mudanças
- 📈 **Facilitar manutenção** e refatoração
- 💼 **Demonstrar profissionalismo**

#### **Cobertura Implementada**
- **Backend**: Testes unitários, integração e E2E
- **Frontend**: Testes de interface e funcionalidade
- **CI/CD**: Pipeline automatizado no GitHub Actions
- **Qualidade**: ESLint, Prettier, auditoria de segurança

### **Configuração Inicial**

#### **1. Instalar Dependências de Teste**
```bash
# Backend
cd backend
npm install --save-dev jest supertest @types/jest jest-environment-node mock-fs

# Raiz do projeto (já configurado)
npm install --save-dev eslint prettier
```

#### **2. Configurar Ambiente de Teste**
```bash
# Criar arquivo de ambiente para testes
echo "NODE_ENV=test" > backend/.env.test
echo "DB_NAME=agenda_mercadorias_test" >> backend/.env.test
echo "JWT_SECRET=test_secret_key" >> backend/.env.test
echo "LOG_LEVEL=error" >> backend/.env.test
```

#### **3. Verificar Estrutura**
```
backend/tests/
├── setup.js                 # Configuração global + logger
├── helpers/                 # Utilitários de teste
│   ├── auth-helper.js      # Mock de autenticação
│   └── test-setup.js       # Setup do Express
├── mocks/                   # Mocks reutilizáveis
│   └── MockDatabaseManager.js
├── unit/                    # Testes unitários
├── integration/             # Testes de integração
└── e2e/                     # Testes end-to-end
```

### **Tipos de Testes**

#### **1. Testes Unitários** 🧩
**Propósito**: Testar funções/classes isoladamente

```javascript
// Exemplo: AgendamentosServiceHibrido.test.js
const logger = require('../../src/utils/logger');

describe('AgendamentosServiceHibrido', () => {
  beforeAll(() => {
    // Configurar logging para testes
    logger.setLevel('debug', process.env.TEST_DEBUG === 'true');
  });

  test('deve criar agendamento visual temporário', async () => {
    logger.debug('Testando criação de agendamento visual');
    
    const service = new AgendamentosServiceHibrido(mockDb);
    const result = await service.criarAgendamentoVisual('session', dados);
    
    logger.success('Agendamento criado com sucesso no teste');
    expect(result.tipo).toBe('TEMPORARIO');
  });
});
```

**Executar**:
```bash
npm run test:unit
```

#### **2. Testes de Integração** 🔗
**Propósito**: Testar APIs e integração entre componentes

```javascript
// Exemplo: agendamentos.routes.test.js
const logger = require('../../src/utils/logger');

describe('GET /api/agendamentos', () => {
  test('deve retornar lista de agendamentos', async () => {
    logger.debug('Testando endpoint GET /api/agendamentos');
    
    const response = await request(app)
      .get('/api/agendamentos')
      .expect(200);

    logger.success(`Endpoint retornou ${response.body.data.length} itens`);
    expect(response.body.data).toBeDefined();
  });
});
```

**Executar**:
```bash
npm run test:integration
```

#### **3. Testes End-to-End (E2E)** 🌐
**Propósito**: Testar fluxos completos do usuário

```javascript
// Exemplo: sistema.completo.test.js
describe('Fluxo de Aprovação Completo', () => {
  test('Admin cria → aprova → aparece para usuários', async () => {
    logger.process('Iniciando fluxo completo de aprovação');
    
    // 1. Criar agendamento
    const created = await request(app).post('/api/agendamentos').send(data);
    logger.success('Agendamento criado');

    // 2. Aprovar
    await request(app).post(`/api/agendamentos/${created.body.id}/aprovar`);
    logger.success('Agendamento aprovado');

    // 3. Verificar para usuários gerais
    const usuarioItems = await request(app).get('/api/agendamentos?tipo_usuario=usuario');
    logger.success('Agendamento visível para usuários');
    
    expect(usuarioItems.body.data.find(item => item.id === created.body.id)).toBeDefined();
  });
});
```

#### **4. Testes de Frontend** 🎨
**Propósito**: Testar interface e funcionalidades JavaScript

Abra no navegador: `frontend/tests/index-fixed.html`

---

## 🔄 **INTEGRAÇÃO LOGGING + TESTES**

### **Logger em Testes**

```javascript
// jest.setup.js
const logger = require('../src/utils/logger');

// Configurar logger para ambiente de teste
beforeAll(() => {
  if (process.env.NODE_ENV === 'test') {
    // Apenas success/warn/error em testes
    logger.setLevel('debug', false);
    logger.setLevel('info', false);
    logger.setLevel('process', false);
  }
});

// Capturar logs durante testes para assertions
global.capturedLogs = [];
const originalLog = logger.success;
logger.success = (...args) => {
  global.capturedLogs.push(['success', ...args]);
  return originalLog(...args);
};
```

### **Debugging com Logs**

```bash
# Executar testes com debug de logs
TEST_DEBUG=true npm test

# Executar apenas um teste com logs detalhados
TEST_DEBUG=true npx jest AgendamentosService.test.js --verbose
```

### **Validar Logs em Testes**

```javascript
test('deve logar operação de criação', async () => {
  global.capturedLogs = [];
  
  await service.criarItem(data);
  
  // Verificar se log foi criado
  const successLogs = global.capturedLogs.filter(log => log[0] === 'success');
  expect(successLogs.length).toBeGreaterThan(0);
  expect(successLogs[0][1]).toContain('Item criado');
});
```

---

## 🚀 **EXECUTANDO TESTES**

### **Comandos Básicos**
```bash
# Todos os testes (com logs minimizados)
npm test

# Com logs detalhados para debug
TEST_DEBUG=true npm test

# Com modo watch (re-executa ao salvar)
npm run test:watch

# Com relatório de cobertura
npm run test:coverage

# Testes específicos
npm run test:unit        # Só unitários
npm run test:integration # Só integração
npm run test:e2e        # Só E2E

# Para CI/CD (logs suprimidos)
npm run test:ci
```

### **Debug Avançado**
```bash
# Executar com logs de sistema detalhados
DEBUG=* npm test

# Executar teste específico com debug
node --inspect-brk node_modules/.bin/jest AgendamentosService.test.js
```

---

## 🔄 **CI/CD E AUTOMAÇÃO**

### **Pipeline Automático**
A cada push/PR, executa automaticamente:

1. **Setup Environment** (Node 16, 18, 20)
2. **Install Dependencies**
3. **Lint & Format Check** (ESLint + Prettier)
4. **Security Audit** (npm audit)
5. **Unit Tests** (com logs suprimidos)
6. **Integration Tests**
7. **E2E Tests**
8. **Coverage Report**
9. **Build & Deploy** (só na main)

### **Configuração de Logs no CI**
```yaml
# .github/workflows/tests.yml
- name: Run Tests
  run: npm run test:ci
  env:
    NODE_ENV: test
    LOG_LEVEL: error  # Apenas erros críticos no CI
```

### **Badges para README**
```markdown
![Tests](https://github.com/tremedam/AgendaReceb_Mercadorias/workflows/Tests/badge.svg)
![Coverage](https://codecov.io/gh/tremedam/AgendaReceb_Mercadorias/branch/main/graph/badge.svg)
```

---

## 🐛 **TROUBLESHOOTING**

### **Problemas de Logging**

**1. Logs não aparecem em desenvolvimento:**
```bash
# Verificar variável de ambiente
echo $NODE_ENV

# Forçar nível de log
logger.setLevel('debug', true);
```

**2. Muitos logs em produção:**
```bash
# Verificar configuração
NODE_ENV=production node app.js
```

**3. Logs poluindo testes:**
```bash
# Executar com logs suprimidos
LOG_LEVEL=error npm test
```

### **Problemas de Testes**

**1. Testes falhando por timeout:**
```javascript
// Aumentar timeout
jest.setTimeout(15000);

// Em teste específico
test('teste lento', async () => {
  // ...
}, 15000);
```

**2. Mock não funcionando:**
```javascript
// Limpar mocks entre testes
afterEach(() => {
  jest.clearAllMocks();
});
```

**3. Problemas de conexão com banco:**
```bash
# Verificar se MySQL está rodando
npm run create-db
npm run setup

# Usar SQLite para testes rápidos
npm run setup:sqlite
```

### **Debug Integrado**
```javascript
// Combinar logger com debugging em testes
describe('Debug Session', () => {
  beforeEach(() => {
    if (process.env.TEST_DEBUG) {
      logger.setLevel('debug', true);
      console.log('=== DEBUG MODE ATIVO ===');
    }
  });

  test('operação complexa', async () => {
    logger.debug('Iniciando operação complexa');
    
    try {
      const result = await complexOperation();
      logger.success('Operação concluída', result);
      expect(result).toBeDefined();
    } catch (error) {
      logger.error('Falha na operação', error);
      throw error;
    }
  });
});
```

---

## ✅ **BOAS PRÁTICAS**

### **Logging**
1. **Use níveis apropriados**: debug para detalhes, info para fluxo, error para falhas
2. **Seja conciso**: Mensagens claras e objetivas
3. **Inclua contexto**: IDs, usuários, timestamps quando relevante
4. **Não logue dados sensíveis**: Senhas, tokens, dados pessoais
5. **Configure por ambiente**: Desenvolvimento ≠ Produção ≠ Testes

### **Testes + Logging**
1. **Use logs para marcar marcos** importantes nos testes
2. **Capture logs para validação** quando necessário
3. **Mantenha logs limpos** em CI/CD
4. **Debug com logs** quando testes falharem
5. **Documente padrões** de logging em testes

### **Integração**
1. **Logger configurado** no setup de testes
2. **Diferentes níveis** por tipo de teste
3. **Debug mode** disponível para development
4. **Logs estruturados** para análise automatizada
5. **Métricas de log** para monitoramento

---

## 📊 **MÉTRICAS E MONITORAMENTO**

### **Cobertura de Código**
```bash
npm run test:coverage
# Abre: backend/coverage/lcov-report/index.html
```

**Metas de Cobertura**:
- **Unitários**: > 80%
- **Integração**: > 60%
- **Global**: > 70%

### **Análise de Logs**
```bash
# Contar logs por nível (em produção)
grep -c "ERROR" logs/*.log
grep -c "WARN" logs/*.log

# Análise de performance via logs
grep "PROCESS" logs/*.log | tail -20
```

### **Relatórios Integrados**
```bash
npm run lint:check     # ESLint
npm run format:check   # Prettier
npm run test:coverage  # Cobertura
npm run audit         # Segurança
```

---

## 🎓 **PRÓXIMOS PASSOS**

### **Melhorias de Logging**
1. **Log Aggregation** (ELK Stack)
2. **Structured Logging** (JSON format)
3. **Log Rotation** automática
4. **Real-time Monitoring** (Grafana)
5. **Alert System** baseado em logs

### **Evolução dos Testes**
1. **Visual Regression Testing** (Puppeteer)
2. **Contract Testing** (Pact)
3. **Load Testing** (K6)
4. **Mutation Testing** (Stryker)
5. **A/B Testing** framework

### **Integração Avançada**
1. **Log-based Test Validation**
2. **Performance Profiling** via logs
3. **Automated Issue Detection**
4. **ML-based Anomaly Detection**
5. **Self-healing Systems**

---

## 📞 **SUPORTE E RECURSOS**

### **Documentação Relacionada**
- [Jest Documentation](https://jestjs.io/docs/)
- [Supertest Guide](https://github.com/visionmedia/supertest)
- [Winston Logging](https://github.com/winstonjs/winston)
- [GitHub Actions](https://docs.github.com/en/actions)

### **Troubleshooting Rápido**
1. **Logs não aparecem**: Verificar `NODE_ENV` e níveis
2. **Testes falhando**: Verificar mocks e timeouts
3. **CI failing**: Verificar variáveis de ambiente
4. **Performance**: Analisar logs de timing

### **Convenções do Projeto**
- **Commits**: Include test coverage in commit messages
- **PRs**: Include log samples for new features
- **Issues**: Include relevant logs when reporting bugs
- **Documentation**: Keep this doc updated with changes

---

**Benefícios da Implementação Unificada**:

✅ **Segurança**: Logs sensíveis não aparecem em produção
✅ **Qualidade**: Testes garantem estabilidade
✅ **Performance**: Logging otimizado por ambiente
✅ **Profissionalismo**: Sistema robusto e bem documentado
✅ **Manutenibilidade**: Debug facilitado e testes confiáveis
✅ **Monitoramento**: Visibilidade completa do sistema

---

_Última atualização: Setembro 2025_  
_Versão: 1.1.0 - Atualização: Sistema "usuario" + Microsoft AD_