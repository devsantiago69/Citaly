const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('../config/db');
const logger = require('../logger');

const login = async (req, res) => {
  const { email, password } = req.body;
  logger.info(`Intento de login para usuario: ${email}`);

  if (!email || !password) {
    logger.warn('Intento de login sin email o password');
    return res.status(400).json({ error: 'Email y contraseña son requeridos' });
  }

  try {
    const [rows] = await db.execute('SELECT * FROM usuarios WHERE correo_electronico = ?', [email]);

    if (rows.length === 0) {
      logger.warn(`Usuario no encontrado en la base de datos: ${email}`);
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const user = rows[0];
    logger.info(`Usuario encontrado: ${user.nombre} (ID: ${user.id}, Empresa: ${user.empresa_id})`);

    // Comparar contraseñas
    const isMatch = await bcrypt.compare(password, user.contrasena);

    if (!isMatch) {
      logger.warn(`Contraseña incorrecta para usuario: ${email}`);
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    logger.info(`Login exitoso para usuario: ${email}`);

    // Generar token JWT
    const token = jwt.sign(
      { id: user.id, empresa_id: user.empresa_id, tipo_usuario_id: user.tipo_usuario_id },
      process.env.JWT_SECRET || 'your_jwt_secret',
      { expiresIn: '1h' }
    );

    // Obtener datos de la empresa
    const [companyRows] = await db.execute('SELECT * FROM empresas WHERE id = ?', [user.empresa_id]);
    const company = companyRows.length > 0 ? companyRows[0] : null;

    res.json({
      message: 'Login exitoso',
      token,
      user: {
        id: user.id,
        name: user.nombre,
        email: user.correo_electronico,
        role: user.tipo_usuario_id, // Ajustar según los roles que uses
        company: {
          id: company?.id,
          name: company?.nombre,
          nit: company?.nit,
          address: company?.direccion,
          phone: company?.telefono,
          email: company?.correo_electronico,
          description: company?.descripcion,
          website: company?.sitio_web,
          industry: company?.industria
        }
      }
    });

  } catch (error) {
    logger.error('Error en login:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const verifyToken = async (req, res) => {
  try {
    // El middleware verifyToken ya ha validado el token y ha puesto la información del usuario en req.user
    const { id, empresa_id } = req.user;

    // Validar que tenemos los parámetros necesarios
    if (!id || !empresa_id) {
      return res.status(400).json({ error: 'Token inválido: faltan datos de usuario' });
    }

    // Obtener información actualizada del usuario
    const [rows] = await db.execute('SELECT * FROM usuarios WHERE id = ? AND empresa_id = ?', [id, empresa_id]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const user = rows[0];

    // Obtener datos de la empresa
    const [companyRows] = await db.execute('SELECT * FROM empresas WHERE id = ?', [empresa_id]);
    const company = companyRows.length > 0 ? companyRows[0] : null;

    res.json({
      message: 'Token válido',
      user: {
        id: user.id,
        name: user.nombre,
        email: user.correo_electronico,
        role: user.tipo_usuario_id,
        company: {
          id: company?.id,
          name: company?.nombre,
          nit: company?.nit,
          address: company?.direccion,
          phone: company?.telefono,
          email: company?.correo_electronico,
          description: company?.descripcion,
          website: company?.sitio_web,
          industry: company?.industria
        }
      }
    });
  } catch (error) {
    logger.error('Error en verificación de token:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

module.exports = { login, verifyToken };
