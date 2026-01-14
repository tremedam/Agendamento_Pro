// =============================================
// CONFIGURAÇÃO DE BANCO DE DADOS
// Arquivo para conectar com seu banco corporativo
// =============================================

const mysql = require('mysql2/promise');
const SessionManager = require('../src/services/SessionManager');
const logger = require('../src/utils/logger');

class DatabaseManager {
  constructor() {
    this.connection = null;
    this.pool = null; // Connection pool
    this.sessionManager = new SessionManager();
    this.config = {
      // SEMPRE usar MySQL para empresa
      production: {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 3306,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'agenda_mercadorias',
        charset: 'utf8mb4',
        timezone: '+00:00',
        // Configurações do pool
        connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT) || 20,
        acquireTimeout: 60000,
        timeout: 60000,
        reconnect: true,
        idleTimeout: 300000, // 5 minutos
        dateStrings: true,
        // Configurações de segurança
        ssl: process.env.DB_SSL === 'true' ? {
          rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false'
        } : false,
        // Configurações de retry
        supportBigNumbers: true,
        bigNumberStrings: true
      }
    };

    // SEMPRE usar production (MySQL) para empresa
    this.env = 'production';
    this.currentConfig = this.config[this.env];
  }

  // ========== CONEXÃO COM BANCO ==========

  async conectar() {
    try {
      // Criar pool de conexões
      this.pool = mysql.createPool(this.currentConfig);

      // Testar conexão inicial
      const testConnection = await this.pool.getConnection();
      await testConnection.ping();
      testConnection.release();

      logger.success(
        `Pool de conexões MySQL criado: ${this.currentConfig.host}:${this.currentConfig.port}`
      );
      logger.info(`Banco: ${this.currentConfig.database}`);
      logger.info(`Pool limit: ${this.currentConfig.connectionLimit} conexões`);

      // Monitorar pool de conexões
      this.setupPoolMonitoring();

      return this.pool;
    } catch (error) {
      logger.error('Erro ao conectar com MySQL:', error.message);
      logger.warn('Verifique:');
      logger.warn(
        `   • Servidor MySQL rodando em ${this.currentConfig.host}:${this.currentConfig.port}`
      );
      logger.warn(`   • Usuário: ${this.currentConfig.user}`);
      logger.warn(`   • Banco existe: ${this.currentConfig.database}`);
      throw error;
    }
  }

  // ========== MONITORAMENTO DO POOL ==========

  setupPoolMonitoring() {
    if (!this.pool) return;

    this.pool.on('connection', (connection) => {
      logger.debug(`Nova conexão estabelecida: ${connection.threadId}`);
    });

    this.pool.on('enqueue', () => {
      logger.debug('Aguardando conexão disponível no pool');
    });

    this.pool.on('acquire', (connection) => {
      logger.debug(`Conexão adquirida do pool: ${connection.threadId}`);
    });

    this.pool.on('release', (connection) => {
      logger.debug(`Conexão retornada ao pool: ${connection.threadId}`);
    });

    // Monitoramento periódico (apenas em desenvolvimento)
    if (process.env.NODE_ENV === 'development') {
      setInterval(() => {
        const poolStatus = this.getPoolStatus();
        if (poolStatus.activeConnections > poolStatus.limit * 0.8) {
          logger.warn('🔥 Pool de conexões com alta utilização:', poolStatus);
        }
      }, 30000); // Verificar a cada 30 segundos
    }
  }

  // ========== MÉTODOS UTILITÁRIOS DO POOL ==========

  getPoolStatus() {
    if (!this.pool) return null;

    return {
      limit: this.currentConfig.connectionLimit,
      activeConnections: this.pool._allConnections?.length || 0,
      freeConnections: this.pool._freeConnections?.length || 0,
      queuedRequests: this.pool._connectionQueue?.length || 0
    };
  }

  async executeQuery(query, params = []) {
    if (!this.pool) {
      throw new Error('Pool de conexões não inicializado');
    }

    const startTime = Date.now();
    let connection;

    try {
      connection = await this.pool.getConnection();
      const [results] = await connection.execute(query, params);

      const duration = Date.now() - startTime;
      if (duration > 1000) { // Log queries lentas
        logger.warn(`🐌 Query lenta (${duration}ms): ${query.substring(0, 100)}...`);
      }

      return results;
    } catch (error) {
      logger.error('Erro na query:', error.message);
      logger.error('Query:', query);
      logger.error('Params:', params);
      throw error;
    } finally {
      if (connection) connection.release();
    }
  }

  async executeTransaction(queries) {
    if (!this.pool) {
      throw new Error('Pool de conexões não inicializado');
    }

    const connection = await this.pool.getConnection();

    try {
      await connection.beginTransaction();

      const results = [];
      for (const { query, params } of queries) {
        const [result] = await connection.execute(query, params);
        results.push(result);
      }

      await connection.commit();
      return results;
    } catch (error) {
      await connection.rollback();
      logger.error('Erro na transação:', error.message);
      throw error;
    } finally {
      connection.release();
    }
  }

  // ========== HEALTH CHECK ==========

  async healthCheck() {
    try {
      if (!this.pool) {
        return { status: 'error', message: 'Pool não inicializado' };
      }

      const connection = await this.pool.getConnection();
      await connection.ping();
      connection.release();

      const poolStatus = this.getPoolStatus();

      return {
        status: 'healthy',
        database: this.currentConfig.database,
        host: this.currentConfig.host,
        pool: poolStatus,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'error',
        message: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  // ========== CLEANUP ==========

  async fechar() {
    try {
      if (this.pool) {
        await this.pool.end();
        logger.info('Pool de conexões MySQL fechado');
      }
    } catch (error) {
      logger.error('Erro ao fechar pool:', error.message);
    }
  }

  // ========== QUERIES PARA AGENDAMENTOS ==========

  /**
   * Buscar todos os agendamentos (para admin)
   */
  async buscarTodosAgendamentos() {
    const sql = `
            SELECT 
                id,
                codigo_produto as codAnt,
                descricao_produto as descricao,
                nome_fornecedor as fornecedor,
                status_entrega as status,
                DATE_FORMAT(data_entrega, '%d/%m/%Y') as data,
                quantidade as qtde,
                saldo,
                observacoes,
                loja_codigo as loja,
                numero_nf as numeroNF,
                valor_total as valorTotal,
                status_aprovacao,
                DATE_FORMAT(updated_at, '%d/%m/%Y %H:%i') as dataUltimaAtualizacao
            FROM agendamentos
            ORDER BY created_at DESC
        `;

    return await this.executarQuery(sql);
  }

  /**
   * Buscar agendamentos aprovados (para loja)
   */
  async buscarAgendamentosAprovados() {
    const sql = `
            SELECT 
                id,
                codigo_produto as codAnt,
                descricao_produto as descricao,
                nome_fornecedor as fornecedor,
                status_entrega as status,
                DATE_FORMAT(data_entrega, '%d/%m/%Y') as data,
                quantidade as qtde,
                saldo,
                observacoes,
                loja_codigo as loja,
                numero_nf as numeroNF,
                valor_total as valorTotal,
                DATE_FORMAT(updated_at, '%d/%m/%Y %H:%i') as dataUltimaAtualizacao
            FROM agendamentos
            WHERE status_aprovacao = 'aprovado'
            ORDER BY data_entrega ASC
        `;

    return await this.executarQuery(sql);
  }

  /**
   * Buscar agendamento por ID
   */
  async buscarAgendamentoPorId(id) {
    const sql = `
            SELECT 
                a.*,
                u.nome as aprovado_por_nome
            FROM agendamentos a
            LEFT JOIN usuarios u ON a.aprovado_por = u.id
            WHERE a.id = ?
        `;

    const resultado = await this.executarQuery(sql, [id]);
    return resultado[0] || null;
  }

  /**
   * Criar novo agendamento
   */
  async criarAgendamento(dados) {
    const sql = `
            INSERT INTO agendamentos (
                codigo_produto,
                descricao_produto,
                nome_fornecedor,
                data_entrega,
                quantidade,
                saldo,
                status_entrega,
                valor_total,
                loja_codigo,
                observacoes,
                prioridade,
                created_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

    const params = [
      dados.codAnt || dados.codigo_produto,
      dados.descricao || dados.descricao_produto,
      dados.fornecedor || dados.nome_fornecedor,
      this.formatarDataParaMySQL(dados.data),
      dados.qtde || dados.quantidade,
      dados.saldo || dados.quantidade,
      dados.status || 'PENDENTE',
      dados.valorTotal || dados.valor_total || 0,
      dados.loja || '001',
      dados.observacoes || '',
      dados.prioridade || 'MEDIA',
      dados.usuario_id || 1
    ];

    const resultado = await this.executarQuery(sql, params);
    return resultado.insertId;
  }

  /**
   * Atualizar agendamento
   */
  async atualizarAgendamento(id, dados) {
    const sql = `
            UPDATE agendamentos SET
                codigo_produto = ?,
                descricao_produto = ?,
                nome_fornecedor = ?,
                data_entrega = ?,
                quantidade = ?,
                saldo = ?,
                status_entrega = ?,
                valor_total = ?,
                observacoes = ?,
                prioridade = ?,
                updated_by = ?,
                updated_at = NOW()
            WHERE id = ?
        `;

    const params = [
      dados.codAnt || dados.codigo_produto,
      dados.descricao || dados.descricao_produto,
      dados.fornecedor || dados.nome_fornecedor,
      this.formatarDataParaMySQL(dados.data),
      dados.qtde || dados.quantidade,
      dados.saldo,
      dados.status,
      dados.valorTotal || dados.valor_total,
      dados.observacoes || '',
      dados.prioridade || 'MEDIA',
      dados.usuario_id || 1,
      id
    ];

    return await this.executarQuery(sql, params);
  }

  /**
   * Aprovar agendamento
   */
  async aprovarAgendamento(id, usuarioId, observacao = '') {
    const sql = `
            UPDATE agendamentos SET
                status_aprovacao = 'aprovado',
                aprovado_por = ?,
                data_aprovacao = NOW(),
                updated_by = ?
            WHERE id = ?
        `;

    await this.executarQuery(sql, [usuarioId, usuarioId, id]);

    // Registrar no histórico
    await this.registrarHistorico(
      id,
      'APROVADO',
      'aprovado',
      usuarioId,
      observacao
    );

    return true;
  }

  /**
   * Rejeitar agendamento
   */
  async rejeitarAgendamento(id, usuarioId, motivo = '') {
    const sql = `
            UPDATE agendamentos SET
                status_aprovacao = 'rejeitado',
                motivo_rejeicao = ?,
                updated_by = ?
            WHERE id = ?
        `;

    await this.executarQuery(sql, [motivo, usuarioId, id]);

    // Registrar no histórico
    await this.registrarHistorico(
      id,
      'REJEITADO',
      'rejeitado',
      usuarioId,
      motivo
    );

    return true;
  }

  /**
   * Deletar agendamento
   */
  async deletarAgendamento(id, usuarioId) {
    // Registrar no histórico antes de deletar
    await this.registrarHistorico(
      id,
      'DELETADO',
      'deletado',
      usuarioId,
      'Registro removido'
    );

    const sql = `DELETE FROM agendamentos WHERE id = ?`;
    return await this.executarQuery(sql, [id]);
  }

  // ========== MÉTODOS AUXILIARES ==========

  /**
   * Executar query genérica
   */
  async executarQuery(sql, params = []) {
    try {
      // Verificar se há conexão com MySQL
      if (!this.connection) {
        logger.warn('MySQL não conectado - retornando dados simulados');
        return this.getDadosSimulados();
      }

      // SEMPRE executar no MySQL quando conectado
      const [rows] = await this.connection.execute(sql, params);
      return rows;
    } catch (error) {
      logger.error('Erro na query MySQL:', error.message);
      logger.debug('SQL:', sql);
      logger.debug('Params:', params);

      // Em caso de erro, usar dados simulados como fallback
      logger.warn('Usando dados simulados como fallback');
      return this.getDadosSimulados();
    }
  }

  /**
   * Retorna dados simulados quando MySQL não está disponível
   */
  getDadosSimulados() {
    const dadosBase = [
      {
        id: 'SIM_001',
        codAnt: 'PROD001',
        descricao: 'Produto Simulado 1',
        fornecedor: 'Fornecedor Teste',
        status: 'Prev. Entrega em Atraso',
        data: '25/12/2024',
        qtde: 100,
        saldo: 100,
        observacoes: 'Dados simulados - MySQL não disponível',
        loja: 'LOJA01',
        numeroNF: 'NF123456',
        valorTotal: 1500.0,
        status_aprovacao: 'PENDENTE',
        dataUltimaAtualizacao: '01/12/2024 10:00',
        origem: 'SIMULADO'
      },
      {
        id: 'SIM_002',
        codAnt: 'PROD002',
        descricao: 'Produto Simulado 2',
        fornecedor: 'Fornecedor Demo',
        status: 'Agendado',
        data: '26/12/2024',
        qtde: 50,
        saldo: 45,
        observacoes: 'Item aprovado em simulação',
        loja: 'LOJA02',
        numeroNF: 'NF789012',
        valorTotal: 800.0,
        status_aprovacao: 'PENDENTE',
        dataUltimaAtualizacao: '01/12/2024 11:30',
        origem: 'SIMULADO'
      },
      {
        id: 'SIM_003',
        codAnt: 'PROD003',
        descricao: 'Cabo de Rede Cat6 100M',
        fornecedor: 'TechNet Distribuidora',
        status: 'Agendado',
        data: '15/11/2025',
        qtde: 200,
        saldo: 200,
        observacoes: 'Material para infraestrutura',
        loja: 'LOJA03',
        numeroNF: 'NF345678',
        valorTotal: 2500.0,
        status_aprovacao: 'PENDENTE',
        dataUltimaAtualizacao: '11/11/2025 08:00',
        origem: 'SIMULADO'
      },
      {
        id: 'SIM_004',
        codAnt: 'PROD004',
        descricao: 'Switch Gerenciável 24 Portas',
        fornecedor: 'InfoTech Solutions',
        status: 'Prev. Sem Agenda',
        data: '20/11/2025',
        qtde: 5,
        saldo: 5,
        observacoes: 'Equipamento de alta prioridade',
        loja: 'LOJA01',
        numeroNF: 'NF456789',
        valorTotal: 8500.0,
        status_aprovacao: 'PENDENTE',
        dataUltimaAtualizacao: '11/11/2025 09:15',
        origem: 'SIMULADO'
      },
      {
        id: 'SIM_005',
        codAnt: 'PROD005',
        descricao: 'Servidor HP DL360 Gen10',
        fornecedor: 'ServerMax Importadora',
        status: 'Agendado',
        data: '18/11/2025',
        qtde: 2,
        saldo: 2,
        observacoes: 'Servidor para datacenter - entrega urgente',
        loja: 'LOJA02',
        numeroNF: 'NF567890',
        valorTotal: 45000.0,
        status_aprovacao: 'PENDENTE',
        dataUltimaAtualizacao: '11/11/2025 10:30',
        origem: 'SIMULADO'
      },
      {
        id: 'SIM_006',
        codAnt: 'PROD006',
        descricao: 'Roteador Wireless AC Dual Band',
        fornecedor: 'ConnectMax Distribuidora',
        status: 'Prev. Entrega em Atraso',
        data: '05/11/2025',
        qtde: 30,
        saldo: 30,
        observacoes: 'Atraso confirmado pelo fornecedor',
        loja: 'LOJA03',
        numeroNF: 'NF678901',
        valorTotal: 4200.0,
        status_aprovacao: 'PENDENTE',
        dataUltimaAtualizacao: '11/11/2025 11:45',
        origem: 'SIMULADO'
      },
      {
        id: 'SIM_007',
        codAnt: 'PROD007',
        descricao: 'Câmera IP 4MP Bullet Externa',
        fornecedor: 'SecureTech Sistemas',
        status: 'Agendado',
        data: '22/11/2025',
        qtde: 48,
        saldo: 48,
        observacoes: 'Kit de segurança para projeto comercial',
        loja: 'LOJA01',
        numeroNF: 'NF789012',
        valorTotal: 12800.0,
        status_aprovacao: 'PENDENTE',
        dataUltimaAtualizacao: '11/11/2025 13:00',
        origem: 'SIMULADO'
      },
      {
        id: 'SIM_008',
        codAnt: 'PROD008',
        descricao: 'Nobreak 3000VA Rack 2U',
        fornecedor: 'PowerGuard Brasil',
        status: 'Agendado',
        data: '25/11/2025',
        qtde: 8,
        saldo: 8,
        observacoes: 'Proteção elétrica para servidores',
        loja: 'LOJA02',
        numeroNF: 'NF890123',
        valorTotal: 6400.0,
        status_aprovacao: 'PENDENTE',
        dataUltimaAtualizacao: '11/11/2025 14:20',
        origem: 'SIMULADO'
      },
      {
        id: 'SIM_009',
        codAnt: 'PROD009',
        descricao: 'Patch Panel 48 Portas Cat6',
        fornecedor: 'ElectroMax Distribuidora',
        status: 'Prev. Sem Agenda',
        data: '28/11/2025',
        qtde: 15,
        saldo: 15,
        observacoes: 'Produto de alta demanda - priorizar',
        loja: 'LOJA03',
        numeroNF: 'NF901234',
        valorTotal: 1800.0,
        status_aprovacao: 'PENDENTE',
        dataUltimaAtualizacao: '11/11/2025 15:35',
        origem: 'SIMULADO'
      },
      {
        id: 'SIM_010',
        codAnt: 'PROD010',
        descricao: 'Rack Fechado 42U 800x1000mm',
        fornecedor: 'DataCenter Equipment',
        status: 'Agendado',
        data: '30/11/2025',
        qtde: 3,
        saldo: 3,
        observacoes: 'Produto importado - documentação em ordem',
        loja: 'LOJA01',
        numeroNF: 'NF012345',
        valorTotal: 9600.0,
        status_aprovacao: 'PENDENTE',
        dataUltimaAtualizacao: '11/11/2025 16:50',
        origem: 'SIMULADO'
      }
    ];

    // Aplicar aprovações simuladas dinâmicas
    return dadosBase.map(item => {
      const aprovacao = this.sessionManager.obterAprovacaoSimulada(item.id);
      if (aprovacao) {
        logger.debug(`Aplicando aprovação simulada para ${item.id}: ${aprovacao.status_aprovacao}`);
        return {
          ...item,
          status_aprovacao: aprovacao.status_aprovacao,
          statusAprovacao: aprovacao.statusAprovacao,
          aprovado_por: aprovacao.aprovado_por,
          aprovado_em: aprovacao.aprovado_em,
          rejeitado_por: aprovacao.rejeitado_por,
          rejeitado_em: aprovacao.rejeitado_em,
          motivo_rejeicao: aprovacao.motivo_rejeicao
        };
      }
      return item;
    });
  }

  /**
   * Registrar no histórico
   */
  async registrarHistorico(
    agendamentoId,
    acao,
    statusNovo,
    usuarioId,
    observacao
  ) {
    const sql = `
            INSERT INTO agendamentos_historico (
                agendamento_id, acao, status_novo, usuario_id, observacao
            ) VALUES (?, ?, ?, ?, ?)
        `;

    return await this.executarQuery(sql, [
      agendamentoId,
      acao,
      statusNovo,
      usuarioId,
      observacao
    ]);
  }

  /**
   * Formatar data para MySQL (YYYY-MM-DD)
   */
  formatarDataParaMySQL(data) {
    if (!data) return null;

    // Se já está no formato YYYY-MM-DD
    if (data.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return data;
    }

    // Se está no formato DD/MM/YYYY
    if (data.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
      const [dia, mes, ano] = data.split('/');
      return `${ano}-${mes}-${dia}`;
    }

    return data;
  }

  /**
   * Fechar conexão
   */
  async fecharConexao() {
    if (this.connection) {
      await this.connection.end();
      logger.success('Conexão MySQL fechada');
    }
  }

  // ========== MÉTODOS PARA MIGRAÇÃO DO SEU SISTEMA ==========

  /**
   * Conectar com seu banco existente (exemplo)
   */
  async conectarSistemaExistente() {
    // SUBSTITUA por suas configurações reais
    const configEmpresa = {
      host: 'SEU_SERVIDOR_DB',
      port: 3306,
      user: 'SEU_USUARIO',
      password: 'SUA_SENHA',
      database: 'SEU_BANCO_ATUAL'
    };

    // Conectar com seu sistema
    this.sistemaExistente = await mysql.createConnection(configEmpresa);
    logger.success('Conectado ao sistema da empresa');
  }

  /**
   * Importar dados do seu sistema existente
   */
  async importarDadosEmpresa() {
    // EXEMPLO: Adapte conforme suas tabelas atuais
    const sqlEmpresa = `
            SELECT 
                codigo_produto,
                descricao,
                fornecedor,
                data_entrega,
                quantidade,
                valor_total
            FROM sua_tabela_de_mercadorias
            WHERE status = 'ATIVO'
        `;

    const dadosEmpresa = await this.sistemaExistente.execute(sqlEmpresa);

    // Inserir no novo sistema
    for (const item of dadosEmpresa[0]) {
      await this.criarAgendamento({
        codAnt: item.codigo_produto,
        descricao: item.descricao,
        fornecedor: item.fornecedor,
        data: item.data_entrega,
        qtde: item.quantidade,
        valorTotal: item.valor_total
      });
    }

    logger.success(`Importados ${dadosEmpresa[0].length} registros`);
  }

  // ========== MÉTODOS HÍBRIDOS (GEMCO + TEMPORÁRIO) ==========

  /**
   * Criar agendamento temporário (NÃO persiste - apenas máscara visual)
   */
  async criarAgendamentoTemporario(sessaoId, dados) {
    logger.warn('ATENÇÃO: Criando agendamento TEMPORÁRIO');
    logger.info('Este agendamento NÃO será salvo no banco de dados');
    logger.debug('É apenas uma MÁSCARA visual para o usuário');

    return this.sessionManager.criarAgendamentoTemporario(sessaoId, dados);
  }

  /**
   * Atualizar agendamento temporário (NÃO persiste - apenas máscara visual)
   */
  async atualizarAgendamentoTemporario(sessaoId, id, dados) {
    logger.warn('ATENÇÃO: Atualizando agendamento TEMPORÁRIO');
    logger.info('Mudanças são apenas visuais - GEMCO não é alterado');
    logger.debug('Para efetivar mudanças, use o GEMCO diretamente');

    return this.sessionManager.atualizarAgendamentoTemporario(
      sessaoId,
      id,
      dados
    );
  }

  /**
   * Aprovar agendamento temporário (NÃO altera GEMCO - apenas status visual)
   */
  async aprovarAgendamentoTemporario(sessaoId, id, usuarioId) {
    logger.warn('ATENÇÃO: Aprovação TEMPORÁRIA');
    logger.info('Esta aprovação é apenas VISUAL!');
    logger.debug('Para efetivar aprovação, altere no GEMCO');

    return this.sessionManager.aprovarAgendamentoTemporario(
      sessaoId,
      id,
      usuarioId
    );
  }

  /**
   * Rejeitar agendamento temporário (NÃO altera GEMCO - apenas status visual)
   */
  async rejeitarAgendamentoTemporario(sessaoId, id, usuarioId, motivo = '') {
    logger.warn('ATENÇÃO: Rejeição TEMPORÁRIA');
    logger.info('Esta rejeição é apenas VISUAL!');
    logger.debug('Para efetivar rejeição, altere no GEMCO');

    return this.sessionManager.rejeitarAgendamentoTemporario(
      sessaoId,
      id,
      usuarioId,
      motivo
    );
  }

  /**
   * Verificar se um ID é temporário
   */
  isIdTemporario(id) {
    return typeof id === 'string' && id.startsWith('temp_');
  }

  /**
   * Obter sessão do usuário
   */
  criarSessaoUsuario(usuarioId) {
    return this.sessionManager.criarSessao(usuarioId);
  }

  /**
   * Limpar dados temporários do usuário
   */
  limparDadosTemporarios(sessaoId) {
    return this.sessionManager.limparSessao(sessaoId);
  }

  /**
   * Buscar agendamentos aplicando máscaras temporárias
   * Combina dados do GEMCO com agendamentos temporários
   */
  async buscarAgendamentosComMascaras(sessaoId = null, tipoUsuario = 'admin') {
    logger.debug(
      `Buscando agendamentos com máscaras (sessão: ${sessaoId}, tipo: ${tipoUsuario})`
    );
    logger.debug(
      `Verificando tipo de usuário: "${tipoUsuario}" (${typeof tipoUsuario})`
    );

    try {
      // 1. Buscar dados base do GEMCO (simulados)
      let agendamentosBase = [];
      if (!this.connection) {
        // Modo simulação - dados de exemplo
        agendamentosBase = this.getDadosSimulados();

        // Para loja, filtrar apenas itens simulados aprovados
        if (tipoUsuario === 'loja') {
          logger.debug('Filtrando dados simulados para LOJA - apenas aprovados');
          agendamentosBase = agendamentosBase.filter(item => {
            const aprovado = item.status_aprovacao === 'APROVADO' || item.status_aprovacao === 'aprovado';
            logger.debug(`Item simulado ${item.id}: status_aprovacao = ${item.status_aprovacao}, aprovado = ${aprovado}`);
            return aprovado;
          });
          logger.debug(`Dados simulados aprovados para loja: ${agendamentosBase.length}`);
        }
      } else {
        // MySQL real
        if (tipoUsuario === 'admin') {
          agendamentosBase = await this.buscarTodosAgendamentos();
        } else {
          agendamentosBase = await this.buscarAgendamentosAprovados();
        }
      }

      logger.debug(`Dados GEMCO: ${agendamentosBase.length} agendamentos`);

      // 2. Buscar agendamentos temporários (SEMPRE buscar frescos)
      this.sessionManager.recarregarDadosDoArquivo(); // Força sincronização
      const agendamentosTemporarios =
        this.sessionManager.buscarTodosAgendamentosTemporarios();

      logger.debug(
        `Dados temporários: ${agendamentosTemporarios.length} agendamentos`
      );

      // 3. Filtrar agendamentos temporários baseado no tipo de usuário
      let temporariosFiltrados = agendamentosTemporarios;
      logger.debug(
        `Verificando se deve filtrar para loja: tipoUsuario="${tipoUsuario}"`
      );
      if (tipoUsuario === 'loja') {
        logger.debug(`MODO LOJA DETECTADO - Filtrando apenas aprovados`);
        // Para loja, incluir apenas agendamentos temporários aprovados
        temporariosFiltrados = agendamentosTemporarios.filter(temp => {
          const statusAprovacao = temp.status_aprovacao || temp.statusAprovacao;
          logger.debug(
            `Temp ${temp.id}: status_aprovacao = ${statusAprovacao}, codAnt = ${temp.codAnt}, descricao = ${temp.descricao || temp.produto}`
          );
          const aprovado = statusAprovacao === 'aprovado';
          if (aprovado) {
            logger.debug(`Item ${temp.id} APROVADO - será incluído na loja`);
          } else {
            logger.debug(
              `Item ${temp.id} NÃO APROVADO (${statusAprovacao}) - será excluído da loja`
            );
          }
          return aprovado;
        });
        logger.debug(
          `Temporários aprovados para loja: ${temporariosFiltrados.length} de ${agendamentosTemporarios.length} total`
        );
      } else {
        logger.debug(
          `MODO ADMIN - Mostrando todos os agendamentos temporários`
        );
      }

      // 4. Combinar dados (base + temporários filtrados)
      const dadosCombinados = [...agendamentosBase, ...temporariosFiltrados];

      logger.debug(
        `Total combinado: ${dadosCombinados.length} agendamentos (${agendamentosBase.length} base + ${temporariosFiltrados.length} temporários)`
      );

      return dadosCombinados;
    } catch (error) {
      logger.error('Erro ao buscar agendamentos com máscaras:', error);
      throw error;
    }
  }

  /**
   * Remover agendamento temporário por id (usando localização automática)
   * Retorna true se removido
   */
  removerAgendamentoTemporario(id) {
    logger.debug(`DatabaseManager: Removendo agendamento temporário ${id}`);

    const resultado = this.sessionManager.obterAgendamentoComLocalizacao(id);
    if (!resultado) {
      logger.warn(
        `DatabaseManager: Agendamento temporário não encontrado: ${id}`
      );
      return false;
    }

    const { mesAno, usuarioId } = resultado;
    logger.debug(
      `DatabaseManager: Localizado em mesAno=${mesAno}, usuarioId=${usuarioId}`
    );

    const removido = this.sessionManager.removerAgendamentoTemporario(
      usuarioId,
      mesAno,
      id
    );

    if (removido) {
      logger.success(`DatabaseManager: Agendamento ${id} removido com sucesso`);
      // Forçar recarregamento dos dados para garantir sincronização
      setTimeout(() => {
        logger.process('DatabaseManager: Forçando sincronização dos dados...');
        this.sessionManager.recarregarDadosDoArquivo();
      }, 200);
    }

    return removido;
  }

  /**
   * Remover agendamento temporário por usuário e id (método antigo)
   * Retorna true se removido
   */
  removerAgendamentoTemporarioPorUsuario(usuarioId, id) {
    // Procurar em todos os meses para este usuário
    for (const [
      mesAno,
      mapaUsuario
    ] of this.sessionManager.agendamentosPorMes.entries()) {
      if (mapaUsuario.has(usuarioId)) {
        const mapaAgendamentos = mapaUsuario.get(usuarioId);
        if (mapaAgendamentos.has(id)) {
          return this.sessionManager.removerAgendamentoTemporario(
            usuarioId,
            mesAno,
            id
          );
        }
      }
    }
    return false;
  }

  /**
   * Gerar dados simulados quando MySQL não está disponível
   */
  gerarDadosSimulados() {
    return [
      {
        id: 'gemco_1001',
        codAnt: '101001',
        data: '2025-09-02',
        fornecedor: 'Fornecedor GEMCO A',
        produto: 'Produto GEMCO Exemplo 1',
        quantidade: 15,
        status: 'Confirmado',
        observacoes: 'Dados simulados do GEMCO',
        status_aprovacao: 'aprovado',
        tipo: 'GEMCO'
      },
      {
        id: 'gemco_1002',
        data: '2025-09-03',
        codAnt: '101002',
        fornecedor: 'Fornecedor GEMCO B',
        produto: 'Produto GEMCO Exemplo 2',
        quantidade: 8,
        status: 'Pendente',
        observacoes: 'Dados simulados do GEMCO',
        status_aprovacao: 'pendente',
        tipo: 'GEMCO'
      }
    ];
  }
}

module.exports = DatabaseManager;
