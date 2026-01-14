// =============================================
// GERENCIADOR DE SESSÃO TEMPORÁRIA
// Para dados que não devem ser persistidos
// =============================================

const ConfiguracaoTempo = require('../config/ConfiguracaoTempo');
const logger = require('../utils/logger');
const fs = require('fs');
const path = require('path');
const AGENDAMENTOS_JSON_PATH = path.join(
  __dirname,
  '../../database/agendamentos-temporarios.json'
);

class SessionManager {
  constructor(ambiente = 'desenvolvimento') {
    // Armazenamento temporário por mês/ano e usuário
    // Estrutura: Map<mesAno, Map<usuarioId, Map<id, agendamento>>>
    this.agendamentosPorMes = new Map();
    this.sessoes = new Map();
    this.contadorId = 1000; // IDs temporários começam em 1000+

    // Armazenamento para aprovações simuladas (dados SIM_*)
    // Estrutura: Map<id, {status_aprovacao, aprovado_por, aprovado_em}>
    this.aprovacoesSimuladas = new Map();

    // Configuração de tempo baseada no ambiente
    this.ambiente = ambiente;
    this.config = ConfiguracaoTempo.obterConfiguracaoAmbiente(ambiente);

    // Restaurar agendamentos do arquivo JSON
    this.restaurarAgendamentosDoArquivo();
    // Corrigir possíveis inconsistências de IDs (casos onde o campo id foi sobrescrito pelo id original GEMCO)
    this.corrigirIdsInconsistentes();
    // Ajustar contadorId para evitar reuso de IDs após reinício ou remoção
    this.ajustarContadorIdAPartirDosDados();

    logger.info(`⏰ SessionManager configurado para: ${ambiente}`);
    logger.info(`🕐 Duração das sessões: ${this.config.duracao} horas`);

    // Iniciar limpeza automática se habilitada
    if (this.config.limpezaAutomatica) {
      this.iniciarLimpezaAutomatica();
    }
  }
  // ========== PERSISTÊNCIA EM ARQUIVO JSON ==========
  salvarAgendamentosNoArquivo() {
    logger.process('💾 SessionManager: Salvando agendamentos no arquivo...');
    logger.debug(
      `   Total de meses com dados: ${this.agendamentosPorMes.size}`
    );

    // Serializa Map para objeto simples
    const obj = {};
    for (const [mesAno, mapaUsuario] of this.agendamentosPorMes.entries()) {
      obj[mesAno] = {};
      logger.debug(`   - Mês ${mesAno}: ${mapaUsuario.size} usuário(s)`);
      for (const [usuarioId, mapaAgendamentos] of mapaUsuario.entries()) {
        obj[mesAno][usuarioId] = {};
        logger.debug(
          `     - Usuário ${usuarioId}: ${mapaAgendamentos.size} agendamento(s)`
        );
        for (const [id, agendamento] of mapaAgendamentos.entries()) {
          obj[mesAno][usuarioId][id] = agendamento;
        }
      }
    }
    try {
      fs.writeFileSync(
        AGENDAMENTOS_JSON_PATH,
        JSON.stringify(obj, null, 2),
        'utf8'
      );
      logger.success('✅ SessionManager: Arquivo salvo com sucesso!');
    } catch (err) {
      logger.error(
        '❌ SessionManager: Erro ao salvar agendamentos temporários:',
        err
      );
    }
  }

  restaurarAgendamentosDoArquivo() {
    if (!fs.existsSync(AGENDAMENTOS_JSON_PATH)) return;
    try {
      const data = fs.readFileSync(AGENDAMENTOS_JSON_PATH, 'utf8');
      if (!data || data.trim() === '') return; // arquivo vazio - nada a restaurar
      const obj = JSON.parse(data);
      // Reconstrói Map a partir do objeto
      for (const mesAno in obj) {
        const mapaUsuario = new Map();
        for (const usuarioId in obj[mesAno]) {
          const mapaAgendamentos = new Map();
          for (const id in obj[mesAno][usuarioId]) {
            const agendamento = obj[mesAno][usuarioId][id];
            // Converte datas de string para Date
            agendamento.criadoEm = new Date(agendamento.criadoEm);
            agendamento.alteradoEm = new Date(agendamento.alteradoEm);
            agendamento.expiraEm = new Date(agendamento.expiraEm);
            mapaAgendamentos.set(id, agendamento);
          }
          mapaUsuario.set(usuarioId, mapaAgendamentos);
        }
        this.agendamentosPorMes.set(mesAno, mapaUsuario);
      }
    } catch (err) {
      logger.error('Erro ao restaurar agendamentos temporários:', err);
    }
  }

  // ========== GESTÃO DE SESSÃO ==========

  criarSessao(usuarioId) {
    const sessaoId = `sess_${Date.now()}_${usuarioId}`;
    this.sessoes.set(sessaoId, {
      usuarioId,
      agendamentos: new Map(),
      criadoEm: new Date(),
      ultimoAcesso: new Date()
    });
    return sessaoId;
  }

  obterSessao(sessaoId) {
    const sessao = this.sessoes.get(sessaoId);
    if (sessao) {
      sessao.ultimoAcesso = new Date();
    }
    return sessao;
  }

  // ========== AGENDAMENTOS TEMPORÁRIOS ==========

  /**
   * Criar agendamento temporário (máscara)
   * Agora persiste por mês/ano e usuário, não por sessão
   */
  criarAgendamentoTemporario(usuarioId, dados, dataReferencia = new Date()) {
    // ...existing code...
    const mesAno = `${dataReferencia.getFullYear()}-${String(dataReferencia.getMonth() + 1).padStart(2, '0')}`;
    if (!this.agendamentosPorMes.has(mesAno)) {
      this.agendamentosPorMes.set(mesAno, new Map());
    }
    const mapaUsuario = this.agendamentosPorMes.get(mesAno);
    if (!mapaUsuario.has(usuarioId)) {
      mapaUsuario.set(usuarioId, new Map());
    }
    const mapaAgendamentos = mapaUsuario.get(usuarioId);

    const id = `temp_${this.contadorId++}`;
    // Importante: espalhar dados ANTES e sobrescrever id para garantir que o id temporário não seja perdido
    const agendamento = {
      ...dados,
      id, // garante que o id temporário seja utilizado, mesmo que 'dados' contenha um id original
      tipo: 'TEMPORARIO',
      criadoEm: new Date(),
      alteradoEm: new Date(),
      usuarioId,
      mesAno,
      expiraEm: new Date(
        dataReferencia.getFullYear(),
        dataReferencia.getMonth() + 1,
        1
      )
    };

    mapaAgendamentos.set(id, agendamento);

    this.salvarAgendamentosNoArquivo();

    logger.success(`📝 Agendamento temporário criado: ${id} para ${mesAno}`);
    logger.info(`💡 Máscara válida até: ${agendamento.expiraEm.toISOString()}`);

    return id;
  }

  /**
   * Corrige casos onde o objeto armazenado tem campo id (ex: gemco_1002) diferente da chave real (temp_xxxx)
   * Isso acontece quando ao criar a máscara o payload trazia 'id' do GEMCO e sobrescrevia o id temporário.
   */
  corrigirIdsInconsistentes() {
    let corrigidos = 0;
    for (const [_mesAno, mapaUsuario] of this.agendamentosPorMes.entries()) {
      for (const [_usuarioId, mapaAgendamentos] of mapaUsuario.entries()) {
        for (const [keyId, agendamento] of mapaAgendamentos.entries()) {
          if (keyId.startsWith('temp_') && agendamento.id !== keyId) {
            logger.warn(
              `⚠️  Corrigindo id inconsistente: campo.id='${agendamento.id}' -> '${keyId}'`
            );
            agendamento.id = keyId;
            corrigidos++;
          }
        }
      }
    }
    if (corrigidos > 0) {
      logger.info(`🔧 IDs inconsistentes corrigidos: ${corrigidos}`);
      this.salvarAgendamentosNoArquivo();
    }
  }

  /**
   * Ajusta o contadorId para ser sempre > maior número encontrado entre os IDs temp_ existentes.
   */
  ajustarContadorIdAPartirDosDados() {
    let maxEncontrado = 999;
    for (const [_mesAno, mapaUsuario] of this.agendamentosPorMes.entries()) {
      for (const [_usuarioId, mapaAgendamentos] of mapaUsuario.entries()) {
        for (const [keyId] of mapaAgendamentos.entries()) {
          if (keyId.startsWith('temp_')) {
            const num = parseInt(keyId.replace('temp_', ''), 10);
            if (!Number.isNaN(num) && num > maxEncontrado) maxEncontrado = num;
          }
        }
      }
    }
    this.contadorId = maxEncontrado + 1;
  }

  /**
   * Localiza máscara criada sobre um item GEMCO original para um usuário específico
   */
  encontrarMascaraPorIdOriginal(idOriginalGEMCO, usuarioId) {
    for (const [mesAno, mapaUsuario] of this.agendamentosPorMes.entries()) {
      const mapaAgendamentos = mapaUsuario.get(usuarioId);
      if (!mapaAgendamentos) continue;
      for (const [keyId, agendamento] of mapaAgendamentos.entries()) {
        if (agendamento.id_gemco_original === idOriginalGEMCO) {
          return { agendamento, mesAno, usuarioId, keyId };
        }
      }
    }
    return null;
  }

  /**
   * Remove máscara derivada de item GEMCO usando o id original (escopo do usuário)
   */
  removerMascaraPorIdOriginal(idOriginalGEMCO, usuarioId) {
    const encontrado = this.encontrarMascaraPorIdOriginal(
      idOriginalGEMCO,
      usuarioId
    );
    if (!encontrado) return false;
    const { mesAno, keyId } = encontrado;
    return this.removerAgendamentoTemporario(usuarioId, mesAno, keyId);
  }

  /**
   * Atualizar agendamento temporário usando localização automática
   */
  atualizarAgendamentoTemporario(sessaoId, id, dados) {
    logger.process(`✏️  Atualizando agendamento temporário: ${id}`);
    logger.debug(`   Sessão: ${sessaoId}`);
    logger.debug(`   Dados:`, dados);

    // Verificar se é um item simulado
    if (id.startsWith('SIM_')) {
      logger.warn(`⚠️  DADOS SIMULADOS: Não é possível atualizar item simulado ${id}`);
      logger.info('💡 DICA: Dados simulados são apenas para demonstração');
      throw new Error('Não é possível editar dados simulados. Conecte ao MySQL para usar dados reais.');
    }

    // Localizar automaticamente o agendamento
    const resultado = this.obterAgendamentoComLocalizacao(id);
    if (!resultado) {
      logger.error(`❌ Agendamento temporário não encontrado: ${id}`);
      throw new Error('Agendamento temporário não encontrado');
    }

    const { agendamento, mesAno, usuarioId } = resultado;
    logger.debug(`📍 Localizado em mesAno=${mesAno}, usuarioId=${usuarioId}`);

    // Atualizar o agendamento
    const dadosAtualizados = {
      ...dados,
      alteradoEm: new Date()
    };

    Object.assign(agendamento, dadosAtualizados);

    // Salvar no arquivo
    this.salvarAgendamentosNoArquivo();

    logger.success(`✅ Agendamento temporário atualizado: ${id}`);
    return agendamento;
  }

  /**
   * Listar agendamentos temporários do mês/ano para um usuário
   */
  listarAgendamentosTemporarios(usuarioId, mesAno) {
    const mapaUsuario = this.agendamentosPorMes.get(mesAno);
    if (!mapaUsuario) return [];
    const mapaAgendamentos = mapaUsuario.get(usuarioId);
    if (!mapaAgendamentos) return [];
    return Array.from(mapaAgendamentos.values());
  }

  /**
   * Obter um agendamento temporário por seu id (procura em todos os meses/usuários)
   */
  obterAgendamentoPorId(id) {
    for (const [_mesAno, mapaUsuario] of this.agendamentosPorMes.entries()) {
      for (const [_usuarioId, mapaAgendamentos] of mapaUsuario.entries()) {
        if (mapaAgendamentos.has(id)) {
          return mapaAgendamentos.get(id);
        }
      }
    }
    return null;
  }

  /**
   * Obter agendamento temporário com informações de localização (mesAno, usuarioId)
   */
  obterAgendamentoComLocalizacao(id) {
    for (const [mesAno, mapaUsuario] of this.agendamentosPorMes.entries()) {
      for (const [usuarioId, mapaAgendamentos] of mapaUsuario.entries()) {
        if (mapaAgendamentos.has(id)) {
          return {
            agendamento: mapaAgendamentos.get(id),
            mesAno: mesAno,
            usuarioId: usuarioId
          };
        }
      }
    }
    return null;
  }

  /**
   * Buscar todos os agendamentos temporários (todos os usuários e meses)
   * Para uso pelo admin
   */
  buscarTodosAgendamentosTemporarios() {
    const todosAgendamentos = [];

    for (const [_mesAno, mapaUsuario] of this.agendamentosPorMes.entries()) {
      for (const [_usuarioId, mapaAgendamentos] of mapaUsuario.entries()) {
        for (const [_id, agendamento] of mapaAgendamentos.entries()) {
          todosAgendamentos.push(agendamento);
        }
      }
    }

    logger.info(
      `📋 Encontrados ${todosAgendamentos.length} agendamentos temporários no sistema`
    );
    return todosAgendamentos;
  }

  /**
   * Aprovar agendamento temporário
   * IMPORTANTE: Não altera GEMCO - apenas status visual
   */
  aprovarAgendamentoTemporario(sessaoId, id, usuarioId) {
    // Verificar se é um item simulado (SIM_001, SIM_002, etc.)
    if (id.startsWith('SIM_')) {
      logger.info(`✅ APROVANDO DADOS SIMULADOS: ${id}`);
      logger.info('💡 DICA: Aprovação será salva para filtros na loja');

      // Salvar aprovação simulada no mapa mantendo observações originais
      const aprovacao = {
        status_aprovacao: 'aprovado',
        statusAprovacao: 'aprovado',
        aprovado_por: usuarioId,
        aprovado_em: new Date(),
        origem: 'SIMULADO'
      };

      this.aprovacoesSimuladas.set(id, aprovacao);
      logger.success(`✅ Aprovação simulada salva para item ${id}`);

      return aprovacao;
    }    // Processar aprovação normal para agendamentos temporários reais
    const agendamento = this.atualizarAgendamentoTemporario(sessaoId, id, {
      status_aprovacao: 'aprovado',
      statusAprovacao: 'aprovado',
      aprovado_por: usuarioId,
      aprovado_em: new Date()
    });
    this.salvarAgendamentosNoArquivo();
    logger.success(`✅ Agendamento temporário APROVADO: ${id}`);
    return agendamento;
  }

  /**
   * Rejeitar agendamento temporário
   * IMPORTANTE: Não altera GEMCO - apenas status visual
   */
  rejeitarAgendamentoTemporario(sessaoId, id, usuarioId, motivo = '') {
    // Verificar se é um item simulado (SIM_001, SIM_002, etc.)
    if (id.startsWith('SIM_')) {
      logger.info(`❌ REJEITANDO DADOS SIMULADOS: ${id}`);
      logger.info('💡 DICA: Rejeição será salva para filtros na loja');

      // Salvar rejeição simulada no mapa
      const rejeicao = {
        status_aprovacao: 'rejeitado',
        statusAprovacao: 'rejeitado',
        rejeitado_por: usuarioId,
        rejeitado_em: new Date(),
        origem: 'SIMULADO'
      };

      // Adicionar motivo apenas se fornecido
      if (motivo) {
        rejeicao.motivo_rejeicao = motivo;
      }

      this.aprovacoesSimuladas.set(id, rejeicao);
      logger.success(`❌ Rejeição simulada salva para item ${id}`);

      return rejeicao;
    }    // Processar rejeição normal para agendamentos temporários reais
    const agendamento = this.atualizarAgendamentoTemporario(sessaoId, id, {
      status_aprovacao: 'rejeitado',
      statusAprovacao: 'rejeitado',
      rejeitado_por: usuarioId,
      rejeitado_em: new Date(),
      motivo_rejeicao: motivo
    });
    this.salvarAgendamentosNoArquivo();
    logger.warn(`❌ Agendamento temporário REJEITADO: ${id}`);
    return agendamento;
  }

  /**
   * Remover agendamento temporário do JSON
   * IMPORTANTE: Remove definitivamente - não afeta GEMCO
   */
  removerAgendamentoTemporario(usuarioId, mesAno, id) {
    logger.debug(`🔍 Tentando remover agendamento temporário:`);
    logger.debug(`   - ID: ${id}`);
    logger.debug(`   - Usuário: ${usuarioId}`);
    logger.debug(`   - Mês/Ano: ${mesAno}`);

    const mapaUsuario = this.agendamentosPorMes.get(mesAno);
    if (!mapaUsuario) {
      logger.warn(`⚠️  Mês/ano não encontrado: ${mesAno}`);
      logger.debug(
        `   Meses disponíveis:`,
        Array.from(this.agendamentosPorMes.keys())
      );
      return false;
    }

    const mapaAgendamentos = mapaUsuario.get(usuarioId);
    if (!mapaAgendamentos) {
      logger.warn(`⚠️  Usuário não encontrado: ${usuarioId}`);
      logger.debug(
        `   Usuários disponíveis no mês ${mesAno}:`,
        Array.from(mapaUsuario.keys())
      );
      return false;
    }

    logger.debug(
      `   Agendamentos disponíveis para o usuário:`,
      Array.from(mapaAgendamentos.keys())
    );

    const removido = mapaAgendamentos.delete(id);
    if (removido) {
      // Se não há mais agendamentos do usuário, remove o usuário
      if (mapaAgendamentos.size === 0) {
        mapaUsuario.delete(usuarioId);
        logger.info(`🗑️  Usuário ${usuarioId} removido (sem agendamentos)`);
      }

      // Se não há mais usuários no mês, remove o mês
      if (mapaUsuario.size === 0) {
        this.agendamentosPorMes.delete(mesAno);
        logger.info(`🗑️  Mês ${mesAno} removido (sem usuários)`);
      }

      // Salvar no arquivo e recarregar para garantir sincronização
      this.salvarAgendamentosNoArquivo();
      logger.success(`✅ Agendamento temporário REMOVIDO: ${id}`);

      // Forçar sincronização da memória com arquivo
      setTimeout(() => {
        this.recarregarDadosDoArquivo();
      }, 100);
    } else {
      logger.error(`❌ Agendamento não encontrado: ${id}`);
    }

    return removido;
  }

  /**
   * Recarregar dados do arquivo para sincronizar memória
   */
  recarregarDadosDoArquivo() {
    logger.process('🔄 Recarregando dados do arquivo para sincronizar...');
    this.agendamentosPorMes.clear();
    this.restaurarAgendamentosDoArquivo();
    logger.success('✅ Dados recarregados da memória');
  }

  /**
   * Limpar sessão (logout ou timeout)
   */
  limparSessao(sessaoId) {
    const removida = this.sessoes.delete(sessaoId);
    if (removida) {
      logger.info(
        `🗑️  Sessão ${sessaoId} removida - dados temporários perdidos`
      );
    }
    return removida;
  }

  // ========== INTEGRAÇÃO COM GEMCO ==========

  /**
   * Simular busca de dados do GEMCO
   * SUBSTITUA pela integração real com GEMCO
   */
  async buscarDadosGEMCO() {
    // TODO: Implementar integração real com GEMCO
    logger.info('📡 Buscando dados do GEMCO...');

    // Exemplo de estrutura esperada do GEMCO
    const dadosGEMCO = [
      {
        id: 'GEMCO_123',
        codigo_produto: 'PROD001',
        descricao: 'Produto vindo do GEMCO',
        fornecedor: 'Fornecedor GEMCO',
        data_entrega: '2024-12-25',
        quantidade: 100,
        valor_total: 1500.0,
        status: 'PENDENTE',
        origem: 'GEMCO'
      }
    ];

    return dadosGEMCO;
  }

  /**
   * Mesclar dados GEMCO com modificações temporárias
   * Agora busca máscaras do mês/ano e usuário
   */
  async obterDadosComMascaras(usuarioId, mesAno) {
    // 1. Buscar dados reais do GEMCO
    const dadosGEMCO = await this.buscarDadosGEMCO();

    // Se mesAno não foi informado, assumir mês/ano atual
    if (!mesAno) {
      const hoje = new Date();
      mesAno = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;
    }

    // 2. Buscar modificações temporárias do mês/ano
    const modificacoes = this.listarAgendamentosTemporarios(usuarioId, mesAno);

    // 3. Aplicar máscaras sobre dados reais
    const dadosComMascaras = [...dadosGEMCO];

    modificacoes.forEach(temp => {
      // Se é uma modificação de item existente
      if (temp.id_gemco_original) {
        const index = dadosComMascaras.findIndex(
          g => g.id === temp.id_gemco_original
        );
        if (index >= 0) {
          // Aplicar máscara
          dadosComMascaras[index] = { ...dadosComMascaras[index], ...temp };
        }
      } else {
        // É um item completamente novo (temporário)
        dadosComMascaras.push(temp);
      }
    });

    return dadosComMascaras;
  }
  /**
   * Limpar agendamentos temporários expirados (de meses anteriores)
   */
  limparAgendamentosExpirados() {
    // ...existing code...
    const agora = new Date();
    let removidos = 0;
    for (const [_mesAno, mapaUsuario] of this.agendamentosPorMes.entries()) {
      for (const [_usuarioId, mapaAgendamentos] of mapaUsuario.entries()) {
        for (const [_id, agendamento] of mapaAgendamentos.entries()) {
          if (agendamento.expiraEm < agora) {
            mapaAgendamentos.delete(_id);
            removidos++;
            logger.info(`🗑️  Máscara expirada removida: ${_id} (${_mesAno})`);
          }
        }
        // Remove usuário se não restam agendamentos
        if (mapaAgendamentos.size === 0) {
          mapaUsuario.delete(_usuarioId);
        }
      }
      // Remove mês se não restam usuários
      if (mapaUsuario.size === 0) {
        this.agendamentosPorMes.delete(_mesAno);
      }
    }
    if (removidos > 0) {
      logger.info(`🧹 Removidas ${removidos} máscaras expiradas`);
    }
    this.salvarAgendamentosNoArquivo();
    return removidos;
  }

  // ========== LIMPEZA AUTOMÁTICA ==========

  /**
   * Limpar sessões expiradas (executar periodicamente)
   */
  limparSessoesExpiradas(tempoLimiteHoras = null) {
    // Usar configuração do ambiente se não especificado
    const limite = tempoLimiteHoras || this.config.duracao;
    const agora = new Date();
    const limiteMs = ConfiguracaoTempo.horasParaMs(limite);

    let removidas = 0;
    let proximasExpirar = 0;
    const avisoMs = ConfiguracaoTempo.minutosParaMs(15); // 15 min antes

    for (const [sessaoId, sessao] of this.sessoes.entries()) {
      const tempoInativo = agora - sessao.ultimoAcesso;

      if (tempoInativo > limiteMs) {
        // Sessão expirada - remover
        this.sessoes.delete(sessaoId);
        removidas++;
        logger.info(`⏰ Sessão expirada removida: ${sessaoId}`);
      } else if (tempoInativo > limiteMs - avisoMs) {
        // Sessão próxima do limite - avisar
        proximasExpirar++;
        const minutosRestantes = Math.round(
          (limiteMs - tempoInativo) / (1000 * 60)
        );
        logger.warn(
          `⚠️  Sessão ${sessaoId} expira em ${minutosRestantes} minutos`
        );
      }
    }

    if (removidas > 0) {
      logger.info(
        `🧹 Removidas ${removidas} sessões expiradas (limite: ${limite}h)`
      );
    }

    if (proximasExpirar > 0) {
      logger.warn(`⏰ ${proximasExpirar} sessões próximas do limite`);
    }

    return { removidas, proximasExpirar };
  }

  /**
   * Iniciar limpeza automática periódica
   */
  iniciarLimpezaAutomatica() {
    const intervalo = ConfiguracaoTempo.minutosParaMs(30); // A cada 30 minutos

    setInterval(() => {
      logger.process('🔄 Executando limpeza automática de sessões...');
      this.limparSessoesExpiradas();
      this.limparAgendamentosExpirados();
    }, intervalo);

    logger.success(
      '✅ Limpeza automática de sessões e máscaras iniciada (30 min)'
    );
  }

  /**
   * Verificar tempo restante de uma sessão
   */
  obterTempoRestante(sessaoId) {
    const sessao = this.sessoes.get(sessaoId);
    if (!sessao) {
      return null;
    }

    const agora = new Date();
    const tempoInativo = agora - sessao.ultimoAcesso;
    const limiteMs = ConfiguracaoTempo.horasParaMs(this.config.duracao);
    const tempoRestante = limiteMs - tempoInativo;

    if (tempoRestante <= 0) {
      return { expirada: true, minutos: 0 };
    }

    const minutosRestantes = Math.round(tempoRestante / (1000 * 60));
    const horasRestantes = Math.floor(minutosRestantes / 60);

    return {
      expirada: false,
      minutos: minutosRestantes,
      horas: horasRestantes,
      formatado:
        horasRestantes > 0
          ? `${horasRestantes}h ${minutosRestantes % 60}min`
          : `${minutosRestantes}min`
    };
  }

  /**
   * Estender sessão (renovar tempo)
   */
  estenderSessao(sessaoId) {
    const sessao = this.obterSessao(sessaoId);
    if (sessao) {
      sessao.ultimoAcesso = new Date();
      logger.info(
        `🔄 Sessão ${sessaoId} estendida por mais ${this.config.duracao}h`
      );
      return true;
    }
    return false;
  }

  /**
   * Obter aprovação simulada por ID
   */
  obterAprovacaoSimulada(id) {
    return this.aprovacoesSimuladas.get(id);
  }

  /**
   * Obter todas as aprovações simuladas
   */
  obterTodasAprovacoesSimuladas() {
    return this.aprovacoesSimuladas;
  }
}

module.exports = SessionManager;
