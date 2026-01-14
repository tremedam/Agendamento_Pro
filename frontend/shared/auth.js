// Sistema de Autenticação - Integrado com Backend
// Gerencia autenticação via API centralizada

class AuthManager {
  constructor() {
    // Fallback se config não estiver carregado
    this.baseURL =
      typeof window.getApiUrl === 'function'
        ? window.getApiUrl('auth')
        : 'http://localhost:3000/api/auth';

    this.tokenKey =
      typeof window.getConfig === 'function'
        ? window.getConfig('auth.session.storageKey', 'auth_token')
        : 'auth_token';

    this.userKey = 'user_data';

    this.sessionTimeout =
      typeof window.getConfig === 'function'
        ? window.getConfig('auth.session.timeout', 8 * 60 * 60 * 1000)
        : 8 * 60 * 60 * 1000;
  }

  // ========== MÉTODOS DE AUTENTICAÇÃO ==========

  async login(credentials) {
    try {
      const response = await fetch(`${this.baseURL}/login`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(credentials)
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error);
      }

      localStorage.setItem(this.tokenKey, data.token);
      localStorage.setItem(this.userKey, JSON.stringify(data.user));

      return data;
    } catch (error) {
      console.error('❌ Erro no login:', error);
      throw error;
    }
  }

  async logout() {
    try {
      await fetch(`${this.baseURL}/logout`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          Authorization: `Bearer ${this.getToken()}`
        }
      });
    } catch (error) {
      console.error('⚠️ Erro no logout (continuando):', error);
    } finally {
      this.clearLocalData();
    }
  }

  async verificarSessao() {
    try {
      const token = this.getToken();
      if (!token) {
        return { valida: false, sessao: null };
      }

      const response = await fetch(`${this.baseURL}/me`, {
        credentials: 'include',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (data.success) {
        localStorage.setItem(this.userKey, JSON.stringify(data.user));
        return { valida: true, sessao: data.user };
      }
      this.clearLocalData();
      return { valida: false, sessao: null };
    } catch (error) {
      console.error('❌ Erro ao verificar sessão:', error);
      this.clearLocalData();
      return { valida: false, sessao: null };
    }
  }
  async verificarSessaoSimples() {
    const resultado = await this.verificarSessao();
    return resultado.valida;
  }

  // ========== MÉTODOS DE DADOS ==========

  getToken() {
    return localStorage.getItem(this.tokenKey);
  }

  getUser() {
    const userData = localStorage.getItem(this.userKey);
    return userData ? JSON.parse(userData) : null;
  }

  isAuthenticated() {
    return !!this.getToken() && !!this.getUser();
  }

  hasPermission(permission) {
    const user = this.getUser();
    return user?.permissoes?.includes(permission) || false;
  }

  isAdmin() {
    const user = this.getUser();
    return user?.perfil === 'admin';
  }

  isLoja() {
    const user = this.getUser();
    // Manter compatibilidade e incluir perfil 'usuario'
    return user?.perfil === 'loja' || user?.perfil === 'usuario';
  }

  isUsuarioGeral() {
    const user = this.getUser();
    return user?.perfil === 'usuario';
  }

  clearLocalData() {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
  }

  // ========== PROTEÇÃO DE ROTAS ==========

  async protegerRota(tipoRota) {
    const resultado = await this.verificarSessao();
    if (!resultado.valida) {
      this.redirecionarParaLogin();
      return false;
    }

    if (tipoRota === 'admin' && !this.isAdmin()) {
      alert(
        '⚠️ Acesso negado. Você não tem permissão para acessar a área administrativa.'
      );
      this.redirecionarParaLogin();
      return false;
    }

    if (tipoRota === 'loja' && !this.isLoja() && !this.isAdmin()) {
      alert('⚠️ Acesso negado. Você não tem permissão para acessar esta área.');
      this.redirecionarParaLogin();
      return false;
    }
    return true;
  }

  redirecionarParaLogin() {
    const loginUrl = '../login/login.html';
    if (window.location.pathname !== loginUrl) {
      window.location.href = loginUrl;
    }
  }
}

window.authManager = new AuthManager();

function protegerRota(tipoRota) {
  return window.authManager.protegerRota(tipoRota);
}

// Expor função globalmente para uso em outros arquivos
window.protegerRota = protegerRota;

window.addEventListener('DOMContentLoaded', async () => {
  if (window.location.pathname.includes('login.html')) {
    return;
  }

  const resultado = await window.authManager.verificarSessao();
  if (!resultado.valida && !window.location.pathname.includes('login.html')) {
    window.authManager.redirecionarParaLogin();
  }
});
