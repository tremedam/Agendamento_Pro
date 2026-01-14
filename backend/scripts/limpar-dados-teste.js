// =============================================
// SCRIPT DE LIMPEZA DE DADOS DE TESTE
// Remove dados de teste acumulados no sistema
// =============================================

const fs = require('fs');
const path = require('path');
const logger = require('../src/utils/logger');

// Caminho para o arquivo de agendamentos temporários
const ARQUIVO_TEMPORARIOS = path.join(__dirname, '..', 'database', 'agendamentos-temporarios.json');

async function executarLimpeza() {
    logger.info('🧹 Iniciando limpeza de dados de teste...');

    try {
        // 1. Ler arquivo atual
        if (!fs.existsSync(ARQUIVO_TEMPORARIOS)) {
            logger.warn('⚠️  Arquivo agendamentos-temporarios.json não encontrado');
            return;
        }

        const conteudoOriginal = fs.readFileSync(ARQUIVO_TEMPORARIOS, 'utf8');
        let dados;

        try {
            dados = JSON.parse(conteudoOriginal);
        } catch (error) {
            logger.error('❌ Erro ao parsear JSON:', error.message);
            return;
        }

        // 2. Estatísticas antes da limpeza
        let totalAntes = 0;
        const dadosLimpos = {};
        let removidosTestSession = 0;
        let removidosTestSession123 = 0;
        let mantidosReais = 0;

        // Contar registros originais
        for (const [_mesAno, usuarios] of Object.entries(dados)) {
            if (typeof usuarios === 'object' && usuarios !== null) {
                for (const [_usuarioId, agendamentos] of Object.entries(usuarios)) {
                    if (typeof agendamentos === 'object' && agendamentos !== null) {
                        totalAntes += Object.keys(agendamentos).length;
                    }
                }
            }
        }

        // 3. Limpar dados de teste
        for (const [mesAno, usuarios] of Object.entries(dados)) {
            if (typeof usuarios !== 'object' || usuarios === null) continue;

            const usuariosLimpos = {};

            for (const [usuarioId, agendamentos] of Object.entries(usuarios)) {
                // Remover sessões de teste específicas
                if (usuarioId === 'test-session') {
                    removidosTestSession += Object.keys(agendamentos).length;
                    logger.info(`🗑️  Removendo ${Object.keys(agendamentos).length} agendamentos da sessão: test-session`);
                    continue;
                }

                if (usuarioId === 'test-session-123') {
                    removidosTestSession123 += Object.keys(agendamentos).length;
                    logger.info(`🗑️  Removendo ${Object.keys(agendamentos).length} agendamentos da sessão: test-session-123`);
                    continue;
                }

                // Manter usuários reais (como K17ZNIxYFHkH7oslWIA3oR3Lngints2J)
                if (typeof agendamentos === 'object' && agendamentos !== null) {
                    usuariosLimpos[usuarioId] = agendamentos;
                    mantidosReais += Object.keys(agendamentos).length;
                    logger.success(`✅ Mantendo ${Object.keys(agendamentos).length} agendamentos do usuário real: ${usuarioId.substring(0, 8)}...`);
                }
            }

            // Só adicionar o mês se houver usuários válidos
            if (Object.keys(usuariosLimpos).length > 0) {
                dadosLimpos[mesAno] = usuariosLimpos;
            }
        }

        // 4. Criar backup antes de sobrescrever
        const backupPath = `${ARQUIVO_TEMPORARIOS}.backup-${new Date().toISOString().replace(/[:.]/g, '-')}`;
        fs.writeFileSync(backupPath, conteudoOriginal);
        logger.info(`💾 Backup criado: ${path.basename(backupPath)}`);

        // 5. Salvar dados limpos
        fs.writeFileSync(ARQUIVO_TEMPORARIOS, JSON.stringify(dadosLimpos, null, 2));

        // 6. Estatísticas finais
        let totalDepois = 0;
        for (const [_mesAno, usuarios] of Object.entries(dadosLimpos)) {
            for (const [_usuarioId, agendamentos] of Object.entries(usuarios)) {
                totalDepois += Object.keys(agendamentos).length;
            }
        }

        logger.success('✅ Limpeza concluída com sucesso!');
        logger.info('📊 Estatísticas da limpeza:');
        logger.info(`   • Total antes: ${totalAntes} agendamentos`);
        logger.info(`   • Removidos test-session: ${removidosTestSession}`);
        logger.info(`   • Removidos test-session-123: ${removidosTestSession123}`);
        logger.info(`   • Mantidos (reais): ${mantidosReais}`);
        logger.info(`   • Total depois: ${totalDepois} agendamentos`);
        logger.info(`   • Economia: ${totalAntes - totalDepois} registros removidos`);

        // 7. Calcular espaço em disco economizado
        const tamanhoOriginal = Buffer.byteLength(conteudoOriginal, 'utf8');
        const tamanhoNovo = Buffer.byteLength(JSON.stringify(dadosLimpos, null, 2), 'utf8');
        const economiaBytes = tamanhoOriginal - tamanhoNovo;
        const economiaMB = (economiaBytes / (1024 * 1024)).toFixed(2);

        logger.info(`💽 Espaço economizado: ${economiaBytes} bytes (${economiaMB} MB)`);

    } catch (error) {
        logger.error('❌ Erro durante a limpeza:', error);
        logger.info('💡 Verifique se o arquivo não está sendo usado por outro processo');
    }
}

// Executar se chamado diretamente
if (require.main === module) {
    logger.info('🎯 Executando limpeza de dados de teste...');
    executarLimpeza().then(() => {
        logger.success('🏁 Script de limpeza finalizado');
        process.exit(0);
    }).catch(error => {
        logger.error('💥 Erro fatal:', error);
        process.exit(1);
    });
}

module.exports = { executarLimpeza };