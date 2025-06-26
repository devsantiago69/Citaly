const db = require('../config/database');

// Obtener todas las cajas de una sucursal
const getCajas = async (req, res) => {
  try {
    const { sucursal_id } = req.params;

    const [cajas] = await db.execute(`
      SELECT c.*,
             s.nombre as sucursal_nombre,
             u1.nombre as creado_por_nombre,
             (SELECT COUNT(*) FROM sesiones_caja sc WHERE sc.caja_id = c.id) as total_sesiones
      FROM cajas c
      LEFT JOIN sucursales s ON c.sucursal_id = s.id
      LEFT JOIN usuarios u1 ON c.creado_por = u1.id
      WHERE c.sucursal_id = ?
      ORDER BY c.fecha_creacion DESC
    `, [sucursal_id]);

    res.json({
      success: true,
      data: cajas,
      total: cajas.length
    });
  } catch (error) {
    console.error('Error al obtener cajas:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// Obtener una caja específica
const getCaja = async (req, res) => {
  try {
    const { id } = req.params;

    const [caja] = await db.execute(`
      SELECT c.*,
             s.nombre as sucursal_nombre,
             u1.nombre as creado_por_nombre,
             (SELECT sc.* FROM sesiones_caja sc WHERE sc.caja_id = c.id AND sc.estado = 'Abierta' LIMIT 1) as sesion_actual
      FROM cajas c
      LEFT JOIN sucursales s ON c.sucursal_id = s.id
      LEFT JOIN usuarios u1 ON c.creado_por = u1.id
      WHERE c.id = ?
    `, [id]);

    if (caja.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Caja no encontrada'
      });
    }

    res.json({
      success: true,
      data: caja[0]
    });
  } catch (error) {
    console.error('Error al obtener caja:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// Crear nueva caja
const createCaja = async (req, res) => {
  try {
    const { sucursal_id, nombre, descripcion } = req.body;
    const creado_por = req.user?.id || 1;

    if (!sucursal_id || !nombre) {
      return res.status(400).json({
        success: false,
        message: 'Los campos sucursal_id y nombre son requeridos'
      });
    }

    // Verificar que la sucursal existe
    const [sucursal] = await db.execute('SELECT id FROM sucursales WHERE id = ?', [sucursal_id]);
    if (sucursal.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Sucursal no encontrada'
      });
    }

    const [result] = await db.execute(`
      INSERT INTO cajas (sucursal_id, nombre, descripcion, creado_por)
      VALUES (?, ?, ?, ?)
    `, [sucursal_id, nombre, descripcion, creado_por]);

    res.status(201).json({
      success: true,
      message: 'Caja creada exitosamente',
      data: {
        id: result.insertId,
        sucursal_id,
        nombre,
        descripcion
      }
    });
  } catch (error) {
    console.error('Error al crear caja:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// Abrir sesión de caja
const abrirSesion = async (req, res) => {
  try {
    const { caja_id } = req.params;
    const { monto_inicial } = req.body;
    const usuario_id = req.user?.id || 1;

    // Verificar que la caja existe y está cerrada
    const [caja] = await db.execute('SELECT * FROM cajas WHERE id = ? AND estado = "Cerrada"', [caja_id]);
    if (caja.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Caja no encontrada o ya está abierta'
      });
    }

    // Verificar que no hay sesiones abiertas
    const [sesionAbierta] = await db.execute(
      'SELECT id FROM sesiones_caja WHERE caja_id = ? AND estado = "Abierta"',
      [caja_id]
    );
    if (sesionAbierta.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe una sesión abierta para esta caja'
      });
    }

    // Crear nueva sesión
    const [result] = await db.execute(`
      INSERT INTO sesiones_caja (caja_id, usuario_apertura_id, monto_inicial, fecha_apertura)
      VALUES (?, ?, ?, NOW())
    `, [caja_id, usuario_id, monto_inicial]);

    // Actualizar estado de la caja
    await db.execute('UPDATE cajas SET estado = "Abierta", saldo_actual = ? WHERE id = ?', [monto_inicial, caja_id]);

    res.json({
      success: true,
      message: 'Sesión de caja abierta exitosamente',
      data: {
        sesion_id: result.insertId,
        monto_inicial
      }
    });
  } catch (error) {
    console.error('Error al abrir sesión:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// Cerrar sesión de caja
const cerrarSesion = async (req, res) => {
  try {
    const { caja_id } = req.params;
    const { monto_final_real, notas_cierre } = req.body;
    const usuario_id = req.user?.id || 1;

    // Obtener sesión abierta
    const [sesion] = await db.execute(`
      SELECT sc.*, c.saldo_actual
      FROM sesiones_caja sc
      JOIN cajas c ON sc.caja_id = c.id
      WHERE sc.caja_id = ? AND sc.estado = "Abierta"
    `, [caja_id]);

    if (sesion.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No hay sesión abierta para esta caja'
      });
    }

    const sesionActual = sesion[0];
    const monto_final_calculado = sesionActual.saldo_actual;

    // Cerrar sesión
    await db.execute(`
      UPDATE sesiones_caja
      SET usuario_cierre_id = ?, monto_final_calculado = ?, monto_final_real = ?,
          fecha_cierre = NOW(), estado = "Cerrada", notas_cierre = ?
      WHERE id = ?
    `, [usuario_id, monto_final_calculado, monto_final_real, notas_cierre, sesionActual.id]);

    // Actualizar estado de la caja
    await db.execute('UPDATE cajas SET estado = "Cerrada", saldo_actual = 0 WHERE id = ?', [caja_id]);

    const diferencia = monto_final_real - monto_final_calculado;

    res.json({
      success: true,
      message: 'Sesión de caja cerrada exitosamente',
      data: {
        monto_inicial: sesionActual.monto_inicial,
        monto_final_calculado,
        monto_final_real,
        diferencia
      }
    });
  } catch (error) {
    console.error('Error al cerrar sesión:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// Registrar movimiento de caja
const registrarMovimiento = async (req, res) => {
  try {
    const { caja_id } = req.params;
    const { tipo_movimiento, monto, motivo, metodo_pago, referencia_id, referencia_tabla } = req.body;
    const usuario_id = req.user?.id || 1;

    // Verificar que hay sesión abierta
    const [sesion] = await db.execute(
      'SELECT id FROM sesiones_caja WHERE caja_id = ? AND estado = "Abierta"',
      [caja_id]
    );

    if (sesion.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No hay sesión abierta para registrar movimientos'
      });
    }

    // Registrar movimiento
    const [result] = await db.execute(`
      INSERT INTO movimientos_caja
      (sesion_id, usuario_id, tipo_movimiento, monto, motivo, metodo_pago, referencia_id, referencia_tabla)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [sesion[0].id, usuario_id, tipo_movimiento, monto, motivo, metodo_pago, referencia_id, referencia_tabla]);

    // Actualizar saldo de la caja
    const ajuste = tipo_movimiento === 'Ingreso' ? monto : -monto;
    await db.execute(
      'UPDATE cajas SET saldo_actual = saldo_actual + ? WHERE id = ?',
      [ajuste, caja_id]
    );

    res.json({
      success: true,
      message: 'Movimiento registrado exitosamente',
      data: {
        movimiento_id: result.insertId,
        tipo_movimiento,
        monto,
        motivo
      }
    });
  } catch (error) {
    console.error('Error al registrar movimiento:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// Obtener movimientos de una sesión
const getMovimientosSesion = async (req, res) => {
  try {
    const { sesion_id } = req.params;

    const [movimientos] = await db.execute(`
      SELECT mc.*, u.nombre as usuario_nombre
      FROM movimientos_caja mc
      LEFT JOIN usuarios u ON mc.usuario_id = u.id
      WHERE mc.sesion_id = ?
      ORDER BY mc.fecha_movimiento DESC
    `, [sesion_id]);

    res.json({
      success: true,
      data: movimientos,
      total: movimientos.length
    });
  } catch (error) {
    console.error('Error al obtener movimientos:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// Obtener reporte de caja
const getReporteCaja = async (req, res) => {
  try {
    const { caja_id } = req.params;
    const { fecha_inicio, fecha_fin } = req.query;

    let whereClause = 'WHERE sc.caja_id = ?';
    let params = [caja_id];

    if (fecha_inicio && fecha_fin) {
      whereClause += ' AND DATE(sc.fecha_apertura) BETWEEN ? AND ?';
      params.push(fecha_inicio, fecha_fin);
    }

    const [reporte] = await db.execute(`
      SELECT
        sc.*,
        c.nombre as caja_nombre,
        ua.nombre as usuario_apertura_nombre,
        uc.nombre as usuario_cierre_nombre,
        (SELECT COUNT(*) FROM movimientos_caja mc WHERE mc.sesion_id = sc.id AND mc.tipo_movimiento = 'Ingreso') as total_ingresos_count,
        (SELECT COALESCE(SUM(mc.monto), 0) FROM movimientos_caja mc WHERE mc.sesion_id = sc.id AND mc.tipo_movimiento = 'Ingreso') as total_ingresos,
        (SELECT COUNT(*) FROM movimientos_caja mc WHERE mc.sesion_id = sc.id AND mc.tipo_movimiento = 'Egreso') as total_egresos_count,
        (SELECT COALESCE(SUM(mc.monto), 0) FROM movimientos_caja mc WHERE mc.sesion_id = sc.id AND mc.tipo_movimiento = 'Egreso') as total_egresos
      FROM sesiones_caja sc
      LEFT JOIN cajas c ON sc.caja_id = c.id
      LEFT JOIN usuarios ua ON sc.usuario_apertura_id = ua.id
      LEFT JOIN usuarios uc ON sc.usuario_cierre_id = uc.id
      ${whereClause}
      ORDER BY sc.fecha_apertura DESC
    `, params);

    res.json({
      success: true,
      data: reporte,
      total: reporte.length
    });
  } catch (error) {
    console.error('Error al obtener reporte:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

module.exports = {
  getCajas,
  getCaja,
  createCaja,
  abrirSesion,
  cerrarSesion,
  registrarMovimiento,
  getMovimientosSesion,
  getReporteCaja
};
