module.exports = {
  // Configurações gerais do Prettier
  semi: true,
  trailingComma: 'none',
  singleQuote: true,
  printWidth: 80,
  tabWidth: 2,
  useTabs: false,
  bracketSpacing: true,
  bracketSameLine: false,
  arrowParens: 'avoid',
  endOfLine: 'lf',

  // Configurações específicas por tipo de arquivo
  overrides: [
    {
      files: ['*.js'],
      options: {
        parser: 'babel',
        singleQuote: true,
        semi: true
      }
    },
    {
      files: ['*.html'],
      options: {
        parser: 'html',
        printWidth: 120,
        htmlWhitespaceSensitivity: 'css'
      }
    },
    {
      files: ['*.css'],
      options: {
        parser: 'css',
        printWidth: 100
      }
    },
    {
      files: ['*.json'],
      options: {
        parser: 'json',
        printWidth: 120
      }
    },
    {
      files: ['*.md'],
      options: {
        parser: 'markdown',
        printWidth: 100,
        proseWrap: 'always'
      }
    }
  ]
};
