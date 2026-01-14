// =============================================
// CONFIGURAÇÃO GLOBAL DOS TESTES
// =============================================

// Configurar timezone para evitar problemas de data
process.env.TZ = 'America/Sao_Paulo';

// Configurar ambiente de teste
process.env.NODE_ENV = 'test';
process.env.DB_NAME = 'agenda_mercadorias_test';
process.env.JWT_SECRET = 'test_secret_key_12345';
process.env.PORT = 3001;

// Configurar timeout global para testes
jest.setTimeout(10000);

// Cleanup após cada teste
afterEach(() => {
  jest.clearAllMocks();
});
