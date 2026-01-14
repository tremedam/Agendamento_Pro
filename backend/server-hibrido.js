// ================================
// SERVIDOR EXPRESS - SISTEMA DE AGENDA
// Versão Híbrida: GEMCO + Máscaras Temporárias
// ================================

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const session = require('express-session');
const path = require('path');
const logger = require('./src/utils/logger');

// Importar rotas e serviços
const agendamentosRoutes = require('./src/routes/agendamentos');
const authRoutes = require('./src/routes/auth');
const DatabaseManager = require('./database/DatabaseManager');
const corsConfig = require('./src/config/cors');
const secretsManager = require('./src/config/secrets');
const rateLimitConfig = require('./src/config/rateLimit');
const securityConfig = require('./src/config/security');
const swaggerConfig = require('./src/config/swagger');

const app = express();
const PORT = process.env.PORT || 3000;

// ========== MIDDLEWARES ==========

// Headers de Segurança - PROTEÇÃO AVANÇADA
securityConfig.applySecurityMiddlewares(app);

// Rate Limiting - PROTEÇÃO CONTRA ATAQUES
// app.use(rateLimitConfig.getSlowDown()); // Desabilitado para desenvolvimento
app.use(rateLimitConfig.applyRateLimitByRoute());

// CORS configurado por ambiente - SEGURANÇA APRIMORADA
app.use(cors(corsConfig.getCorsOptions()));

// JSON parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Sessões seguras
app.use(
  session({
    secret: secretsManager.getSessionSecret(),
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false, // true apenas em HTTPS
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000 // 24 horas
    }
  })
);

// Log de requisições
app.use((req, res, next) => {
  const timestamp = new Date().toLocaleString('pt-BR');
  logger.debug(`📡 ${timestamp} - ${req.method} ${req.url}`);
  next();
});

// ========== ROTAS ==========

// Documentação da API - Swagger UI
app.use('/api-docs', swaggerConfig.serve(), swaggerConfig.setup());
logger.info('📚 Swagger UI disponível em: http://localhost:' + PORT + '/api-docs');

// Health check e monitoramento (sem middleware de sistema)
app.use('/', require('./src/routes/health'));

// Servir arquivos estáticos do frontend
app.use(express.static(path.join(__dirname, '../frontend')));
app.use('/frontend', express.static(path.join(__dirname, '../frontend')));

// Rota padrão para o frontend
app.get('/app', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/login/login.html'));
});

// ========== INICIALIZAÇÃO DO SISTEMA ==========

let db;
let sistemaInicializado = false;

async function inicializarSistema() {
  logger.info('🚀 Inicializando sistema híbrido...');

  try {
    // Inicializar DatabaseManager
    db = new DatabaseManager();

    // Tentar conectar com MySQL (opcional para desenvolvimento)
    try {
      await db.conectar();
      logger.success('✅ Conectado ao MySQL');
    } catch {
      logger.warn('⚠️  MySQL não disponível - usando modo simulação');
      logger.info('💡 Sistema funcionará com dados de exemplo');
    }

    // Iniciar limpeza automática de sessões e dados temporários
    db.sessionManager.iniciarLimpezaAutomatica();

    // Sistema híbrido pronto
    sistemaInicializado = true;
    logger.success('✅ Sistema híbrido inicializado!');
  } catch (error) {
    logger.error('❌ Erro na inicialização:', error);
    logger.info('🔄 Continuando em modo desenvolvimento...');
    sistemaInicializado = true; // Permite continuar
  }
}

// ========== MIDDLEWARE DE VERIFICAÇÃO ==========

function verificarSistema(req, res, next) {
  if (!sistemaInicializado) {
    return res.status(503).json({
      success: false,
      error: 'Sistema ainda inicializando',
      message: 'Aguarde alguns segundos e tente novamente'
    });
  }
  next();
}

// ========== ROTAS ==========

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'API Agenda funcionando!',
    sistema: sistemaInicializado ? 'Híbrido ativo' : 'Inicializando...',
    ambiente: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    versao: 'v2.0-hibrido'
  });
});

// Info do sistema
app.get('/api/info', verificarSistema, (req, res) => {
  res.json({
    success: true,
    sistema: {
      nome: 'Agenda Recebimento Mercadorias',
      versao: '2.0-hibrido',
      ambiente: process.env.NODE_ENV || 'development',
      recursos: {
        mascaras_temporarias: true,
        integracao_gemco: true,
        mysql_support: true,
        sessoes_automaticas: true
      },
      endpoints: [
        'GET /api/health',
        'GET /api/info',
        'GET /api/agendamentos',
        'POST /api/agendamentos',
        'PUT /api/agendamentos/:id',
        'POST /api/agendamentos/:id/aprovar',
        'DELETE /api/agendamentos/:id',
        'GET /api/agendamentos/sessao/status',
        'POST /api/agendamentos/sessao/limpar',
        'POST /api/agendamentos/sessao/estender'
      ]
    }
  });
});

// Usar rotas dos agendamentos (sistema híbrido)
app.use('/api/agendamentos', verificarSistema, agendamentosRoutes);

// Usar rotas de autenticação
app.use('/api/auth', verificarSistema, authRoutes);

// Rota de exemplo para testar dados GEMCO
app.get('/api/gemco/dados', verificarSistema, async (req, res) => {
  try {
    if (db && db.sessionManager) {
      const dadosGEMCO = await db.sessionManager.buscarDadosGEMCO();
      res.json({
        success: true,
        data: dadosGEMCO,
        origem: 'GEMCO',
        total: dadosGEMCO.length
      });
    } else {
      res.json({
        success: true,
        data: [],
        origem: 'SIMULACAO',
        message: 'GEMCO não configurado - retornando dados vazios'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Servir arquivos estáticos do frontend (se necessário)
// app.use(express.static('../frontend')); // Removido - duplicado

// Rota 404
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint não encontrado',
    message: 'Verifique a URL e tente novamente',
    endpoints_disponiveis: [
      'GET /api/health',
      'GET /api/info',
      'GET /api/agendamentos',
      'POST /api/agendamentos',
      'GET /api/gemco/dados'
    ]
  });
});

// ========== TRATAMENTO DE ERROS ==========

app.use((error, req, res) => {
  logger.error('❌ Erro no servidor:', error);

  res.status(500).json({
    success: false,
    error: 'Erro interno do servidor',
    message:
      process.env.NODE_ENV === 'development'
        ? error.message
        : 'Contate o suporte'
  });
});

// ========== GRACEFUL SHUTDOWN ==========

process.on('SIGINT', async () => {
  logger.info('\n🛑 Encerrando servidor...');

  if (db) {
    try {
      await db.fecharConexao();
      logger.success('✅ Conexão com banco fechada');
    } catch (error) {
      logger.warn('⚠️  Erro ao fechar conexão:', error.message);
    }
  }

  logger.info('👋 Servidor encerrado');
  process.exit(0);
});

// ========== INICIAR SERVIDOR ==========

async function iniciarServidor() {
  // Primeiro inicializar o sistema
  await inicializarSistema();

  // Depois iniciar o servidor HTTP
  const server = app.listen(PORT, () => {
    logger.info(`
🚀 ====================================
   SISTEMA DE AGENDA - SISTEMA HÍBRIDO
====================================
   
✅ Servidor rodando em: http://localhost:${PORT}
📊 Sistema: ${sistemaInicializado ? 'Híbrido ativo' : 'Modo desenvolvimento'}
🎭 Máscaras temporárias: Habilitadas
🔗 Integração GEMCO: Preparada
📋 Endpoints principais:
   • GET  /api/health
   • GET  /api/agendamentos
   • POST /api/agendamentos
   
💡 Frontend: http://localhost:${PORT}
🔧 Admin: http://localhost:${PORT}/admin
🏪 Loja: http://localhost:${PORT}/loja

====================================
        `);
  });

  return server;
}

// Iniciar servidor
if (require.main === module) {
  iniciarServidor().catch(error => {
    logger.error('💥 Falha ao iniciar servidor:', error);
    process.exit(1);
  });
}

module.exports = app;
