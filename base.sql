-- ============================================
-- TABLAS EXISTENTES (con modificaciones)
-- ============================================

CREATE TABLE ubicaciones (
    idubicacion SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    estado SMALLINT DEFAULT 0 CHECK (estado IN (0, 1)),
    idbodega INTEGER -- Nueva columna para asociar a bodega/sucursal
);

CREATE TABLE categorias (
    idcategoria SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    estado SMALLINT DEFAULT 0 CHECK (estado IN (0, 1))
);

CREATE TABLE tipos (
    idtipo SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    estado SMALLINT DEFAULT 0 CHECK (estado IN (0, 1))
);

-- Usuarios con rol directo y asignación a bodega/sucursal
CREATE TABLE usuarios (
    idusuario SERIAL PRIMARY KEY,
    nombres VARCHAR(100) NOT NULL,
    apellidos VARCHAR(100) NOT NULL,
    telefono VARCHAR(20),
    usuario VARCHAR(50) UNIQUE NOT NULL,
    contraseña VARCHAR(255) NOT NULL,
    rol VARCHAR(20) CHECK (rol IN ('Admin', 'Asistente')),
    idbodega INTEGER REFERENCES bodegas(idbodega) ON DELETE SET NULL, -- Asignación a bodega/sucursal
    estado SMALLINT DEFAULT 0 CHECK (estado IN (0, 1, 2)) -- 0: Activo, 1: Inactivo, 2: Eliminado
);

-- Tablas de productos (modificada)
CREATE TABLE productos (
    idproducto SERIAL PRIMARY KEY,
    nombre VARCHAR(200) NOT NULL,
    descripcion TEXT,
    idubicacion INTEGER REFERENCES ubicaciones(idubicacion),
    estado SMALLINT DEFAULT 0,
    imagen bytea,
    precio_venta integer NOT NULL DEFAULT 0,
    precio_compra integer NOT NULL DEFAULT 0,
    stock integer NOT NULL DEFAULT 0,
    stock_minimo INTEGER NOT NULL DEFAULT 0,
    codigo_barras VARCHAR(100) UNIQUE,
    idbodega INTEGER REFERENCES bodegas(idbodega) ON DELETE SET NULL, -- Identifica a qué bodega/sucursal pertenece
    idproducto_principal INTEGER REFERENCES productos(idproducto) ON DELETE SET NULL -- Referencia al producto original en bodega principal
);

-- Relación muchos a muchos: Productos - Categorías
CREATE TABLE producto_categorias (
    idproducto INTEGER REFERENCES productos(idproducto) ON DELETE CASCADE,
    idcategoria INTEGER REFERENCES categorias(idcategoria) ON DELETE CASCADE,
    PRIMARY KEY (idproducto, idcategoria)
);

-- Relación muchos a muchos: Productos - Tipos
CREATE TABLE producto_tipos (
    idproducto INTEGER REFERENCES productos(idproducto) ON DELETE CASCADE,
    idtipo INTEGER REFERENCES tipos(idtipo) ON DELETE CASCADE,
    PRIMARY KEY (idproducto, idtipo)
);

-- Tablas de ventas y transacciones (modificada)
CREATE TABLE ventas (
    idventa SERIAL PRIMARY KEY,
    fecha_hora TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    idusuario INTEGER REFERENCES usuarios(idusuario) NOT NULL,
    idcliente INTEGER REFERENCES clientes(idcliente) ON DELETE SET NULL, -- Cliente opcional
    idbodega INTEGER REFERENCES bodegas(idbodega) ON DELETE SET NULL, -- Bodega donde se realizó la venta
    descripcion TEXT,
    sub_total DECIMAL(10,2) NOT NULL CHECK (sub_total >= 0),
    descuento DECIMAL(10,2) DEFAULT 0 CHECK (descuento >= 0),
    total DECIMAL(10,2) NOT NULL CHECK (total >= 0),
    metodo_pago VARCHAR(20) CHECK (metodo_pago IN ('Efectivo', 'QR')),
    descripcion_descuento TEXT
);

CREATE TABLE detalle_ventas (
    iddetalle_venta SERIAL PRIMARY KEY,
    idventa INTEGER REFERENCES ventas(idventa) ON DELETE CASCADE,
    idproducto INTEGER REFERENCES productos(idproducto) NOT NULL,
    cantidad INTEGER NOT NULL CHECK (cantidad > 0),
    precio_unitario DECIMAL(10,2) NOT NULL CHECK (precio_unitario >= 0),
    subtotal_linea DECIMAL(10,2) NOT NULL CHECK (subtotal_linea >= 0)
);

-- Tablas de caja
CREATE TABLE estado_caja (
    idestado_caja SERIAL PRIMARY KEY,
    estado VARCHAR(20) CHECK (estado IN ('abierta', 'cerrada')),
    monto_inicial DECIMAL(15, 2) DEFAULT 0,
    monto_final DECIMAL(15, 2) DEFAULT 0,
    idusuario INTEGER REFERENCES usuarios(idusuario) NOT NULL,
    idbodega INTEGER REFERENCES bodegas(idbodega) ON DELETE SET NULL -- Caja asociada a una bodega/sucursal
);

CREATE TABLE transacciones_caja (
    idtransaccion SERIAL PRIMARY KEY,
    idestado_caja INTEGER REFERENCES estado_caja(idestado_caja),
    tipo_movimiento VARCHAR(20) CHECK (tipo_movimiento IN ('Apertura', 'Ingreso', 'Egreso', 'Cierre')),
    descripcion TEXT,
    monto DECIMAL(15, 2) NOT NULL,
    fecha TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    idusuario INTEGER REFERENCES usuarios(idusuario) NOT NULL,
    idventa INTEGER REFERENCES ventas(idventa) NULL,
    idbodega INTEGER REFERENCES bodegas(idbodega) ON DELETE SET NULL -- Transacción asociada a una bodega
);

-- Tablas de cotizaciones (modificada)
CREATE TABLE cotizaciones (
    idcotizacion SERIAL PRIMARY KEY,
    vigencia TEXT,
    cliente_nombre VARCHAR(200) NOT NULL,
    cliente_telefono VARCHAR(20),
    cliente_direccion TEXT,
    tipo_pago VARCHAR(30) CHECK (tipo_pago IN ('Pago por Adelantado', 'Mitad de Pago')),
    sub_total DECIMAL(10,2) NOT NULL CHECK (sub_total >= 0),
    descuento DECIMAL(10,2) DEFAULT 0 CHECK (descuento >= 0),
    total DECIMAL(10,2) NOT NULL CHECK (total >= 0),
    abono DECIMAL(10,2) DEFAULT 0 CHECK (abono >= 0),
    saldo DECIMAL(10,2) DEFAULT 0 CHECK (saldo >= 0),
    estado SMALLINT DEFAULT 0 CHECK (estado IN (0, 1)),
    idusuario INTEGER REFERENCES usuarios(idusuario) NOT NULL,
    idcliente INTEGER REFERENCES clientes(idcliente) ON DELETE SET NULL, -- Cliente opcional
    idbodega INTEGER REFERENCES bodegas(idbodega) ON DELETE SET NULL, -- Bodega donde se realizó la cotización
    fecha_creacion TIMESTAMP DEFAULT TIMEZONE('America/La_Paz', NOW())
);

CREATE TABLE detalle_cotizaciones (
    iddetalle_cotizacion SERIAL PRIMARY KEY,
    idcotizacion INTEGER REFERENCES cotizaciones(idcotizacion) ON DELETE CASCADE,
    idproducto INTEGER REFERENCES productos(idproducto) NOT NULL,
    cantidad INTEGER NOT NULL CHECK (cantidad > 0),
    precio_unitario DECIMAL(10,2) NOT NULL CHECK (precio_unitario >= 0),
    subtotal_linea DECIMAL(10,2) NOT NULL CHECK (subtotal_linea >= 0)
);

CREATE TABLE productos_pendientes_cotizacion (
    idproducto_pendiente SERIAL PRIMARY KEY,
    idcotizacion INTEGER REFERENCES cotizaciones(idcotizacion) ON DELETE CASCADE,
    idproducto INTEGER REFERENCES productos(idproducto) NOT NULL,
    cantidad_pendiente INTEGER NOT NULL CHECK (cantidad_pendiente >= 0)
);

-- Tablas de objetivos y carruseles
CREATE TABLE objetivos (
    idobjetivo SERIAL PRIMARY KEY,
    mes INTEGER NOT NULL CHECK (mes >= 1 AND mes <= 12),
    año INTEGER NOT NULL CHECK (año >= 2020),
    monto DECIMAL(10,2) NOT NULL CHECK (monto > 0),
    idbodega INTEGER REFERENCES bodegas(idbodega) ON DELETE CASCADE, -- Objetivo por bodega/sucursal
    UNIQUE(mes, año, idbodega)
);

CREATE TABLE carruseles (
    idcarrusel SERIAL PRIMARY KEY,
    nombre VARCHAR(200) NOT NULL,
    estado SMALLINT DEFAULT 0 CHECK (estado IN (0, 1, 2)) -- 0 activo, 1 inactivo, 2 eliminado
);

CREATE TABLE carrusel_productos (
    idcarrusel_producto SERIAL PRIMARY KEY,
    idcarrusel INTEGER REFERENCES carruseles(idcarrusel) ON DELETE CASCADE,
    idproducto INTEGER REFERENCES productos(idproducto) ON DELETE CASCADE,
    UNIQUE(idcarrusel, idproducto)
);

-- Tabla de notas
CREATE TABLE notas (
    idnota SERIAL PRIMARY KEY,
    titulo VARCHAR(200) NOT NULL,
    contenido TEXT NOT NULL,
    fecha DATE NOT NULL DEFAULT CURRENT_DATE
);

CREATE TABLE productos_similares (
    idproducto INTEGER REFERENCES productos(idproducto) ON DELETE CASCADE,
    idproducto_similar INTEGER REFERENCES productos(idproducto) ON DELETE CASCADE,
    PRIMARY KEY (idproducto, idproducto_similar),
    CHECK (idproducto != idproducto_similar)
);

-- ============================================
-- NUEVAS TABLAS
-- ============================================

-- Tabla Bodega/Sucursal
CREATE TABLE bodegas (
    idbodega SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('Principal', 'Sucursal')),
    direccion TEXT,
    telefono VARCHAR(20),
    estado SMALLINT DEFAULT 0 CHECK (estado IN (0, 1)) -- 0: Activo, 1: Inactivo
);

-- Tabla Clientes
CREATE TABLE clientes (
    idcliente SERIAL PRIMARY KEY,
    nombres VARCHAR(100) NOT NULL,
    apellidos VARCHAR(100) NOT NULL,
    carnet VARCHAR(20) UNIQUE NOT NULL,
    celular VARCHAR(20),
    nota TEXT,
    estado SMALLINT DEFAULT 0 CHECK (estado IN (0, 1)) -- 0: Activo, 1: Inactivo
);

-- ============================================
-- ÍNDICES MEJORADOS
-- ============================================

CREATE INDEX idx_ventas_fecha ON ventas(fecha_hora);
CREATE INDEX idx_ventas_usuario ON ventas(idusuario);
CREATE INDEX idx_ventas_cliente ON ventas(idcliente);
CREATE INDEX idx_ventas_bodega ON ventas(idbodega);
CREATE INDEX idx_transacciones_caja_fecha ON transacciones_caja(fecha);
CREATE INDEX idx_transacciones_caja_usuario ON transacciones_caja(idusuario);
CREATE INDEX idx_transacciones_caja_bodega ON transacciones_caja(idbodega);
CREATE INDEX idx_detalle_ventas_venta ON detalle_ventas(idventa);
CREATE INDEX idx_detalle_cotizaciones_cotizacion ON detalle_cotizaciones(idcotizacion);
CREATE INDEX idx_productos_codigo_barras ON productos(codigo_barras);
CREATE INDEX idx_productos_similares_producto ON productos_similares(idproducto);
CREATE INDEX idx_productos_similares_similar ON productos_similares(idproducto_similar);
CREATE INDEX idx_productos_bodega ON productos(idbodega);
CREATE INDEX idx_ubicaciones_bodega ON ubicaciones(idbodega);
CREATE INDEX idx_clientes_carnet ON clientes(carnet);
CREATE INDEX idx_cotizaciones_cliente ON cotizaciones(idcliente);
CREATE INDEX idx_cotizaciones_bodega ON cotizaciones(idbodega);
CREATE INDEX idx_usuarios_bodega ON usuarios(idbodega);
CREATE INDEX idx_estado_caja_bodega ON estado_caja(idbodega);