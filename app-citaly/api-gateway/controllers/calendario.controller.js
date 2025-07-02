const pool = require('../config/db');

// Resumen de citas por día para el calendario (mes)
exports.summary = async (req, res) => {
  try {
    const { start, end } = req.query;
    const company_id = req.user?.company_id || req.user?.empresa_id || 1;
    if (!start || !end) {
      return res.status(400).json({ success: false, message: 'Faltan fechas' });
    }
    const [result] = await pool.query(
      `SELECT
        c.id,
        c.fecha,
        c.hora,
        c.estado,
        c.notas,
        c.canal,
        c.origen,
        c.cliente_id,
        c.personal_id,
        c.servicio_id,
        c.sucursal_id,
        cl.nombres as cliente_nombres,
        cl.apellidos as cliente_apellidos,
        cl.telefono as cliente_telefono,
        cl.correo_electronico as cliente_email,
        CONCAT(cl.nombres, ' ', cl.apellidos) as cliente_nombre_completo,
        s.nombre as servicio_nombre,
        s.duracion as servicio_duracion,
        s.precio as servicio_precio_base,
        ss.precio as servicio_precio,
        cs.nombre as categoria_nombre,
        p.id as personal_id,
        u.nombre as personal_nombre,
        u.telefono as personal_telefono,
        suc.nombre as sucursal_nombre,
        suc.direccion as sucursal_direccion
      FROM citas c
      LEFT JOIN clientes cl ON c.cliente_id = cl.id
      LEFT JOIN servicios s ON c.servicio_id = s.id
      LEFT JOIN servicios_sucursal ss ON c.servicio_id = ss.servicio_id AND c.sucursal_id = ss.sucursal_id
      LEFT JOIN categorias_servicio cs ON s.categoria_id = cs.id
      LEFT JOIN personal p ON c.personal_id = p.id
      LEFT JOIN usuarios u ON p.usuario_id = u.id
      LEFT JOIN sucursales suc ON c.sucursal_id = suc.id
      WHERE c.empresa_id = ?
        AND c.fecha BETWEEN ? AND ?
      ORDER BY c.fecha ASC, c.hora ASC`,
      [company_id, start, end]
    );
    // console.log('[CALENDARIO] summary result:', result); // Silenciado para producción
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('[calendario.controller] Error summary:', error);
    res.status(500).json({ success: false, message: 'Error al obtener resumen del calendario' });
  }
};

// Citas de un día específico
exports.day = async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) return res.status(400).json({ success: false, message: 'Falta la fecha' });
    const [events] = await pool.query(
      `SELECT c.id, c.fecha as date, c.hora as time, c.estado as status, cli.nombre_completo as client, s.nombre as service, c.notas as notes
       FROM citas c
       LEFT JOIN clientes cli ON c.cliente_id = cli.id
       LEFT JOIN servicios s ON c.servicio_id = s.id
       WHERE c.fecha = ?`,
      [date]
    );
    res.json({ success: true, data: events });
  } catch (error) {
    console.error('[calendario.controller] Error day:', error);
    res.status(500).json({ success: false, message: 'Error al obtener detalles del día' });
  }
};

// Todas las citas (opcional, para dashboard)
exports.all = async (req, res) => {
  try {
    const [events] = await pool.query(
      `SELECT c.id, c.fecha as date, c.hora as time, c.estado as status, cli.nombre_completo as client, s.nombre as service, c.notas as notes
       FROM citas c
       LEFT JOIN clientes cli ON c.cliente_id = cli.id
       LEFT JOIN servicios s ON c.servicio_id = s.id`,
    );
    res.json({ success: true, data: events });
  } catch (error) {
    console.error('[calendario.controller] Error all:', error);
    res.status(500).json({ success: false, message: 'Error al obtener todas las citas' });
  }
};
