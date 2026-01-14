// =============================================
// AUTENTICAÇÃO E JWT
// Funções para login e autenticação de usuários
// =============================================

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');
const secretsManager = require('../config/secrets');

// ========== SERVIÇOS DE AUTENTICAÇÃO ==========

/**
 * Gerar token JWT para usuário
 * @param {Object} usuario - Dados do usuário
 * @returns {string} - Token JWT
 */
function gerarToken(usuario) {
  return jwt.sign(
    {
      id: usuario.id,
      re: usuario.re,
      email: usuario.email,
      perfil: usuario.perfil,
      nivel: usuario.nivel,
      permissoes: usuario.permissoes,
      loja: usuario.loja
    },
    secretsManager.getJwtSecret(),
    { expiresIn: '8h' }
  );
}

/**
 * Validar senha usando bcrypt
 * @param {string} senhaInformada - Senha fornecida pelo usuário
 * @param {string} hashArmazenado - Hash da senha armazenado
 * @returns {Promise<boolean>} - True se válida, false caso contrário
 */
async function validarSenha(senhaInformada, hashArmazenado) {
  try {
    return await bcrypt.compare(senhaInformada, hashArmazenado);
  } catch (error) {
    logger.error('Erro ao validar senha:', error);
    return false;
  }
}

/**
 * Verificar token JWT
 * @param {string} token - Token a ser verificado
 * @returns {Object|null} - Payload do token ou null se inválido
 */
function verificarToken(token) {
  try {
    return jwt.verify(token, secretsManager.getJwtSecret());
  } catch (error) {
    logger.error('Token JWT inválido:', error.message);
    return null;
  }
}

/**
 * Configurar dados da sessão
 * @param {Object} req - Request object
 * @param {Object} usuario - Dados do usuário
 * @param {string} [authType] - Tipo de autenticação (opcional)
 */
function configurarSessao(req, usuario, authType = null) {
  req.session.userId = usuario.id;
  req.session.userEmail = usuario.email;
  req.session.userPerfil = usuario.perfil;

  if (authType) {
    req.session.authType = authType;
  }
}

/**
 * Limpar sessão do usuário
 * @param {Object} req - Request object
 * @returns {Promise<boolean>} - Promise que resolve quando sessão é limpa
 */
function limparSessao(req) {
  return new Promise((resolve, reject) => {
    req.session.destroy(err => {
      if (err) {
        logger.error('Erro ao limpar sessão:', err);
        reject(err);
      } else {
        resolve(true);
      }
    });
  });
}

/**
 * Simular verificação de autenticação Microsoft
 * @returns {boolean} - Status de autenticação (sempre true para desenvolvimento)
 */
function verificarAutenticacaoMicrosoft() {
  // Em produção, aqui você faria a verificação real com Microsoft/intranet
  return true;
}

/**
 * Obter informações da sessão formatadas
 * @param {Object} req - Request object
 * @returns {Object} - Informações da sessão
 */
function obterInfoSessao(req) {
  if (!req.session || !req.session.userId) {
    return null;
  }

  return {
    id: req.session.id,
    userId: req.session.userId,
    email: req.session.userEmail,
    perfil: req.session.userPerfil,
    authType: req.session.authType || 'session'
  };
}

module.exports = {
  gerarToken,
  validarSenha,
  verificarToken,
  configurarSessao,
  limparSessao,
  verificarAutenticacaoMicrosoft,
  obterInfoSessao
};
