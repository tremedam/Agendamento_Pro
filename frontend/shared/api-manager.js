// API Manager - Centralizado no Backend (sem fallbacks)

class ApiManager {
  constructor() {
    this.baseURL = window.getApiUrl();

    this.isConnected = false;
    this.lastConnectionCheck = null;
  }

  // ========== MÉTODOS PARA ADMIN ==========

  getAuthHeaders() {
    return {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + localStorage.getItem('auth_token'),
      'X-Session-Id': localStorage.getItem('session_id') || ''
    };
  }

  // Captura o header de sessão retornado pelo backend e armazena localmente
  _captureSession(response) {
    try {
      const sid = response.headers.get && response.headers.get('x-session-id');
      if (sid) {
        localStorage.setItem('session_id', sid);
      }
    } catch {
      // silencioso
    }
  }

  async buscarDadosAdmin() {
    try {
      // Adicionar timestamp para evitar cache do browser
      const timestamp = new Date().getTime();
      const url = `${this.baseURL}/agendamentos?tipo=admin&mascaras=true&_t=${timestamp}`;

      console.log('🔄 API Manager: Buscando dados frescos:', url);

      const response = await fetch(url, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });
      this._captureSession(response);

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Erro ao buscar dados');
      }

      console.log(`📊 API Manager: ${data.data.length} agendamentos recebidos`);
      return data.data;
    } catch (error) {
      console.error('❌ Erro ao buscar dados:', error);
      throw error;
    }
  }

  async aprovarAgendamento(id) {
    try {
      const response = await fetch(
        `${this.baseURL}/agendamentos/${id}/aprovar`,
        {
          method: 'POST',
          headers: this.getAuthHeaders()
        }
      );
      this._captureSession(response);

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Erro ao aprovar');
      }
      return { sucesso: true, id, status: 'aprovado', data: data.data };
    } catch (error) {
      console.error('❌ Erro ao aprovar:', error);
      throw error;
    }
  }

  async rejeitarAgendamento(id, motivo = '') {
    try {
      const response = await fetch(
        `${this.baseURL}/agendamentos/${id}/rejeitar`,
        {
          method: 'POST',
          headers: this.getAuthHeaders(),
          body: JSON.stringify({ motivo })
        }
      );
      this._captureSession(response);

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Erro ao rejeitar');
      }
      return { sucesso: true, id, status: 'rejeitado', data: data.data };
    } catch (error) {
      console.error('❌ Erro ao rejeitar:', error);
      throw error;
    }
  }

  async atualizarAgendamento(id, dadosAtualizados) {
    try {
      const response = await fetch(`${this.baseURL}/agendamentos/${id}`, {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(dadosAtualizados)
      });
      this._captureSession(response);

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Erro ao atualizar');
      }

      return { sucesso: true, item: data.data };
    } catch (error) {
      console.error('❌ Erro ao atualizar:', error);
      throw error;
    }
  }

  async criarAgendamento(dadosItem) {
    try {
      const response = await fetch(`${this.baseURL}/agendamentos`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(dadosItem)
      });
      this._captureSession(response);

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Erro ao criar');
      }

      return { sucesso: true, item: data.data };
    } catch (error) {
      console.error('❌ Erro ao criar:', error);
      throw error;
    }
  }

  async excluirAgendamento(id) {
    try {
      console.log('🗑️ API Manager: Excluindo agendamento:', id);

      const response = await fetch(`${this.baseURL}/agendamentos/${id}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders()
      });
      this._captureSession(response);

      console.log('📡 API Manager: Response status:', response.status);

      const data = await response.json();
      console.log('📨 API Manager: Response data:', data);

      if (!data.success) {
        throw new Error(data.error || 'Erro ao excluir');
      }

      // Se o backend indicar para invalidar cache, limpar localStorage
      if (data.invalidateCache) {
        console.log('🗑️ API Manager: Limpando cache local...');
        this.invalidarCache();
      }

      return { sucesso: true, id };
    } catch (error) {
      console.error('❌ API Manager: Erro ao excluir:', error);
      throw error;
    }
  }

  /**
   * Invalidar cache local do navegador
   */
  invalidarCache() {
    localStorage.removeItem('dadosAgenda');
    localStorage.removeItem('filtros_admin');
    console.log('🗑️ Cache local invalidado');
  } // ========== MÉTODOS PARA LOJA ==========

  async buscarDadosLoja() {
    try {
      // Buscar dados com máscaras e filtrar apenas aprovados
      const response = await fetch(
        `${this.baseURL}/agendamentos?tipo=loja&mascaras=true`,
        {
          headers: this.getAuthHeaders()
        }
      );
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Erro ao buscar dados');
      }

      // Filtrar apenas agendamentos aprovados (considerar camelCase e snake_case)
      const dadosAprovados = data.data
        .filter(item => {
          const statusCamel = item.statusAprovacao;
          const statusSnake = item.status_aprovacao;

          if (typeof statusCamel === 'string')
            return statusCamel.toLowerCase() === 'aprovado';
          if (typeof statusSnake === 'string')
            return statusSnake.toLowerCase() === 'aprovado';
          if (statusCamel && typeof statusCamel === 'object')
            return statusCamel.aprovado === true;
          return false;
        })
        .map(item => {
          // Normalizar campos esperados pela loja
          if (!item.descricao && item.produto) item.descricao = item.produto;
          if (!item.produto && item.descricao) item.produto = item.descricao;
          if (item.quantidade && item.qtde == null) item.qtde = item.quantidade;
          if (item.qtde && item.quantidade == null) item.quantidade = item.qtde;
          if (item.saldo == null)
            item.saldo = item.qtde || item.quantidade || 0;
          if (!item.codAnt && item.codigo_produto)
            item.codAnt = item.codigo_produto;
          // Garantir status em maiúscula inicial para consistência visual
          if (item.status && typeof item.status === 'string') {
            item.status =
              item.status.charAt(0).toUpperCase() +
              item.status.slice(1).toLowerCase();
          }
          return item;
        });

      if (dadosAprovados.length === 0) {
        console.log(
          '⚠️ Loja: Nenhum agendamento aprovado retornado pela API. Verifique se o backend está marcando status_aprovacao corretamente.'
        );
        // Log de exemplo de primeiro item bruto para debug
        if (data.data.length) {
          console.log('🔎 Exemplo bruto recebido:', data.data[0]);
        }
      } else {
        console.log(
          `📊 Loja: ${data.data.length} total, ${dadosAprovados.length} aprovados após normalização`
        );
      }
      return dadosAprovados;
    } catch (error) {
      console.error('❌ Erro ao buscar dados da loja:', error);
      throw error;
    }
  }

  // ========== MÉTODOS DE UTILIDADE ==========

  obterUsuarioAtual() {
    return localStorage.getItem('usuario_admin') || 'admin@example.com';
  }
}

window.apiManager = new ApiManager();

window.addEventListener('DOMContentLoaded', async () => {
  const indicator = document.createElement('div');
  indicator.id = 'api-status-indicator';
  indicator.style.cssText = `
        position: fixed;
        top: 10px;
        right: 10px;
        padding: 8px 12px;
        border-radius: 8px;
        font-size: 12px;
        font-weight: bold;
        z-index: 9999;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        cursor: pointer;
    `;

  try {
    const healthUrl = window.getApiUrl() + '/health';
    const response = await fetch(healthUrl);
    await response.json(); // Validar se resposta é JSON válida
    indicator.textContent = '🟢 Backend Online';
    indicator.style.backgroundColor = '#4CAF50';
    indicator.style.color = 'white';
  } catch (error) {
    indicator.textContent = '🔴 Backend Offline';
    indicator.style.backgroundColor = '#f44336';
    indicator.style.color = 'white';
    console.error('❌ Backend offline:', error);
  }
  document.body.appendChild(indicator);
});
