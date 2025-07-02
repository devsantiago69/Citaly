// Controlador de facturación
const db = require('../config/db');

// Obtener todas las facturas
const getFacturas = async (req, res) => {
  try {
    const [facturas] = await db.execute('SELECT * FROM facturas ORDER BY fecha DESC');
    res.json({ success: true, data: facturas });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener facturas', error: error.message });
  }
};

// Crear una factura
const createFactura = async (req, res) => {
  try {
    const { cliente_id, total, fecha, descripcion } = req.body;
    if (!cliente_id || !total || !fecha) {
      return res.status(400).json({ success: false, message: 'Faltan datos obligatorios' });
    }
    const [result] = await db.execute(
      'INSERT INTO facturas (cliente_id, total, fecha, descripcion) VALUES (?, ?, ?, ?)',
      [cliente_id, total, fecha, descripcion || '']
    );
    res.status(201).json({ success: true, id: result.insertId });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al crear factura', error: error.message });
  }
};

// Obtener una factura por ID
const getFacturaById = async (req, res) => {
  try {
    const { id } = req.params;
    const [facturas] = await db.execute('SELECT * FROM facturas WHERE id = ?', [id]);
    if (facturas.length === 0) {
      return res.status(404).json({ success: false, message: 'Factura no encontrada' });
    }
    res.json({ success: true, data: facturas[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener factura', error: error.message });
  }
};

// Eliminar una factura
const deleteFactura = async (req, res) => {
  try {
    const { id } = req.params;
    await db.execute('DELETE FROM facturas WHERE id = ?', [id]);
    res.json({ success: true, message: 'Factura eliminada' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al eliminar factura', error: error.message });
  }
};

module.exports = {
  getFacturas,
  createFactura,
  getFacturaById,
  deleteFactura,
};
