const Usuario = require('../models/Usuario');

const checkRole = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'No autenticado' });
        }

        const userRole = req.user.rol;

        if (!roles.includes(userRole)) {
            return res.status(403).json({ 
                error: 'No tiene permisos para acceder a este recurso',
                requiredRoles: roles,
                userRole: userRole
            });
        }

        next();
    };
};

const checkPermission = (permission) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'No autenticado' });
        }

        const rolePermissions = {
            admin: ['all'],
            gerente: ['ventas', 'productos', 'clientes', 'proveedores', 'categorias', 'reportes', 'devoluciones', 'caja'],
            supervisor: ['ventas', 'productos', 'clientes', 'reportes', 'devoluciones', 'caja'],
            vendedor: ['ventas', 'productos', 'clientes', 'devoluciones'],
            cajero: ['ventas', 'caja'],
            almacen: ['productos', 'proveedores', 'categorias']
        };

        const permissions = rolePermissions[req.user.rol] || [];

        if (!permissions.includes('all') && !permissions.includes(permission)) {
            return res.status(403).json({ 
                error: 'No tiene permisos para realizar esta acción',
                requiredPermission: permission,
                userRole: req.user.rol
            });
        }

        next();
    };
};

const requireAdmin = checkRole('admin');
const requireGerente = checkRole('admin', 'gerente');
const requireSupervisor = checkRole('admin', 'gerente', 'supervisor');

module.exports = {
    checkRole,
    checkPermission,
    requireAdmin,
    requireGerente,
    requireSupervisor
};
