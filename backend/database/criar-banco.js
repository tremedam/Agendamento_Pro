// =============================================
// SCRIPT PARA CRIAR BANCO MYSQL
// Execute antes do setup para criar o banco
// =============================================

/* eslint-disable no-console */
const mysql = require('mysql2/promise');
require('dotenv').config();

async function criarBancoMySQL() {
  // Configuração para conectar SEM especificar o banco
  const config = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    charset: 'utf8mb4'
  };

  const nomeBanco = process.env.DB_NAME || 'agenda_mercadorias';

  try {
    const connection = await mysql.createConnection(config);
    await connection.execute(
      `CREATE DATABASE IF NOT EXISTS \`${nomeBanco}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );

    const [bancos] = await connection.execute('SHOW DATABASES LIKE ?', [
      nomeBanco
    ]);
    if (bancos.length > 0) {
      console.log(`🎯 Banco '${nomeBanco}' confirmado!`);
    } else {
      throw new Error(`Banco '${nomeBanco}' não foi criado`);
    }

    await connection.end();
    return true;
  } catch (error) {
    console.error('❌ Erro ao criar banco:', error.message);
    console.error('\n🔧 Verificações necessárias:');
    console.error(`   • MySQL está rodando em ${config.host}:${config.port}?`);
    console.error(
      `   • Usuário '${config.user}' tem permissão para criar bancos?`
    );
    console.error(`   • Senha está correta no arquivo .env?`);
    console.error('\n💡 Soluções:');
    console.error('   • Verifique o arquivo .env');
    console.error('   • Execute: mysql -u root -p');
    console.error(
      '   • GRANT ALL PRIVILEGES ON *.* TO "seu_usuario"@"localhost";'
    );

    throw error;
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  criarBancoMySQL().catch(error => {
    console.error('\n💥 Falha na criação do banco', error);
    process.exit(1);
  });
}

/* eslint-enable no-console */
module.exports = criarBancoMySQL;
