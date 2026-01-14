// =============================================
// CONFIGURAÇÃO DE RATE LIMITING
// Proteção contra ataques de força bruta e DDoS
// =============================================

const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');
const logger = require('../utils/logger');

class RateLimitConfig {
    constructor() {
        this.environment = process.env.NODE_ENV || 'development';
        this.isProduction = this.environment === 'production';

        // Criar todas as instâncias na inicialização
        this.generalLimiter = this.createGeneralLimiter();
        this.loginLimiter = this.createLoginLimiter();
        this.apiLimiter = this.createApiLimiter();
        this.slowDownMiddleware = this.createSlowDown();
    }

    // Rate limiting geral para toda a aplicação
    createGeneralLimiter() {
        return rateLimit({
            windowMs: 15 * 60 * 1000, // 15 minutos
            max: this.isProduction ? 100 : 1000, // Limite por IP
            message: {
                error: 'Muitas requisições. Tente novamente em 15 minutos.',
                code: 'RATE_LIMIT_EXCEEDED',
                retryAfter: 15 * 60
            },
            standardHeaders: true,
            legacyHeaders: false,
            handler: (req, res) => {
                logger.warn(`🚫 Rate limit excedido: ${req.ip} - ${req.method} ${req.path}`);
                res.status(429).json({
                    success: false,
                    error: 'Muitas requisições. Tente novamente em 15 minutos.',
                    code: 'RATE_LIMIT_EXCEEDED',
                    retryAfter: 15 * 60
                });
            }
        });
    }

    // Rate limiting específico para login (mais restritivo)
    createLoginLimiter() {
        return rateLimit({
            windowMs: 15 * 60 * 1000, // 15 minutos
            max: this.isProduction ? 5 : 50, // Máximo 5 tentativas em prod, 50 em dev
            message: {
                error: 'Muitas tentativas de login. Tente novamente em 15 minutos.',
                code: 'LOGIN_RATE_LIMIT_EXCEEDED',
                retryAfter: 15 * 60
            },
            standardHeaders: true,
            legacyHeaders: false,
            skipSuccessfulRequests: true, // Não conta logins bem-sucedidos
            handler: (req, res) => {
                const { re } = req.body;
                logger.warn(`🔒 Login bloqueado por rate limit: ${req.ip} - RE: ${re || 'não informado'}`);

                res.status(429).json({
                    success: false,
                    error: 'Muitas tentativas de login falharam. Por segurança, aguarde 15 minutos antes de tentar novamente.',
                    code: 'LOGIN_RATE_LIMIT_EXCEEDED',
                    retryAfter: 15 * 60,
                    details: {
                        maxAttempts: this.isProduction ? 5 : 50,
                        windowMinutes: 15
                    }
                });
            }
        });
    }

    // Rate limiting para APIs críticas (criação, edição, exclusão)
    createApiLimiter() {
        return rateLimit({
            windowMs: 60 * 1000, // 1 minuto
            max: this.isProduction ? 30 : 100,
            message: {
                error: 'Muitas operações. Aguarde 1 minuto.',
                code: 'API_RATE_LIMIT_EXCEEDED',
                retryAfter: 60
            },
            standardHeaders: true,
            legacyHeaders: false,
            handler: (req, res) => {
                logger.warn(`⚡ API rate limit excedido: ${req.ip} - ${req.method} ${req.path}`);
                res.status(429).json({
                    success: false,
                    error: 'Muitas operações em sequência. Aguarde 1 minuto.',
                    code: 'API_RATE_LIMIT_EXCEEDED',
                    retryAfter: 60
                });
            }
        });
    }

    // Slow down para reduzir velocidade após muitas requisições
    createSlowDown() {
        return slowDown({
            windowMs: 15 * 60 * 1000, // 15 minutos
            delayAfter: this.isProduction ? 10 : 500, // Permitir 10/500 requisições rápidas
            delayMs: (hits) => {
                const delay = hits * 500;
                if (hits === (this.isProduction ? 11 : 501)) {
                    // Primeiro ponto em que começa a aplicar atrasos
                    logger.warn(`🐌 Slow down iniciado: ${hits} hits - aplicando ${delay}ms de atraso`);
                } else if (hits % 50 === 0) {
                    // Log periódico para não poluir demais
                    logger.info(`🐌 Slow down progressivo: ${hits} hits - atraso atual ${delay}ms`);
                }
                return delay;
            }, // Função de delay progressivo com logging controlado
            maxDelayMs: 20000 // Máximo 20 segundos de atraso
        });
    }

    // Getters para as instâncias já criadas
    getGeneralLimiter() {
        return this.generalLimiter;
    }

    getLoginLimiter() {
        return this.loginLimiter;
    }

    getApiLimiter() {
        return this.apiLimiter;
    }

    getSlowDown() {
        return this.slowDownMiddleware;
    }

    // Rate limiting personalizado baseado no usuário
    getUserBasedLimiter() {
        const store = new Map(); // Em produção, usar Redis

        return rateLimit({
            windowMs: 60 * 1000, // 1 minuto
            max: this.isProduction ? 60 : 200,
            keyGenerator: (req) => {
                // Usar ID do usuário se autenticado, senão IP
                const userId = req.user?.id || req.headers['x-user-id'];
                return userId ? `user:${userId}` : req.ip;
            },
            store: this.isProduction ? undefined : { // Em dev usar memória, prod deve usar Redis
                incr: (key, callback) => {
                    const current = store.get(key) || 0;
                    const newValue = current + 1;
                    store.set(key, newValue);
                    callback(null, newValue, Date.now() + 60000);
                },
                decrement: (key) => {
                    const current = store.get(key) || 0;
                    if (current > 0) {
                        store.set(key, current - 1);
                    }
                },
                resetKey: (key) => {
                    store.delete(key);
                }
            },
            handler: (req, res) => {
                const identifier = req.user?.id ? `Usuário ${req.user.id}` : `IP ${req.ip}`;
                logger.warn(`👤 Rate limit por usuário excedido: ${identifier}`);

                res.status(429).json({
                    success: false,
                    error: 'Limite de operações por usuário excedido. Aguarde 1 minuto.',
                    code: 'USER_RATE_LIMIT_EXCEEDED',
                    retryAfter: 60
                });
            }
        });
    }

    // Middleware para aplicar rate limits baseado na rota
    applyRateLimitByRoute() {
        return (req, res, next) => {
            const path = req.path.toLowerCase();

            // Escolher rate limiter baseado na rota
            if (path.includes('/auth/login')) {
                return this.loginLimiter(req, res, next);
            }

            if (path.includes('/api/') && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
                return this.apiLimiter(req, res, next);
            }

            // Rate limit geral para outras rotas
            return this.generalLimiter(req, res, next);
        };
    }

    // Health check dos rate limiters
    healthCheck() {
        return {
            environment: this.environment,
            limits: {
                general: {
                    windowMs: '15min',
                    max: this.isProduction ? 100 : 1000
                },
                login: {
                    windowMs: '15min',
                    max: this.isProduction ? 5 : 50
                },
                api: {
                    windowMs: '1min',
                    max: this.isProduction ? 30 : 100
                }
            },
            production: this.isProduction
        };
    }
}

module.exports = new RateLimitConfig();