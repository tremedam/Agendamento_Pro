// =============================================
// SCRIPT DE SETUP E MIGRAÇÃO
// Execute para configurar o banco de dados
// =============================================

const fs = require('fs');
const path = require('path');
const DatabaseManager = require('./DatabaseManager');
const logger = require('../src/utils/logger');

class SetupDatabase {
  constructor() {
    this.db = new DatabaseManager();
  }

  async executarSetup() {
    logger.info('Iniciando setup do banco de dados...');

    try {
      // 1. Conectar com banco
      await this.db.conectar();

      // 2. Executar schema
      await this.executarSchema();

      // 3. Inserir dados iniciais
      await this.inserirDadosIniciais();

      // 4. Verificar instalação
      await this.verificarInstalacao();

      logger.success('Setup concluído com sucesso!');
    } catch (error) {
      logger.error('Erro durante setup:', error);
    } finally {
      await this.db.fecharConexao();
    }
  }

  async executarSchema() {
    logger.info('Executando schema do banco...');

    try {
      const schemaPath = path.join(__dirname, 'schema.sql');
      const schema = fs.readFileSync(schemaPath, 'utf8');

      // Dividir em comandos individuais
      const comandos = schema
        .split(';')
        .map(cmd => cmd.trim())
        .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));

      for (const comando of comandos) {
        if (comando.includes('CREATE') || comando.includes('INSERT')) {
          try {
            await this.db.executarQuery(comando);
            logger.debug('Comando executado');
          } catch (error) {
            if (!error.message.includes('already exists')) {
              logger.warn('Aviso:', error.message.substring(0, 100));
            }
          }
        }
      }

      logger.success('Schema criado com sucesso');
    } catch (error) {
      logger.error('Erro ao executar schema:', error);
      throw error;
    }
  }

  async inserirDadosIniciais() {
    logger.info('Inserindo dados iniciais...');

    // Dados de exemplo baseados no seu sistema atual
    const agendamentosExemplo = [
      {
        codAnt: '011049',
        descricao: 'ANTENA MINI PARAB 60CM VIVENSIS CINZA NC',
        fornecedor: 'VIVENSIS',
        data: '2025-08-18',
        qtde: 6,
        saldo: 7,
        valorTotal: 1250.0,
        observacoes: 'Entrega programada para manhã'
      },
      {
        codAnt: '011232',
        descricao: 'RECEPTOR VX10 NOVO VIVENSIS PRETO NC',
        fornecedor: 'VIVENSIS',
        data: '2025-08-18',
        qtde: 7,
        saldo: 7,
        valorTotal: 875.0,
        observacoes: ''
      },
      {
        codAnt: '121106',
        descricao: 'SMARTPHONE MOTOROLA G15 256GB GRAFITE BIVOLT',
        fornecedor: 'TELEFONICA',
        data: '2025-08-19',
        qtde: 200,
        saldo: 200,
        valorTotal: 240000.0,
        observacoes: 'Lote prioritário para promoção'
      },
      {
        codAnt: '011415',
        descricao: 'CABO COAXIAL RG6 100M PRETO VIVENSIS',
        fornecedor: 'VIVENSIS',
        data: '2025-08-20',
        qtde: 3,
        saldo: 5,
        valorTotal: 450.0,
        observacoes: 'Material para instalação'
      },
      {
        codAnt: '012001',
        descricao: 'REF CONSUL CRD37 334L BRANCO BIVOLT',
        fornecedor: 'WHIRLPOOL',
        data: '2025-08-21',
        qtde: 5,
        saldo: 5,
        valorTotal: 12500.0,
        observacoes: 'Atraso devido a problema na transportadora'
      }
    ];

    for (const agendamento of agendamentosExemplo) {
      try {
        const id = await this.db.criarAgendamento(agendamento);
        logger.debug(`Agendamento criado: ID ${id} - ${agendamento.codAnt}`);

        // Aprovar alguns automaticamente para demonstração
        if (Math.random() > 0.5) {
          await this.db.aprovarAgendamento(
            id,
            1,
            'Aprovação automática do setup'
          );
          logger.debug('Aprovado automaticamente');
        }
      } catch {
        logger.debug(`Agendamento já existe: ${agendamento.codAnt}`);
      }
    }

    logger.success('Dados iniciais inseridos');
  }

  async verificarInstalacao() {
    logger.info('Verificando instalação...');

    try {
      // Verificar se tabelas existem e têm dados
      const agendamentos = await this.db.buscarTodosAgendamentos();
      const aprovados = await this.db.buscarAgendamentosAprovados();

      logger.info(`Total de agendamentos: ${agendamentos.length}`);
      logger.info(`Agendamentos aprovados: ${aprovados.length}`);
      logger.info(
        `Agendamentos pendentes: ${agendamentos.length - aprovados.length}`
      );

      if (agendamentos.length > 0) {
        logger.success('Banco configurado corretamente!');

        logger.info('Dados disponíveis:');
        agendamentos.slice(0, 3).forEach(item => {
          logger.debug(
            `• ${item.codAnt} - ${item.descricao.substring(0, 40)}...`
          );
        });
      } else {
        logger.warn('Nenhum dado encontrado');
      }
    } catch (error) {
      logger.error('Erro na verificação:', error);
      throw error;
    }
  }

  // ========== MÉTODOS PARA MIGRAÇÃO DA EMPRESA ==========

  /**
   * Importar dados do sistema existente da empresa
   */
  async importarDadosEmpresa(configEmpresa) {
    logger.info('Importando dados do sistema da empresa...');

    try {
      // Conectar com sistema da empresa
      const mysql = require('mysql2/promise');
      const conexaoEmpresa = await mysql.createConnection(configEmpresa);

      // SUBSTITUA esta query pela estrutura do seu banco
      const sqlEmpresa = `
                SELECT 
                    codigo as codAnt,
                    descricao,
                    fornecedor,
                    data_prevista as data,
                    quantidade as qtde,
                    saldo,
                    valor_total as valorTotal,
                    observacoes
                FROM sua_tabela_mercadorias 
                WHERE status = 'ATIVO' 
                  AND data_prevista >= CURDATE()
                ORDER BY data_prevista
            `;

      const [dadosEmpresa] = await conexaoEmpresa.execute(sqlEmpresa);

      logger.info(`Encontrados ${dadosEmpresa.length} registros para importar`);

      let importados = 0;
      for (const item of dadosEmpresa) {
        try {
          await this.db.criarAgendamento(item);
          importados++;

          if (importados % 10 === 0) {
            logger.process(
              `Importados ${importados}/${dadosEmpresa.length} registros...`
            );
          }
        } catch (error) {
          logger.debug(`Erro ao importar ${item.codAnt}: ${error.message}`);
        }
      }

      await conexaoEmpresa.end();
      logger.success(`Importação concluída: ${importados} registros`);
    } catch (error) {
      logger.error('Erro na importação:', error);
      throw error;
    }
  }

  /**
   * Sincronizar com sistema da empresa (executar periodicamente)
   */
  async sincronizarDados(_configEmpresa) {
    logger.process('Sincronizando dados...');

    // Implementar lógica de sincronização periódica
    // Por exemplo: verificar mudanças nas últimas 24h

    const _sqlSincronizacao = `
            SELECT * FROM sua_tabela_mercadorias 
            WHERE data_atualizacao >= DATE_SUB(NOW(), INTERVAL 1 DAY)
        `;

    // Implementar a sincronização conforme necessário
  }
}

// ========== EXECUTAR SETUP ==========

async function main() {
  const setup = new SetupDatabase();

  // Argumentos da linha de comando
  const args = process.argv.slice(2);

  if (args.includes('--import')) {
    // Para importar do sistema da empresa
    logger.info('Modo de importação ativado');

    // CONFIGURE aqui com os dados do seu banco corporativo
    const configEmpresa = {
      host: 'SEU_SERVIDOR',
      port: 3306,
      user: 'SEU_USUARIO',
      password: 'SUA_SENHA',
      database: 'SEU_BANCO'
    };

    await setup.importarDadosEmpresa(configEmpresa);
  } else {
    // Setup normal
    await setup.executarSetup();
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  main().catch(logger.error);
}

module.exports = SetupDatabase;
