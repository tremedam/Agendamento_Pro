// Helper para autenticação nos testes
const _request = require('supertest');

class AuthHelper {
  constructor(app) {
    this.app = app;
    this.tokens = {};
  }

  // Criar token de teste válido
  async getAdminToken() {
    if (this.tokens.admin) {
      return this.tokens.admin;
    }

    // Mock de token para testes
    this.tokens.admin = 'test-admin-token-12345';
    return this.tokens.admin;
  }

  async getLojaToken() {
    if (this.tokens.loja) {
      return this.tokens.loja;
    }

    // Mock de token para testes
    this.tokens.loja = 'test-loja-token-67890';
    return this.tokens.loja;
  }

  // Headers de autenticação para testes
  getAdminHeaders() {
    return {
      Authorization: `Bearer ${this.tokens.admin || 'test-admin-token-12345'}`,
      'Content-Type': 'application/json'
    };
  }

  getLojaHeaders() {
    return {
      Authorization: `Bearer ${this.tokens.loja || 'test-loja-token-67890'}`,
      'Content-Type': 'application/json'
    };
  }

  // Mock do middleware de autenticação para testes
  static mockAuthMiddleware() {
    return (req, res, next) => {
      // Simular usuário autenticado para testes
      const token = req.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        return res.status(401).json({ error: 'Token não fornecido' });
      }

      if (token === 'test-admin-token-12345') {
        req.user = {
          id: 1,
          tipo_usuario: 'admin',
          nome: 'Admin Teste',
          sessionId: 'test-session-admin'
        };
      } else if (token === 'test-loja-token-67890') {
        req.user = {
          id: 2,
          tipo_usuario: 'loja',
          nome: 'Loja Teste',
          sessionId: 'test-session-loja'
        };
      } else {
        return res.status(401).json({ error: 'Token inválido' });
      }

      next();
    };
  }

  // Limpar tokens
  clearTokens() {
    this.tokens = {};
  }
}

module.exports = AuthHelper;
