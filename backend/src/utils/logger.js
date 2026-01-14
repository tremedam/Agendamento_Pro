// =============================================
// SISTEMA DE LOGGING PROFISSIONAL
// Substitui console.log por logger configurável
// =============================================

class Logger {
  constructor() {
    this.isDevelopment = process.env.NODE_ENV !== 'production';
    this.enabledLevels = {
      debug: this.isDevelopment,
      info: this.isDevelopment,
      warn: true, // sempre habilitado
      error: true // sempre habilitado
    };
  }

  /**
   * Log de debug (apenas em desenvolvimento)
   */
  debug(message, ...args) {
    if (this.enabledLevels.debug) {
      // eslint-disable-next-line no-console
      console.log(`🔍 [DEBUG] ${this._formatMessage(message)}`, ...args);
    }
  }

  /**
   * Log de informação (apenas em desenvolvimento)
   */
  info(message, ...args) {
    if (this.enabledLevels.info) {
      // eslint-disable-next-line no-console
      console.log(`ℹ️  [INFO] ${this._formatMessage(message)}`, ...args);
    }
  }

  /**
   * Log de aviso (sempre habilitado)
   */
  warn(message, ...args) {
    if (this.enabledLevels.warn) {
      // eslint-disable-next-line no-console
      console.warn(`⚠️  [WARN] ${this._formatMessage(message)}`, ...args);
    }
  }

  /**
   * Log de erro (sempre habilitado)
   */
  error(message, ...args) {
    if (this.enabledLevels.error) {
      // eslint-disable-next-line no-console
      console.error(`❌ [ERROR] ${this._formatMessage(message)}`, ...args);
    }
  }

  /**
   * Log de sucesso (apenas em desenvolvimento)
   */
  success(message, ...args) {
    if (this.enabledLevels.info) {
      // eslint-disable-next-line no-console
      console.log(`✅ [SUCCESS] ${this._formatMessage(message)}`, ...args);
    }
  }

  /**
   * Log de processo (apenas em desenvolvimento)
   */
  process(message, ...args) {
    if (this.enabledLevels.debug) {
      // eslint-disable-next-line no-console
      console.log(`🔄 [PROCESS] ${this._formatMessage(message)}`, ...args);
    }
  }

  /**
   * Formatar mensagem com timestamp (apenas em desenvolvimento)
   */
  _formatMessage(message) {
    if (this.isDevelopment) {
      const timestamp = new Date()
        .toISOString()
        .replace('T', ' ')
        .substring(0, 19);
      return `[${timestamp}] ${message}`;
    }
    return message;
  }

  /**
   * Configurar níveis de log dinamicamente
   */
  setLevel(level, enabled) {
    if (Object.prototype.hasOwnProperty.call(this.enabledLevels, level)) {
      this.enabledLevels[level] = enabled;
    }
  }

  /**
   * Desabilitar todos os logs (para testes ou produção estrita)
   */
  silent() {
    Object.keys(this.enabledLevels).forEach(level => {
      this.enabledLevels[level] = false;
    });
  }
}

// Exportar instância singleton
const logger = new Logger();

module.exports = logger;
