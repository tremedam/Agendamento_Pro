// =============================================
// MOCK DO DATABASE MANAGER PARA TESTES
// =============================================

class MockDatabaseManager {
  constructor() {
    this.connection = null;
    this.sessionManager = {
      criarSessao: jest.fn(),
      obterSessao: jest.fn(),
      limparSessao: jest.fn(),
      adicionarAgendamento: jest.fn(),
      obterAgendamentoPorId: jest.fn(),
      atualizarAgendamento: jest.fn(),
      removerAgendamento: jest.fn()
    };
    this.connected = false;
  }

  // Dados mockados para testes
  getMockData() {
    return [
      {
        id: 1,
        cod_ant: '011049',
        descricao: 'ANTENA MINI PARAB 60CM TESTE',
        fornecedor: 'TESTE_FORNECEDOR',
        status: 'PREV. ENTREGA',
        data_prevista: '2025-09-15',
        quantidade: 10,
        saldo: 10,
        status_aprovacao: 'aprovado',
        valor_total: 1250.0,
        observacoes: 'Teste unitário',
        loja: '001',
        contato: 'Teste - (11) 99999-9999',
        numero_nf: '000001',
        criado_em: new Date(),
        atualizado_em: new Date()
      },
      {
        id: 2,
        cod_ant: '011050',
        descricao: 'PRODUTO TESTE 2',
        fornecedor: 'TESTE_FORNECEDOR_2',
        status: 'AGENDADO',
        data_prevista: '2025-09-16',
        quantidade: 5,
        saldo: 5,
        status_aprovacao: 'pendente',
        valor_total: 500.0,
        observacoes: '',
        loja: '001',
        contato: 'Teste2 - (11) 88888-8888',
        numero_nf: '000002',
        criado_em: new Date(),
        atualizado_em: new Date()
      }
    ];
  }

  // Métodos mockados
  async conectar() {
    this.connected = true;
    return { execute: jest.fn(), end: jest.fn() };
  }

  async buscarTodosAgendamentos() {
    return this.getMockData();
  }

  async buscarAgendamentosAprovados() {
    return this.getMockData().filter(
      item => item.status_aprovacao === 'aprovado'
    );
  }

  async buscarAgendamentosPendentes() {
    return this.getMockData().filter(
      item => item.status_aprovacao === 'pendente'
    );
  }

  async buscarAgendamentoPorId(id) {
    return this.getMockData().find(item => item.id === parseInt(id));
  }

  async criarAgendamento(_dados) {
    const novoId = Math.max(...this.getMockData().map(item => item.id)) + 1;
    return novoId;
  }

  async atualizarAgendamento(id, dados) {
    const item = this.getMockData().find(item => item.id === parseInt(id));
    if (item) {
      return { ...item, ...dados, atualizado_em: new Date() };
    }
    throw new Error('Agendamento não encontrado');
  }

  async excluirAgendamento(id) {
    const item = this.getMockData().find(item => item.id === parseInt(id));
    if (!item) {
      throw new Error('Agendamento não encontrado');
    }
    return true;
  }

  async aprovarAgendamento(id, _usuarioId, _observacao) {
    const item = this.getMockData().find(item => item.id === parseInt(id));
    if (item) {
      return { ...item, status_aprovacao: 'aprovado' };
    }
    throw new Error('Agendamento não encontrado');
  }

  async rejeitarAgendamento(id, usuarioId, motivo) {
    const item = this.getMockData().find(item => item.id === parseInt(id));
    if (item) {
      return {
        ...item,
        status_aprovacao: 'rejeitado',
        motivo_rejeicao: motivo
      };
    }
    throw new Error('Agendamento não encontrado');
  }

  // Métodos para sistema híbrido
  async buscarAgendamentosComMascaras(_sessaoId) {
    return this.getMockData();
  }

  async criarAgendamentoTemporario(_sessaoId, _dados) {
    return `temp_${Date.now()}`;
  }

  async atualizarAgendamentoTemporario(sessaoId, id, dados) {
    return { id, ...dados, tipo: 'TEMPORARIO' };
  }

  isIdTemporario(id) {
    return typeof id === 'string' && id.startsWith('temp_');
  }

  gerarDadosSimulados() {
    return this.getMockData();
  }
}

module.exports = MockDatabaseManager;
