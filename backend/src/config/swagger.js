const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');

class SwaggerConfig {
    constructor() {
        this.swaggerDocument = null;
        this.loadSwaggerDocument();
    }

    loadSwaggerDocument() {
        try {
            // Carregar o arquivo OpenAPI YAML - caminho corrigido
            const swaggerPath = path.join(__dirname, '../../../docs/openapi.yaml');

            if (fs.existsSync(swaggerPath)) {
                this.swaggerDocument = YAML.load(swaggerPath);
                logger.success('✅ OpenAPI document loaded successfully from:', swaggerPath);
            } else {
                logger.warn('OpenAPI file not found at:', swaggerPath);
                this.createDefaultDocument();
            }
        } catch (error) {
            logger.error('Error loading OpenAPI document:', error.message);
            this.createDefaultDocument();
        }
    }

    createDefaultDocument() {
        // Documento padrão caso o arquivo não seja encontrado
        this.swaggerDocument = {
            openapi: '3.0.3',
            info: {
                title: 'Sistema Agenda - API',
                description: 'APIs RESTful para sistema de agendamento de recebimento de mercadorias',
                version: '1.1.0',
                contact: {
                    name: 'Sistema Agenda',
                    url: 'https://github.com/tremedam/AgendaReceb_Mercadorias'
                }
            },
            servers: [
                {
                    url: 'http://localhost:3000',
                    description: 'Servidor de Desenvolvimento'
                }
            ],
            paths: {
                '/ping': {
                    get: {
                        summary: 'Health Check',
                        responses: {
                            200: {
                                description: 'API está funcionando'
                            }
                        }
                    }
                }
            }
        };
    }

    // Opções customizadas do Swagger UI
    getSwaggerOptions() {
        return {
            customCss: `
                .swagger-ui .topbar { 
                    background-color: #1f4e79; 
                    border-bottom: 3px solid #2980b9;
                }
                .swagger-ui .topbar .download-url-wrapper .select-label { 
                    color: white; 
                }
                .swagger-ui .info .title { 
                    color: #2c3e50; 
                }
                .swagger-ui .scheme-container {
                    background: #f8f9fa;
                    border: 1px solid #dee2e6;
                    border-radius: 4px;
                    padding: 10px;
                }
            `,
            customSiteTitle: 'API Documentation',
            customfavIcon: '/favicon.ico'
        };
    }

    // Middleware para servir a documentação
    serve() {
        return swaggerUi.serve;
    }

    // Setup da documentação
    setup() {
        return swaggerUi.setup(this.swaggerDocument, this.getSwaggerOptions());
    }

    // Retornar o documento JSON para outros usos
    getDocument() {
        return this.swaggerDocument;
    }
}

module.exports = new SwaggerConfig();