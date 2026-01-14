// =============================================
// MODELO DE USUÁRIO
// Definição dos dados de usuários e validações
// =============================================

// Usuários autorizados (migrados do frontend)
const usuariosAutorizados = [
  {
    id: 1,
    re: '12345',
    email: 'admin@example.com',
    senha: '$2b$10$TeGoKkgCcf4kTjbsy8616.Oc4gIYC6y4Cv4nn/2fd9utQIARfmepa', // admin123
    nome: 'Administrador Principal',
    nivel: 'admin',
    perfil: 'admin',
    permissoes: ['read', 'write', 'delete', 'export', 'import', 'manage_users'],
    ativo: true,
    loja: null
  },
  {
    id: 2,
    re: '67890',
    email: 'supervisor@example.com',
    senha: '$2b$10$uuZcRDUmzqGj/gj3BcHxo.NRgN8s/fHUoX.Cfp0w.v9tNuuAWkRcK', // super456
    nome: 'Supervisor Geral',
    nivel: 'admin',
    perfil: 'admin',
    permissoes: ['read', 'write', 'delete', 'export', 'import'],
    ativo: true,
    loja: null
  },
  {
    id: 3,
    re: '11111',
    email: 'ti@example.com',
    senha: '$2b$10$gW9w5gbH3Li4lL4lf5CvMecK5BVZdGyrcXv84dCH6KbrFnXsd5jca', // senha123
    nome: 'Gestor TI',
    nivel: 'admin',
    perfil: 'admin',
    permissoes: ['read', 'write', 'export', 'import', 'manage_users'],
    ativo: true,
    loja: null
  },
  {
    id: 4,
    re: '54321',
    email: 'coordenador@example.com',
    senha: '$2b$10$93OmsQhEJbV0U6r4CH0XC.Eu9ILjHCSMCgrn6S.n62cCw64uuDGIy', // coord2024
    nome: 'Coordenador de Recebimento',
    nivel: 'admin',
    perfil: 'admin',
    permissoes: ['read', 'write', 'export'],
    ativo: true,
    loja: null
  },
  {
    id: 5,
    re: 'usuario001',
    email: 'usuario@example.com',
    senha: '$2b$10$z8HwRtoPx8j2VRNHDuwtXusq6cjuZLjnZ7JKfXaw3zEBq70E6d87W', // usuario123
    nome: 'Usuário Geral',
    nivel: 'usuario',
    perfil: 'usuario',
    permissoes: ['read'],
    ativo: true,
    loja: null
  }
];

// ========== MÉTODOS DO MODEL ==========

/**
 * Buscar usuário por RE
 * @param {string} re - Registro de empregado
 * @returns {Object|null} - Usuário encontrado ou null
 */
function buscarPorRE(re) {
  return usuariosAutorizados.find(u => u.re === re) || null;
}

/**
 * Buscar usuário por ID
 * @param {number} id - ID do usuário
 * @returns {Object|null} - Usuário encontrado ou null
 */
function buscarPorId(id) {
  return usuariosAutorizados.find(u => u.id === id) || null;
}

/**
 * Buscar usuário por perfil
 * @param {string} perfil - Perfil do usuário (admin, usuario, etc.)
 * @returns {Object|null} - Primeiro usuário encontrado ou null
 */
function buscarPorPerfil(perfil) {
  return usuariosAutorizados.find(u => u.perfil === perfil) || null;
}

/**
 * Buscar usuário por múltiplos critérios
 * @param {Object} criterios - Objeto com critérios de busca
 * @returns {Object|null} - Usuário encontrado ou null
 */
function buscarPorCriterios(criterios) {
  return (
    usuariosAutorizados.find(u => {
      return Object.keys(criterios).every(key => u[key] === criterios[key]);
    }) || null
  );
}

/**
 * Remover dados sensíveis do usuário
 * @param {Object} usuario - Objeto do usuário
 * @returns {Object} - Usuário sem dados sensíveis
 */
function obterUsuarioSeguro(usuario) {
  if (!usuario) return null;
  const { senha: _, ...usuarioSeguro } = usuario;
  return usuarioSeguro;
}

/**
 * Validar se usuário está ativo
 * @param {Object} usuario - Objeto do usuário
 * @returns {boolean} - True se ativo, false caso contrário
 */
function isUsuarioAtivo(usuario) {
  return usuario && usuario.ativo === true;
}

/**
 * Obter lista de usuários para demonstração (sem senhas)
 * @returns {Array} - Lista de usuários seguros
 */
function obterUsuariosDemo() {
  return [
    {
      re: '12345',
      senha: 'admin123',
      perfil: 'admin',
      nome: 'Administrador Principal'
    },
    {
      re: '67890',
      senha: 'super456',
      perfil: 'admin',
      nome: 'Supervisor Geral'
    },
    {
      re: '11111',
      senha: 'senha123',
      perfil: 'admin',
      nome: 'Gestor TI'
    },
    {
      re: '54321',
      senha: 'coord2024',
      perfil: 'admin',
      nome: 'Coordenador de Recebimento'
    }
  ];
}

module.exports = {
  buscarPorRE,
  buscarPorId,
  buscarPorPerfil,
  buscarPorCriterios,
  obterUsuarioSeguro,
  isUsuarioAtivo,
  obterUsuariosDemo
};
