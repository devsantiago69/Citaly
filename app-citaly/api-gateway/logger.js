const winston = require('winston');
const path = require('path');

// Crear directorio de logs si no existe
const logsDir = path.join(__dirname, 'logs');
if (!require('fs').existsSync(logsDir)) {
    require('fs').mkdirSync(logsDir);
}

// Configurar el logger
const logger = winston.createLogger({
    level: 'debug', // Cambiado a debug para ver más información
    format: winston.format.combine(
        winston.format.timestamp({
            format: 'YYYY-MM-DD HH:mm:ss'
        }),
        winston.format.printf(({ level, message, timestamp, ...metadata }) => {
            let msg = `${timestamp} [${level}] : ${message}`;
            if (Object.keys(metadata).length > 0) {
                msg += ` : ${JSON.stringify(metadata, null, 2)}`;
            }
            return msg;
        })
    ),
    transports: [
        // Escribir logs de error en 'error.log'
        new winston.transports.File({ 
            filename: path.join(logsDir, 'error.log'), 
            level: 'error',
            maxsize: 5242880, // 5MB
            maxFiles: 5,
        }),
        // Escribir todos los logs en 'combined.log'
        new winston.transports.File({ 
            filename: path.join(logsDir, 'combined.log'),
            maxsize: 5242880, // 5MB
            maxFiles: 5,
        }),
        // También mostrar en consola
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.simple()
            )
        })
    ]
});

// Exportar funciones de logging
module.exports = {
    info: (message, meta = {}) => {
        logger.info(message, meta);
    },
    error: (message, meta = {}) => {
        logger.error(message, meta);
    },
    debug: (message, meta = {}) => {
        logger.debug(message, meta);
    },
    warn: (message, meta = {}) => {
        logger.warn(message, meta);
    },
    // Función específica para logs de base de datos
    dbQuery: (query, params = []) => {
        logger.info('Database Query', {
            query,
            params,
            timestamp: new Date().toISOString()
        });
    },
    // Función específica para logs de API
    apiRequest: (method, path, body = null) => {
        logger.info('API Request', {
            method,
            path,
            body,
            timestamp: new Date().toISOString()
        });
    },
    // Función específica para logs de respuesta de API
    apiResponse: (method, path, statusCode, body = null) => {
        logger.info('API Response', {
            method,
            path,
            statusCode,
            body,
            timestamp: new Date().toISOString()
        });
    }
};
