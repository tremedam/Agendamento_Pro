// =============================================
// CONFIGURAÇÃO DE TEMPOS DAS MÁSCARAS
// Ajuste conforme necessidade da empresa
// =============================================

class ConfiguracaoTempo {
  static obterConfiguracoes() {
    return {
      // ========== TEMPO DE VIDA DAS SESSÕES ==========

      // Sessão padrão (desenvolvimento/teste)
      sessaoPadrao: {
        duracaoHoras: 8,
        descricao: 'Sessão normal de trabalho'
      },

      // Sessão estendida (produção/empresa)
      sessaoEstendida: {
        duracaoHoras: 24,
        descricao: 'Sessão para ambiente corporativo'
      },

      // Sessão curta (demo/apresentação)
      sessaoCurta: {
        duracaoHoras: 2,
        descricao: 'Sessão para testes rápidos'
      },

      // ========== LIMPEZA AUTOMÁTICA ==========

      // Frequência de limpeza (em minutos)
      intervaloLimpeza: 30, // A cada 30 minutos

      // Aviso antes de expirar (em minutos)
      avisoExpiracao: 15, // Avisar 15min antes

      // ========== CONFIGURAÇÕES POR AMBIENTE ==========

      desenvolvimento: {
        duracao: 8,
        limpezaAutomatica: true,
        avisos: true
      },

      producao: {
        duracao: 24,
        limpezaAutomatica: true,
        avisos: false
      },

      demo: {
        duracao: 2,
        limpezaAutomatica: true,
        avisos: true
      }
    };
  }

  // ========== MÉTODOS DE CONVERSÃO ==========

  static horasParaMs(horas) {
    return horas * 60 * 60 * 1000;
  }

  static minutosParaMs(minutos) {
    return minutos * 60 * 1000;
  }

  // ========== CONFIGURAÇÃO POR AMBIENTE ==========

  static obterConfiguracaoAmbiente(ambiente = 'desenvolvimento') {
    const configs = this.obterConfiguracoes();
    return configs[ambiente] || configs.desenvolvimento;
  }
}

module.exports = ConfiguracaoTempo;
