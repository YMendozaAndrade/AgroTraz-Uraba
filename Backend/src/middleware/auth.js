const jwt = require('jsonwebtoken');

const SECRETO = process.env.JWT_SECRET;

// TEMPORAL - fase de verificación: toda la API queda disponible solo para
// el rol administrador. Poner en false para reactivar el acceso por roles.
const SOLO_ADMIN = true;

if (!SECRETO || SECRETO.length < 16) {
  console.error('ADVERTENCIA CRÍTICA: JWT_SECRET no definido o muy corto. Los tokens son inseguros.');
}

function generarToken(usuario) {
  return jwt.sign(
    { id_usuario: usuario.id_usuario, rol: usuario.rol, nombre: usuario.nombre },
    SECRETO,
    { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
  );
}

function verificarToken(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ status: 'error', message: 'Token no proporcionado' });
  }
  try {
    req.usuario = jwt.verify(header.split(' ')[1], SECRETO);
    if (SOLO_ADMIN && req.usuario.rol !== 'administrador') {
      return res.status(403).json({ status: 'error', message: 'Acceso temporal solo para administración (fase de verificación)' });
    }
    next();
  } catch (err) {
    return res.status(401).json({ status: 'error', message: 'Token inválido o expirado' });
  }
}

function requiereRol(...roles) {
  return (req, res, next) => {
    if (!req.usuario) {
      return res.status(401).json({ status: 'error', message: 'No autenticado' });
    }
    if (!roles.includes(req.usuario.rol)) {
      return res.status(403).json({ status: 'error', message: 'Sin permisos para esta acción' });
    }
    next();
  };
}

module.exports = { generarToken, verificarToken, requiereRol };