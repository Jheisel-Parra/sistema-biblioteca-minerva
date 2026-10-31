export const permitirRoles = (...rolesPermitidos) => {
  return (req, res, next) => {
    if (!req.usuario) {
      return res.status(401).json({
        ok: false,
        mensaje: 'No autorizado. Debes iniciar sesión.'
      });
    }

    if (!rolesPermitidos.includes(req.usuario.rol)) {
      return res.status(403).json({
        ok: false,
        mensaje: `Acceso denegado. Esta acción requiere rol [${rolesPermitidos.join(' o ')}], pero tu rol actual es "${req.usuario.rol}".`
      });
    }

    next();
  };
};

export const soloAdmin = permitirRoles('admin');
