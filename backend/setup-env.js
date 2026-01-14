const fs = require('fs');
const path = require('path');
const logger = require('./src/utils/logger');

const args = process.argv.slice(2);
const ambiente = args[0] || 'local';

logger.info(`🔧 Configurando ambiente: ${ambiente}`);

const envFiles = {
  local: '.env.local',
  empresa: '.env',
  production: '.env'
};

const sourceFile = envFiles[ambiente];

if (!sourceFile) {
  logger.error('❌ Ambiente inválido. Use: local, empresa ou production');
  logger.info('💡 Exemplo: npm run setup:env local');
  process.exit(1);
}

const sourcePath = path.join(__dirname, sourceFile);
const targetPath = path.join(__dirname, '.env');

if (!fs.existsSync(sourcePath)) {
  logger.error(`❌ Arquivo ${sourceFile} não encontrado`);
  process.exit(1);
}

try {
  // Backup do .env atual
  if (fs.existsSync(targetPath)) {
    fs.copyFileSync(targetPath, targetPath + '.backup');
    logger.info('📋 Backup do .env atual criado');
  }

  // Copia o arquivo de configuração
  fs.copyFileSync(sourcePath, targetPath);

  logger.success(`✅ Ambiente ${ambiente} configurado!`);
  logger.info(`📁 Arquivo ativo: ${sourceFile} → .env`);

  if (ambiente === 'local') {
    logger.info('');
    logger.warn('⚠️  ATENÇÃO: Configure sua senha do MySQL no arquivo .env');
    logger.info('📝 Edite a linha: DB_PASSWORD=SUA_SENHA_MYSQL_AQUI');
  }
} catch (error) {
  logger.error('❌ Erro ao configurar ambiente:', error.message);
  process.exit(1);
}
