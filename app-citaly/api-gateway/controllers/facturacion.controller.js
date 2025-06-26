const db = require('../config/database');

// Obtener todos los planes de facturación
const getPlanes = async (req, res) => {
  try {
    const [planes] = await db.execute(`
      SELECT pf.*,
             sa.nombre as creado_por_nombre,
             (SELECT COUNT(*) FROM suscripciones s WHERE s.plan_id = pf.id AND s.estado = 'Activa') as suscripciones_activas
      FROM planes_facturacion pf
      LEFT JOIN super_administradores sa ON pf.creado_por = sa.id
      WHERE pf.activo = TRUE
      ORDER BY pf.precio ASC
    `);

    // Obtener funcionalidades para cada plan
    for (let plan of planes) {
      const [funcionalidades] = await db.execute(`
        SELECT f.nombre, f.descripcion, pf.limite, pf.habilitado
        FROM plan_funcionalidades pf
        JOIN funcionalidades f ON pf.funcionalidad_id = f.id
        WHERE pf.plan_id = ? AND pf.habilitado = TRUE
        ORDER BY f.nombre
      `, [plan.id]);

      plan.funcionalidades = funcionalidades;
    }

    res.json({
      success: true,
      data: planes
    });
  } catch (error) {
    console.error('Error al obtener planes:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// Obtener un plan específico
const getPlan = async (req, res) => {
  try {
    const { id } = req.params;

    const [plan] = await db.execute(`
      SELECT pf.*, sa.nombre as creado_por_nombre
      FROM planes_facturacion pf
      LEFT JOIN super_administradores sa ON pf.creado_por = sa.id
      WHERE pf.id = ?
    `, [id]);

    if (plan.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Plan no encontrado'
      });
    }

    // Obtener funcionalidades del plan
    const [funcionalidades] = await db.execute(`
      SELECT f.id, f.nombre, f.descripcion, f.modulo, pf.limite, pf.habilitado
      FROM plan_funcionalidades pf
      JOIN funcionalidades f ON pf.funcionalidad_id = f.id
      WHERE pf.plan_id = ?
      ORDER BY f.modulo, f.nombre
    `, [id]);

    res.json({
      success: true,
      data: {
        ...plan[0],
        funcionalidades
      }
    });
  } catch (error) {
    console.error('Error al obtener plan:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// Obtener suscripciones por empresa
const getSuscripciones = async (req, res) => {
  try {
    const { empresa_id } = req.params;

    const [suscripciones] = await db.execute(`
      SELECT s.*,
             pf.nombre as plan_nombre,
             pf.precio as plan_precio,
             pf.ciclo_facturacion,
             e.nombre as empresa_nombre,
             DATEDIFF(s.fecha_fin, CURDATE()) as dias_restantes
      FROM suscripciones s
      JOIN planes_facturacion pf ON s.plan_id = pf.id
      JOIN empresas e ON s.empresa_id = e.id
      WHERE s.empresa_id = ?
      ORDER BY s.fecha_creacion DESC
    `, [empresa_id]);

    res.json({
      success: true,
      data: suscripciones
    });
  } catch (error) {
    console.error('Error al obtener suscripciones:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// Crear nueva suscripción
const createSuscripcion = async (req, res) => {
  try {
    const {
      empresa_id, plan_id, fecha_inicio, fecha_fin, metodo_pago, renovacion_automatica = true
    } = req.body;

    const creado_por = req.user?.id || 1;

    // Validaciones básicas
    if (!empresa_id || !plan_id || !fecha_inicio || !fecha_fin) {
      return res.status(400).json({
        success: false,
        message: 'Los campos empresa_id, plan_id, fecha_inicio y fecha_fin son requeridos'
      });
    }

    // Verificar que la empresa existe
    const [empresa] = await db.execute('SELECT id FROM empresas WHERE id = ?', [empresa_id]);
    if (empresa.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Empresa no encontrada'
      });
    }

    // Verificar que el plan existe
    const [plan] = await db.execute('SELECT * FROM planes_facturacion WHERE id = ? AND activo = TRUE', [plan_id]);
    if (plan.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Plan no encontrado o inactivo'
      });
    }

    // Verificar que no hay suscripción activa
    const [suscripcionActiva] = await db.execute(
      'SELECT id FROM suscripciones WHERE empresa_id = ? AND estado = "Activa"',
      [empresa_id]
    );

    if (suscripcionActiva.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'La empresa ya tiene una suscripción activa'
      });
    }

    const [result] = await db.execute(`
      INSERT INTO suscripciones
      (empresa_id, plan_id, fecha_inicio, fecha_fin, metodo_pago, renovacion_automatica, creado_por)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [empresa_id, plan_id, fecha_inicio, fecha_fin, metodo_pago, renovacion_automatica, creado_por]);

    res.status(201).json({
      success: true,
      message: 'Suscripción creada exitosamente',
      data: {
        id: result.insertId,
        empresa_id,
        plan_id,
        fecha_inicio,
        fecha_fin
      }
    });
  } catch (error) {
    console.error('Error al crear suscripción:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// Actualizar suscripción
const updateSuscripcion = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado, metodo_pago, renovacion_automatica, motivo_suspension } = req.body;

    // Verificar que la suscripción existe
    const [existingSuscripcion] = await db.execute('SELECT * FROM suscripciones WHERE id = ?', [id]);
    if (existingSuscripcion.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Suscripción no encontrada'
      });
    }

    const updateFields = [];
    const updateValues = [];

    if (estado) { updateFields.push('estado = ?'); updateValues.push(estado); }
    if (metodo_pago) { updateFields.push('metodo_pago = ?'); updateValues.push(metodo_pago); }
    if (renovacion_automatica !== undefined) { updateFields.push('renovacion_automatica = ?'); updateValues.push(renovacion_automatica); }
    if (motivo_suspension) { updateFields.push('motivo_suspension = ?'); updateValues.push(motivo_suspension); }

    if (updateFields.length > 0) {
      updateValues.push(id);
      await db.execute(
        `UPDATE suscripciones SET ${updateFields.join(', ')} WHERE id = ?`,
        updateValues
      );
    }

    res.json({
      success: true,
      message: 'Suscripción actualizada exitosamente'
    });
  } catch (error) {
    console.error('Error al actualizar suscripción:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// Obtener facturas por empresa
const getFacturas = async (req, res) => {
  try {
    const { empresa_id } = req.params;
    const { estado, page = 1, limit = 10 } = req.query;

    const offset = (page - 1) * limit;

    let whereClause = 'WHERE f.empresa_id = ?';
    const params = [empresa_id];

    if (estado) {
      whereClause += ' AND f.estado = ?';
      params.push(estado);
    }

    const [facturas] = await db.execute(`
      SELECT f.*,
             s.plan_id,
             pf.nombre as plan_nombre,
             suc.nombre as sucursal_nombre
      FROM facturas f
      LEFT JOIN suscripciones s ON f.suscripcion_id = s.id
      LEFT JOIN planes_facturacion pf ON s.plan_id = pf.id
      LEFT JOIN sucursales suc ON f.sucursal_id = suc.id
      ${whereClause}
      ORDER BY f.fecha_creacion DESC
      LIMIT ? OFFSET ?
    `, [...params, parseInt(limit), offset]);

    // Obtener total de registros
    const [total] = await db.execute(`
      SELECT COUNT(*) as count
      FROM facturas f
      ${whereClause}
    `, params);

    res.json({
      success: true,
      data: facturas,
      pagination: {
        current_page: parseInt(page),
        per_page: parseInt(limit),
        total: total[0].count,
        total_pages: Math.ceil(total[0].count / limit)
      }
    });
  } catch (error) {
    console.error('Error al obtener facturas:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// Crear factura
const createFactura = async (req, res) => {
  try {
    const {
      empresa_id, sucursal_id, suscripcion_id, numero_factura, monto, monto_impuestos,
      fecha_vencimiento, metodo_pago, referencia_pago
    } = req.body;

    const creado_por = req.user?.id || 1;

    // Validaciones básicas
    if (!empresa_id || !suscripcion_id || !numero_factura || !monto || !fecha_vencimiento) {
      return res.status(400).json({
        success: false,
        message: 'Los campos empresa_id, suscripcion_id, numero_factura, monto y fecha_vencimiento son requeridos'
      });
    }

    // Verificar que no existe otra factura con el mismo número
    const [existingFactura] = await db.execute(
      'SELECT id FROM facturas WHERE numero_factura = ?',
      [numero_factura]
    );

    if (existingFactura.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe una factura con este número'
      });
    }

    const [result] = await db.execute(`
      INSERT INTO facturas
      (empresa_id, sucursal_id, suscripcion_id, numero_factura, monto, monto_impuestos,
       fecha_vencimiento, metodo_pago, referencia_pago, creado_por)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      empresa_id, sucursal_id, suscripcion_id, numero_factura, monto, monto_impuestos || 0,
      fecha_vencimiento, metodo_pago, referencia_pago, creado_por
    ]);

    res.status(201).json({
      success: true,
      message: 'Factura creada exitosamente',
      data: {
        id: result.insertId,
        numero_factura,
        monto,
        estado: 'No_pagada'
      }
    });
  } catch (error) {
    console.error('Error al crear factura:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// Marcar factura como pagada
const marcarFacturaPagada = async (req, res) => {
  try {
    const { id } = req.params;
    const { metodo_pago, referencia_pago, fecha_pago } = req.body;

    const [result] = await db.execute(`
      UPDATE facturas
      SET estado = 'Pagada', metodo_pago = ?, referencia_pago = ?, fecha_pago = ?
      WHERE id = ? AND estado = 'No_pagada'
    `, [metodo_pago, referencia_pago, fecha_pago || new Date(), id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Factura no encontrada o ya está pagada'
      });
    }

    res.json({
      success: true,
      message: 'Factura marcada como pagada exitosamente'
    });
  } catch (error) {
    console.error('Error al marcar factura como pagada:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// Obtener estadísticas de facturación
const getEstadisticasFacturacion = async (req, res) => {
  try {
    const { empresa_id } = req.params;

    const [stats] = await db.execute(`
      SELECT
        COUNT(*) as total_facturas,
        COUNT(CASE WHEN estado = 'Pagada' THEN 1 END) as facturas_pagadas,
        COUNT(CASE WHEN estado = 'No_pagada' THEN 1 END) as facturas_pendientes,
        COUNT(CASE WHEN estado = 'Vencida' THEN 1 END) as facturas_vencidas,
        COALESCE(SUM(CASE WHEN estado = 'Pagada' THEN monto_total END), 0) as total_pagado,
        COALESCE(SUM(CASE WHEN estado != 'Pagada' THEN monto_total END), 0) as total_pendiente,
        COALESCE(AVG(CASE WHEN estado = 'Pagada' THEN monto_total END), 0) as promedio_factura
      FROM facturas
      WHERE empresa_id = ?
    `, [empresa_id]);

    res.json({
      success: true,
      data: stats[0]
    });
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

module.exports = {
  getPlanes,
  getPlan,
  getSuscripciones,
  createSuscripcion,
  updateSuscripcion,
  getFacturas,
  createFactura,
  marcarFacturaPagada,
  getEstadisticasFacturacion
};
