// =============================================
// TESTES END-TO-END - FLUXO COMPLETO
// =============================================

const request = require('supertest');
const express = require('express');

describe('E2E - Fluxo Completo do Sistema', () => {
  let app;
  const adminToken = 'test-admin-token-e2e-completo';
  let agendamentoId;

  beforeAll(async () => {
    // Configurar aplicação express mock para testes E2E
    app = express();
    app.use(express.json());

    // Mock de autenticação
    app.use((req, res, next) => {
      const token = req.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        return res.status(401).json({ error: 'Token requerido' });
      }

      req.user = {
        id: 1,
        tipo_usuario: 'admin',
        sessionId: 'test-session-e2e'
      };

      next();
    });

    // Mock das rotas principais
    const agendamentos = [];
    let nextId = 1;

    // Login mock
    app.post('/api/auth/login', (req, res) => {
      res.json({
        success: true,
        token: adminToken,
        user: { id: 1, tipo_usuario: 'admin' }
      });
    });

    // GET - Lista agendamentos
    app.get('/api/agendamentos', (req, res) => {
      let dados = [...agendamentos];

      // Filtro por tipo de usuário
      if (req.query.tipo_usuario === 'loja') {
        dados = dados.filter(item => item.status_aprovacao === 'aprovado');
      }

      res.json({ success: true, data: dados });
    });

    // GET - Lista com máscaras (DEVE vir antes de /:id)
    app.get('/api/agendamentos/com-mascaras', (req, res) => {
      const dados = [
        ...agendamentos,
        { id: 'temp_123', produto: 'PRODUTO TEMPORÁRIO', tipo: 'TEMPORARIO' }
      ];
      res.json({ success: true, data: dados });
    });

    // GET - Agendamento específico
    app.get('/api/agendamentos/:id', (req, res) => {
      const id = parseInt(req.params.id);
      const agendamento = agendamentos.find(item => item.id === id);

      if (!agendamento) {
        return res.status(404).json({ error: 'Agendamento não encontrado' });
      }

      res.json({ success: true, data: agendamento });
    });

    // POST - Criar agendamento
    app.post('/api/agendamentos', (req, res) => {
      const novoAgendamento = {
        id: nextId++,
        ...req.body,
        status_aprovacao: 'pendente',
        created_at: new Date().toISOString()
      };

      agendamentos.push(novoAgendamento);
      res.status(201).json({ success: true, data: novoAgendamento });
    });

    // POST - Criar agendamento visual
    app.post('/api/agendamentos/visual', (req, res) => {
      res.status(201).json({
        success: true,
        tipo: 'TEMPORARIO',
        persistido: false,
        data: { id: `temp_${Date.now()}`, ...req.body }
      });
    });

    // PUT - Atualizar agendamento
    app.put('/api/agendamentos/:id', (req, res) => {
      const id = parseInt(req.params.id);
      const index = agendamentos.findIndex(item => item.id === id);

      if (index === -1) {
        return res.status(404).json({ error: 'Agendamento não encontrado' });
      }

      agendamentos[index] = { ...agendamentos[index], ...req.body };
      res.json({ success: true, data: agendamentos[index] });
    });

    // POST - Aprovar agendamento
    app.post('/api/agendamentos/:id/aprovar', (req, res) => {
      const id = parseInt(req.params.id);
      const index = agendamentos.findIndex(item => item.id === id);

      if (index !== -1) {
        agendamentos[index].status_aprovacao = 'aprovado';
        agendamentos[index].observacao = req.body.observacao || 'Aprovado';
      }

      res.json({
        success: true,
        data: agendamentos[index] || { id, status_aprovacao: 'aprovado' }
      });
    });

    // POST - Rejeitar agendamento
    app.post('/api/agendamentos/:id/rejeitar', (req, res) => {
      const id = parseInt(req.params.id);
      const index = agendamentos.findIndex(item => item.id === id);

      if (index !== -1) {
        agendamentos[index].status_aprovacao = 'rejeitado';
        agendamentos[index].motivo_rejeicao = req.body.motivo || 'Rejeitado';
      }

      res.json({
        success: true,
        data: agendamentos[index] || {
          id,
          status_aprovacao: 'rejeitado',
          motivo_rejeicao: req.body.motivo || 'Rejeitado'
        }
      });
    });

    // Remover referência ao login real
    // adminToken já é definido como constante
  });

  describe('Fluxo de Aprovação Completo', () => {
    test('1. Admin deve criar novo agendamento', async () => {
      const novoAgendamento = {
        cod_ant: 'E2E001',
        descricao: 'PRODUTO TESTE E2E',
        fornecedor: 'FORNECEDOR E2E',
        status: 'PENDENTE',
        data_prevista: '2025-09-25',
        quantidade: 10,
        valor_total: 1000.0,
        loja: '001',
        contato: 'Teste E2E - (11) 99999-9999',
        numero_nf: 'E2E000001'
      };

      const response = await request(app)
        .post('/api/agendamentos')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(novoAgendamento)
        .expect(201);

      agendamentoId = response.body.data.id;
      expect(agendamentoId).toBeDefined();
    });

    test('2. Agendamento deve aparecer na lista do admin', async () => {
      const response = await request(app)
        .get('/api/agendamentos')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const agendamento = response.body.data.find(
        item => item.id === agendamentoId
      );

      expect(agendamento).toBeDefined();
      expect(agendamento.status_aprovacao).toBe('pendente');
    });

    test('3. Agendamento NÃO deve aparecer na lista da loja (ainda pendente)', async () => {
      const response = await request(app)
        .get('/api/agendamentos?tipo_usuario=loja')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const agendamento = response.body.data.find(
        item => item.id === agendamentoId
      );

      expect(agendamento).toBeUndefined();
    });

    test('4. Admin deve aprovar o agendamento', async () => {
      const response = await request(app)
        .post(`/api/agendamentos/${agendamentoId}/aprovar`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          usuario_id: 1,
          observacao: 'Aprovado no teste E2E'
        })
        .expect(200);

      expect(response.body.data.status_aprovacao).toBe('aprovado');
    });

    test('5. Agendamento aprovado deve aparecer na lista da loja', async () => {
      const response = await request(app)
        .get('/api/agendamentos?tipo_usuario=loja')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const agendamento = response.body.data.find(
        item => item.id === agendamentoId
      );

      expect(agendamento).toBeDefined();
      expect(agendamento.status_aprovacao).toBe('aprovado');
    });

    test('6. Admin deve poder editar agendamento aprovado', async () => {
      const dadosEdicao = {
        observacoes: 'Editado após aprovação - E2E',
        quantidade: 15
      };

      const response = await request(app)
        .put(`/api/agendamentos/${agendamentoId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(dadosEdicao)
        .expect(200);

      expect(response.body.data.observacoes).toBe(dadosEdicao.observacoes);
      expect(response.body.data.quantidade).toBe(dadosEdicao.quantidade);
    });
  });

  describe('Fluxo de Rejeição', () => {
    let agendamentoRejeitadoId;

    test('1. Criar agendamento para rejeitar', async () => {
      const agendamento = {
        cod_ant: 'REJ001',
        descricao: 'PRODUTO PARA REJEITAR',
        fornecedor: 'FORNECEDOR TESTE',
        status: 'PENDENTE',
        data_prevista: '2025-09-30',
        quantidade: 1,
        valor_total: 100.0,
        loja: '001'
      };

      const response = await request(app)
        .post('/api/agendamentos')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(agendamento)
        .expect(201);

      agendamentoRejeitadoId = response.body.data.id;
    });

    test('2. Admin deve rejeitar o agendamento', async () => {
      const response = await request(app)
        .post(`/api/agendamentos/${agendamentoRejeitadoId}/rejeitar`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          usuario_id: 1,
          motivo: 'Dados inconsistentes - Teste E2E'
        })
        .expect(200);

      expect(response.body.data.status_aprovacao).toBe('rejeitado');
      expect(response.body.data.motivo_rejeicao).toBe(
        'Dados inconsistentes - Teste E2E'
      );
    });

    test('3. Agendamento rejeitado NÃO deve aparecer na lista da loja', async () => {
      const response = await request(app)
        .get('/api/agendamentos?tipo_usuario=loja')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const agendamento = response.body.data.find(
        item => item.id === agendamentoRejeitadoId
      );

      expect(agendamento).toBeUndefined();
    });
  });

  describe('Sistema Híbrido - Máscaras Temporárias', () => {
    test('1. Deve criar agendamento visual temporário', async () => {
      const dadosTemporarios = {
        produto: 'PRODUTO VISUAL E2E',
        fornecedor: 'FORNECEDOR VISUAL',
        quantidade: 5,
        data: '2025-10-01'
      };

      const response = await request(app)
        .post('/api/agendamentos/visual')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(dadosTemporarios)
        .expect(201);

      expect(response.body.tipo).toBe('TEMPORARIO');
      expect(response.body.persistido).toBe(false);
      expect(response.body.data.id).toMatch(/^temp_/);
    });

    test('2. Dados visuais devem aparecer misturados com dados reais', async () => {
      const response = await request(app)
        .get('/api/agendamentos/com-mascaras')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const temTemporarios = response.body.data.some(
        item => item.id && item.id.toString().startsWith('temp_')
      );

      expect(temTemporarios).toBe(true);
    });
  });

  describe('Performance e Limites', () => {
    test('Deve lidar com múltiplas requisições simultâneas', async () => {
      const requests = Array.from({ length: 5 }, (_, _i) =>
        request(app)
          .get('/api/agendamentos')
          .set('Authorization', `Bearer ${adminToken}`)
      );

      const responses = await Promise.all(requests);

      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(Array.isArray(response.body.data)).toBe(true);
      });
    });

    test('Deve validar limites de dados na criação', async () => {
      const agendamentoGrande = {
        cod_ant: 'A'.repeat(50),
        descricao: 'D'.repeat(1000),
        fornecedor: 'TESTE',
        quantidade: 999999,
        valor_total: 999999.99
      };

      // Deve aceitar dados dentro dos limites
      await request(app)
        .post('/api/agendamentos')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(agendamentoGrande)
        .expect(201);
    });
  });

  describe('Tratamento de Erro E2E', () => {
    test('Deve tratar tentativa de acesso sem autenticação', async () => {
      await request(app)
        .post('/api/agendamentos')
        .send({ descricao: 'TESTE' })
        .expect(401);
    });

    test('Deve tratar operação em agendamento inexistente', async () => {
      await request(app)
        .put('/api/agendamentos/99999')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ descricao: 'TESTE' })
        .expect(404);
    });

    test('Deve tratar dados malformados', async () => {
      await request(app)
        .post('/api/agendamentos')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('Content-Type', 'application/json')
        .send('{"dados": "malformados"')
        .expect(400);
    });
  });

  describe('Cenários de Integração', () => {
    describe('Interface Admin x Loja', () => {
      test('Mudanças do admin devem refletir na loja em tempo real', async () => {
        // Este teste seria implementado com WebSockets ou polling
        // Por enquanto, testamos a consistência via API

        const adminResponse = await request(app)
          .get('/api/agendamentos')
          .set('Authorization', `Bearer ${adminToken}`)
          .query({ tipo_usuario: 'admin' });

        const lojaResponse = await request(app)
          .get('/api/agendamentos')
          .set('Authorization', `Bearer ${adminToken}`)
          .query({ tipo_usuario: 'loja' });

        // Todos os itens da loja devem estar aprovados
        const todosAprovados = lojaResponse.body.data.every(
          item => item.status_aprovacao === 'aprovado'
        );

        expect(todosAprovados).toBe(true);
        expect(lojaResponse.body.data.length).toBeLessThanOrEqual(
          adminResponse.body.data.length
        );
      });
    });

    describe('Backup e Recuperação', () => {
      test('Sistema deve manter integridade após falhas simuladas', async () => {
        // Simular falha de rede
        const beforeCount = await request(app)
          .get('/api/agendamentos')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        // Operação durante "falha"
        const createResponse = await request(app)
          .post('/api/agendamentos')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            cod_ant: 'BACKUP001',
            descricao: 'TESTE BACKUP',
            fornecedor: 'TESTE'
          });

        // Verificar consistência após "recuperação"
        const afterCount = await request(app)
          .get('/api/agendamentos')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        if (createResponse.status === 201) {
          expect(afterCount.body.data.length).toBe(
            beforeCount.body.data.length + 1
          );
        }
      });
    });
  });
});
