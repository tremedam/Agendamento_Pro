// =============================================
// CONFIGURAÇÃO SEGURA DE CORS
// Origens permitidas por ambiente
// =============================================

const logger = require('../utils/logger');

class CorsConfig {
    constructor() {
        this.environment = process.env.NODE_ENV || 'development';
        this.allowedOrigins = this.getOriginsByEnvironment();
    }

    getOriginsByEnvironment() {
        const origins = {
            production: [
                'https://agenda.example.com',
                'https://www.example.com',
                'https://admin.example.com'
                // Adicionar seus domínios de produção aqui
            ],
            staging: [
                'https://agenda-staging.example.com',
                'https://test.example.com'
            ],
            development: [
                'http://localhost:3000',
                'http://localhost:3001',
                'http://localhost:8080',
                'http://127.0.0.1:3000',
                'http://127.0.0.1:3001',
                'http://127.0.0.1:8080',
                // Live Server ports
                'http://127.0.0.1:5500',
                'http://localhost:5500',
                'http://127.0.0.1:5501',
                'http://localhost:5501'
            ],
            test: [
                'http://localhost:3000'
            ]
        };

        // Adicionar origens customizadas do .env
        const customOrigins = process.env.ALLOWED_ORIGINS?.split(',').map(origin => origin.trim()) || [];

        const envOrigins = origins[this.environment] || origins.development;
        const allOrigins = [...envOrigins, ...customOrigins];

        logger.info(`🌐 CORS configurado para ${this.environment}:`);
        allOrigins.forEach(origin => logger.info(`   • ${origin}`));

        return allOrigins;
    }

    getCorsOptions() {
        return {
            origin: (origin, callback) => {
                // Permitir requisições sem origin (Postman, apps mobile, etc.)
                if (!origin) {
                    return callback(null, true);
                }

                // Verificar se a origem está na lista permitida
                if (this.allowedOrigins.includes(origin)) {
                    callback(null, true);
                } else {
                    logger.warn(`🚫 Origem BLOQUEADA pelo CORS: ${origin}`);

                    // Em desenvolvimento, apenas avisar mas permitir
                    if (this.environment === 'development') {
                        logger.warn('   ⚠️  Permitindo em desenvolvimento - configure ALLOWED_ORIGINS para produção');
                        callback(null, true);
                    } else {
                        // Em produção, bloquear origem não autorizada
                        callback(new Error('Não permitido pelo CORS'), false);
                    }
                }
            },
            credentials: true,
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
            allowedHeaders: [
                'Content-Type',
                'Authorization',
                'X-Session-Id',
                'X-User-Id',
                'X-Requested-With',
                'Accept',
                'Origin',
                'Cache-Control'
            ],
            exposedHeaders: [
                'X-Session-Id',
                'X-Total-Count',
                'X-Page-Count'
            ],
            maxAge: 86400 // 24 horas cache do preflight
        };
    }

    // Adicionar origem dinamicamente (útil para desenvolvimento)
    addAllowedOrigin(origin) {
        if (!this.allowedOrigins.includes(origin)) {
            this.allowedOrigins.push(origin);
            logger.info(`🌐 Nova origem permitida: ${origin}`);
        }
    }

    // Verificar se origem é permitida
    isOriginAllowed(origin) {
        return this.allowedOrigins.includes(origin);
    }

    // Health check
    healthCheck() {
        return {
            environment: this.environment,
            allowedOrigins: this.allowedOrigins.length,
            customOrigins: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',').length : 0
        };
    }
}

module.exports = new CorsConfig();