// =============================================
// TESTE SIMPLES PARA VERIFICAR SETUP
// =============================================

describe('Setup de Testes', () => {
  test('Jest deve estar funcionando', () => {
    expect(true).toBe(true);
  });

  test('Environment de teste deve estar configurado', () => {
    expect(process.env.NODE_ENV).toBe('test');
  });

  test('Matemática básica deve funcionar', () => {
    expect(2 + 2).toBe(4);
    expect(10 - 5).toBe(5);
    expect(3 * 4).toBe(12);
  });
});

describe('Node.js Environment', () => {
  test('Deve ter acesso aos módulos do Node', () => {
    expect(typeof require).toBe('function');
    expect(typeof process).toBe('object');
    expect(typeof console).toBe('object');
  });

  test('Deve conseguir importar módulos', () => {
    const path = require('path');
    expect(typeof path.join).toBe('function');
  });
});
