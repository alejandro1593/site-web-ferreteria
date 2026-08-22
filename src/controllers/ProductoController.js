const Producto = require('../models/Producto');
const { registrarAccion } = require('../utils/audit');

const ProductoController = {
   // Obtener todos los productos (soporta ?page=1&limit=50)
   getAll: (req, res) => {
     const { page, limit } = req.query;
     const options = {};
     if (page && limit) {
       options.limit = Math.min(Number(limit), 200);
       options.offset = (Math.max(Number(page), 1) - 1) * options.limit;
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

    // Crear nuevo producto
     create: (req, res) => {
       try {
         console.log('🔍 === INICIO CREATE ===');
         console.log('🔍 req.body completo:', JSON.stringify(req.body, null, 2));
         console.log('🔍 req.body tipo:', typeof req.body);
         console.log('🔍 req.body está vacío:', Object.keys(req.body || {}).length === 0);
         console.log('🔍 req.headers:', req.headers['content-type']);
         
         const { nombre, descripcion, codigo, precio_compra, precio_venta, stock_actual, stock_minimo, id_categoria, id_proveedor, imagen, activo } = req.body || {};

         console.log('📦 Creando producto:', { nombre, descripcion, codigo, precio_compra, precio_venta, stock_actual, stock_minimo, id_categoria, id_proveedor, imagen, activo });

        if (!nombre || !precio_venta) {
          console.log('❌ Validación fallida: nombre o precio_venta faltante');
          return res.status(400).json({ error: 'Nombre y precio de venta son requeridos' });
        }

        Producto.create({
          nombre,
          descripcion,
          codigo,
          precio_compra,
          precio_venta,
          stock_actual,
          stock_minimo,
          id_categoria,
          id_proveedor,
          imagen,
          activo
        }, (err, result) => {
          if (err) {
            console.error('❌ Error al crear producto:', err);
            if (err.code === 'ER_DUP_ENTRY') {
              return res.status(400).json({ error: 'Ya existe un producto con ese código' });
            }
            return res.status(500).json({ error: 'Error al crear producto', details: err.message });
          }
          console.log('✅ Producto creado exitosamente:', result);
          res.status(201).json({ message: 'Producto creado exitosamente', id: result.insertId });
        });
      } catch (error) {
        console.error('❌ Error inesperado en create:', error);
        res.status(500).json({ error: 'Error al crear producto', details: error.message });
      }
    },

     // Actualizar producto
      // Actualizar producto
      update: (req, res) => {
        console.log('🔍 === INICIO UPDATE ===');
        console.log('🔍 req.params:', req.params);
        console.log('🔍 req.body completo:', JSON.stringify(req.body, null, 2));
        console.log('🔍 req.body tipo:', typeof req.body);
        console.log('🔍 req.body es nulo:', req.body === null);
        console.log('🔍 req.body está vacío:', Object.keys(req.body || {}).length === 0);
        console.log('🔍 req.headers:', req.headers['content-type']);
        
        const { id } = req.params;
        const { nombre, descripcion, codigo, precio_compra, precio_venta, stock_actual, stock_minimo, id_categoria, id_proveedor, imagen, activo } = req.body || {};

        console.log('📦 Actualizando producto ID:', id, 'Datos:', { nombre, descripcion, codigo, precio_compra, precio_venta, stock_actual, stock_minimo, id_categoria, id_proveedor, imagen, activo });

       if (!nombre || !precio_venta) {
         return res.status(400).json({ error: 'Nombre y precio de venta son requeridos' });
       }

       Producto.findById(id, (err, results) => {
         if (err) {
           console.error('❌ Error al verificar producto:', err);
           return res.status(500).json({ error: 'Error al verificar producto' });
         }
         if (results.length === 0) {
           return res.status(404).json({ error: 'Producto no encontrado' });
         }

         Producto.update(id, {
           nombre,
           descripcion,
           codigo,
           precio_compra,
           precio_venta,
           stock_actual,
           stock_minimo,
           id_categoria,
           id_proveedor,
           imagen,
           activo
         }, (err, result) => {
           if (err) {
             console.error('❌ Error al actualizar producto:', err);
             if (err.code === 'ER_DUP_ENTRY') {
               return res.status(400).json({ error: 'Ya existe un producto con ese código' });
             }
             return res.status(500).json({ error: 'Error al actualizar producto', details: err.message });
           }
           console.log('✅ Producto actualizado exitosamente');
           res.json({ message: 'Producto actualizado exitosamente' });
         });
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
      const { id } = req.params;
      const { cantidad } = req.body || {};

      const cantidadNum = Number(cantidad);
      if (cantidad === undefined || isNaN(cantidadNum) || cantidadNum < 0) {
        return res.status(400).json({ error: 'Cantidad inválida' });
      }

      Producto.updateStock(id, cantidadNum, (err, result) => {
       if (err) {
         return res.status(500).json({ error: 'Error al actualizar stock' });
       }
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

     // Crear producto con imagen
     createWithImage: (req, res) => {
       const { nombre, descripcion, codigo, precio_compra, precio_venta, stock_actual, stock_minimo, id_categoria, id_proveedor, activo } = req.body || {};

      if (!nombre || !precio_venta) {
        return res.status(400).json({ error: 'Nombre y precio de venta son requeridos' });
      }

      if (!req.file) {
        return res.status(400).json({ error: 'No se ha proporcionado ningún archivo' });
      }

      const imagen = `/uploads/productos/${req.file.filename}`;

      Producto.create({
        nombre,
        descripcion,
        codigo,
        precio_compra,
        precio_venta,
        stock_actual,
        stock_minimo,
        id_categoria,
        id_proveedor,
        imagen,
        activo
      }, (err, result) => {
        if (err) {
          if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'Ya existe un producto con ese código' });
          }
          return res.status(500).json({ error: 'Error al crear producto' });
        }
        res.status(201).json({ message: 'Producto creado exitosamente', id: result.insertId, imagen });
      });
    },

   // Subir imagen de producto
    uploadImage: (req, res) => {
      if (!req.file) {
        return res.status(400).json({ error: 'No se ha proporcionado ningún archivo' });
      }

      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

      if (!allowedTypes.includes(req.file.mimetype)) {
        return res.status(400).json({ error: 'Tipo de archivo no permitido. Solo se permiten: JPG, PNG, GIF, WebP' });
      }

      const fileName = req.file.filename;

      const id = (req.body || {}).id;

      Producto.findById(id, (err, results) => {
        if (err) {
          return res.status(500).json({ error: 'Error al verificar producto' });
        }
        if (results.length === 0) {
          return res.status(404).json({ error: 'Producto no encontrado' });
        }

        const updateData = {
          imagen: `/uploads/productos/${fileName}`
        };

        Producto.update(id, updateData, (err, result) => {
          if (err) {
            return res.status(500).json({ error: 'Error al actualizar producto' });
          }
          if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Producto no encontrado' });
          }
          res.json({ message: 'Imagen subida exitosamente', imagen: updateData.imagen });
        });
      });
    }
};

module.exports = ProductoController;