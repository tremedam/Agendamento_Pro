// Teste super simples
test('2 + 2 = 4', () => {
  expect(2 + 2).toBe(4);
});

test('String deve conter texto', () => {
  expect('Hello World').toContain('World');
});

test('Array deve ter tamanho correto', () => {
  expect([1, 2, 3]).toHaveLength(3);
});
