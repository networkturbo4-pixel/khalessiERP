-- MariaDB dump 10.19  Distrib 10.4.32-MariaDB, for Win64 (AMD64)
--
-- Host: localhost    Database: khalessi_erp
-- ------------------------------------------------------
-- Server version	10.4.32-MariaDB

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `categorias`
--

DROP TABLE IF EXISTS `categorias`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `categorias` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `nombre` varchar(50) NOT NULL,
  `descripcion` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `nombre` (`nombre`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `categorias`
--

LOCK TABLES `categorias` WRITE;
/*!40000 ALTER TABLE `categorias` DISABLE KEYS */;
INSERT INTO `categorias` VALUES (1,'Pizzas',NULL),(2,'Bebidas',NULL),(3,'Extras',NULL);
/*!40000 ALTER TABLE `categorias` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `clientes`
--

DROP TABLE IF EXISTS `clientes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `clientes` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) NOT NULL,
  `telefono` varchar(20) DEFAULT NULL,
  `direccion` varchar(255) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `fecha_registro` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `clientes`
--

LOCK TABLES `clientes` WRITE;
/*!40000 ALTER TABLE `clientes` DISABLE KEYS */;
/*!40000 ALTER TABLE `clientes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `configuracion`
--

DROP TABLE IF EXISTS `configuracion`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `configuracion` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `clave` varchar(50) NOT NULL,
  `valor` text NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `clave` (`clave`)
) ENGINE=InnoDB AUTO_INCREMENT=366 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `configuracion`
--

LOCK TABLES `configuracion` WRITE;
/*!40000 ALTER TABLE `configuracion` DISABLE KEYS */;
INSERT INTO `configuracion` VALUES (1,'nombre_empresa','Pizza Khalessi ERP'),(2,'moneda','PEN'),(3,'impuesto_iva','18'),(5,'razon_social','Pizza Khalessi EIRL'),(6,'ruc','25698556333001'),(7,'whatsapp','987546321'),(8,'direccion',''),(9,'locales','[{\"nombre\":\"Local de Prueba\",\"direccion\":\"sdgfsdgsgd\",\"coords\":\"-11.851165627636503, -77.0703288378511\",\"desc\":\"\"},{\"nombre\":\"Local de prueba 0002\",\"direccion\":\"afasvzxcvbxcbxbc\",\"coords\":\"-11.837677478924034, -77.04683011773298\",\"desc\":\"\"}]'),(36,'font_family','\'Inter\', sans-serif'),(37,'font_size','12px'),(38,'color_primary','#f00000'),(39,'btn_bg_light','#f00000'),(40,'btn_text_light','#ffffff'),(41,'btn_bg_dark','#ffbb00'),(42,'btn_text_dark','#000000'),(43,'text_light','#212121'),(44,'text_dark','#f8fafc'),(62,'logo_favicon','/khalessierp/uploads/logos/logo_favicon_1783786037.jpg'),(131,'remove_logo_light','0'),(132,'remove_logo_dark','0'),(133,'remove_logo_collapsed','0'),(134,'remove_logo_favicon','0'),(135,'logo_light','/khalessierp/uploads/logos/logo_light_1783786037.png'),(136,'logo_dark','/khalessierp/uploads/logos/logo_dark_1783786037.png'),(137,'logo_collapsed','/khalessierp/uploads/logos/logo_collapsed_1783786037.png'),(318,'api_whatsapp','ee54e3a5-44ee-4dc7-ad4e-218e0c8dea8a'),(319,'api_rucdni','367547a06a4fb21bb098bb60d550dab46a96353276acc31c0ded5d45de3a'),(320,'api_email',''),(344,'api_sms',''),(345,'smtp_host',''),(346,'smtp_port',''),(347,'smtp_crypto','tls'),(348,'smtp_user',''),(349,'smtp_pass',''),(363,'rrhh_tolerancia_tardanza_minutos','15'),(364,'rrhh_totp_supervisor_secret','TNY4C3V3E63H6OH5');
/*!40000 ALTER TABLE `configuracion` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ingredientes`
--

DROP TABLE IF EXISTS `ingredientes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ingredientes` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) NOT NULL,
  `unidad_medida` varchar(20) NOT NULL,
  `unidad_compra` varchar(20) DEFAULT NULL,
  `equivalencia_compra` decimal(10,4) DEFAULT 1.0000,
  `costo_estimado` decimal(10,2) DEFAULT 0.00,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ingredientes`
--

LOCK TABLES `ingredientes` WRITE;
/*!40000 ALTER TABLE `ingredientes` DISABLE KEYS */;
/*!40000 ALTER TABLE `ingredientes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ingredientes_sustitutos`
--

DROP TABLE IF EXISTS `ingredientes_sustitutos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ingredientes_sustitutos` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `id_ingrediente_principal` int(11) NOT NULL,
  `id_ingrediente_sustituto` int(11) NOT NULL,
  `ratio_conversion` decimal(10,4) DEFAULT 1.0000,
  `notas` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `id_ingrediente_principal` (`id_ingrediente_principal`),
  KEY `id_ingrediente_sustituto` (`id_ingrediente_sustituto`),
  CONSTRAINT `ingredientes_sustitutos_ibfk_1` FOREIGN KEY (`id_ingrediente_principal`) REFERENCES `ingredientes` (`id`) ON DELETE CASCADE,
  CONSTRAINT `ingredientes_sustitutos_ibfk_2` FOREIGN KEY (`id_ingrediente_sustituto`) REFERENCES `ingredientes` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ingredientes_sustitutos`
--

LOCK TABLES `ingredientes_sustitutos` WRITE;
/*!40000 ALTER TABLE `ingredientes_sustitutos` DISABLE KEYS */;
/*!40000 ALTER TABLE `ingredientes_sustitutos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `locales`
--

DROP TABLE IF EXISTS `locales`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `locales` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) NOT NULL,
  `ciudad` varchar(100) DEFAULT NULL,
  `estado` enum('activo','inactivo') DEFAULT 'activo',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `locales`
--

LOCK TABLES `locales` WRITE;
/*!40000 ALTER TABLE `locales` DISABLE KEYS */;
INSERT INTO `locales` VALUES (1,'Local Centro','Ciudad Base','activo');
/*!40000 ALTER TABLE `locales` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `lotes_ingredientes`
--

DROP TABLE IF EXISTS `lotes_ingredientes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `lotes_ingredientes` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `id_ingrediente` int(11) NOT NULL,
  `id_local` int(11) NOT NULL,
  `lote` varchar(50) NOT NULL,
  `cantidad_inicial` decimal(10,4) NOT NULL,
  `cantidad_restante` decimal(10,4) NOT NULL,
  `fecha_caducidad` date NOT NULL,
  `fecha_ingreso` date DEFAULT curdate(),
  PRIMARY KEY (`id`),
  KEY `id_ingrediente` (`id_ingrediente`),
  KEY `id_local` (`id_local`),
  CONSTRAINT `lotes_ingredientes_ibfk_1` FOREIGN KEY (`id_ingrediente`) REFERENCES `ingredientes` (`id`) ON DELETE CASCADE,
  CONSTRAINT `lotes_ingredientes_ibfk_2` FOREIGN KEY (`id_local`) REFERENCES `locales` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `lotes_ingredientes`
--

LOCK TABLES `lotes_ingredientes` WRITE;
/*!40000 ALTER TABLE `lotes_ingredientes` DISABLE KEYS */;
/*!40000 ALTER TABLE `lotes_ingredientes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `movimientos_inventario`
--

DROP TABLE IF EXISTS `movimientos_inventario`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `movimientos_inventario` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `id_local` int(11) NOT NULL,
  `id_ingrediente` int(11) DEFAULT NULL,
  `id_producto` int(11) DEFAULT NULL,
  `tipo_movimiento` enum('compra','produccion','venta','merma','transferencia','ajuste') NOT NULL,
  `cantidad` decimal(10,4) NOT NULL,
  `costo_unitario` decimal(10,2) DEFAULT NULL,
  `fecha` timestamp NOT NULL DEFAULT current_timestamp(),
  `lote` varchar(50) DEFAULT NULL,
  `fecha_caducidad` date DEFAULT NULL,
  `documento_referencia` varchar(50) DEFAULT NULL,
  `observaciones` text DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `id_local` (`id_local`),
  KEY `id_ingrediente` (`id_ingrediente`),
  KEY `id_producto` (`id_producto`),
  CONSTRAINT `movimientos_inventario_ibfk_1` FOREIGN KEY (`id_local`) REFERENCES `locales` (`id`) ON DELETE CASCADE,
  CONSTRAINT `movimientos_inventario_ibfk_2` FOREIGN KEY (`id_ingrediente`) REFERENCES `ingredientes` (`id`) ON DELETE CASCADE,
  CONSTRAINT `movimientos_inventario_ibfk_3` FOREIGN KEY (`id_producto`) REFERENCES `productos` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `movimientos_inventario`
--

LOCK TABLES `movimientos_inventario` WRITE;
/*!40000 ALTER TABLE `movimientos_inventario` DISABLE KEYS */;
/*!40000 ALTER TABLE `movimientos_inventario` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `parametros_inventario_local`
--

DROP TABLE IF EXISTS `parametros_inventario_local`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `parametros_inventario_local` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `id_local` int(11) NOT NULL,
  `id_ingrediente` int(11) NOT NULL,
  `stock_minimo` decimal(10,4) DEFAULT 0.0000,
  `stock_maximo` decimal(10,4) DEFAULT 0.0000,
  `punto_pedido` decimal(10,4) DEFAULT 0.0000,
  `dias_cobertura` int(11) DEFAULT 3,
  `proveedor_preferido` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_param_local_ing` (`id_local`,`id_ingrediente`),
  KEY `id_ingrediente` (`id_ingrediente`),
  CONSTRAINT `parametros_inventario_local_ibfk_1` FOREIGN KEY (`id_local`) REFERENCES `locales` (`id`) ON DELETE CASCADE,
  CONSTRAINT `parametros_inventario_local_ibfk_2` FOREIGN KEY (`id_ingrediente`) REFERENCES `ingredientes` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `parametros_inventario_local`
--

LOCK TABLES `parametros_inventario_local` WRITE;
/*!40000 ALTER TABLE `parametros_inventario_local` DISABLE KEYS */;
/*!40000 ALTER TABLE `parametros_inventario_local` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `permisos_roles`
--

DROP TABLE IF EXISTS `permisos_roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `permisos_roles` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `id_rol` int(11) NOT NULL,
  `modulo` varchar(50) NOT NULL,
  `puede_ver` tinyint(1) DEFAULT 0,
  `puede_editar` tinyint(1) DEFAULT 0,
  `puede_eliminar` tinyint(1) DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_rol_modulo` (`id_rol`,`modulo`),
  CONSTRAINT `permisos_roles_ibfk_1` FOREIGN KEY (`id_rol`) REFERENCES `roles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=31 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `permisos_roles`
--

LOCK TABLES `permisos_roles` WRITE;
/*!40000 ALTER TABLE `permisos_roles` DISABLE KEYS */;
INSERT INTO `permisos_roles` VALUES (1,1,'dashboard',1,1,1),(2,1,'inventario',1,1,1),(3,1,'clientes',1,1,1),(4,1,'usuarios',1,1,1),(5,1,'configuracion',1,1,1),(6,7,'dashboard',1,1,1),(7,7,'inventario',1,1,1),(8,7,'clientes',1,1,1),(9,7,'usuarios',1,1,1),(10,7,'configuracion',1,1,1),(21,3,'dashboard',1,0,0),(22,3,'inventario',1,0,0),(23,3,'clientes',0,0,0),(24,3,'usuarios',0,0,0),(25,3,'configuracion',0,0,0),(26,13,'dashboard',1,1,0),(27,13,'inventario',1,1,0),(28,13,'clientes',0,0,0),(29,13,'usuarios',0,0,0),(30,13,'configuracion',0,0,0);
/*!40000 ALTER TABLE `permisos_roles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `precios_insumos_local`
--

DROP TABLE IF EXISTS `precios_insumos_local`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `precios_insumos_local` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `id_local` int(11) NOT NULL,
  `id_ingrediente` int(11) NOT NULL,
  `precio_compra` decimal(10,2) NOT NULL,
  `fecha_actualizacion` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_local_ingrediente` (`id_local`,`id_ingrediente`),
  KEY `id_ingrediente` (`id_ingrediente`),
  CONSTRAINT `precios_insumos_local_ibfk_1` FOREIGN KEY (`id_local`) REFERENCES `locales` (`id`) ON DELETE CASCADE,
  CONSTRAINT `precios_insumos_local_ibfk_2` FOREIGN KEY (`id_ingrediente`) REFERENCES `ingredientes` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `precios_insumos_local`
--

LOCK TABLES `precios_insumos_local` WRITE;
/*!40000 ALTER TABLE `precios_insumos_local` DISABLE KEYS */;
/*!40000 ALTER TABLE `precios_insumos_local` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `productos`
--

DROP TABLE IF EXISTS `productos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `productos` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `id_categoria` int(11) NOT NULL,
  `codigo_sku` varchar(50) DEFAULT NULL,
  `nombre` varchar(100) NOT NULL,
  `descripcion` text DEFAULT NULL,
  `precio_venta` decimal(10,2) NOT NULL,
  `stock_actual` decimal(10,2) DEFAULT 0.00,
  `stock_minimo` decimal(10,2) DEFAULT 0.00,
  `imagen_url` varchar(255) DEFAULT NULL,
  `estado` enum('disponible','agotado','inactivo') DEFAULT 'disponible',
  `id_receta` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `codigo_sku` (`codigo_sku`),
  KEY `id_categoria` (`id_categoria`),
  KEY `id_receta` (`id_receta`),
  CONSTRAINT `productos_ibfk_1` FOREIGN KEY (`id_categoria`) REFERENCES `categorias` (`id`),
  CONSTRAINT `productos_ibfk_2` FOREIGN KEY (`id_receta`) REFERENCES `recetas` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `productos`
--

LOCK TABLES `productos` WRITE;
/*!40000 ALTER TABLE `productos` DISABLE KEYS */;
/*!40000 ALTER TABLE `productos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `receta_detalle`
--

DROP TABLE IF EXISTS `receta_detalle`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `receta_detalle` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `id_receta` int(11) NOT NULL,
  `id_ingrediente` int(11) NOT NULL,
  `cantidad_base` decimal(10,4) NOT NULL,
  `peso_porcion` decimal(10,4) DEFAULT NULL,
  `orden_preparacion` int(11) DEFAULT 1,
  `notas` text DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `id_receta` (`id_receta`),
  KEY `id_ingrediente` (`id_ingrediente`),
  CONSTRAINT `receta_detalle_ibfk_1` FOREIGN KEY (`id_receta`) REFERENCES `recetas` (`id`) ON DELETE CASCADE,
  CONSTRAINT `receta_detalle_ibfk_2` FOREIGN KEY (`id_ingrediente`) REFERENCES `ingredientes` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `receta_detalle`
--

LOCK TABLES `receta_detalle` WRITE;
/*!40000 ALTER TABLE `receta_detalle` DISABLE KEYS */;
/*!40000 ALTER TABLE `receta_detalle` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `receta_local`
--

DROP TABLE IF EXISTS `receta_local`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `receta_local` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `id_receta` int(11) NOT NULL,
  `id_local` int(11) NOT NULL,
  `factor_ajuste` decimal(10,4) DEFAULT 1.0000,
  `temp_agua_c` decimal(5,2) DEFAULT NULL,
  `horas_fermentacion` decimal(5,2) DEFAULT NULL,
  `costo_mano_obra_extra` decimal(10,2) DEFAULT 0.00,
  `rendimiento_real` decimal(10,4) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_receta_local` (`id_receta`,`id_local`),
  KEY `id_local` (`id_local`),
  CONSTRAINT `receta_local_ibfk_1` FOREIGN KEY (`id_receta`) REFERENCES `recetas` (`id`) ON DELETE CASCADE,
  CONSTRAINT `receta_local_ibfk_2` FOREIGN KEY (`id_local`) REFERENCES `locales` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `receta_local`
--

LOCK TABLES `receta_local` WRITE;
/*!40000 ALTER TABLE `receta_local` DISABLE KEYS */;
/*!40000 ALTER TABLE `receta_local` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `recetas`
--

DROP TABLE IF EXISTS `recetas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `recetas` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) NOT NULL,
  `tipo` enum('base','producto_final') NOT NULL,
  `descripcion` text DEFAULT NULL,
  `rendimiento_esperado` varchar(100) DEFAULT NULL,
  `horas_fermentacion_base` decimal(5,2) DEFAULT NULL,
  `temp_agua_c_base` decimal(5,2) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `recetas`
--

LOCK TABLES `recetas` WRITE;
/*!40000 ALTER TABLE `recetas` DISABLE KEYS */;
/*!40000 ALTER TABLE `recetas` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `registro_mermas`
--

DROP TABLE IF EXISTS `registro_mermas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `registro_mermas` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `id_local` int(11) NOT NULL,
  `id_receta` int(11) NOT NULL,
  `id_usuario` int(11) NOT NULL,
  `fecha` date NOT NULL,
  `cantidad_teorica` decimal(10,4) NOT NULL,
  `cantidad_real` decimal(10,4) NOT NULL,
  `merma_calculada` decimal(10,4) GENERATED ALWAYS AS (`cantidad_teorica` - `cantidad_real`) STORED,
  `porcentaje_merma` decimal(5,2) GENERATED ALWAYS AS ((`cantidad_teorica` - `cantidad_real`) / `cantidad_teorica` * 100) STORED,
  `observaciones` text DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `id_local` (`id_local`),
  KEY `id_receta` (`id_receta`),
  KEY `id_usuario` (`id_usuario`),
  CONSTRAINT `registro_mermas_ibfk_1` FOREIGN KEY (`id_local`) REFERENCES `locales` (`id`),
  CONSTRAINT `registro_mermas_ibfk_2` FOREIGN KEY (`id_receta`) REFERENCES `recetas` (`id`),
  CONSTRAINT `registro_mermas_ibfk_3` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `registro_mermas`
--

LOCK TABLES `registro_mermas` WRITE;
/*!40000 ALTER TABLE `registro_mermas` DISABLE KEYS */;
/*!40000 ALTER TABLE `registro_mermas` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `roles`
--

DROP TABLE IF EXISTS `roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `roles` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `nombre` varchar(50) NOT NULL,
  `descripcion` varchar(255) DEFAULT NULL,
  `hora_entrada` time DEFAULT NULL,
  `hora_salida` time DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `nombre` (`nombre`)
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `roles`
--

LOCK TABLES `roles` WRITE;
/*!40000 ALTER TABLE `roles` DISABLE KEYS */;
INSERT INTO `roles` VALUES (1,'Administrador','Acceso total al sistema','09:00:00','23:00:00'),(2,'Cajero','Acceso al módulo de Punto de Venta (POS) y Clientes','09:00:00','18:00:00'),(3,'Cocinero','Acceso al monitor de pedidos y órdenes en preparación','09:00:00','18:00:00'),(7,'Desarrollador','Supervisa todos los modulos para el buen desarrollo del sistema','09:00:00','23:00:00'),(13,'Asistente','','09:00:00','18:00:00');
/*!40000 ALTER TABLE `roles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `rrhh_asistencias`
--

DROP TABLE IF EXISTS `rrhh_asistencias`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `rrhh_asistencias` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `id_usuario` int(11) NOT NULL,
  `fecha_hora_entrada` timestamp NULL DEFAULT NULL,
  `foto_entrada_url` varchar(255) DEFAULT NULL,
  `fecha_hora_salida` timestamp NULL DEFAULT NULL,
  `metodo_salida` enum('manual','automatico') DEFAULT NULL,
  `estado` enum('abierto','cerrado') DEFAULT 'abierto',
  `condicion` varchar(50) DEFAULT 'puntual',
  `minutos_tardanza` int(11) DEFAULT 0,
  `autorizado_por_totp` tinyint(1) DEFAULT 0,
  `horas_extra` decimal(5,2) DEFAULT 0.00,
  `horas_perdidas` decimal(5,2) DEFAULT 0.00,
  `id_justificacion` int(11) DEFAULT NULL,
  `latitud` varchar(50) DEFAULT NULL,
  `longitud` varchar(50) DEFAULT NULL,
  `observaciones` text DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_asist_fecha_hora` (`fecha_hora_entrada`),
  KEY `idx_asist_user_fecha` (`id_usuario`,`fecha_hora_entrada`),
  KEY `idx_asist_estado` (`estado`),
  KEY `idx_asist_condicion` (`condicion`),
  CONSTRAINT `rrhh_asistencias_ibfk_1` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=19 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `rrhh_asistencias`
--

LOCK TABLES `rrhh_asistencias` WRITE;
/*!40000 ALTER TABLE `rrhh_asistencias` DISABLE KEYS */;
INSERT INTO `rrhh_asistencias` VALUES (1,3,'2026-07-11 19:34:20','/khalessierp/uploads/asistencia/entrada_3_1783798460.jpeg','2026-07-11 19:56:47','manual','cerrado','puntual',0,0,0.00,0.00,NULL,NULL,NULL,NULL),(2,3,'2026-07-11 19:57:56','/khalessierp/uploads/asistencia/entrada_3_1783799876.jpeg','2026-07-11 23:45:44','manual','cerrado','puntual',0,0,0.00,0.00,NULL,NULL,NULL,NULL),(3,3,'2026-07-11 23:45:56','/khalessierp/uploads/asistencia/entrada_3_1783813556.jpeg','2026-07-12 04:30:00','automatico','cerrado','puntual',0,0,0.00,0.00,NULL,'-11.85','-77.06',NULL),(4,4,'2026-07-11 23:49:19','/khalessierp/uploads/asistencia/entrada_4_1783813759.jpeg','2026-07-12 00:13:18','manual','cerrado','puntual',0,0,0.00,0.00,NULL,'-11.85','-77.06',NULL),(5,1,'2026-07-12 00:06:42','/khalessierp/uploads/asistencia/entrada_1_1783814802.jpeg','2026-07-12 04:30:00','automatico','cerrado','puntual',0,0,0.00,0.00,NULL,'-11.85','-77.06',NULL),(6,3,'2026-07-12 04:47:53','/khalessierp/uploads/asistencia/entrada_3_1783831673.jpeg','2026-07-12 04:30:00','automatico','cerrado','puntual',0,0,0.00,0.00,NULL,'-11.85','-77.06',NULL),(7,3,'2026-07-15 06:45:53','/khalessierp/uploads/asistencia/entrada_3_1784097953.jpeg','2026-07-15 06:48:07','manual','cerrado','puntual',0,0,0.00,0.00,NULL,'-11.85','-77.06',NULL),(8,1,'2026-07-15 06:48:22','/khalessierp/uploads/asistencia/entrada_1_1784098102.jpeg','2026-07-16 04:30:00','automatico','cerrado','puntual',0,0,0.00,0.00,NULL,'-11.85','-77.06',NULL),(9,3,'2026-07-20 15:40:43','/khalessierp/uploads/asistencia/entrada_3_1784562043.jpeg','2026-07-21 04:30:00','automatico','cerrado','tardanza',0,0,0.00,0.00,NULL,'-11.85','-77.06',NULL),(10,3,'2026-07-24 21:32:36','/khalessierp/uploads/asistencia/entrada_3_1784928756.jpeg','2026-07-25 04:30:00','automatico','cerrado','tardanza',0,0,0.00,0.00,NULL,'-11.85','-77.06',NULL),(11,3,'2026-08-13 17:25:16','/khalessierp/uploads/asistencia/entrada_3_1786641916.jpeg','2026-08-14 04:30:00','automatico','cerrado','tardanza',0,0,0.00,0.00,NULL,'-11.85','-77.06',NULL),(12,3,'2026-08-14 05:32:59','/khalessierp/uploads/asistencia/entrada_3_1786685579.jpeg','2026-08-15 04:30:00','automatico','cerrado','puntual',0,0,0.00,0.00,NULL,'-11.85','-77.06',NULL),(13,3,'2026-09-02 03:33:13','/khalessierp/uploads/asistencia/entrada_3_1788319993.jpeg','2026-09-02 04:30:00','automatico','cerrado','puntual',0,0,0.00,0.00,NULL,'-11.85','-77.06',NULL),(14,3,'2026-09-10 01:24:29','/khalessierp/uploads/asistencia/entrada_3_1789003469.jpeg','2026-09-09 23:30:00','automatico','cerrado','puntual',0,0,0.00,0.00,NULL,'-11.8707','-77.0619',NULL),(15,1,'2026-09-10 01:50:08','/khalessierp/uploads/asistencia/entrada_1_1789005008.jpeg','2026-09-10 04:30:00','automatico','cerrado','puntual',0,0,0.00,0.00,NULL,'-11.8707','-77.0619',NULL),(16,4,'2026-09-09 14:00:00',NULL,'2026-09-09 23:00:00','manual','cerrado','falta_justificada',0,0,0.00,0.00,1,NULL,NULL,'Justificación resuelta: Aprobado por descanso médico verificado | Justificación: Aprobado por descanso médico verificado | Justificación: Aprobado por descanso médico verificado | Justificación: Aprobado por descanso médico verificado'),(17,4,'2026-09-10 01:55:22','/khalessierp/uploads/asistencia/entrada_4_1789005322.jpeg','2026-09-09 23:30:00','automatico','cerrado','puntual',0,0,0.00,0.00,NULL,'-11.8707','-77.0619',NULL),(18,3,'2026-09-10 04:30:28','uploads/asistencia/entrada_3_1789014628.jpeg','2026-09-09 23:30:00','automatico','cerrado','puntual',0,0,0.00,0.00,NULL,'-11.8707','-77.0619',NULL);
/*!40000 ALTER TABLE `rrhh_asistencias` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `rrhh_justificaciones`
--

DROP TABLE IF EXISTS `rrhh_justificaciones`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `rrhh_justificaciones` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `id_usuario` int(11) NOT NULL,
  `fecha` date NOT NULL,
  `motivo` varchar(100) NOT NULL,
  `descripcion` text NOT NULL,
  `foto_evidencia_url` varchar(255) DEFAULT NULL,
  `estado` enum('pendiente','aprobado','desaprobado') DEFAULT 'pendiente',
  `tipo_resolucion` enum('con_goce','sin_goce','tiempo_extra','tiempo_perdido') DEFAULT 'sin_goce',
  `horas_afectadas` decimal(5,2) DEFAULT 0.00,
  `id_admin_resolucion` int(11) DEFAULT NULL,
  `comentarios_resolucion` text DEFAULT NULL,
  `fecha_resolucion` timestamp NULL DEFAULT NULL,
  `fecha_creacion` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_just_usuario` (`id_usuario`),
  KEY `idx_just_fecha` (`fecha`),
  KEY `idx_just_estado` (`estado`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `rrhh_justificaciones`
--

LOCK TABLES `rrhh_justificaciones` WRITE;
/*!40000 ALTER TABLE `rrhh_justificaciones` DISABLE KEYS */;
INSERT INTO `rrhh_justificaciones` VALUES (1,4,'2026-09-09','Emergencia Familiar','xgdsfg','/khalessierp/uploads/justificaciones/just_4_1789005061.jpeg','aprobado','con_goce',0.00,1,'Aprobado por descanso médico verificado','2026-09-10 02:45:47','2026-09-10 01:51:01');
/*!40000 ALTER TABLE `rrhh_justificaciones` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sistema_migraciones`
--

DROP TABLE IF EXISTS `sistema_migraciones`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `sistema_migraciones` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `version` varchar(100) NOT NULL,
  `nombre` varchar(255) NOT NULL,
  `descripcion` varchar(255) DEFAULT NULL,
  `ejecutado_en` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `version` (`version`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sistema_migraciones`
--

LOCK TABLES `sistema_migraciones` WRITE;
/*!40000 ALTER TABLE `sistema_migraciones` DISABLE KEYS */;
INSERT INTO `sistema_migraciones` VALUES (1,'001_asistencias_2fa_justificaciones_sueldos','Asistencias 2FA, Justificaciones y Sueldos de Personal','Crea tabla de justificaciones, añade soporte Google Authenticator 2FA para tardanzas, campos de remuneración y métricas de nómina.','2026-09-10 01:38:36'),(2,'002_usuarios_cargo_contratacion','Campos de Cargo, Fecha de Contratación y Horarios en Usuarios','Añade cargo y fecha_contratacion a la tabla usuarios para gestión directa de contratos y fichas laborales desde Configuración de Usuarios.','2026-09-10 03:31:17');
/*!40000 ALTER TABLE `sistema_migraciones` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `stock_local`
--

DROP TABLE IF EXISTS `stock_local`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `stock_local` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `id_local` int(11) NOT NULL,
  `id_ingrediente` int(11) DEFAULT NULL,
  `id_producto` int(11) DEFAULT NULL,
  `cantidad_disponible` decimal(10,4) DEFAULT 0.0000,
  `cantidad_reservada` decimal(10,4) DEFAULT 0.0000,
  `stock_minimo` decimal(10,4) DEFAULT 0.0000,
  `ultima_actualizacion` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_local_ingrediente` (`id_local`,`id_ingrediente`),
  UNIQUE KEY `unique_local_producto` (`id_local`,`id_producto`),
  KEY `id_ingrediente` (`id_ingrediente`),
  KEY `id_producto` (`id_producto`),
  CONSTRAINT `stock_local_ibfk_1` FOREIGN KEY (`id_local`) REFERENCES `locales` (`id`) ON DELETE CASCADE,
  CONSTRAINT `stock_local_ibfk_2` FOREIGN KEY (`id_ingrediente`) REFERENCES `ingredientes` (`id`) ON DELETE CASCADE,
  CONSTRAINT `stock_local_ibfk_3` FOREIGN KEY (`id_producto`) REFERENCES `productos` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `stock_local`
--

LOCK TABLES `stock_local` WRITE;
/*!40000 ALTER TABLE `stock_local` DISABLE KEYS */;
/*!40000 ALTER TABLE `stock_local` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `transferencias_inventario`
--

DROP TABLE IF EXISTS `transferencias_inventario`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `transferencias_inventario` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `id_local_origen` int(11) NOT NULL,
  `id_local_destino` int(11) NOT NULL,
  `id_ingrediente` int(11) DEFAULT NULL,
  `id_producto` int(11) DEFAULT NULL,
  `cantidad` decimal(10,4) NOT NULL,
  `estado` enum('solicitado','en_transito','recibido','cancelado') DEFAULT 'solicitado',
  `fecha_solicitud` timestamp NOT NULL DEFAULT current_timestamp(),
  `fecha_envio` timestamp NULL DEFAULT NULL,
  `fecha_recepcion` timestamp NULL DEFAULT NULL,
  `id_usuario_solicita` int(11) NOT NULL,
  `id_usuario_recibe` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `id_local_origen` (`id_local_origen`),
  KEY `id_local_destino` (`id_local_destino`),
  KEY `id_ingrediente` (`id_ingrediente`),
  KEY `id_producto` (`id_producto`),
  KEY `id_usuario_solicita` (`id_usuario_solicita`),
  KEY `id_usuario_recibe` (`id_usuario_recibe`),
  CONSTRAINT `transferencias_inventario_ibfk_1` FOREIGN KEY (`id_local_origen`) REFERENCES `locales` (`id`) ON DELETE CASCADE,
  CONSTRAINT `transferencias_inventario_ibfk_2` FOREIGN KEY (`id_local_destino`) REFERENCES `locales` (`id`) ON DELETE CASCADE,
  CONSTRAINT `transferencias_inventario_ibfk_3` FOREIGN KEY (`id_ingrediente`) REFERENCES `ingredientes` (`id`) ON DELETE CASCADE,
  CONSTRAINT `transferencias_inventario_ibfk_4` FOREIGN KEY (`id_producto`) REFERENCES `productos` (`id`) ON DELETE CASCADE,
  CONSTRAINT `transferencias_inventario_ibfk_5` FOREIGN KEY (`id_usuario_solicita`) REFERENCES `usuarios` (`id`),
  CONSTRAINT `transferencias_inventario_ibfk_6` FOREIGN KEY (`id_usuario_recibe`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `transferencias_inventario`
--

LOCK TABLES `transferencias_inventario` WRITE;
/*!40000 ALTER TABLE `transferencias_inventario` DISABLE KEYS */;
/*!40000 ALTER TABLE `transferencias_inventario` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `usuarios`
--

DROP TABLE IF EXISTS `usuarios`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `usuarios` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `id_rol` int(11) NOT NULL,
  `nombre` varchar(100) NOT NULL,
  `apellido` varchar(100) DEFAULT NULL,
  `cargo` varchar(100) DEFAULT NULL,
  `dni` varchar(20) DEFAULT NULL,
  `email` varchar(100) NOT NULL,
  `celular` varchar(20) DEFAULT NULL,
  `password_hash` varchar(255) NOT NULL,
  `pin_hash` varchar(255) DEFAULT NULL,
  `estado` enum('activo','inactivo') DEFAULT 'activo',
  `fecha_contratacion` date DEFAULT NULL,
  `hora_entrada_asignada` time DEFAULT NULL,
  `hora_salida_asignada` time DEFAULT NULL,
  `fecha_creacion` timestamp NOT NULL DEFAULT current_timestamp(),
  `foto_perfil` longtext DEFAULT NULL,
  `bio` text DEFAULT NULL,
  `sueldo_base` decimal(10,2) DEFAULT 0.00,
  `sueldo_por_hora` decimal(10,2) DEFAULT 0.00,
  `tipo_pago` enum('mensual','quincenal','semanal','hora') DEFAULT 'mensual',
  `horas_semanales_pactadas` int(11) DEFAULT 48,
  `totp_secret` varchar(32) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  KEY `id_rol` (`id_rol`),
  CONSTRAINT `usuarios_ibfk_1` FOREIGN KEY (`id_rol`) REFERENCES `roles` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `usuarios`
--

LOCK TABLES `usuarios` WRITE;
/*!40000 ALTER TABLE `usuarios` DISABLE KEYS */;
INSERT INTO `usuarios` VALUES (1,1,'Admin Khalessi',NULL,'','12345678','admin@khalessi.com','','$2y$10$Kh1tC4ZACxdI7NzPUo3lIu7Mu3fJPaEMZI4JMq3sSXpTRng08U3dS','$2y$10$0z5A5H5F5w5G5w5w5w5w5u5v5w5w5w5w5w5w5w5w5w5w5w5w5w5w5','activo',NULL,NULL,NULL,'2026-07-11 15:26:02','uploads/perfiles/avatar_1_1789015218.png','',2000.00,0.00,'mensual',48,NULL),(3,1,'Cesar Mendoza',NULL,'','74214636','cesarestudio2395@gmail.com','5199872563','$2y$10$I0JyUck8y2maYmA3LPA4u.qKsOphCPcoh1r/Wjb5V6mtoWgYb/ZDS',NULL,'activo','2026-06-02','09:00:00','18:00:00','2026-07-11 16:55:48','uploads/perfiles/avatar_3_1789015218.jpg','',2500.00,0.00,'mensual',48,NULL),(4,13,'Luis Mendoza',NULL,'Asistente de Cocina','987654321','luimendoza@gmail.com','987456123','$2y$10$F7QeqFmmL3FEX2pC6hqE4.HJyl.K6hHPsqC0h4OuVkylXv.chyAH2',NULL,'activo','2026-02-01','09:00:00','18:00:00','2026-07-11 23:49:05',NULL,NULL,1400.00,7.50,'mensual',48,NULL);
/*!40000 ALTER TABLE `usuarios` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-09-09 23:42:49
