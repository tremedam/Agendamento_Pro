// =============================================
// HEALTH CHECK E MONITORAMENTO
// Endpoint para verificar saúde do sistema
// =============================================

const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const secretsManager = require('../config/secrets');
const corsConfig = require('../config/cors');
const rateLimitConfig = require('../config/rateLimit');
const securityConfig = require('../config/security');

// Health check básico
router.get('/health', async (req, res) => {
    try {
        const health = {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            environment: process.env.NODE_ENV || 'development',
            version: require('../../../package.json').version,

            // Verificações de sistema
            system: {
                memory: {
                    used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
                    total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
                    external: Math.round(process.memoryUsage().external / 1024 / 1024)
                },
                cpu: process.cpuUsage()
            }
        };

        res.json(health);
    } catch (error) {
        logger.error('Erro no health check:', error);
        res.status(500).json({
            status: 'error',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Health check completo (apenas para admins)
router.get('/health/detailed', async (req, res) => {
    try {
        const detailedHealth = {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            environment: process.env.NODE_ENV || 'development',

            // Configurações de segurança
            security: {
                secrets: secretsManager.healthCheck(),
                cors: corsConfig.healthCheck(),
                rateLimit: rateLimitConfig.healthCheck(),
                headers: securityConfig.healthCheck()
            },

            // Status do sistema
            system: {
                uptime: process.uptime(),
                memory: process.memoryUsage(),
                cpu: process.cpuUsage(),
                nodeVersion: process.version,
                platform: process.platform
            },

            // Variáveis de ambiente (mascaradas)
            environmentVariables: {
                NODE_ENV: process.env.NODE_ENV,
                PORT: process.env.PORT,
                DB_HOST: process.env.DB_HOST,
                DB_NAME: process.env.DB_NAME,
                // Mascarar valores sensíveis
                JWT_SECRET: secretsManager.getJwtSecret() ? '***CONFIGURED***' : 'NOT_SET',
                DB_PASSWORD: process.env.DB_PASSWORD ? '***CONFIGURED***' : 'NOT_SET'
            }
        };

        res.json(detailedHealth);
    } catch (error) {
        logger.error('Erro no health check detalhado:', error);
        res.status(500).json({
            status: 'error',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Status das conexões do banco
router.get('/health/database', async (req, res) => {
    try {
        const DatabaseManager = require('../../database/DatabaseManager');
        const db = new DatabaseManager();

        const dbHealth = await db.healthCheck();
        res.json(dbHealth);
    } catch (error) {
        logger.error('Erro no health check do banco:', error);
        res.status(500).json({
            status: 'error',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Informações sobre rate limiting atual
router.get('/health/rate-limits', (req, res) => {
    try {
        const rateLimitInfo = rateLimitConfig.healthCheck();
        res.json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            rateLimits: rateLimitInfo,
            clientInfo: {
                ip: req.ip,
                userAgent: req.headers['user-agent'],
                headers: Object.keys(req.headers)
            }
        });
    } catch (error) {
        logger.error('Erro no health check de rate limits:', error);
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
});

// Teste de conectividade (ping)
router.get('/ping', (req, res) => {
    res.json({
        status: 'pong',
        timestamp: new Date().toISOString(),
        message: 'Sistema operacional'
    });
});

module.exports = router;