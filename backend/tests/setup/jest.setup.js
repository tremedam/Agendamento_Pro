// Setup global para Jest - limpeza de recursos
module.exports = () => {
  // Configurar timeout global
  jest.setTimeout(10000);

  // Cleanup após cada teste
  afterEach(() => {
    // Limpar timers
    jest.clearAllTimers();

    // Limpar mocks
    jest.clearAllMocks();
  });

  // Cleanup global após todos os testes
  afterAll(async () => {
    // Aguardar um pouco para processos terminarem
    await new Promise(resolve => setTimeout(resolve, 100));

    // Forçar saída se necessário
    if (process.env.NODE_ENV === 'test') {
      setTimeout(() => {
        process.exit(0);
      }, 1000);
    }
  });

  // Configurar console para testes
  global.console = {
    ...console,
    // Manter apenas logs importantes durante testes
    log: process.env.VERBOSE_TESTS ? console.log : () => {},
    debug: process.env.VERBOSE_TESTS ? console.debug : () => {},
    info: process.env.VERBOSE_TESTS ? console.info : () => {},
    warn: console.warn,
    error: console.error
  };
};
