// Controlador vacío para citas-new, solo para evitar error de módulo no encontrado
module.exports = {
  getAllCitas: (req, res) => res.status(501).json({ success: false, message: 'Not implemented' }),
  getAvailability: (req, res) => res.status(501).json({ success: false, message: 'Not implemented' }),
  getCitaById: (req, res) => res.status(501).json({ success: false, message: 'Not implemented' }),
  createCita: (req, res) => res.status(501).json({ success: false, message: 'Not implemented' }),
  updateCita: (req, res) => res.status(501).json({ success: false, message: 'Not implemented' }),
  changeStatus: (req, res) => res.status(501).json({ success: false, message: 'Not implemented' }),
  deleteCita: (req, res) => res.status(501).json({ success: false, message: 'Not implemented' })
};
