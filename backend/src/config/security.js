// =============================================
// CONFIGURAÇÃO DE SEGURANÇA COM HELMET
// Headers de segurança para proteção contra ataques
// =============================================

const helmet = require('helmet');
const logger = require('../utils/logger');

class SecurityConfig {
    constructor() {
        this.environment = process.env.NODE_ENV || 'development';
        this.isProduction = this.environment === 'production';
    }

    // Configuração principal do Helmet
    getHelmetConfig() {
        const config = {
            // Configurar CSP (Content Security Policy)
            contentSecurityPolicy: {
                directives: {
                    defaultSrc: ["'self'"],
                    styleSrc: [
                        "'self'",
                        "'unsafe-inline'", // Necessário para algumas bibliotecas CSS
                        "https://fonts.googleapis.com",
                        "https://cdnjs.cloudflare.com"
                    ],
                    scriptSrc: [
                        "'self'",
                        ...(this.isProduction ? [] : ["'unsafe-eval'"]) // Apenas em dev para debugging
                    ],
                    fontSrc: [
                        "'self'",
                        "https://fonts.gstatic.com",
                        "data:"
                    ],
                    imgSrc: [
                        "'self'",
                        "data:",
                        "blob:",
                        "https:" // Permitir imagens HTTPS
                    ],
                    connectSrc: [
                        "'self'",
                        // Adicionar domínios de API se necessário
                        ...(this.isProduction ? [
                            "https://api.example.com"
                        ] : [
                            "http://localhost:3000",
                            "http://127.0.0.1:3000",
                            "ws://localhost:*", // WebSockets para desenvolvimento
                            "wss://localhost:*"
                        ])
                    ],
                    objectSrc: ["'none'"],
                    upgradeInsecureRequests: this.isProduction ? [] : null
                },
                reportOnly: !this.isProduction // Apenas reportar em desenvolvimento
            },

            // Configurar HSTS (HTTP Strict Transport Security)
            hsts: {
                maxAge: 31536000, // 1 ano
                includeSubDomains: true,
                preload: true
            },

            // Prevenir ataques de clickjacking
            frameguard: {
                action: 'deny' // Não permitir iframe
            },

            // Prevenir MIME sniffing
            noSniff: true,

            // Configurar referrer policy
            referrerPolicy: {
                policy: ['no-referrer', 'strict-origin-when-cross-origin']
            },

            // Remover header X-Powered-By
            hidePoweredBy: true,

            // Configurar permissões da API
            permissionsPolicy: {
                features: {
                    geolocation: ["'none'"],
                    camera: ["'none'"],
                    microphone: ["'none'"],
                    payment: ["'none'"],
                    usb: ["'none'"],
                    fullscreen: ["'self'"]
                }
            }
        };

        // Em desenvolvimento, relaxar algumas políticas
        if (!this.isProduction) {
            config.contentSecurityPolicy.directives.scriptSrc.push("'unsafe-inline'");
            logger.warn('🔒 Headers de segurança em modo desenvolvimento (relaxado)');
        } else {
            logger.info('🔒 Headers de segurança em modo produção (rigoroso)');
        }

        return config;
    }

    // Middlewares adicionais de segurança
    getAdditionalSecurityMiddlewares() {
        return [
            // Middleware personalizado para logs de segurança
            this.securityLoggingMiddleware(),

            // Middleware para detectar ataques comuns
            this.attackDetectionMiddleware(),

            // Middleware para validar User-Agent
            this.userAgentValidationMiddleware()
        ];
    }

    // Log de tentativas de segurança suspeitas
    securityLoggingMiddleware() {
        return (req, res, next) => {
            const suspiciousPatterns = [
                /\.(php|asp|jsp)$/i,
                /\/wp-admin/i,
                /\/admin\.php/i,
                /phpmyadmin/i,
                /\/\.env/i,
                /\/config\./i,
                /<script/i,
                /javascript:/i,
                /eval\(/i,
                /union.*select/i
            ];

            const url = req.url.toLowerCase();
            const userAgent = req.headers['user-agent'] || '';

            // Detectar padrões suspeitos
            if (suspiciousPatterns.some(pattern => pattern.test(url))) {
                logger.warn(`🚨 TENTATIVA SUSPEITA detectada:`);
                logger.warn(`   IP: ${req.ip}`);
                logger.warn(`   URL: ${req.url}`);
                logger.warn(`   User-Agent: ${userAgent}`);
                logger.warn(`   Headers: ${JSON.stringify(req.headers, null, 2)}`);

                // Em produção, retornar 404 para confundir atacantes
                if (this.isProduction) {
                    return res.status(404).json({ error: 'Not Found' });
                }
            }

            next();
        };
    }

    // Detectar ataques automatizados
    attackDetectionMiddleware() {
        const suspiciousIPs = new Map(); // Em produção, usar Redis

        return (req, res, next) => {
            const ip = req.ip;
            const now = Date.now();
            const windowMs = 60000; // 1 minuto

            // Rastrear IPs suspeitos
            if (!suspiciousIPs.has(ip)) {
                suspiciousIPs.set(ip, { requests: 1, firstRequest: now });
            } else {
                const data = suspiciousIPs.get(ip);

                // Resetar contador se janela expirou
                if (now - data.firstRequest > windowMs) {
                    suspiciousIPs.set(ip, { requests: 1, firstRequest: now });
                } else {
                    data.requests++;

                    // Detectar comportamento suspeito
                    if (data.requests > 100) { // Muito rapidooooo
                        logger.warn(`🤖 POSSÍVEL BOT detectado: ${ip} (${data.requests} req/min)`);

                        if (this.isProduction) {
                            return res.status(429).json({
                                error: 'Rate limit exceeded',
                                retryAfter: 60
                            });
                        }
                    }
                }
            }

            next();
        };
    }

    // Validar User-Agent para detectar bots maliciosos
    userAgentValidationMiddleware() {
        const maliciousUserAgents = [
            /sqlmap/i,
            /nikto/i,
            /nmap/i,
            /masscan/i,
            /zmap/i,
            /dirb/i,
            /dirbuster/i,
            /gobuster/i,
            /wget/i,
            /curl/i,
            /python-requests/i
        ];

        return (req, res, next) => {
            const userAgent = req.headers['user-agent'] || '';

            // Detectar User-Agents suspeitos
            if (maliciousUserAgents.some(pattern => pattern.test(userAgent))) {
                logger.warn(`🕷️ USER-AGENT SUSPEITO:`);
                logger.warn(`   IP: ${req.ip}`);
                logger.warn(`   User-Agent: ${userAgent}`);
                logger.warn(`   URL: ${req.url}`);

                // Em produção, bloquear
                if (this.isProduction) {
                    return res.status(403).json({ error: 'Forbidden' });
                }
            }

            next();
        };
    }

    // Health check da configuração de segurança
    healthCheck() {
        return {
            environment: this.environment,
            helmet: {
                enabled: true,
                hsts: this.isProduction,
                csp: 'enabled',
                frameguard: 'deny'
            },
            customMiddlewares: {
                securityLogging: true,
                attackDetection: true,
                userAgentValidation: true
            }
        };
    }

    // Aplicar todas as configurações de segurança
    applySecurityMiddlewares(app) {
        // Aplicar Helmet primeiro
        app.use(helmet(this.getHelmetConfig()));

        // Aplicar middlewares adicionais
        const additionalMiddlewares = this.getAdditionalSecurityMiddlewares();
        additionalMiddlewares.forEach(middleware => {
            app.use(middleware);
        });

        logger.success('🛡️  Configurações de segurança aplicadas');

        if (!this.isProduction) {
            logger.warn('⚠️  Alguns headers relaxados para desenvolvimento');
        }
    }
}

module.exports = new SecurityConfig();