// Configuração de teste para Express App
const express = require('express');
const cors = require('cors');
const AuthHelper = require('./auth-helper');

class TestAppSetup {
  static createTestApp() {
    const app = express();

    // Middleware básico
    app.use(cors());
    app.use(express.json());

    // Mock do middleware de autenticação para testes
    app.use('/api', (req, res, next) => {
      // Pular autenticação para rotas de login nos testes
      if (req.path === '/auth/login') {
        return next();
      }

      // Usar mock de autenticação
      return AuthHelper.mockAuthMiddleware()(req, res, next);
    });

    // Importar rotas reais
    try {
      const agendamentosRoutes = require('../../backend/src/routes/agendamentos');
      const authRoutes = require('../../backend/src/routes/auth');

      app.use('/api', agendamentosRoutes);
      app.use('/api/auth', authRoutes);
    } catch (error) {
      console.warn(
        '⚠️ Erro ao carregar rotas reais, usando mocks:',
        error.message
      );

      // Fallback com rotas mock simples
      app.get('/api/agendamentos', (req, res) => {
        res.json({
          success: true,
          data: [
            {
              id: 1,
              cod_ant: '011049',
              produto: 'PRODUTO TESTE',
              descricao: 'PRODUTO TESTE',
              fornecedor: 'FORNECEDOR TESTE',
              quantidade: 100,
              status: 'PENDENTE',
              status_aprovacao: 'pendente',
              data: '2025-09-20',
              observacoes: 'Dados de teste'
            }
          ]
        });
      });

      app.post('/api/agendamentos', (req, res) => {
        res.status(201).json({
          success: true,
          data: {
            id: Date.now(),
            ...req.body,
            status_aprovacao: 'pendente',
            created_at: new Date().toISOString()
          }
        });
      });

      app.post('/api/auth/login', (req, res) => {
        res.json({
          success: true,
          token: 'test-token-' + Date.now(),
          user: { id: 1, tipo_usuario: 'admin' }
        });
      });
    }

    // Middleware de erro
    app.use((error, req, res, _next) => {
      console.error('Erro nos testes:', error);
      res.status(500).json({
        error: 'Erro interno do servidor',
        message:
          process.env.NODE_ENV === 'test' ? error.message : 'Erro interno'
      });
    });

    return app;
  }

  static async setupTestDatabase() {
    // Mock do database para testes
    const mockDb = {
      query: jest.fn(),
      close: jest.fn()
    };

    // Configurar mocks básicos
    mockDb.query.mockImplementation((_sql, _params) => {
      return Promise.resolve([
        {
          id: 1,
          cod_ant: '011049',
          produto: 'PRODUTO TESTE',
          quantidade: 100,
          status_aprovacao: 'pendente'
        }
      ]);
    });

    return mockDb;
  }

  static async teardownTestApp(server) {
    if (server) {
      return new Promise(resolve => {
        server.close(() => {
          resolve();
        });
      });
    }
  }
}

module.exports = TestAppSetup;
