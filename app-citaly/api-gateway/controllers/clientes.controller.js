// Controlador de clientes: gesti�n completa y compatible con frontend
const ClienteModel = require('../models/cliente.model');

// Obtener todos los clientes de una empresa (paginado, b�squeda, filtros y datos enriquecidos)
const getClientes = async (req, res) => {
  try {
    const { company_id } = req.user;
    const { page = 1, limit = 10, search = '', estado = '', genero = '', ciudad = '' } = req.query;
    const { clientes, total } = await ClienteModel.getAll({ company_id, page, limit, search, estado, genero, ciudad });
    res.json({
      success: true,
      data: clientes,
      pagination: {
        current_page: parseInt(page),
        per_page: parseInt(limit),
        total,
        total_pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error interno del servidor', error: error.message });
  }
};

// Obtener un cliente espec�fico y su historial de citas
const getCliente = async (req, res) => {
  try {
    const { id } = req.params;
    const { company_id } = req.user;
    const cliente = await ClienteModel.getById(id, company_id);
    if (!cliente) {
      return res.status(404).json({ success: false, message: 'Cliente no encontrado' });
    }
    const historial_citas = await ClienteModel.getCitasHistorial(id, company_id);
    res.json({
      success: true,
      data: { ...cliente, historial_citas }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error interno del servidor', error: error.message });
  }
};

// Crear nuevo cliente
const createCliente = async (req, res) => {
  try {
    const data = {
      ...req.body,
      company_id: req.user.company_id,
      creado_por: req.user.id
    };
    if (!data.nombres || !data.apellidos || !data.numero_documento || !data.correo_electronico || !data.telefono) {
      return res.status(400).json({ success: false, message: 'Los campos nombres, apellidos, numero_documento, correo_electronico y telefono son requeridos' });
    }
    const nuevoCliente = await ClienteModel.create(data);
    res.status(201).json({
      success: true,
      message: 'Cliente creado exitosamente',
      data: nuevoCliente
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Error interno del servidor' });
  }
};

// Actualizar cliente
const updateCliente = async (req, res) => {
  try {
    const { id } = req.params;
    const { company_id } = req.user;
    const ok = await ClienteModel.update(id, company_id, req.body);
    if (!ok) {
      return res.status(404).json({ success: false, message: 'Cliente no encontrado o ya actualizado' });
    }
    res.json({ success: true, message: 'Cliente actualizado exitosamente' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Error interno del servidor' });
  }
};

// Eliminar cliente (soft delete)
const deleteCliente = async (req, res) => {
  try {
    const { id } = req.params;
    const { company_id } = req.user;
    const ok = await ClienteModel.remove(id, company_id);
    if (!ok) {
      return res.status(404).json({ success: false, message: 'Cliente no encontrado' });
    }
    res.json({ success: true, message: 'Cliente eliminado exitosamente' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Error interno del servidor' });
  }
};

// Buscar clientes (autocompletado)
const searchClientes = async (req, res) => {
  try {
    const { company_id } = req.user;
    const { term } = req.query;
    if (!term) {
      return res.status(400).json({ success: false, message: 'Parámetro de búsqueda requerido' });
    }
    const clientes = await ClienteModel.search(company_id, term);
    res.json({ success: true, data: clientes });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Error interno del servidor' });
  }
};

// Obtener estadísticas de clientes
const getEstadisticasClientes = async (req, res) => {
  try {
    const { company_id } = req.user;
    const data = await ClienteModel.estadisticas(company_id);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Error interno del servidor' });
  }
};

module.exports = {
  getClientes,
  getCliente,
  createCliente,
  updateCliente,
  deleteCliente,
  getEstadisticasClientes,
  searchClientes
};
