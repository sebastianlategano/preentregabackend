const express = require('express');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = 8080;

app.use(express.json());

// GET
app.get('/api/products', (req, res) => {
    fs.readFile('productos.json', 'utf8', (err, data) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Error al leer los productos' });
        }
        
        let products = JSON.parse(data);
        
        //limit
        const limit = req.query.limit;
        if (limit) {
            products = products.slice(0, limit);
        }
        
        res.json(products);
    });
});

// Puerto 8080
app.listen(8080, () => {
    console.log('Servidor escuchando en el puerto 8080');
});

// Funciones
function leerArchivoJSON(nombreArchivo, callback) {
    fs.readFile(nombreArchivo, 'utf8', (err, data) => {
        if (err) {
            console.error(`Error al leer el archivo ${nombreArchivo}:`, err);
            callback(err);
            return;
        }

        try {
            const contenido = JSON.parse(data);
            callback(null, contenido);
        } catch (error) {
            console.error(`Error al parsear el contenido del archivo ${nombreArchivo}:`, error);
            callback(error);
        }
    });
}

function escribirArchivoJSON(nombreArchivo, contenido, callback) {
    fs.writeFile(nombreArchivo, JSON.stringify(contenido, null, 2), err => {
        if (err) {
            console.error(`Error al escribir en el archivo ${nombreArchivo}:`, err);
            callback(err);
            return;
        }

        console.log(`Datos escritos en el archivo ${nombreArchivo} exitosamente`);
        callback(null);
    });
}

// Rutas
const productsRouter = express.Router();

// Todos los productos
productsRouter.get('/', (req, res) => {
    leerArchivoJSON('productos.json', (err, productos) => {
        if (err) {
            res.status(500).send('Error interno del servidor');
            return;
        }
        res.json(productos);
    });
});

// Producto por ID
productsRouter.get('/:pid', (req, res) => {
    const productId = req.params.pid;
    leerArchivoJSON('productos.json', (err, productos) => {
        if (err) {
            res.status(500).send('Error interno del servidor');
            return;
        }
        const producto = productos.find(producto => producto.id === productId);
        if (!producto) {
            res.status(404).send('Producto no encontrado');
            return;
        }
        res.json(producto);
    });
});

// Agregar nuevo producto
productsRouter.post('/', (req, res) => {
    const newProduct = req.body;
    newProduct.id = uuidv4();
    leerArchivoJSON('productos.json', (err, productos) => {
        if (err) {
            res.status(500).send('Error interno del servidor');
            return;
        }
        productos.push(newProduct);
        escribirArchivoJSON('productos.json', productos, (err) => {
            if (err) {
                res.status(500).send('Error interno del servidor');
                return;
            }
            res.json(newProduct);
        });
    });
});

// Actualizar un producto por ID
productsRouter.put('/:pid', (req, res) => {
    const productId = req.params.pid;
    const updatedProduct = req.body;
    leerArchivoJSON('productos.json', (err, productos) => {
        if (err) {
            res.status(500).send('Error interno del servidor');
            return;
        }
        const productIndex = productos.findIndex(producto => producto.id === productId);
        if (productIndex === -1) {
            res.status(404).send('Producto no encontrado');
            return;
        }
        productos[productIndex] = { ...productos[productIndex], ...updatedProduct };
        escribirArchivoJSON('productos.json', productos, (err) => {
            if (err) {
                res.status(500).send('Error interno del servidor');
                return;
            }
            res.json(productos[productIndex]);
        });
    });
});

// Eliminar un producto por ID
productsRouter.delete('/:pid', (req, res) => {
    const productId = req.params.pid;
    leerArchivoJSON('productos.json', (err, productos) => {
        if (err) {
            res.status(500).send('Error interno del servidor');
            return;
        }
        const filteredProducts = productos.filter(producto => producto.id !== productId);
        if (productos.length === filteredProducts.length) {
            res.status(404).send('Producto no encontrado');
            return;
        }
        escribirArchivoJSON('productos.json', filteredProducts, (err) => {
            if (err) {
                res.status(500).send('Error interno del servidor');
                return;
            }
            res.send('Producto eliminado exitosamente');
        });
    });
});

// Rutas para carritos
const cartsRouter = express.Router();

// Obtener los productos de un carrito por ID
cartsRouter.get('/:cid', (req, res) => {
    const cartId = req.params.cid;
    leerArchivoJSON('carrito.json', (err, carritos) => {
        if (err) {
            res.status(500).send('Error interno del servidor');
            return;
        }
        const carrito = carritos.find(carrito => carrito.id === cartId);
        if (!carrito) {
            res.status(404).send('Carrito no encontrado');
            return;
        }
        res.json(carrito.products);
    });
});

// Crear un nuevo carrito
cartsRouter.post('/', (req, res) => {
    const newCart = {
        id: uuidv4(),
        products: []
    };
    leerArchivoJSON('carrito.json', (err, carritos) => {
        if (err) {
            res.status(500).send('Error interno del servidor');
            return;
        }
        carritos.push(newCart);
        escribirArchivoJSON('carrito.json', carritos, (err) => {
            if (err) {
                res.status(500).send('Error interno del servidor');
                return;
            }
            res.json(newCart);
        });
    });
});

// Agregar un producto a un carrito
cartsRouter.post('/:cid/product/:pid', (req, res) => {
    const cartId = req.params.cid;
    const productId = req.params.pid;
    const { quantity } = req.body;
    leerArchivoJSON('carrito.json', (err, carritos) => {
        if (err) {
            res.status(500).send('Error interno del servidor');
            return;
        }
        const carrito = carritos.find(carrito => carrito.id === cartId);
        if (!carrito) {
            res.status(404).send('Carrito no encontrado');
            return;
        }
        const existingProduct = carrito.products.find(product => product.id === productId);
        if (existingProduct) {
            existingProduct.quantity += quantity;
        } else {
            carrito.products.push({ id: productId, quantity });
        }
        escribirArchivoJSON('carrito.json', carritos, (err) => {
            if (err) {
                res.status(500).send('Error interno del servidor');
                return;
            }
            res.json(carrito);
        });
    });
});

app.use('/api/products', productsRouter);
app.use('/api/carts', cartsRouter);

app.listen(PORT, () => {
    console.log(`Servidor escuchando en el puerto ${PORT}`);
});
