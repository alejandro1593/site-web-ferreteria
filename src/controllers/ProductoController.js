const fs = require('fs');
const Producto = require('../models/Producto');
const Ajuste = require('../models/Ajuste');
const { registrarAccion } = require('../utils/audit');

function archivoValido(file) {
  return new Promise((resolve, reject) => {
    fs.open(file.path, 'r', (openError, fd) => {
      if (openError) return reject(openError);
      const buffer = Buffer.alloc(12);
      fs.read(fd, buffer, 0, buffer.length, 0, (readError, bytesRead) => {
        fs.close(fd, () => {});
        if (readError) return reject(readError);
        const data = buffer.subarray(0, bytesRead);
        const valid = (file.mimetype === 'image/jpeg' || file.mimetype === 'image/jpg') && data[0] === 0xff && data[1] === 0xd8
          || file.mimetype === 'image/png' && data.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
          || (file.mimetype === 'image/gif' && ['GIF87a', 'GIF89a'].includes(data.toString('ascii', 0, 6)))
          || file.mimetype === 'image/webp' && data.toString('ascii', 0, 4) === 'RIFF' && data.toString('ascii', 8, 12) === 'WEBP';
        if (valid) return resolve(true);
        reject(new Error('El contenido del archivo no coincide con una imagen válida'));
      });
    });
  });
}

function eliminarArchivo(file) {
  if (file && file.path) fs.unlink(file.path, () => {});
}

function productoValido(data) {
  const nombre = String(data.nombre || '').trim();
  const precioVenta = Number(data.precio_venta);
  const precioCompra = data.precio_compra === undefined || data.precio_compra === null || data.precio_compra === '' ? null : Number(data.precio_compra);
  const stockActual = data.stock_actual === undefined || data.stock_actual === null || data.stock_actual === '' ? 0 : Number(data.stock_actual);
  const stockMinimo = data.stock_minimo === undefined || data.stock_minimo === null || data.stock_minimo === '' ? 0 : Number(data.stock_minimo);
  const idCategoria = data.id_categoria ? Number(data.id_categoria) : null;
  const idProveedor = data.id_proveedor ? Number(data.id_proveedor) : null;
  if (!nombre || !Number.isFinite(precioVenta) || precioVenta <= 0 || (precioCompra !== null && (!Number.isFinite(precioCompra) || precioCompra < 0)) || !Number.isInteger(stockActual) || stockActual < 0 || !Number.isInteger(stockMinimo) || stockMinimo < 0 || (idCategoria !== null && (!Number.isInteger(idCategoria) || idCategoria <= 0)) || (idProveedor !== null && (!Number.isInteger(idProveedor) || idProveedor <= 0))) {
    const error = new Error('Los datos del producto no son válidos');
    error.status = 400;
    throw error;
  }
  return {
    nombre,
    descripcion: data.descripcion ? String(data.descripcion).slice(0, 2000) : null,
    codigo: data.codigo ? String(data.codigo).trim().slice(0, 50) : null,
    precio_compra: precioCompra,
    precio_venta: precioVenta,
    stock_actual: stockActual,
    stock_minimo: stockMinimo,
    id_categoria: idCategoria,
    id_proveedor: idProveedor,
    imagen: data.imagen ? String(data.imagen).slice(0, 255) : null,
    activo: data.activo === undefined ? true : data.activo === true || data.activo === 'true' || data.activo === 1
  };
}

const ProductoController = {
   // Obtener todos los productos (soporta ?page=1&limit=50)
   getAll: (req, res) => {
     const { page, limit } = req.query;
     const options = {};
     if (page !== undefined || limit !== undefined) {
       const pageNumber = Number(page);
       const limitNumber = Number(limit);
       if (!Number.isInteger(pageNumber) || pageNumber < 1 || !Number.isInteger(limitNumber) || limitNumber < 1 || limitNumber > 200) {
         return res.status(400).json({ error: 'Parámetros de paginación inválidos' });
       }
       options.limit = limitNumber;
       options.offset = (pageNumber - 1) * limitNumber;
     }
     Producto.findAll(options, (err, results) => {
       if (err) {
         return res.status(500).json({ error: 'Error al obtener productos' });
       }
       Producto.countAll((err2, countResults) => {
         if (!err2) {
           res.set('X-Total-Count', String(countResults[0].total));
         }
         res.json(results);
       });
     });
   },

   // Obtener producto por ID
   getById: (req, res) => {
     const { id } = req.params;
     Producto.findById(id, (err, results) => {
       if (err) {
         return res.status(500).json({ error: 'Error al obtener producto' });
       }
       if (results.length === 0) {
         return res.status(404).json({ error: 'Producto no encontrado' });
       }
       res.json(results[0]);
     });
   },

   // Obtener productos por categoría
   getByCategoria: (req, res) => {
     const { idCategoria } = req.params;
     Producto.findByCategoria(idCategoria, (err, results) => {
       if (err) {
         return res.status(500).json({ error: 'Error al obtener productos' });
       }
       res.json(results);
     });
   },

   // Buscar productos
   search: (req, res) => {
     const { termino } = req.query;
     if (!termino) {
       return res.status(400).json({ error: 'El término de búsqueda es requerido' });
     }
     Producto.search(termino, (err, results) => {
       if (err) {
         return res.status(500).json({ error: 'Error al buscar productos' });
       }
       res.json(results);
     });
   },

   // Obtener productos con stock bajo
   getLowStock: (req, res) => {
     Producto.getLowStock((err, results) => {
       if (err) {
         return res.status(500).json({ error: 'Error al obtener productos' });
       }
       res.json(results);
     });
   },

     create: (req, res) => {
       let data;
       try {
         data = productoValido(req.body || {});
       } catch (error) {
         return res.status(error.status || 400).json({ error: error.message });
       }
       Producto.create(data, (err, result) => {
         if (err) {
           if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'Ya existe un producto con ese código' });
           return res.status(500).json({ error: 'Error al crear producto' });
         }
         res.status(201).json({ message: 'Producto creado exitosamente', id: result.insertId });
       });
     },

      update: (req, res) => {
        const id = Number(req.params.id);
        let data;
        try {
          data = productoValido(req.body || {});
        } catch (error) {
          return res.status(error.status || 400).json({ error: error.message });
        }
        if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'ID de producto inválido' });
        Producto.update(id, data, (err) => {
          if (err) {
            if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'Ya existe un producto con ese código' });
            return res.status(500).json({ error: 'Error al actualizar producto' });
          }
          res.json({ message: 'Producto actualizado exitosamente' });
        });
      },

   // Eliminar producto (soft delete)
   delete: (req, res) => {
     const { id } = req.params;

     Producto.findById(id, (err, results) => {
       if (err) {
         return res.status(500).json({ error: 'Error al verificar producto' });
       }
       if (results.length === 0) {
         return res.status(404).json({ error: 'Producto no encontrado' });
       }

        Producto.delete(id, (err, result) => {
          if (err) {
            return res.status(500).json({ error: 'Error al eliminar producto' });
          }
          registrarAccion(req, 'eliminar', 'producto', id, results[0].nombre);
          res.json({ message: 'Producto eliminado exitosamente' });
        });
     });
   },

     // Actualizar stock de producto
     updateStock: (req, res) => {
       const id = Number(req.params.id);
       const cantidad = Number(req.body?.cantidad);
       const motivo = String(req.body?.motivo || '').trim().slice(0, 255);

       if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'ID de producto inválido' });
       if (!Number.isInteger(cantidad) || cantidad < 0) {
         return res.status(400).json({ error: 'La cantidad debe ser un entero mayor o igual a 0' });
       }
       if (!motivo) return res.status(400).json({ error: 'El motivo del ajuste es requerido' });

       Ajuste.crear(id, cantidad, motivo, req.user.id_usuario, (err) => {
         if (err) {
           const status = err.code === 'PRODUCT_NOT_FOUND' ? 404 : 400;
           return res.status(status).json({ error: err.message || 'Error al registrar el ajuste' });
         }
         registrarAccion(req, 'ajustar', 'producto', id, `Stock ajustado a ${cantidad}. Motivo: ${motivo}`);
         res.json({ message: 'Stock actualizado exitosamente' });
       });
     },

   // Obtener producto por código
   getByCodigo: (req, res) => {
     const { codigo } = req.params;
     Producto.findByCodigo(codigo, (err, results) => {
       if (err) {
         return res.status(500).json({ error: 'Error al obtener producto' });
       }
       if (results.length === 0) {
         return res.status(404).json({ error: 'Producto no encontrado' });
       }
       res.json(results[0]);
     });
   },

     createWithImage: async (req, res) => {
       if (!req.file) return res.status(400).json({ error: 'No se ha proporcionado ningún archivo' });
       try {
         await archivoValido(req.file);
       } catch (error) {
         eliminarArchivo(req.file);
         return res.status(400).json({ error: 'El archivo no contiene una imagen válida' });
       }
       const imagen = `/uploads/productos/${req.file.filename}`;
       let data;
       try {
         data = productoValido({ ...(req.body || {}), imagen });
       } catch (error) {
         eliminarArchivo(req.file);
         return res.status(error.status || 400).json({ error: error.message });
       }
       Producto.create(data, (err, result) => {
         if (err) {
           eliminarArchivo(req.file);
           if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'Ya existe un producto con ese código' });
           return res.status(500).json({ error: 'Error al crear producto' });
         }
         res.status(201).json({ message: 'Producto creado exitosamente', id: result.insertId, imagen });
       });
     },

   uploadImage: async (req, res) => {
     if (!req.file) return res.status(400).json({ error: 'No se ha proporcionado ningún archivo' });
     const id = Number(req.params.id);
     if (!Number.isInteger(id) || id <= 0) {
       eliminarArchivo(req.file);
       return res.status(400).json({ error: 'ID de producto inválido' });
     }

     try {
       await archivoValido(req.file);
     } catch (error) {
       eliminarArchivo(req.file);
       return res.status(400).json({ error: 'El archivo no contiene una imagen válida' });
     }

     Producto.findById(id, (err, results) => {
       if (err) {
         eliminarArchivo(req.file);
         return res.status(500).json({ error: 'Error al verificar producto' });
       }
       if (results.length === 0) {
         eliminarArchivo(req.file);
         return res.status(404).json({ error: 'Producto no encontrado' });
       }

       const imagen = `/uploads/productos/${req.file.filename}`;
       Producto.updateImage(id, imagen, (error, result) => {
         if (error) {
           eliminarArchivo(req.file);
           return res.status(500).json({ error: 'Error al actualizar producto' });
         }
         if (result.affectedRows === 0) {
           eliminarArchivo(req.file);
           return res.status(404).json({ error: 'Producto no encontrado' });
         }
         res.json({ message: 'Imagen subida exitosamente', imagen });
       });
     });
   }
};

module.exports = ProductoController;