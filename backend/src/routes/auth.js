// =============================================
// ROTAS DE AUTENTICAÇÃO - VERSÃO REFATORADA
// Apenas definições de rotas e middlewares
// =============================================

const express = require('express');
const { body } = require('express-validator');

const router = express.Router();

// Middlewares
const authMiddleware = require('../middleware/auth');
const validateRequest = require('../middleware/validation');

// Controller
const authController = require('../controllers/authController');

// ========== DEFINIÇÕES DE ROTAS ==========

/**
 * POST /api/auth/login
 * Fazer login no sistema
 */
router.post(
  '/login',
  [
    body('re').notEmpty().withMessage('RE é obrigatório'),
    body('senha').notEmpty().withMessage('Senha é obrigatória')
  ],
  validateRequest,
  authController.login
);

/**
 * POST /api/auth/login-loja
 * Autenticação automática para loja via Microsoft/intranet (compatibilidade)
 */
router.post('/login-loja', authController.loginLoja);

/**
 * POST /api/auth/login-usuario
 * Autenticação automática para usuários gerais via Microsoft/intranet
 */
router.post('/login-usuario', authController.loginUsuario);

/**
 * GET /api/auth/check-microsoft
 * Verificar se usuário já está autenticado via Microsoft
 */
router.get('/check-microsoft', authController.checkMicrosoft);

/**
 * POST /api/auth/logout
 * Fazer logout do sistema
 */
router.post('/logout', authController.logout);

/**
 * GET /api/auth/me
 * Verificar usuário autenticado
 */
router.get('/me', authMiddleware, authController.me);

/**
 * GET /api/auth/info
 * Informações do sistema de autenticação
 */
router.get('/info', authMiddleware, authController.info);

module.exports = router;
