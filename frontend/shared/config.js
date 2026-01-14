// Configurações globais do Sistema de Agenda de Recebimentos
// Este arquivo centraliza todas as configurações importantes do sistema

window.SYSTEM_CONFIG = {
  // ===== INFORMAÇÕES DO SISTEMA =====
  app: {
    name: 'Sistema de Agenda de Recebimento de Mercadorias',
    version: '1.0.0',
    company: '',
    environment: 'development',
    lastUpdate: '2024-12-13'
  },

  // ===== CONFIGURAÇÕES DE API =====
  api: {
    development: {
      baseURL: 'http://localhost:3000/api',
      timeout: 10000
    },
    production: {
      baseURL: 'https://api.example.com',
      timeout: 30000
    },

    // Endpoints da API
    endpoints: {
      agendamentos: '/agendamentos',
      fornecedores: '/fornecedores',
      usuarios: '/usuarios',
      auth: '/auth',
      reports: '/reports',
      upload: '/upload'
    },

    // Headers padrão
    defaultHeaders: {
      'Content-Type': 'application/json',
      'X-App-Version': '1.0.0'
    }
  },

  // ===== CONFIGURAÇÕES DE AUTENTICAÇÃO =====
  auth: {
    microsoft: {
      clientId: 'your-client-id-here',
      tenantId: 'your-tenant-id-here',
      redirectUri: 'http://localhost/auth/callback',
      scopes: ['openid', 'profile', 'email', 'User.Read']
    },

    session: {
      timeout: 8 * 60 * 60 * 1000, // 8 horas em ms
      renewalTime: 30 * 60 * 1000, // 30 minutos antes do timeout
      storageKey: 'auth_token'
    },

    // Níveis de acesso
    accessLevels: {
      LOJA: 'loja',
      ADMIN: 'admin',
      SUPER_ADMIN: 'super_admin'
    }
  },

  // ===== CONFIGURAÇÕES DE INTERFACE =====
  ui: {
    themes: {
      light: 'light',
      dark: 'dark',
      auto: 'auto'
    },

    pagination: {
      defaultItemsPerPage: 25,
      options: [10, 25, 50, 100, 'all'],
      maxVisiblePages: 5
    },

    notifications: {
      duration: {
        success: 3000,
        info: 4000,
        warning: 5000,
        error: 6000
      },
      position: 'top-right',
      maxVisible: 3
    },

    modal: {
      closeOnEscape: true,
      closeOnClickOutside: true,
      animation: 'fade'
    },

    debounce: {
      search: 300,
      filter: 500,
      resize: 250
    }
  },

  // ===== CONFIGURAÇÕES DE DADOS =====
  data: {
    dateFormats: {
      display: 'DD/MM/YYYY',
      input: 'YYYY-MM-DD',
      datetime: 'DD/MM/YYYY HH:mm'
    },

    cache: {
      enabled: true,
      duration: 5 * 60 * 1000, // 5 minutos
      keys: {
        agendamentos: 'cached_agendamentos',
        fornecedores: 'cached_fornecedores',
        filters: 'cached_filters'
      }
    },

    limits: {
      maxItemsPerPage: 100,
      maxSearchResults: 500,
      maxFileSize: 10 * 1024 * 1024, // 10MB
      maxTextLength: 1000
    },

    allowedStatus: ['Pendente', 'Confirmado', 'Cancelado', 'Concluído'],

    allowedUnits: ['UN', 'KG', 'LT', 'MT', 'CX', 'PC', 'DZ', 'M²', 'M³']
  },

  // ===== CONFIGURAÇÕES DE NAVEGADOR =====
  browser: {
    supported: {
      loja: ['Chrome', 'Firefox'],
      admin: ['Edge', 'Chrome']
    },

    minVersions: {
      Chrome: 90,
      Firefox: 88,
      Edge: 90
    },

    requiredFeatures: [
      'localStorage',
      'sessionStorage',
      'fetch',
      'Promise',
      'CSS.supports'
    ]
  },

  // ===== CONFIGURAÇÕES DE SEGURANÇA =====
  security: {
    csp: {
      enabled: true,
      directives: {
        'default-src': "'self'",
        'script-src': "'self' 'unsafe-inline' https://cdnjs.cloudflare.com",
        'style-src': "'self' 'unsafe-inline' https://cdnjs.cloudflare.com",
        'img-src': "'self' data: https:",
        'font-src': "'self' https://cdnjs.cloudflare.com",
        'connect-src': "'self' https://api.example.com"
      }
    },

    validation: {
      maxStringLength: 500,
      allowedChars: /^[a-zA-Z0-9\s\-_.@()/,:;]+$/,
      sanitizeInput: true
    },

    rateLimit: {
      requests: 100,
      window: 60 * 1000, // 1 minuto
      blockDuration: 5 * 60 * 1000 // 5 minutos
    }
  },

  // ===== CONFIGURAÇÕES DE PERFORMANCE =====
  performance: {
    lazyLoading: {
      enabled: true,
      rootMargin: '50px',
      threshold: 0.1
    },

    virtualScrolling: {
      enabled: true,
      itemHeight: 60,
      bufferSize: 10
    },

    optimizations: {
      minifyCSS: true,
      minifyJS: true,
      gzipCompression: true,
      imageOptimization: true
    }
  },

  // ===== CONFIGURAÇÕES DE RELATÓRIOS =====
  reports: {
    exportFormats: ['Excel', 'PDF'],

    pdf: {
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
      margins: {
        top: 20,
        right: 20,
        bottom: 20,
        left: 20
      }
    },

    excel: {
      sheetName: 'Agenda Recebimentos',
      includeHeaders: true,
      autoWidth: true
    }
  },

  // ===== CONFIGURAÇÕES DE DESENVOLVIMENTO =====
  development: {
    debug: {
      enabled: true,
      logLevel: 'info',
      showPerformance: true
    },

    mockData: {
      enabled: true,
      autoGenerate: true,
      recordCount: 15
    },

    hotReload: {
      enabled: true,
      watchFiles: ['*.html', '*.css', '*.js']
    }
  },

  // ===== CONFIGURAÇÕES DE MONITORAMENTO =====
  monitoring: {
    analytics: {
      enabled: false,
      provider: 'google',
      trackingId: 'GA-XXXX-X'
    },

    errorTracking: {
      enabled: true,
      logToConsole: true,
      sendToServer: false
    },

    performanceMonitoring: {
      enabled: true,
      sampleRate: 0.1,
      thresholds: {
        slowPage: 3000,
        slowApi: 5000
      }
    }
  },

  // ===== MENSAGENS DO SISTEMA =====
  messages: {
    errors: {
      NETWORK_ERROR: 'Erro de conexão. Verifique sua internet.',
      AUTH_EXPIRED: 'Sessão expirada. Faça login novamente.',
      PERMISSION_DENIED: 'Você não tem permissão para esta ação.',
      DATA_NOT_FOUND: 'Dados não encontrados.',
      VALIDATION_ERROR: 'Dados inválidos. Verifique os campos.',
      SERVER_ERROR: 'Erro no servidor. Tente novamente mais tarde.'
    },

    success: {
      ITEM_SAVED: 'Item salvo com sucesso!',
      ITEM_DELETED: 'Item excluído com sucesso!',
      DATA_EXPORTED: 'Dados exportados com sucesso!',
      DATA_IMPORTED: 'Dados importados com sucesso!'
    },

    confirmations: {
      DELETE_ITEM: 'Tem certeza que deseja excluir este item?',
      CLEAR_FILTERS: 'Limpar todos os filtros?',
      LOGOUT: 'Deseja realmente sair do sistema?'
    }
  }
};

// ===== FUNÇÕES DE CONFIGURAÇÃO =====
// Obter configuração por caminho (ex: 'api.baseURL')
window.getConfig = function (path, defaultValue = null) {
  const keys = path.split('.');
  let current = window.SYSTEM_CONFIG;

  for (const key of keys) {
    if (current && typeof current === 'object' && key in current) {
      current = current[key];
    } else {
      return defaultValue;
    }
  }
  return current;
};

// Obter URL da API baseada no ambiente
window.getApiUrl = function (endpoint = '') {
  const env = getConfig('app.environment', 'development');
  const baseURL = getConfig(`api.${env}.baseURL`);
  const endpointPath = getConfig(`api.endpoints.${endpoint}`, endpoint);
  return baseURL + endpointPath;
};

// Verificar se feature está habilitada
window.isFeatureEnabled = function (feature) {
  return getConfig(feature, false) === true;
};

// Obter configuração de tema
window.getThemeConfig = function () {
  return {
    current: localStorage.getItem('tema') || 'light',
    available: getConfig('ui.themes', {})
  };
};

// Verificar compatibilidade do navegador
window.checkBrowserCompatibility = function () {
  // Placeholder - implementar verificação se necessário
  return true;
};

// Configurar ambiente baseado na URL
if (
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1'
) {
  window.SYSTEM_CONFIG.app.environment = 'development';
} else {
  window.SYSTEM_CONFIG.app.environment = 'production';
}

// Log de inicialização
console.log(
  `%c🚀 ${getConfig('app.name')} v${getConfig('app.version')}`,
  'color: #dc143c; font-weight: bold; font-size: 14px;'
);
console.log(
  `%c🏢 ${getConfig('app.company')} - Ambiente: ${getConfig('app.environment')}`,
  'color: #666; font-size: 12px;'
);
