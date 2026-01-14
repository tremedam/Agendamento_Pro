// =============================================
// CONFIGURAÇÃO SEGURA DE SECRETS
// Sistema obrigatório sem fallbacks para produção
// =============================================

const logger = require('../utils/logger');

class SecretsManager {
    constructor() {
        this.requiredSecrets = {
            // Secrets obrigatórios por ambiente
            production: [
                'JWT_SECRET',
                'DB_PASSWORD',
                'SESSION_SECRET',
                'ENCRYPTION_KEY'
            ],
            development: [
                'JWT_SECRET',
                'DB_PASSWORD'
            ],
            test: [
                'JWT_SECRET'
            ]
        };

        this.environment = process.env.NODE_ENV || 'development';
        this.secrets = this.loadSecrets();
    }

    loadSecrets() {
        logger.info(`🔐 Carregando secrets para ambiente: ${this.environment}`);

        const requiredForEnv = this.requiredSecrets[this.environment] || [];
        const secrets = {};
        const missing = [];

        // Verificar secrets obrigatórios
        for (const secretName of requiredForEnv) {
            const value = process.env[secretName];

            if (!value || value.trim() === '') {
                missing.push(secretName);
            } else {
                // Validar força do secret
                if (this.isWeakSecret(secretName, value)) {
                    logger.warn(`⚠️  Secret fraco detectado: ${secretName}`);
                    if (this.environment === 'production') {
                        missing.push(`${secretName} (muito fraco para produção)`);
                    }
                }
                secrets[secretName] = value;
            }
        }

        // Falhar se secrets obrigatórios estão faltando
        if (missing.length > 0) {
            logger.error('❌ SECRETS OBRIGATÓRIOS FALTANDO:');
            missing.forEach(secret => logger.error(`   • ${secret}`));

            if (this.environment === 'production') {
                logger.error('🚨 APLICAÇÃO NÃO PODE INICIAR EM PRODUÇÃO SEM SECRETS SEGUROS');
                process.exit(1);
            } else {
                logger.warn('⚠️  Usando valores padrão para desenvolvimento (INSEGURO)');
                this.setDevelopmentDefaults(secrets, missing);
            }
        }

        logger.success(`✅ Secrets carregados: ${Object.keys(secrets).length} encontrados`);
        return secrets;
    }

    isWeakSecret(name, value) {
        // Verificar secrets fracos
        const weakPatterns = [
            'password', 'secret', '123', 'admin', 'default',
            'chave', 'desenvolvimento', 'test', 'example'
        ];

        const lowerValue = value.toLowerCase();

        // Verificar tamanho mínimo
        if (name === 'JWT_SECRET' && value.length < 32) {
            return true;
        }

        if (name === 'ENCRYPTION_KEY' && value.length < 32) {
            return true;
        }

        // Verificar padrões fracos
        return weakPatterns.some(pattern => lowerValue.includes(pattern));
    }

    setDevelopmentDefaults(secrets, missing) {
        const defaults = {
            JWT_SECRET: 'dev_jwt_secret_CHANGE_IN_PRODUCTION_' + Date.now(),
            DB_PASSWORD: 'dev_password',
            SESSION_SECRET: 'dev_session_secret_' + Date.now(),
            ENCRYPTION_KEY: 'dev_encryption_key_32_chars_long!!'
        };

        missing.forEach(secretName => {
            const cleanName = secretName.split('(')[0].trim();
            if (defaults[cleanName]) {
                secrets[cleanName] = defaults[cleanName];
                logger.warn(`   📝 Usando default para ${cleanName}`);
            }
        });
    }

    getSecret(name) {
        const secret = this.secrets[name];
        if (!secret && this.environment === 'production') {
            logger.error(`🚨 Secret requerido não encontrado: ${name}`);
            throw new Error(`Secret ${name} é obrigatório em produção`);
        }

        // Fallback para desenvolvimento se não encontrar o secret
        if (!secret) {
            const fallbacks = {
                JWT_SECRET: 'dev_jwt_secret_CHANGE_IN_PRODUCTION_' + Date.now(),
                SESSION_SECRET: 'dev_session_secret_CHANGE_IN_PRODUCTION_' + Date.now(),
                ENCRYPTION_KEY: 'dev_encryption_key_32_chars_long!!',
                DB_PASSWORD: 'dev_password'
            };

            if (fallbacks[name]) {
                logger.warn(`⚠️  Usando fallback para ${name} (apenas desenvolvimento)`);
                return fallbacks[name];
            }
        }

        return secret;
    }

    // Métodos convenientes para secrets específicos
    getJwtSecret() {
        return this.getSecret('JWT_SECRET');
    }

    getDbPassword() {
        return this.getSecret('DB_PASSWORD');
    }

    getSessionSecret() {
        return this.getSecret('SESSION_SECRET');
    }

    getEncryptionKey() {
        return this.getSecret('ENCRYPTION_KEY');
    }

    // Verificar saúde dos secrets
    healthCheck() {
        return {
            environment: this.environment,
            secretsLoaded: Object.keys(this.secrets).length,
            requiredSecrets: this.requiredSecrets[this.environment]?.length || 0,
            status: 'healthy'
        };
    }
}

// Singleton para garantir uma instância
const secretsManager = new SecretsManager();

module.exports = secretsManager;