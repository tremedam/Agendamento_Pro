// =============================================
// EXEMPLO DE USO DO SISTEMA HÍBRIDO
// Como usar masks temporárias sem afetar GEMCO
// =============================================

const DatabaseManager = require('../../database/DatabaseManager');
const logger = require('../utils/logger');

class AgendamentosServiceHibrido {
  /**
   * @param {DatabaseManager} dbInstance Instância compartilhada (evita múltiplos SessionManager e conflitos de ID)
   */
  constructor(dbInstance = null) {
    // Usa instância compartilhada se fornecida; caso contrário cria uma (fallback)
    this.db =
      dbInstance instanceof DatabaseManager
        ? dbInstance
        : new DatabaseManager();
  }

  // ========== OPERAÇÕES SEGURAS (SOMENTE LEITURA) ==========

  /**
   * Buscar dados reais do GEMCO (sem modificações)
   */
  async buscarDadosOriginais() {
    logger.info('📊 Buscando dados ORIGINAIS do GEMCO...');
    return await this.db.buscarAgendamentosComMascaras(null);
  }

  /**
   * Buscar dados com máscaras temporárias aplicadas
   */
  async buscarDadosComMascaras(sessaoId, tipoUsuario = 'admin') {
    logger.info('🎭 Buscando dados com máscaras temporárias...');
    return await this.db.buscarAgendamentosComMascaras(sessaoId, tipoUsuario);
  }

  // ========== OPERAÇÕES TEMPORÁRIAS (NÃO PERSISTEM) ==========

  /**
   * Criar agendamento temporário - APENAS VISUAL
   */
  async criarAgendamentoVisual(sessaoId, dadosAgendamento) {
    logger.process('🎨 CRIANDO AGENDAMENTO VISUAL (não persiste)');

    // Normalizar campos (aceitar tanto 'produto' quanto 'descricao')
    if (dadosAgendamento.produto && !dadosAgendamento.descricao) {
      dadosAgendamento.descricao = dadosAgendamento.produto;
    }
    if (dadosAgendamento.descricao && !dadosAgendamento.produto) {
      dadosAgendamento.produto = dadosAgendamento.descricao;
    }

    // Validar dados básicos (campos opcionais conforme solicitado)
    if (dadosAgendamento.quantidade && dadosAgendamento.quantidade <= 0) {
      throw new Error('Quantidade deve ser maior que zero');
    }

    // Criar na sessão temporária
    const id = await this.db.criarAgendamentoTemporario(sessaoId, {
      ...dadosAgendamento,
      status_aprovacao: 'pendente',
      criado_em: new Date()
    });

    // Recuperar objeto completo e retornar para o frontend
    const item = this.db.sessionManager.obterAgendamentoPorId(id);

    logger.success(`✅ Agendamento visual criado: ${id}`);
    logger.warn(`⚠️  LEMBRE-SE: Este é apenas uma prévia visual!`);

    return { id, tipo: 'TEMPORARIO', persistido: false, item };
  }

  /**
   * Editar agendamento temporário - APENAS VISUAL
   */
  async editarAgendamentoVisual(sessaoId, id, novosDados) {
    logger.process('✏️  EDITANDO AGENDAMENTO VISUAL');
    logger.debug(`🔍 Editando ID: ${id} - Tipo: ${typeof id} - StartsWith SIM_: ${id && id.startsWith('SIM_')}`);

    // Verificar se é um item simulado - CRIAR NOVO AGENDAMENTO TEMPORÁRIO
    if (id && id.startsWith('SIM_')) {
      logger.info('🎭 Item simulado detectado - criando novo agendamento temporário');

      // Buscar dados originais do item simulado
      const itemOriginal = this.buscarItemSimuladoOriginal(id);
      if (!itemOriginal) {
        throw new Error(`Item simulado não encontrado: ${id}`);
      }

      // Criar novo agendamento temporário com base no simulado + edições
      const dadosNovoAgendamento = {
        ...itemOriginal,
        ...novosDados,
        // Remover ID simulado e propriedades específicas
        id: undefined
      };

      // Criar como agendamento visual temporário
      return await this.criarAgendamentoVisual(sessaoId, dadosNovoAgendamento);
    }

    if (!this.db.isIdTemporario(id)) {
      logger.warn('⚠️  ATENÇÃO: Tentativa de editar item do GEMCO');
      logger.info('💡 Criando máscara temporária sobre item original');

      // Criar máscara sobre item do GEMCO
      return await this.criarMascaraSobreItemGEMCO(sessaoId, id, novosDados);
    }

    // Editar item já temporário
    const agendamento = await this.db.atualizarAgendamentoTemporario(
      sessaoId,
      id,
      novosDados
    );

    logger.success(`✅ Agendamento visual atualizado: ${id}`);
    return { agendamento, tipo: 'TEMPORARIO', persistido: false };
  }

  /**
   * Aprovar agendamento - APENAS STATUS VISUAL
   */
  async aprovarAgendamentoVisual(sessaoId, id, usuarioId) {
    logger.process('✅ APROVANDO AGENDAMENTO VISUAL (não persiste)');

    const agendamento = await this.db.aprovarAgendamentoTemporario(
      sessaoId,
      id,
      usuarioId
    );

    logger.success(`✅ Status visual alterado para APROVADO: ${id}`);
    logger.info(`🔧 Para aprovar no GEMCO, acesse o sistema GEMCO diretamente`);

    return { agendamento, tipo: 'VISUAL_APROVADO', persistido: false };
  }

  /**
   * Rejeitar agendamento - APENAS STATUS VISUAL
   */
  async rejeitarAgendamentoVisual(sessaoId, id, usuarioId, motivo = '') {
    logger.process('❌ REJEITANDO AGENDAMENTO VISUAL (não persiste)');

    const agendamento = await this.db.rejeitarAgendamentoTemporario(
      sessaoId,
      id,
      usuarioId,
      motivo
    );

    logger.warn(`❌ Status visual alterado para REJEITADO: ${id}`);
    logger.info(
      `🔧 Para rejeitar no GEMCO, acesse o sistema GEMCO diretamente`
    );

    return { agendamento, tipo: 'VISUAL_REJEITADO', persistido: false };
  }

  // ========== OPERAÇÕES ESPECÍFICAS ==========

  /**
   * Criar máscara sobre item existente do GEMCO
   */
  async criarMascaraSobreItemGEMCO(sessaoId, idOriginalGEMCO, modificacoes) {
    logger.process(`🎭 Criando máscara sobre item GEMCO: ${idOriginalGEMCO}`);

    const mascaraId = await this.db.criarAgendamentoTemporario(sessaoId, {
      ...modificacoes,
      id_gemco_original: idOriginalGEMCO,
      tipo_mascara: 'MODIFICACAO_GEMCO'
    });

    logger.success(`✅ Máscara criada: ${mascaraId} sobre ${idOriginalGEMCO}`);
    logger.info(
      `💡 Usuário verá a versão modificada, GEMCO permanece inalterado`
    );

    return mascaraId;
  }

  /**
   * Limpar todas as modificações temporárias
   */
  async limparModificacoesTemporarias(sessaoId) {
    logger.process('🧹 Limpando todas as modificações temporárias...');

    const removido = this.db.limparDadosTemporarios(sessaoId);

    if (removido) {
      logger.success('✅ Modificações temporárias removidas');
      logger.info('📊 Usuário agora vê apenas dados originais do GEMCO');
    }

    return { limpo: removido };
  }

  // ========== RELATÓRIOS E AUDITORIA ==========

  /**
   * Relatório de modificações temporárias
   */
  async relatorioModificacoesTemporarias(sessaoId) {
    const temporarios =
      this.db.sessionManager.listarAgendamentosTemporarios(sessaoId);

    const relatorio = {
      total_modificacoes: temporarios.length,
      tipos: {
        novos: temporarios.filter(t => !t.id_gemco_original).length,
        mascaras: temporarios.filter(t => t.id_gemco_original).length,
        aprovacoes_visuais: temporarios.filter(
          t => t.status_aprovacao === 'aprovado'
        ).length
      },
      modificacoes: temporarios
    };

    logger.info('📋 Relatório de modificações temporárias:');
    logger.info(`   • Total: ${relatorio.total_modificacoes}`);
    logger.info(`   • Novos: ${relatorio.tipos.novos}`);
    logger.info(`   • Máscaras: ${relatorio.tipos.mascaras}`);
    logger.info(
      `   • Aprovações visuais: ${relatorio.tipos.aprovacoes_visuais}`
    );

    return relatorio;
  }

  /**
   * Buscar item simulado original pelos dados fixos
   */
  buscarItemSimuladoOriginal(id) {
    // Dados simulados fixos (sincronizados com DatabaseManager.getDadosSimulados())
    const dadosSimulados = this.db.getDadosSimulados();
    return dadosSimulados.find(item => item.id === id);
  }
}

// ========== EXEMPLO DE USO ==========

/*
const service = new AgendamentosServiceHibrido();

// 1. Usuário faz login - criar sessão
const sessaoId = db.criarSessaoUsuario(123);

// 2. Buscar dados com máscaras (se houver)
const dados = await service.buscarDadosComMascaras(sessaoId);

// 3. Usuário cria agendamento "teste" (apenas visual)
const novoId = await service.criarAgendamentoVisual(sessaoId, {
    descricao: "Produto Teste",
    fornecedor: "Fornecedor Teste",
    quantidade: 50
});

// 4. Usuário "aprova" o agendamento (apenas visual)
await service.aprovarAgendamentoVisual(sessaoId, novoId, 123);

// 5. Ver relatório de modificações
await service.relatorioModificacoesTemporarias(sessaoId);

// 6. Limpar modificações (volta aos dados originais)
await service.limparModificacoesTemporarias(sessaoId);
*/

module.exports = AgendamentosServiceHibrido;
