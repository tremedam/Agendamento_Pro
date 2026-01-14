// =============================================
// CONTROLLER DE AUTENTICAÇÃO
// Lógica de controle das rotas de autenticação
// =============================================

const logger = require('../utils/logger');
const userModel = require('../models/userModel');
const authService = require('../services/authService');

// ========== CONTROLLERS ==========

/**
 * Controller para login de usuário
 * POST /api/auth/login
 */
async function login(req, res) {
  try {
    const { re, senha } = req.body;

    // Validar dados obrigatórios
    if (!re || !senha) {
      return res.status(400).json({
        success: false,
        error: 'RE e senha são obrigatórios'
      });
    }

    // Buscar usuário
    const usuario = userModel.buscarPorRE(re);
    if (!usuario) {
      return res.status(401).json({
        success: false,
        error: 'RE ou senha incorretos'
      });
    }

    // Verificar se usuário está ativo
    if (!userModel.isUsuarioAtivo(usuario)) {
      return res.status(401).json({
        success: false,
        error: 'Usuário inativo'
      });
    }

    // Validar senha
    const senhaValida = await authService.validarSenha(senha, usuario.senha);
    if (!senhaValida) {
      return res.status(401).json({
        success: false,
        error: 'RE ou senha incorretos'
      });
    }

    // Gerar token
    const token = authService.gerarToken(usuario);

    // Configurar sessão
    authService.configurarSessao(req, usuario);

    // Resposta de sucesso
    const usuarioSeguro = userModel.obterUsuarioSeguro(usuario);

    res.json({
      success: true,
      message: 'Login realizado com sucesso',
      user: usuarioSeguro,
      token: token,
      expiresIn: '24h'
    });

    logger.info(`Login realizado: ${usuario.nome} (RE: ${usuario.re})`);
  } catch (error) {
    logger.error('Erro no login:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
}

/**
 * Controller para login automático de usuário geral
 * POST /api/auth/login-usuario
 */
async function loginUsuario(req, res) {
  try {
    const { microsoftToken: _microsoftToken, userInfo: _userInfo } = req.body;

    logger.debug('Autenticação automática de usuário via Microsoft');

    // Buscar usuário geral
    const usuarioGeral = userModel.buscarPorPerfil('usuario');

    if (!usuarioGeral || !userModel.isUsuarioAtivo(usuarioGeral)) {
      return res.status(401).json({
        success: false,
        error: 'Acesso de usuário não autorizado'
      });
    }

    // Gerar token
    const token = authService.gerarToken(usuarioGeral);

    // Configurar sessão
    authService.configurarSessao(req, usuarioGeral, 'microsoft');

    // Resposta de sucesso
    const usuarioSeguro = userModel.obterUsuarioSeguro(usuarioGeral);

    res.json({
      success: true,
      message: 'Autenticação automática realizada com sucesso',
      user: usuarioSeguro,
      token: token,
      authType: 'microsoft',
      expiresIn: '8h'
    });

    logger.info(`Login automático de usuário: ${usuarioGeral.nome}`);
  } catch (error) {
    logger.error('Erro na autenticação de usuário:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
}

/**
 * Controller para login automático de loja (mantido para compatibilidade)
 * POST /api/auth/login-loja
 */
async function loginLoja(req, res) {
  try {
    const { microsoftToken: _microsoftToken, userInfo: _userInfo } = req.body;

    logger.debug('Autenticação automática de usuário via Microsoft (compatibilidade loja)');

    // Buscar usuário geral (novo perfil)
    const usuarioGeral = userModel.buscarPorPerfil('usuario');

    if (!usuarioGeral || !userModel.isUsuarioAtivo(usuarioGeral)) {
      return res.status(401).json({
        success: false,
        error: 'Acesso de usuário não autorizado'
      });
    }

    // Gerar token
    const token = authService.gerarToken(usuarioGeral);

    // Configurar sessão
    authService.configurarSessao(req, usuarioGeral, 'microsoft');

    // Resposta de sucesso
    const usuarioSeguro = userModel.obterUsuarioSeguro(usuarioGeral);

    res.json({
      success: true,
      message: 'Autenticação automática realizada com sucesso',
      user: usuarioSeguro,
      token: token,
      authType: 'microsoft',
      expiresIn: '8h'
    });

    logger.info(`Login automático de usuário: ${usuarioGeral.nome}`);
  } catch (error) {
    logger.error('Erro na autenticação de usuário:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
}

/**
 * Controller para verificar autenticação Microsoft
 * GET /api/auth/check-microsoft
 */
function checkMicrosoft(req, res) {
  try {
    const isAuthenticated = authService.verificarAutenticacaoMicrosoft();

    if (isAuthenticated) {
      const usuarioGeral = userModel.buscarPorPerfil('usuario');
      const usuarioSeguro = userModel.obterUsuarioSeguro(usuarioGeral);

      res.json({
        success: true,
        authenticated: true,
        user: usuarioSeguro,
        authType: 'microsoft'
      });
    } else {
      res.json({
        success: true,
        authenticated: false
      });
    }
  } catch (error) {
    logger.error('Erro ao verificar Microsoft auth:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
}

/**
 * Controller para logout
 * POST /api/auth/logout
 */
async function logout(req, res) {
  try {
    const email = req.session.userEmail;

    // Limpar sessão
    await authService.limparSessao(req);

    res.json({
      success: true,
      message: 'Logout realizado com sucesso'
    });

    logger.info(`Logout realizado: ${email}`);
  } catch (error) {
    logger.error('Erro no logout:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao fazer logout'
    });
  }
}

/**
 * Controller para verificar usuário autenticado
 * GET /api/auth/me
 */
function me(req, res) {
  try {
    // Primeiro, tentar usar sessão (cookie)
    if (req.session && req.session.userId) {
      const usuario = userModel.buscarPorId(req.session.userId);
      if (!usuario) {
        return res
          .status(401)
          .json({ success: false, error: 'Usuário não encontrado' });
      }

      const usuarioSeguro = userModel.obterUsuarioSeguro(usuario);
      const infoSessao = authService.obterInfoSessao(req);

      return res.json({
        success: true,
        user: usuarioSeguro,
        session: infoSessao
      });
    }

    // Se não houver sessão, tentar Authorization: Bearer <token>
    const authHeader =
      req.headers['authorization'] || req.headers['Authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const payload = authService.verificarToken(token);

      if (!payload) {
        return res
          .status(401)
          .json({ success: false, error: 'Token inválido' });
      }

      // Localizar usuário a partir do payload
      const usuario = userModel.buscarPorCriterios({
        id: payload.id,
        re: payload.re,
        email: payload.email
      });

      if (!usuario) {
        return res.status(401).json({
          success: false,
          error: 'Usuário não encontrado via token'
        });
      }

      const usuarioSeguro = userModel.obterUsuarioSeguro(usuario);
      return res.json({
        success: true,
        user: usuarioSeguro,
        session: { authType: 'token' }
      });
    }

    // Sem sessão e sem token
    return res
      .status(401)
      .json({ success: false, error: 'Usuário não autenticado' });
  } catch (error) {
    logger.error('Erro ao verificar usuário:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
}

/**
 * Controller para informações do sistema
 * GET /api/auth/info
 */
function info(req, res) {
  res.json({
    success: true,
    info: {
      sistema: 'Autenticação integrada',
      usuarios_disponiveis: userModel.obterUsuariosDemo(),
      loja_auth: 'Autenticação automática via Microsoft/intranet',
      endpoints: [
        'POST /api/auth/login (Admin: RE + senha)',
        'POST /api/auth/login-loja (Loja: automático)',
        'GET /api/auth/check-microsoft',
        'POST /api/auth/logout',
        'GET /api/auth/me',
        'GET /api/auth/info'
      ],
      notas: [
        'Este é um sistema de autenticação simplificado para desenvolvimento',
        'Em produção, integre com o sistema de usuários da empresa',
        'Senhas são apenas para demonstração'
      ]
    }
  });
}

module.exports = {
  login,
  loginLoja,
  loginUsuario,
  checkMicrosoft,
  logout,
  me,
  info
};
