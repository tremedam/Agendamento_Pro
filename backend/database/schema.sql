-- =============================================
-- SISTEMA AGENDA RECEBIMENTO MERCADORIAS
-- SCHEMA DE BANCO DE DADOS SQL
-- Compatível com: MySQL, PostgreSQL, SQL Server
-- =============================================
-- ==========================
-- 1. TABELA DE USUÁRIOS
-- ==========================
CREATE TABLE usuarios (
  id INT PRIMARY KEY AUTO_INCREMENT,
  email VARCHAR(255) NOT NULL UNIQUE,
  senha_hash VARCHAR(255) NOT NULL,
  nome VARCHAR(255) NOT NULL,
  perfil ENUM('admin', 'loja', 'gerente') NOT NULL DEFAULT 'loja',
  ativo BOOLEAN DEFAULT TRUE,
  loja_id VARCHAR(10),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  ultimo_login TIMESTAMP NULL,
  INDEX idx_email (email),
  INDEX idx_perfil (perfil),
  INDEX idx_loja (loja_id)
);
-- ==========================
-- 2. TABELA DE FORNECEDORES
-- ==========================
CREATE TABLE fornecedores (
  id INT PRIMARY KEY AUTO_INCREMENT,
  codigo VARCHAR(20) UNIQUE,
  nome VARCHAR(255) NOT NULL,
  cnpj VARCHAR(18),
  telefone VARCHAR(20),
  email VARCHAR(255),
  endereco TEXT,
  contato_responsavel VARCHAR(255),
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_codigo (codigo),
  INDEX idx_nome (nome),
  INDEX idx_cnpj (cnpj)
);
-- ==========================
-- 3. TABELA DE PRODUTOS
-- ==========================
CREATE TABLE produtos (
  id INT PRIMARY KEY AUTO_INCREMENT,
  codigo_antigo VARCHAR(50),
  -- Campo para manter compatibilidade
  codigo_barras VARCHAR(50),
  descricao TEXT NOT NULL,
  categoria VARCHAR(100),
  unidade_medida VARCHAR(10) DEFAULT 'UN',
  valor_custo DECIMAL(15, 2),
  valor_venda DECIMAL(15, 2),
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_codigo_antigo (codigo_antigo),
  INDEX idx_codigo_barras (codigo_barras),
  INDEX idx_descricao (descricao(100)),
  INDEX idx_categoria (categoria)
);
-- ==========================
-- 4. TABELA PRINCIPAL - AGENDAMENTOS
-- ==========================
CREATE TABLE agendamentos (
  id INT PRIMARY KEY AUTO_INCREMENT,
  -- Dados do Produto
  produto_id INT,
  codigo_produto VARCHAR(50),
  -- Para compatibilidade com sistema legado
  descricao_produto TEXT NOT NULL,
  -- Dados do Fornecedor
  fornecedor_id INT,
  nome_fornecedor VARCHAR(255) NOT NULL,
  -- Dados da Entrega
  data_entrega DATE NOT NULL,
  data_agendamento TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  quantidade DECIMAL(10, 2) NOT NULL,
  saldo DECIMAL(10, 2),
  -- Status do Agendamento
  status_entrega ENUM(
    'PENDENTE',
    'CONFIRMADO',
    'PREV. ENTREGA',
    'EM TRANSITO',
    'ENTREGUE',
    'CANCELADO',
    'REAGENDADO'
  ) DEFAULT 'PENDENTE',
  -- Sistema de Aprovação
  status_aprovacao ENUM('pendente', 'aprovado', 'rejeitado') DEFAULT 'pendente',
  aprovado_por INT NULL,
  -- ID do usuário que aprovou
  data_aprovacao TIMESTAMP NULL,
  motivo_rejeicao TEXT NULL,
  -- Dados Financeiros
  valor_unitario DECIMAL(15, 2),
  valor_total DECIMAL(15, 2),
  numero_nf VARCHAR(50),
  -- Dados da Loja/Filial
  loja_codigo VARCHAR(10) NOT NULL,
  loja_nome VARCHAR(255),
  -- Informações Adicionais
  observacoes TEXT,
  contato_entrega VARCHAR(255),
  telefone_contato VARCHAR(20),
  prioridade ENUM('BAIXA', 'MEDIA', 'ALTA') DEFAULT 'MEDIA',
  -- Controle de Versão
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by INT,
  updated_by INT,
  -- Chaves Estrangeiras
  FOREIGN KEY (produto_id) REFERENCES produtos(id) ON DELETE
  SET
    NULL,
    FOREIGN KEY (fornecedor_id) REFERENCES fornecedores(id) ON DELETE
  SET
    NULL,
    FOREIGN KEY (aprovado_por) REFERENCES usuarios(id) ON DELETE
  SET
    NULL,
    FOREIGN KEY (created_by) REFERENCES usuarios(id) ON DELETE
  SET
    NULL,
    FOREIGN KEY (updated_by) REFERENCES usuarios(id) ON DELETE
  SET
    NULL,
    -- Índices para Performance
    INDEX idx_data_entrega (data_entrega),
    INDEX idx_status_entrega (status_entrega),
    INDEX idx_status_aprovacao (status_aprovacao),
    INDEX idx_fornecedor (fornecedor_id),
    INDEX idx_produto (produto_id),
    INDEX idx_loja (loja_codigo),
    INDEX idx_codigo_produto (codigo_produto),
    INDEX idx_data_agendamento (data_agendamento),
    INDEX idx_prioridade (prioridade)
);
-- ==========================
-- 5. TABELA DE HISTÓRICO/LOG
-- ==========================
CREATE TABLE agendamentos_historico (
  id INT PRIMARY KEY AUTO_INCREMENT,
  agendamento_id INT NOT NULL,
  acao VARCHAR(50) NOT NULL,
  -- 'CRIADO', 'APROVADO', 'REJEITADO', 'EDITADO', etc.
  status_anterior VARCHAR(50),
  status_novo VARCHAR(50),
  dados_alterados JSON,
  -- Para bancos que suportam JSON
  usuario_id INT,
  observacao TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (agendamento_id) REFERENCES agendamentos(id) ON DELETE CASCADE,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE
  SET
    NULL,
    INDEX idx_agendamento (agendamento_id),
    INDEX idx_acao (acao),
    INDEX idx_data (created_at)
);
-- ==========================
-- 6. DADOS INICIAIS (SEEDS)
-- ==========================
-- Usuários padrão
INSERT INTO
  usuarios (email, senha_hash, nome, perfil)
VALUES
  (
    'admin@example.com',
    '$2b$10$example_hash_admin',
    'Administrador',
    'admin'
  ),
  (
    'loja@example.com',
    '$2b$10$example_hash_loja',
    'Usuário Loja',
    'loja'
  ),
  (
    'gerente@example.com',
    '$2b$10$example_hash_gerente',
    'Gerente',
    'gerente'
  );
-- Fornecedores exemplo
INSERT INTO
  fornecedores (
    codigo,
    nome,
    cnpj,
    telefone,
    contato_responsavel
  )
VALUES
  (
    'VIVENSIS',
    'VIVENSIS TECNOLOGIA LTDA',
    '12.345.678/0001-90',
    '(11) 99999-9999',
    'João Silva'
  ),
  (
    'TELEFONICA',
    'TELEFÔNICA BRASIL S.A.',
    '02.558.157/0001-62',
    '(11) 88888-8888',
    'Maria Santos'
  ),
  (
    'WHIRLPOOL',
    'WHIRLPOOL S.A.',
    '59.104.422/0001-60',
    '(11) 77777-7777',
    'Pedro Costa'
  );
-- Produtos exemplo
INSERT INTO
  produtos (
    codigo_antigo,
    descricao,
    categoria,
    valor_custo,
    valor_venda
  )
VALUES
  (
    '011049',
    'ANTENA MINI PARAB 60CM VIVENSIS CINZA NC',
    'ANTENAS',
    150.00,
    250.00
  ),
  (
    '011232',
    'RECEPTOR VX10 NOVO VIVENSIS PRETO NC',
    'RECEPTORES',
    200.00,
    350.00
  ),
  (
    '121106',
    'SMARTPHONE MOTOROLA G15 256GB GRAFITE BIVOLT',
    'CELULARES',
    800.00,
    1200.00
  );
-- Agendamentos exemplo
INSERT INTO
  agendamentos (
    codigo_produto,
    descricao_produto,
    nome_fornecedor,
    data_entrega,
    quantidade,
    saldo,
    status_entrega,
    valor_total,
    loja_codigo,
    observacoes
  )
VALUES
  (
    '011049',
    'ANTENA MINI PARAB 60CM VIVENSIS CINZA NC',
    'VIVENSIS',
    '2025-08-18',
    6,
    7,
    'PREV. ENTREGA',
    1500.00,
    '001',
    'Entrega programada para manhã'
  ),
  (
    '011232',
    'RECEPTOR VX10 NOVO VIVENSIS PRETO NC',
    'VIVENSIS',
    '2025-08-18',
    7,
    7,
    'PREV. ENTREGA',
    2450.00,
    '001',
    ''
  ),
  (
    '121106',
    'SMARTPHONE MOTOROLA G15 256GB GRAFITE BIVOLT',
    'TELEFONICA',
    '2025-08-19',
    200,
    200,
    'PREV. ENTREGA',
    240000.00,
    '001',
    'Lote prioritário para promoção'
  );
-- ==========================
  -- 7. VIEWS ÚTEIS
  -- ==========================
  -- View para dados da loja (só aprovados)
  CREATE VIEW vw_agendamentos_loja AS
SELECT
  a.id,
  a.codigo_produto as codAnt,
  a.descricao_produto as descricao,
  a.nome_fornecedor as fornecedor,
  a.status_entrega as status,
  DATE_FORMAT(a.data_entrega, '%d/%m/%Y') as data,
  a.quantidade as qtde,
  a.saldo,
  a.observacoes,
  a.loja_codigo as loja,
  a.numero_nf as numeroNF,
  a.valor_total as valorTotal,
  DATE_FORMAT(a.updated_at, '%d/%m/%Y %H:%i') as dataUltimaAtualizacao
FROM
  agendamentos a
WHERE
  a.status_aprovacao = 'aprovado'
ORDER BY
  a.data_entrega ASC;
-- View para dados do admin (todos)
  CREATE VIEW vw_agendamentos_admin AS
SELECT
  a.*,
  u.nome as aprovado_por_nome,
  DATE_FORMAT(a.data_entrega, '%d/%m/%Y') as data_formatada,
  DATE_FORMAT(a.updated_at, '%d/%m/%Y %H:%i') as ultima_atualizacao_formatada
FROM
  agendamentos a
  LEFT JOIN usuarios u ON a.aprovado_por = u.id
ORDER BY
  a.created_at DESC;
-- ==========================
  -- 8. PROCEDURES ÚTEIS
  -- ==========================
  DELIMITER / / -- Procedure para aprovar agendamento
  CREATE PROCEDURE sp_aprovar_agendamento(
    IN p_agendamento_id INT,
    IN p_usuario_id INT,
    IN p_observacao TEXT
  ) BEGIN DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN ROLLBACK;
RESIGNAL;
END;
START TRANSACTION;
UPDATE
  agendamentos
SET
  status_aprovacao = 'aprovado',
  aprovado_por = p_usuario_id,
  data_aprovacao = NOW(),
  updated_by = p_usuario_id
WHERE
  id = p_agendamento_id;
INSERT INTO
  agendamentos_historico (
    agendamento_id,
    acao,
    status_novo,
    usuario_id,
    observacao
  )
VALUES
  (
    p_agendamento_id,
    'APROVADO',
    'aprovado',
    p_usuario_id,
    p_observacao
  );
COMMIT;
END / / -- Procedure para rejeitar agendamento
CREATE PROCEDURE sp_rejeitar_agendamento(
  IN p_agendamento_id INT,
  IN p_usuario_id INT,
  IN p_motivo TEXT
) BEGIN DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN ROLLBACK;
RESIGNAL;
END;
START TRANSACTION;
UPDATE
  agendamentos
SET
  status_aprovacao = 'rejeitado',
  motivo_rejeicao = p_motivo,
  updated_by = p_usuario_id
WHERE
  id = p_agendamento_id;
INSERT INTO
  agendamentos_historico (
    agendamento_id,
    acao,
    status_novo,
    usuario_id,
    observacao
  )
VALUES
  (
    p_agendamento_id,
    'REJEITADO',
    'rejeitado',
    p_usuario_id,
    p_motivo
  );
COMMIT;
END / / DELIMITER;
-- ==========================
-- 9. ÍNDICES COMPOSTOS PARA PERFORMANCE
-- ==========================
-- Para consultas frequentes
CREATE INDEX idx_agendamentos_aprovacao_data ON agendamentos(status_aprovacao, data_entrega);
CREATE INDEX idx_agendamentos_loja_status ON agendamentos(loja_codigo, status_entrega);
CREATE INDEX idx_agendamentos_fornecedor_data ON agendamentos(fornecedor_id, data_entrega);
-- ==========================
-- COMENTÁRIOS FINAIS
-- ==========================
/*
Este schema foi projetado para:

1. SER PLUGÁVEL: Você pode facilmente conectar com seu sistema existente
2. FLEXÍVEL: Suporta diferentes fornecedores, produtos e lojas
3. AUDITÁVEL: Histórico completo de mudanças
4. PERFORMÁTICO: Índices otimizados para consultas frequentes
5. SEGURO: Sistema de aprovação e controle de acesso

Para conectar com seu sistema atual:
- Adapte os campos conforme sua estrutura existente
- Use as foreign keys para conectar com suas tabelas de produtos/fornecedores
- As views facilitam a integração sem impactar o frontend

*/