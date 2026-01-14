// =============================================
// ROTAS DE AGENDAMENTOS - VERSÃO HÍBRIDA
// Integra GEMCO + Máscaras Temporárias
// =============================================

const express = require('express');
const router = express.Router();

// Importações dos serviços
const DatabaseManager = require('../../database/DatabaseManager');
const AgendamentosServiceHibrido = require('../services/AgendamentosServiceHibrido');
const logger = require('../utils/logger');

const authMiddleware = require('../middleware/auth');
const { body } = require('express-validator');
const validateRequest = require('../middleware/validation');

// Instanciar serviços
const db = new DatabaseManager();
const serviceHibrido = new AgendamentosServiceHibrido(db);

// ========== MIDDLEWARE DE SESSÃO ==========

function obterSessaoUsuario(req, res, next) {
  // Obter sessão do header ou cookie
  const sessaoId = req.headers['x-session-id'] || req.session?.id;
  const usuarioId = req.headers['x-user-id'] || req.session?.userId || 1;

  // Se não tem sessão, criar uma
  if (!sessaoId) {
    const novaSessao = db.criarSessaoUsuario(usuarioId);
    req.sessaoId = novaSessao;
    req.usuarioId = usuarioId;

    // Informar o frontend sobre a nova sessão
    res.setHeader('X-Session-Id', novaSessao);
    logger.debug(`Nova sessão criada: ${novaSessao} para usuário ${usuarioId}`);
  } else {
    req.sessaoId = sessaoId;
    req.usuarioId = usuarioId;
  }

  next();
}

// ========== ROTAS PRINCIPAIS ==========

/**
 * GET /api/agendamentos
 * Buscar agendamentos com suporte a máscaras
 */
router.get('/', authMiddleware, obterSessaoUsuario, async (req, res) => {
  try {
    logger.debug(`Buscando agendamentos para sessão: ${req.sessaoId}`);

    const tipoUsuario = req.query.tipo || 'admin';
    const incluirMascaras = req.query.mascaras !== 'false';

    let agendamentos;

    if (incluirMascaras) {
      // Buscar com máscaras temporárias aplicadas
      agendamentos = await serviceHibrido.buscarDadosComMascaras(
        req.sessaoId,
        tipoUsuario
      );
    } else {
      // Buscar apenas dados originais (GEMCO)
      agendamentos = await serviceHibrido.buscarDadosOriginais();
    }

    res.json({
      success: true,
      data: agendamentos,
      sessaoId: req.sessaoId,
      incluiMascaras: incluirMascaras,
      total: agendamentos.length
    });
  } catch (error) {
    logger.error('Erro ao buscar agendamentos:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/agendamentos
 * Criar agendamento temporário (máscara visual)
 */
router.post(
  '/',
  authMiddleware,
  obterSessaoUsuario,
  [
    // Validações opcionais - campos podem ser deixados em branco
    body('quantidade')
      .optional()
      .isNumeric()
      .withMessage('Quantidade deve ser um número'),
    body('data')
      .optional()
      .isISO8601()
      .withMessage('Data deve estar em formato válido')
  ],
  validateRequest,
  async (req, res) => {
    try {
      logger.debug(
        `Criando agendamento temporário para sessão: ${req.sessaoId}`
      );

      const dadosAgendamento = req.body;

      // Criar agendamento visual (não persiste)
      const resultado = await serviceHibrido.criarAgendamentoVisual(
        req.sessaoId,
        dadosAgendamento
      );

      res.status(201).json({
        success: true,
        data: resultado.item || resultado,
        message: 'Agendamento visual criado (não persistido)',
        tipo: 'TEMPORARIO'
      });
    } catch (error) {
      logger.error('Erro ao criar agendamento:', error);
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
);

/**
 * PUT /api/agendamentos/:id
 * Atualizar agendamento temporário (máscara visual)
 */
router.put('/:id', authMiddleware, obterSessaoUsuario, async (req, res) => {
  try {
    const id = req.params.id;
    const novosDados = req.body;

    logger.debug(`Atualizando agendamento temporário: ${id}`);

    // Editar agendamento visual
    const resultado = await serviceHibrido.editarAgendamentoVisual(
      req.sessaoId,
      id,
      novosDados
    );

    res.json({
      success: true,
      data: resultado,
      message: 'Agendamento visual atualizado (não persistido)',
      tipo: resultado.tipo
    });
  } catch (error) {
    logger.error('Erro ao atualizar agendamento:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/agendamentos/:id/aprovar
 * Aprovar agendamento (apenas visual)
 */
router.post(
  '/:id/aprovar',
  authMiddleware,
  obterSessaoUsuario,
  async (req, res) => {
    try {
      const id = req.params.id;

      logger.debug(`Aprovando agendamento visual: ${id}`);

      // Aprovar visualmente
      const resultado = await serviceHibrido.aprovarAgendamentoVisual(
        req.sessaoId,
        id,
        req.usuarioId
      );

      res.json({
        success: true,
        data: resultado,
        message: 'Agendamento aprovado visualmente (não altera GEMCO)',
        tipo: 'VISUAL_APROVADO'
      });
    } catch (error) {
      logger.error('Erro ao aprovar agendamento:', error);
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
);

/**
 * POST /api/agendamentos/:id/rejeitar
 * Rejeitar agendamento (apenas visual)
 */
router.post(
  '/:id/rejeitar',
  authMiddleware,
  obterSessaoUsuario,
  async (req, res) => {
    try {
      const id = req.params.id;
      const motivo = req.body.motivo || '';

      logger.debug(`Rejeitando agendamento visual: ${id}`);

      // Rejeitar visualmente
      const resultado = await serviceHibrido.rejeitarAgendamentoVisual(
        req.sessaoId,
        id,
        req.usuarioId,
        motivo
      );

      res.json({
        success: true,
        data: resultado,
        message: 'Agendamento rejeitado visualmente (não altera GEMCO)',
        tipo: 'VISUAL_REJEITADO'
      });
    } catch (error) {
      logger.error('Erro ao rejeitar agendamento:', error);
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
);

/**
 * DELETE /api/agendamentos/:id
 * Remover agendamento temporário
 */
router.delete('/:id', authMiddleware, obterSessaoUsuario, async (req, res) => {
  try {
    const id = req.params.id;
    logger.debug(`Requisição DELETE recebida para ID: ${id}`);
    logger.debug(`   Sessão ID: ${req.sessaoId}`);
    logger.debug(`   Usuário ID: ${req.usuarioId}`);
    let idParaRemover = id;
    let viaMascara = false;

    // Caso ID não seja temporário mas exista uma máscara associada ao usuário para este GEMCO
    if (!db.isIdTemporario(id)) {
      logger.debug(
        `ID ${id} não é temporário. Verificando se há máscara derivada...`
      );
      if (
        db.sessionManager &&
        typeof db.sessionManager.encontrarMascaraPorIdOriginal === 'function'
      ) {
        let maskInfo = db.sessionManager.encontrarMascaraPorIdOriginal(
          id,
          req.usuarioId
        );
        // Fallback: algumas máscaras foram criadas usando o sessaoId como usuarioId
        if (!maskInfo && req.sessaoId) {
          logger.debug(
            'Tentando localizar máscara usando sessaoId como usuarioId (compat)...'
          );
          maskInfo = db.sessionManager.encontrarMascaraPorIdOriginal(
            id,
            req.sessaoId
          );
        }
        if (maskInfo) {
          logger.debug(
            `Encontrada máscara ${maskInfo.keyId} para original ${id}. Iremos removê-la.`
          );
          idParaRemover = maskInfo.keyId;
          viaMascara = true;
        } else {
          logger.warn(
            `Nenhuma máscara associada ao ID ${id} para este usuário.`
          );
          return res.status(400).json({
            success: false,
            error: 'Não é possível remover item original do GEMCO',
            message: 'Somente máscaras temporárias podem ser removidas'
          });
        }
      } else {
        return res.status(500).json({
          success: false,
          error: 'Função de busca de máscara indisponível'
        });
      }
    }

    logger.debug(`Removendo agendamento temporário real: ${idParaRemover}`);

    // Remover do JSON permanentemente usando método do DatabaseManager
    const removido = db.removerAgendamentoTemporario(idParaRemover);

    if (removido) {
      res.json({
        success: true,
        message: viaMascara
          ? 'Máscara temporária derivada de item GEMCO removida'
          : 'Agendamento temporário removido definitivamente',
        id: idParaRemover,
        invalidateCache: true // Sinaliza para o frontend limpar cache
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'Agendamento não encontrado ou já removido'
      });
    }
  } catch (error) {
    logger.error('Erro ao remover agendamento:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// ========== ROTAS DE CONTROLE DE SESSÃO ==========

/**
 * GET /api/agendamentos/sessao/status
 * Verificar status da sessão
 */
router.get('/sessao/status', obterSessaoUsuario, async (req, res) => {
  try {
    const tempo = db.sessionManager.obterTempoRestante(req.sessaoId);
    const relatorio = await serviceHibrido.relatorioModificacoesTemporarias(
      req.sessaoId
    );

    res.json({
      success: true,
      sessao: {
        id: req.sessaoId,
        usuarioId: req.usuarioId,
        tempoRestante: tempo,
        modificacoes: relatorio
      }
    });
  } catch (error) {
    logger.error('Erro ao verificar sessão:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/agendamentos/sessao/limpar
 * Limpar modificações temporárias
 */
router.post('/sessao/limpar', obterSessaoUsuario, async (req, res) => {
  try {
    logger.debug(
      `Limpando modificações temporárias da sessão: ${req.sessaoId}`
    );

    const resultado = await serviceHibrido.limparModificacoesTemporarias(
      req.sessaoId
    );

    res.json({
      success: true,
      data: resultado,
      message: 'Modificações temporárias removidas'
    });
  } catch (error) {
    logger.error('Erro ao limpar sessão:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/agendamentos/sessao/estender
 * Estender tempo da sessão
 */
router.post('/sessao/estender', obterSessaoUsuario, async (req, res) => {
  try {
    const sucesso = db.sessionManager.estenderSessao(req.sessaoId);

    if (sucesso) {
      const tempo = db.sessionManager.obterTempoRestante(req.sessaoId);
      res.json({
        success: true,
        message: 'Sessão estendida com sucesso',
        tempoRestante: tempo
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'Sessão não encontrada'
      });
    }
  } catch (error) {
    logger.error('Erro ao estender sessão:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/agendamentos/:id/aprovar-real
 * ENDPOINT TEMPORÁRIO PARA TESTE - Aprovar agendamento no banco de dados
 * (Em produção, isso seria feito pelo sistema GEMCO)
 */
router.post(
  '/:id/aprovar-real',
  authMiddleware,
  obterSessaoUsuario,
  async (req, res) => {
    try {
      const id = req.params.id;
      const usuarioId = req.usuarioId || 1;

      logger.warn(`TESTE: Aprovando agendamento no banco: ${id}`);
      logger.warn(`ATENÇÃO: Em produção, usar sistema GEMCO!`);

      // Conectar ao banco e aprovar
      await db.conectar();

      const sql = `
            UPDATE agendamentos 
            SET status_aprovacao = 'aprovado',
                aprovado_por = ?,
                aprovado_em = NOW(),
                updated_at = NOW()
            WHERE id = ?
        `;

      const resultado = await db.executarQuery(sql, [usuarioId, id]);

      if (resultado.affectedRows > 0) {
        res.json({
          success: true,
          message: 'Agendamento aprovado no banco (TESTE)',
          data: { id, aprovadoPor: usuarioId },
          warning: 'Em produção, usar sistema GEMCO para aprovações'
        });
      } else {
        res.status(404).json({
          success: false,
          error: 'Agendamento não encontrado'
        });
      }
    } catch (error) {
      logger.error('Erro ao aprovar agendamento no banco:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

module.exports = router;
