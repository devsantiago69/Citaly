const db = require('../config/db');
const logger = require('../logger');

const pagosController = {
  // Obtener todos los pagos con filtros avanzados
  getAllPagos: async (req, res) => {
    try {
      const {
        page = 1,
        limit = 50,
        fecha_inicio,
        fecha_fin,
        sucursal_id,
        estado,
        metodo_pago,
        cliente_id,
        monto_min,
        monto_max,
        search
      } = req.query;

      const offset = (page - 1) * limit;

      let whereConditions = ['f.estado != "Cancelada"'];
      let params = [];

      if (fecha_inicio && fecha_fin) {
        whereConditions.push('DATE(f.fecha_pago) BETWEEN ? AND ?');
        params.push(fecha_inicio, fecha_fin);
      }

      if (sucursal_id) {
        whereConditions.push('f.sucursal_id = ?');
        params.push(sucursal_id);
      }

      if (estado) {
        whereConditions.push('f.estado = ?');
        params.push(estado);
      }

      if (metodo_pago) {
        whereConditions.push('f.medio_pago_id = ?');
        params.push(metodo_pago);
      }

      if (cliente_id) {
        whereConditions.push('s.cliente_id = ?');
        params.push(cliente_id);
      }

      if (monto_min) {
        whereConditions.push('f.monto_total >= ?');
        params.push(monto_min);
      }

      if (monto_max) {
        whereConditions.push('f.monto_total <= ?');
        params.push(monto_max);
      }

      if (search) {
        whereConditions.push('(f.numero_factura LIKE ? OR cl.nombre LIKE ? OR f.referencia_pago LIKE ?)');
        const searchTerm = `%${search}%`;
        params.push(searchTerm, searchTerm, searchTerm);
      }

      const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';

      const query = `
        SELECT
          f.*,
          s.nombre as sucursal_nombre,
          s.direccion as sucursal_direccion,
          sub.cliente_id,
          cl.nombre as cliente_nombre,
          cl.telefono as cliente_telefono,
          cl.email as cliente_email,
          c.fecha_hora as cita_fecha,
          srv.nombre as servicio_nombre,
          srv.precio as servicio_precio,
          p.nombre as personal_nombre,
          CASE
            WHEN f.estado = 'Pagada' THEN 'Pagado'
            WHEN f.estado = 'No_pagada' THEN 'Pendiente'
            WHEN f.estado = 'Vencida' THEN 'Vencido'
            ELSE f.estado
          END as estado_display
        FROM facturas f
        LEFT JOIN sucursales s ON f.sucursal_id = s.id
        LEFT JOIN suscripciones sub ON f.suscripcion_id = sub.id
        LEFT JOIN clientes cl ON sub.cliente_id = cl.id
        LEFT JOIN citas c ON c.id = (
          SELECT cita_id FROM facturas_detalle fd WHERE fd.factura_id = f.id LIMIT 1
        )
        LEFT JOIN servicios srv ON c.servicio_id = srv.id
        LEFT JOIN personal p ON c.personal_id = p.id
        ${whereClause}
        ORDER BY f.fecha_creacion DESC
        LIMIT ? OFFSET ?
      `;

      params.push(parseInt(limit), offset);

      const [pagos] = await db.execute(query, params);

      // Contar total
      const countQuery = `
        SELECT COUNT(*) as total
        FROM facturas f
        LEFT JOIN sucursales s ON f.sucursal_id = s.id
        LEFT JOIN suscripciones sub ON f.suscripcion_id = sub.id
        LEFT JOIN clientes cl ON sub.cliente_id = cl.id
        ${whereClause}
      `;

      const [countResult] = await db.execute(countQuery, params.slice(0, -2));
      const total = countResult[0].total;

      res.json({
        success: true,
        data: pagos,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      });

    } catch (error) {
      logger.error('Error al obtener pagos:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  },

  // Obtener estadísticas de pagos
  getEstadisticas: async (req, res) => {
    try {
      const { fecha_inicio, fecha_fin, sucursal_id } = req.query;

      let whereConditions = ['f.estado != "Cancelada"'];
      let params = [];

      if (fecha_inicio && fecha_fin) {
        whereConditions.push('DATE(f.fecha_pago) BETWEEN ? AND ?');
        params.push(fecha_inicio, fecha_fin);
      }

      if (sucursal_id) {
        whereConditions.push('f.sucursal_id = ?');
        params.push(sucursal_id);
      }

      const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';

      // Estadísticas generales
      const [generalStats] = await db.execute(`
        SELECT
          COUNT(*) as total_transacciones,
          COUNT(CASE WHEN estado = 'Pagada' THEN 1 END) as pagos_completados,
          COUNT(CASE WHEN estado = 'No_pagada' THEN 1 END) as pagos_pendientes,
          COUNT(CASE WHEN estado = 'Vencida' THEN 1 END) as pagos_vencidos,
          COALESCE(SUM(CASE WHEN estado = 'Pagada' THEN monto_total END), 0) as ingresos_total,
          COALESCE(AVG(CASE WHEN estado = 'Pagada' THEN monto_total END), 0) as ticket_promedio,
          COALESCE(SUM(CASE WHEN estado = 'Pagada' THEN monto_impuestos END), 0) as impuestos_total
        FROM facturas f
        ${whereClause}
      `, params);

      // Pagos por método de pago
      const [pagosPorMetodo] = await db.execute(`
        SELECT
          COALESCE(medio_pago_id, 'No especificado') as metodo_pago,
          COUNT(*) as cantidad,
          COALESCE(SUM(CASE WHEN estado = 'Pagada' THEN monto_total END), 0) as monto_total
        FROM facturas f
        ${whereClause}
        GROUP BY medio_pago_id
        ORDER BY monto_total DESC
      `, params);

      // Pagos por día (últimos 30 días)
      const [pagosPorDia] = await db.execute(`
        SELECT
          DATE(fecha_pago) as fecha,
          COUNT(*) as cantidad,
          COALESCE(SUM(monto_total), 0) as monto_total
        FROM facturas f
        WHERE estado = 'Pagada'
        AND fecha_pago >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        ${sucursal_id ? 'AND sucursal_id = ?' : ''}
        GROUP BY DATE(fecha_pago)
        ORDER BY fecha DESC
        LIMIT 30
      `, sucursal_id ? [sucursal_id] : []);

      // Top clientes
      const [topClientes] = await db.execute(`
        SELECT
          cl.id,
          cl.nombre,
          cl.email,
          COUNT(f.id) as total_transacciones,
          COALESCE(SUM(CASE WHEN f.estado = 'Pagada' THEN f.monto_total END), 0) as monto_total_pagado
        FROM facturas f
        LEFT JOIN suscripciones sub ON f.suscripcion_id = sub.id
        LEFT JOIN clientes cl ON sub.cliente_id = cl.id
        ${whereClause}
        AND cl.id IS NOT NULL
        GROUP BY cl.id, cl.nombre, cl.email
        ORDER BY monto_total_pagado DESC
        LIMIT 10
      `, params);

      // Pagos por sucursal
      const [pagosPorSucursal] = await db.execute(`
        SELECT
          s.id,
          s.nombre,
          COUNT(f.id) as total_transacciones,
          COALESCE(SUM(CASE WHEN f.estado = 'Pagada' THEN f.monto_total END), 0) as monto_total
        FROM facturas f
        LEFT JOIN sucursales s ON f.sucursal_id = s.id
        ${whereClause}
        GROUP BY s.id, s.nombre
        ORDER BY monto_total DESC
      `, params);

      res.json({
        success: true,
        data: {
          general: generalStats[0],
          por_metodo: pagosPorMetodo,
          por_dia: pagosPorDia,
          top_clientes: topClientes,
          por_sucursal: pagosPorSucursal
        }
      });

    } catch (error) {
      logger.error('Error al obtener estadísticas de pagos:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  },

  // Obtener detalle de factura
  getFacturaDetalle: async (req, res) => {
    try {
      const { id } = req.params;

      // Información principal de la factura
      const [factura] = await db.execute(`
        SELECT
          f.*,
          s.nombre as sucursal_nombre,
          s.direccion as sucursal_direccion,
          s.telefono as sucursal_telefono,
          s.email as sucursal_email,
          sub.cliente_id,
          cl.nombre as cliente_nombre,
          cl.telefono as cliente_telefono,
          cl.email as cliente_email,
          cl.direccion as cliente_direccion,
          cl.documento_identidad,
          emp.nombre as empresa_nombre,
          emp.nit as empresa_nit,
          emp.direccion as empresa_direccion,
          emp.telefono as empresa_telefono
        FROM facturas f
        LEFT JOIN sucursales s ON f.sucursal_id = s.id
        LEFT JOIN suscripciones sub ON f.suscripcion_id = sub.id
        LEFT JOIN clientes cl ON sub.cliente_id = cl.id
        LEFT JOIN empresas emp ON f.empresa_id = emp.id
        WHERE f.id = ?
      `, [id]);

      if (factura.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Factura no encontrada'
        });
      }

      // Detalles de la factura (servicios)
      const [detalles] = await db.execute(`
        SELECT
          fd.*,
          c.fecha_hora as cita_fecha,
          srv.nombre as servicio_nombre,
          srv.descripcion as servicio_descripcion,
          p.nombre as personal_nombre,
          p.especialidad as personal_especialidad
        FROM facturas_detalle fd
        LEFT JOIN citas c ON fd.cita_id = c.id
        LEFT JOIN servicios srv ON c.servicio_id = srv.id
        LEFT JOIN personal p ON c.personal_id = p.id
        WHERE fd.factura_id = ?
        ORDER BY fd.id
      `, [id]);

      // Historial de pagos
      const [historialPagos] = await db.execute(`
        SELECT
          fecha_pago,
          monto_total,
          medio_pago_id,
          referencia_pago,
          estado,
          notas
        FROM facturas
        WHERE id = ?
        ORDER BY fecha_actualizacion DESC
      `, [id]);

      const facturaCompleta = {
        ...factura[0],
        detalles: detalles,
        historial_pagos: historialPagos
      };

      res.json({
        success: true,
        data: facturaCompleta
      });

    } catch (error) {
      logger.error('Error al obtener detalle de factura:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  },

  // Procesar pago de factura
  procesarPago: async (req, res) => {
    try {
      const { id } = req.params;
      const {
        metodo_pago,
        referencia_pago,
        monto_recibido,
        notas,
        fecha_pago = new Date()
      } = req.body;

      // Validaciones
      if (!metodo_pago) {
        return res.status(400).json({
          success: false,
          message: 'El método de pago es requerido'
        });
      }

      // Verificar que la factura existe y está pendiente
      const [factura] = await db.execute(`
        SELECT * FROM facturas
        WHERE id = ? AND estado IN ('No_pagada', 'Vencida')
      `, [id]);

      if (factura.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Factura no encontrada o ya está pagada'
        });
      }

      const montoFactura = factura[0].monto_total;
      const montoFinal = monto_recibido || montoFactura;

      // Actualizar estado de la factura
      await db.execute(`
        UPDATE facturas
        SET
          estado = 'Pagada',
          fecha_pago = ?,
          medio_pago_id = ?,
          referencia_pago = ?,
          notas = CONCAT(COALESCE(notas, ''), ?, ' | Procesado: ', NOW()),
          revisado_por_admin = TRUE,
          fecha_actualizacion = NOW()
        WHERE id = ?
      `, [fecha_pago, metodo_pago, referencia_pago, notas || '', id]);

      // Registrar en movimientos de caja si hay sucursal asignada
      if (factura[0].sucursal_id) {
        // Buscar sesión de caja activa
        const [sesionActiva] = await db.execute(`
          SELECT sc.id
          FROM sesiones_caja sc
          JOIN cajas c ON sc.caja_id = c.id
          WHERE c.sucursal_id = ? AND sc.estado = 'abierta'
          ORDER BY sc.fecha_apertura DESC
          LIMIT 1
        `, [factura[0].sucursal_id]);

        if (sesionActiva.length > 0) {
          await db.execute(`
            INSERT INTO movimientos_caja (
              sesion_id, usuario_id, tipo_movimiento, monto,
              motivo, referencia_id, referencia_tabla, metodo_pago
            ) VALUES (?, ?, 'ingreso', ?, ?, ?, 'facturas', ?)
          `, [
            sesionActiva[0].id,
            req.user?.id || 1,
            montoFinal,
            `Pago factura #${factura[0].numero_factura}`,
            id,
            metodo_pago
          ]);
        }
      }

      logger.info('Pago procesado exitosamente:', {
        facturaId: id,
        numeroFactura: factura[0].numero_factura,
        monto: montoFinal,
        metodoPago: metodo_pago
      });

      res.json({
        success: true,
        message: 'Pago procesado exitosamente',
        data: {
          factura_id: id,
          numero_factura: factura[0].numero_factura,
          monto_pagado: montoFinal,
          metodo_pago: metodo_pago,
          fecha_pago: fecha_pago
        }
      });

    } catch (error) {
      logger.error('Error al procesar pago:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  },

  // Generar reporte de pagos
  generateReporte: async (req, res) => {
    try {
      const {
        fecha_inicio,
        fecha_fin,
        sucursal_id,
        formato = 'json'
      } = req.query;

      if (!fecha_inicio || !fecha_fin) {
        return res.status(400).json({
          success: false,
          message: 'Las fechas de inicio y fin son requeridas'
        });
      }

      let whereConditions = ['f.estado = "Pagada"', 'DATE(f.fecha_pago) BETWEEN ? AND ?'];
      let params = [fecha_inicio, fecha_fin];

      if (sucursal_id) {
        whereConditions.push('f.sucursal_id = ?');
        params.push(sucursal_id);
      }

      const whereClause = 'WHERE ' + whereConditions.join(' AND ');

      const [reporte] = await db.execute(`
        SELECT
          f.numero_factura,
          f.fecha_pago,
          f.monto_total,
          f.medio_pago_id as metodo_pago,
          f.referencia_pago,
          s.nombre as sucursal,
          cl.nombre as cliente,
          cl.email as cliente_email,
          srv.nombre as servicio,
          p.nombre as personal
        FROM facturas f
        LEFT JOIN sucursales s ON f.sucursal_id = s.id
        LEFT JOIN suscripciones sub ON f.suscripcion_id = sub.id
        LEFT JOIN clientes cl ON sub.cliente_id = cl.id
        LEFT JOIN citas c ON c.id = (
          SELECT fd.cita_id FROM facturas_detalle fd WHERE fd.factura_id = f.id LIMIT 1
        )
        LEFT JOIN servicios srv ON c.servicio_id = srv.id
        LEFT JOIN personal p ON c.personal_id = p.id
        ${whereClause}
        ORDER BY f.fecha_pago DESC
      `, params);

      // Resumen del reporte
      const [resumen] = await db.execute(`
        SELECT
          COUNT(*) as total_transacciones,
          SUM(monto_total) as monto_total,
          AVG(monto_total) as ticket_promedio,
          COUNT(DISTINCT DATE(fecha_pago)) as dias_activos
        FROM facturas f
        ${whereClause}
      `, params);

      if (formato === 'csv') {
        // Generar CSV
        const csvHeaders = 'Número Factura,Fecha Pago,Monto,Método Pago,Referencia,Sucursal,Cliente,Email Cliente,Servicio,Personal\n';
        const csvRows = reporte.map(row => [
          row.numero_factura,
          row.fecha_pago,
          row.monto_total,
          row.metodo_pago,
          row.referencia_pago || '',
          row.sucursal || '',
          row.cliente || '',
          row.cliente_email || '',
          row.servicio || '',
          row.personal || ''
        ].join(',')).join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=reporte_pagos_${fecha_inicio}_${fecha_fin}.csv`);
        res.send(csvHeaders + csvRows);
      } else {
        res.json({
          success: true,
          data: {
            resumen: resumen[0],
            detalle: reporte,
            periodo: {
              fecha_inicio,
              fecha_fin,
              sucursal_id: sucursal_id || 'todas'
            }
          }
        });
      }

    } catch (error) {
      logger.error('Error al generar reporte:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  },

  // Obtener métodos de pago disponibles
  getMetodosPago: async (req, res) => {
    try {
      const metodosPago = [
        { id: 'efectivo', nombre: 'Efectivo', activo: true },
        { id: 'tarjeta_credito', nombre: 'Tarjeta de Crédito', activo: true },
        { id: 'tarjeta_debito', nombre: 'Tarjeta de Débito', activo: true },
        { id: 'transferencia', nombre: 'Transferencia Bancaria', activo: true },
        { id: 'pse', nombre: 'PSE', activo: true },
        { id: 'nequi', nombre: 'Nequi', activo: true },
        { id: 'daviplata', nombre: 'Daviplata', activo: true },
        { id: 'otro', nombre: 'Otro', activo: true }
      ];

      res.json({
        success: true,
        data: metodosPago
      });

    } catch (error) {
      logger.error('Error al obtener métodos de pago:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  },

  // Anular pago
  anularPago: async (req, res) => {
    try {
      const { id } = req.params;
      const { motivo } = req.body;

      if (!motivo) {
        return res.status(400).json({
          success: false,
          message: 'El motivo de anulación es requerido'
        });
      }

      // Verificar que la factura existe y está pagada
      const [factura] = await db.execute(`
        SELECT * FROM facturas
        WHERE id = ? AND estado = 'Pagada'
      `, [id]);

      if (factura.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Factura no encontrada o no está pagada'
        });
      }

      // Anular la factura
      await db.execute(`
        UPDATE facturas
        SET
          estado = 'Cancelada',
          notas = CONCAT(COALESCE(notas, ''), ' | ANULADA: ', ?, ' - ', NOW()),
          fecha_actualizacion = NOW()
        WHERE id = ?
      `, [motivo, id]);

      logger.info('Pago anulado:', {
        facturaId: id,
        numeroFactura: factura[0].numero_factura,
        motivo
      });

      res.json({
        success: true,
        message: 'Pago anulado exitosamente'
      });

    } catch (error) {
      logger.error('Error al anular pago:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }
};

module.exports = pagosController;
