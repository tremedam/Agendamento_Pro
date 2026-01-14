// Setup rápido e automático do sistema
// Este script vai configurar automaticamente o banco e migrar os dados

const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');
const logger = require('../src/utils/logger');

// Dados mockados que serão migrados
const dadosMockados = [
  {
    codAnt: '011049',
    descricao: 'ANTENA MINI PARAB 60CM VIVENSIS CINZA NC',
    fornecedor: 'VIVENSIS',
    status: 'PREV. ENTREGA',
    data: '2025-08-18',
    qtde: 6,
    saldo: 7,
    observacoes: 'Entrega programada para manhã',
    loja: '001',
    contato: 'João Silva - (11) 99999-9999',
    numeroNF: '000012345',
    valorTotal: 1250.0
  },
  {
    codAnt: '011232',
    descricao: 'RECEPTOR VX10 NOVO VIVENSIS PRETO NC',
    fornecedor: 'VIVENSIS',
    status: 'PREV. ENTREGA',
    data: '2025-08-18',
    qtde: 7,
    saldo: 7,
    observacoes: '',
    loja: '001',
    contato: 'João Silva - (11) 99999-9999',
    numeroNF: '000012346',
    valorTotal: 2100.0
  },
  {
    codAnt: '121106',
    descricao: 'SMARTPHONE MOTOROLA G15 256GB GRAFITE BIVOLT',
    fornecedor: 'TELEFONICA',
    status: 'PREV. ENTREGA',
    data: '2025-08-15',
    qtde: 200,
    saldo: 200,
    observacoes: 'Lote prioritário para promoção',
    loja: '001',
    contato: 'Maria Santos - (11) 88888-8888',
    numeroNF: '000054321',
    valorTotal: 120000.0
  },
  {
    codAnt: '121111',
    descricao: 'SMARTPHONE MOTOROLA G15 256GB VERDE BIVOLT',
    fornecedor: 'TELEFONICA',
    status: 'PREV. ENTREGA',
    data: '2025-08-15',
    qtde: 50,
    saldo: 50,
    observacoes: '',
    loja: '001',
    contato: 'Maria Santos - (11) 88888-8888',
    numeroNF: '000054322',
    valorTotal: 30000.0
  },
  {
    codAnt: '121730',
    descricao: 'SMARTPHONE SAMSUNG A56 256G PRETO BIVOLT',
    fornecedor: 'TELEFONICA',
    status: 'PREV. ENTREGA',
    data: '2025-08-15',
    qtde: 50,
    saldo: 50,
    observacoes: 'Aguardando confirmação de horário',
    loja: '001',
    contato: 'Maria Santos - (11) 88888-8888',
    numeroNF: '000054323',
    valorTotal: 32500.0
  }
];

async function setupCompleto() {
  logger.info('INICIANDO SETUP COMPLETO DO SISTEMA');
  logger.info('=====================================');

  let connection;

  try {
    // Primeiro, vamos tentar diferentes configurações de conexão
    const configsConexao = [
      {
        host: 'localhost',
        port: 3306,
        user: 'root',
        password: '',
        database: undefined
      },
      {
        host: 'localhost',
        port: 3306,
        user: 'root',
        password: 'root',
        database: undefined
      },
      {
        host: 'localhost',
        port: 3306,
        user: 'root',
        password: 'mysql',
        database: undefined
      },
      {
        host: 'localhost',
        port: 3306,
        user: 'root',
        password: '123456',
        database: undefined
      }
    ];

    logger.info('Tentando conectar ao MySQL...');

    let configValida = null;
    for (const config of configsConexao) {
      try {
        const testConnection = await mysql.createConnection(config);
        await testConnection.ping();
        await testConnection.end();
        configValida = config;
        logger.success(
          `Conexão bem-sucedida com user: ${config.user}, password: ${config.password || '(vazio)'}`
        );
        break;
      } catch {
        logger.warn(
          `Falhou com user: ${config.user}, password: ${config.password || '(vazio)'}`
        );
      }
    }

    if (!configValida) {
      throw new Error(
        'Não foi possível conectar ao MySQL com nenhuma das configurações padrão'
      );
    }

    // Conectar sem especificar database
    connection = await mysql.createConnection(configValida);

    // Criar database se não existir
    logger.process('Criando database...');
    await connection.execute(
      'CREATE DATABASE IF NOT EXISTS agenda_mercadorias'
    );
    logger.success('Database criada/verificada: agenda_mercadorias');

    // Conectar à database específica
    await connection.end();
    configValida.database = 'agenda_mercadorias';
    connection = await mysql.createConnection(configValida);

    // Criar tabela
    logger.process('Criando tabela agendamentos...');
    const createTableSQL = `
            CREATE TABLE IF NOT EXISTS agendamentos (
                id INT AUTO_INCREMENT PRIMARY KEY,
                cod_ant VARCHAR(50) NOT NULL,
                descricao TEXT NOT NULL,
                fornecedor VARCHAR(100) NOT NULL,
                status VARCHAR(50) NOT NULL DEFAULT 'PENDENTE',
                data_prevista DATE NOT NULL,
                quantidade INT NOT NULL DEFAULT 0,
                saldo INT NOT NULL DEFAULT 0,
                observacoes TEXT,
                loja VARCHAR(10) NOT NULL DEFAULT '001',
                contato VARCHAR(200),
                numero_nf VARCHAR(50),
                valor_total DECIMAL(10,2) DEFAULT 0.00,
                status_aprovacao ENUM('pendente', 'aprovado', 'rejeitado') DEFAULT 'aprovado',
                motivo_rejeicao TEXT,
                criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                aprovado_por VARCHAR(100),
                aprovado_em TIMESTAMP NULL,
                
                INDEX idx_status (status),
                INDEX idx_fornecedor (fornecedor),
                INDEX idx_data_prevista (data_prevista),
                INDEX idx_status_aprovacao (status_aprovacao)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `;

    await connection.execute(createTableSQL);
    logger.success('Tabela criada/verificada');

    // Verificar se já existem dados
    const [existingData] = await connection.execute(
      'SELECT COUNT(*) as total FROM agendamentos'
    );

    if (existingData[0].total > 0) {
      logger.warn(
        `Já existem ${existingData[0].total} registros. Limpando para migração...`
      );
      await connection.execute('DELETE FROM agendamentos');
    }

    // Inserir dados mockados
    logger.process('Inserindo dados de exemplo...');

    const insertSQL = `
            INSERT INTO agendamentos (
                cod_ant, descricao, fornecedor, status, data_prevista,
                quantidade, saldo, observacoes, loja, contato,
                numero_nf, valor_total, status_aprovacao
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

    for (const item of dadosMockados) {
      const valores = [
        item.codAnt,
        item.descricao,
        item.fornecedor,
        item.status,
        item.data,
        item.qtde,
        item.saldo,
        item.observacoes || null,
        item.loja,
        item.contato,
        item.numeroNF,
        item.valorTotal,
        'aprovado'
      ];

      await connection.execute(insertSQL, valores);
      logger.success(`Inserido: ${item.descricao.substring(0, 50)}...`);
    }

    // Atualizar arquivo .env com as configurações que funcionaram
    logger.process('Atualizando arquivo .env...');

    const envContent = `# =============================================
# CONFIGURAÇÃO AUTOMÁTICA - GERADA PELO SETUP
# =============================================

NODE_ENV=development

# ========== MYSQL - CONFIGURAÇÃO QUE FUNCIONOU ==========
DB_TYPE=mysql
DB_HOST=${configValida.host}
DB_PORT=${configValida.port}
DB_USER=${configValida.user}
DB_PASSWORD=${configValida.password}
DB_NAME=agenda_mercadorias

# ========== SERVIDOR ==========
PORT=3000
API_BASE_URL=http://localhost:3000

# ========== SEGURANÇA ==========
JWT_SECRET=minha_chave_secreta_super_segura_2024
SESSION_SECRET=sessao_secreta_agenda_2024

# ========== LOGS ==========
LOG_LEVEL=debug
`;

    await fs.writeFile(path.join(__dirname, '..', '.env'), envContent);
    logger.success('Arquivo .env atualizado');

    // Verificar dados finais
    const [finalData] = await connection.execute(
      'SELECT COUNT(*) as total FROM agendamentos'
    );
    logger.info(`Total de registros inseridos: ${finalData[0].total}`);

    logger.success('SETUP COMPLETO REALIZADO COM SUCESSO!');
    logger.info('=====================================');
    logger.info('✅ Database: agenda_mercadorias');
    logger.info('✅ Tabela: agendamentos');
    logger.info(`✅ Dados: ${finalData[0].total} registros`);
    logger.info('✅ Arquivo .env configurado');
    logger.info('');
    logger.info('🚀 Próximos passos:');
    logger.info('1. Execute: npm run dev');
    logger.info('2. Teste: http://localhost:3000/api/health');
    logger.info('3. Acesse o frontend e veja os dados do backend!');
  } catch (error) {
    logger.error('ERRO NO SETUP:', error.message);

    if (error.code === 'ECONNREFUSED') {
      logger.info('💡 SOLUÇÃO:');
      logger.info(
        '1. Instale o MySQL: https://dev.mysql.com/downloads/installer/'
      );
      logger.info('2. Ou use XAMPP: https://www.apachefriends.org/');
      logger.info('3. Certifique-se que o serviço MySQL está rodando');
      logger.info('4. Execute este script novamente');
    }
  } finally {
    if (connection) {
      await connection.end();
      logger.debug('Conexão fechada');
    }
  }
}

// Executar setup
if (require.main === module) {
  setupCompleto();
}

module.exports = { setupCompleto };
