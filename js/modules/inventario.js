// js/modules/inventario.js - Módulo de Inventario con Catálogo Dual (Tabla Deslizable PC / Cards Móvil) y Modal Extendido de Producto

(function() {
    'use strict';

    let productosData = [];
    let categoriasData = [];
    let catalogosData = {
        tipo_articulo: [],
        unidad_medida: [],
        ubicacion_fisica: [],
        proveedor_habitual: [],
        categoria: []
    };
    let activeTab = 'productos';
    let expandedProductIds = new Set();
    let currentModalTab = 'info';
    let currentProductoEnEdicion = null;
    let comprasDelProducto = [];
    let comprobanteFileAdjunto = null;
    let selectedCategoriaPill = '';
    let gestorCatalogoTipoActual = '';
    let productosCargaMasiva = [];
    let camaraStream = null;
    let camaraDispositivos = [];
    let camaraDispositivoActualIdx = 0;
    let comprasFiltroBusqueda = '';
    let comprasFiltroFechaDesde = '';
    let comprasFiltroFechaHasta = '';
    let comprasFiltroPagina = 1;
    let comprasFiltroLimite = 50;

    // Función principal invocada por el enrutador
    window.renderInventario = function(container) {
        if (!container) return;

        // Renderizado del layout: SIN cabecera, iniciando directamente con las pestañas
        container.innerHTML = `
            <div class="inventario-wrapper" style="padding-top: 4px;">
                <!-- Pestañas de Navegación del Módulo -->
                <div class="nav-tabs" id="inventario-nav-tabs">
                    <div class="nav-tab active" onclick="switchInventarioTab('productos')" id="tab-inv-productos">
                        <i class="ph ph-package"></i>
                        <span>Productos</span>
                    </div>
                </div>

                <!-- 1. VISTA: PRODUCTOS -->
                <div id="inv-view-productos" class="inv-tab-content">
                    <!-- Tarjetas de Métricas Rápidas (KPIs - 2 Columnas en móvil) -->
                    <div class="stats-grid mb-3" id="inv-prod-kpis">
                        <div class="stat-card">
                            <div class="stat-icon" style="background: rgba(239, 68, 68, 0.1); color: var(--primary);">
                                <i class="ph ph-package"></i>
                            </div>
                            <div>
                                <div class="stat-value" id="kpi-total-productos">0</div>
                                <div class="stat-label">Total Productos</div>
                            </div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-icon" style="background: rgba(16, 185, 129, 0.1); color: var(--success);">
                                <i class="ph ph-check-circle"></i>
                            </div>
                            <div>
                                <div class="stat-value" id="kpi-disponibles">0</div>
                                <div class="stat-label">Disponibles</div>
                            </div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-icon" style="background: rgba(245, 158, 11, 0.1); color: #F59E0B;">
                                <i class="ph ph-warning-circle"></i>
                            </div>
                            <div>
                                <div class="stat-value" id="kpi-bajo-stock">0</div>
                                <div class="stat-label">Bajo Stock / Agotados</div>
                            </div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-icon" style="background: rgba(59, 130, 246, 0.1); color: #3B82F6;">
                                <i class="ph ph-money"></i>
                            </div>
                            <div>
                                <div class="stat-value" id="kpi-valor-inventario">S/ 0.00</div>
                                <div class="stat-label">Valorización Total</div>
                            </div>
                        </div>
                    </div>

                    <!-- Barra de Búsqueda y Acciones Responsiva -->
                    <div class="inv-toolbar-container">
                        <div class="inv-search-wrapper">
                            <div style="position: relative; flex: 1;">
                                <i class="ph ph-magnifying-glass" style="position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: var(--text-sec); font-size: 16px;"></i>
                                <input type="text" id="filtro-prod-buscar" class="form-control" placeholder="Buscar insumo, SKU, proveedor..." style="padding-left: 38px; border-radius: 12px; height: 42px;" oninput="filtrarProductosInventario()">
                            </div>
                            <button class="btn btn-secondary btn-icon" style="height: 42px; width: 42px; border-radius: 12px; flex-shrink: 0;" title="Refrescar catálogo" onclick="cargarProductosInventario(true)">
                                <i class="ph ph-arrows-clockwise"></i>
                            </button>
                        </div>
                        <div class="inv-toolbar-actions">
                            <button class="btn btn-secondary btn-toolbar-action" onclick="abrirModalCargaMasiva()" title="Carga masiva de múltiples productos">
                                <i class="ph ph-cloud-arrow-up"></i> <span>Carga Masiva</span>
                            </button>
                            <button class="btn btn-primary btn-toolbar-action" onclick="abrirModalProducto()">
                                <i class="ph ph-plus"></i> <span>+ Nuevo Producto</span>
                            </button>
                        </div>
                    </div>

                    <!-- Pestañas Horizontales de Categorías (Pills Ultra Compactas y Rápidas) -->
                    <div class="category-pills-bar" id="contenedor-category-pills">
                        <button type="button" class="cat-pill active" onclick="filtrarPorPillCategoria('')">Todos</button>
                    </div>

                    <!-- Contenedor del Catálogo: Dual PC (Tabla Deslizable) y Móvil (Cards Ordenadas) -->
                    <div id="contenedor-productos-catalogo">
                        <div style="text-align: center; padding: 48px; color: var(--text-sec); background: var(--bg-panel); border-radius: 16px; border: 1px solid var(--border-color);">
                            <i class="ph ph-spinner ph-spin" style="font-size: 28px; color: var(--primary); margin-bottom: 8px; display: block; margin-inline: auto;"></i>
                            Cargando productos del catálogo...
                        </div>
                    </div>
                </div>
            </div>

            <!-- MODAL: CREAR / EDITAR PRODUCTO (88% VH en PC, Tabs e Historial de Compras) -->
            <div id="modal-producto" class="modal-backdrop hidden" onclick="if(event.target === this) cerrarModalProducto()">
                <div class="modal">
                    <!-- Cabecera del Modal -->
                    <div class="modal-header">
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <div style="width: 42px; height: 42px; border-radius: 12px; background: rgba(239, 68, 68, 0.1); color: var(--primary); border: 1px solid rgba(239, 68, 68, 0.2); display: flex; align-items: center; justify-content: center; font-size: 24px; flex-shrink: 0;">
                                <i class="ph ph-package"></i>
                            </div>
                            <div>
                                <div style="display: flex; align-items: center; gap: 8px;">
                                    <h3 id="modal-producto-titulo" style="margin: 0; font-size: 17px; font-weight: 700;">Registrar Nuevo Producto / Insumo</h3>
                                    <span id="modal-badge-modo" class="badge" style="background: rgba(239, 68, 68, 0.1); color: var(--primary); border: 1px solid rgba(239, 68, 68, 0.2); font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 6px; letter-spacing: 0.5px;">NUEVO</span>
                                </div>
                                <p style="margin: 2px 0 0 0; font-size: 12px; color: var(--text-sec);">Gestión integral del insumo, costeo, control de mermas y auditoría de compras</p>
                            </div>
                        </div>
                        <button class="btn-icon" onclick="cerrarModalProducto()"><i class="ph ph-x"></i></button>
                    </div>

                    <!-- TABS INTERNAS DEL MODAL -->
                    <div class="modal-tabs-strip">
                        <div class="modal-subtab active" id="btn-subtab-info" onclick="switchModalProductoTab('info')">
                            <i class="ph ph-info"></i>
                            <span class="tab-label-full">1. Información del Producto & Imagen</span>
                            <span class="tab-label-mob">1. Info & Foto</span>
                        </div>
                        <div class="modal-subtab" id="btn-subtab-historial" onclick="switchModalProductoTab('historial')">
                            <i class="ph ph-receipt"></i>
                            <span class="tab-label-full">2. Historial de Compras & Comprobantes</span>
                            <span class="tab-label-mob">2. Compras</span>
                            <span class="tab-badge-counter" id="modal-tab-compras-count">0</span>
                        </div>
                    </div>

                    <!-- CUERPO DEL MODAL (CON SCROLL INTERNO LIMPIO) -->
                    <div class="modal-body">
                        <!-- PESTAÑA 1: INFORMACIÓN DEL PRODUCTO & IMAGEN -->
                        <div id="modal-page-info">
                            <form id="form-producto" onsubmit="event.preventDefault(); guardarProducto();">
                                <input type="hidden" id="prod-id" value="">
                                <input type="hidden" id="prod-imagen-url" value="">

                                <div class="modal-producto-form-grid">
                                    
                                    <!-- COLUMNA IZQUIERDA: FOTOGRAFÍA Y ACCESO RÁPIDO -->
                                    <div class="prod-photo-container">
                                        <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-sec); margin-bottom: 12px; text-align: center;">
                                            FOTOGRAFÍA DEL PRODUCTO
                                        </div>

                                        <div class="prod-photo-preview" id="prod-photo-box" onclick="document.getElementById('prod-input-foto').click()" style="cursor: pointer;" title="Haz clic para subir o cambiar foto">
                                            <div id="prod-photo-placeholder" style="text-align: center; padding: 20px;">
                                                <i class="ph ph-image empty-icon"></i>
                                                <div class="empty-txt">Sin Imagen</div>
                                            </div>
                                            <img id="prod-photo-img" src="" alt="Preview" style="display: none;">
                                        </div>

                                        <input type="file" id="prod-input-foto" accept="image/jpeg,image/png,image/webp" style="display: none;" onchange="procesarFotoSeleccionada(this)">

                                        <div style="display: flex; gap: 8px; justify-content: center;">
                                            <button type="button" class="btn btn-secondary" style="flex: 1; font-size: 12.5px;" onclick="document.getElementById('prod-input-foto').click()">
                                                <i class="ph ph-upload-simple"></i> Subir Foto
                                            </button>
                                            <button type="button" class="btn btn-secondary text-danger" style="padding: 8px 12px;" onclick="eliminarFotoProducto()" title="Quitar imagen">
                                                <i class="ph ph-trash"></i>
                                            </button>
                                        </div>

                                        <p style="font-size: 11px; color: var(--text-sec); margin-top: 10px; margin-bottom: 0; line-height: 1.4;">
                                            Formatos JPG, PNG o WebP. Se visualiza en las pantallas de ensamble y kárdex.
                                        </p>

                                        <!-- Acceso Directo a Carga Masiva -->
                                        <div style="margin-top: 14px; padding: 12px; background: rgba(239, 68, 68, 0.05); border: 1px dashed rgba(239, 68, 68, 0.3); border-radius: 12px; text-align: center;">
                                            <div style="font-size: 11.5px; font-weight: 600; color: var(--primary); margin-bottom: 6px;">
                                                <i class="ph ph-lightning"></i> ¿Tienes varios productos?
                                            </div>
                                            <button type="button" class="btn btn-secondary btn-sm" onclick="cerrarModalProducto(); abrirModalCargaMasiva();" style="width: 100%; font-size: 11.5px; border-radius: 8px; font-weight: 600; color: var(--primary);">
                                                <i class="ph ph-cloud-arrow-up"></i> Carga Masiva de Productos
                                            </button>
                                        </div>
                                    </div>

                                    <!-- COLUMNA DERECHA: CAMPOS DEL PRODUCTO -->
                                    <div style="display: flex; flex-direction: column; gap: 14px;">
                                        
                                        <!-- Fila 1: SKU, Código de Barras (EAN-13) y Nombre Comercial -->
                                        <div class="modal-row-sku-ean-name">
                                            <div class="form-group mb-0">
                                                <label class="form-label font-bold" style="font-size: 12px;">Código / SKU <span class="text-danger">*</span></label>
                                                <div style="display: flex; gap: 4px;">
                                                    <input type="text" id="prod-sku" class="form-control font-bold" placeholder="MP-013" style="font-family: monospace;" required>
                                                    <button type="button" class="btn btn-secondary btn-icon" onclick="generarSkuAutomatico()" title="Generar código automático">
                                                        <i class="ph ph-sparkle"></i>
                                                    </button>
                                                </div>
                                            </div>
                                            <div class="form-group mb-0">
                                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                                                    <label class="form-label font-bold" style="font-size: 12px; margin-bottom: 0;">Cód. Barras (EAN)</label>
                                                    <span id="prod-ean13-badge" class="ean13-tag" style="display: none;"></span>
                                                </div>
                                                <div style="display: flex; gap: 4px;">
                                                    <input type="text" id="prod-codigo-barras" class="form-control font-bold" placeholder="7751234567890" style="font-family: monospace;" oninput="actualizarEstadoEAN13(this.value)">
                                                    <button type="button" class="btn btn-secondary" onclick="generarCodigoBarrasEAN13()" style="border-radius: 10px; font-size: 11px; font-weight: 700; padding: 0 8px; white-space: nowrap; display: inline-flex; align-items: center; gap: 4px;" title="Generar código de barras estándar EAN-13 (13 dígitos)">
                                                        <i class="ph ph-barcode"></i> EAN-13
                                                    </button>
                                                </div>
                                            </div>
                                            <div class="form-group mb-0 modal-name-field">
                                                <label class="form-label font-bold" style="font-size: 12px;">Nombre Comercial del Insumo / Producto <span class="text-danger">*</span></label>
                                                <input type="text" id="prod-nombre" class="form-control font-bold" placeholder="Ej: Champiñones Portobello Frescos" required>
                                            </div>
                                        </div>

                                        <!-- Fila 2: Tipo de Artículo, Categoría y Unidad de Medida (Gestión dinámica) -->
                                        <div class="modal-row-3col">
                                            <div class="form-group mb-0">
                                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                                                    <label class="form-label font-bold" style="font-size: 12px; margin-bottom: 0;">Tipo de Artículo <span class="text-danger">*</span></label>
                                                    <a href="javascript:void(0)" onclick="abrirGestorCatalogo('tipo_articulo')" class="link-gestionar" title="Crear, editar o eliminar">+ Gestionar</a>
                                                </div>
                                                <div class="catalog-select-group">
                                                    <select id="prod-tipo-articulo" class="form-control" required></select>
                                                    <button type="button" class="btn-icon" onclick="abrirGestorCatalogo('tipo_articulo')" title="Gestionar tipos de artículo">
                                                        <i class="ph ph-sliders"></i>
                                                    </button>
                                                </div>
                                            </div>
                                            <div class="form-group mb-0">
                                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                                                    <label class="form-label font-bold" style="font-size: 12px; margin-bottom: 0;">Categoría en Catálogo</label>
                                                    <a href="javascript:void(0)" onclick="abrirGestorCatalogo('categoria')" class="link-gestionar" title="Crear, editar o eliminar">+ Gestionar</a>
                                                </div>
                                                <div class="catalog-select-group">
                                                    <select id="prod-categoria" class="form-control"></select>
                                                    <button type="button" class="btn-icon" onclick="abrirGestorCatalogo('categoria')" title="Gestionar categorías de catálogo">
                                                        <i class="ph ph-sliders"></i>
                                                    </button>
                                                </div>
                                            </div>
                                            <div class="form-group mb-0">
                                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                                                    <label class="form-label font-bold" style="font-size: 12px; margin-bottom: 0;">Unidad de Medida Base <span class="text-danger">*</span></label>
                                                    <a href="javascript:void(0)" onclick="abrirGestorCatalogo('unidad_medida')" class="link-gestionar" title="Crear, editar o eliminar">+ Gestionar</a>
                                                </div>
                                                <div class="catalog-select-group">
                                                    <select id="prod-unidad-medida" class="form-control" required></select>
                                                    <button type="button" class="btn-icon" onclick="abrirGestorCatalogo('unidad_medida')" title="Gestionar unidades de medida">
                                                        <i class="ph ph-sliders"></i>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        <!-- Fila 3: Ubicación Física y Proveedor Habitual (Gestión dinámica) -->
                                        <div class="modal-row-2col">
                                            <div class="form-group mb-0">
                                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                                                    <label class="form-label font-bold" style="font-size: 12px; margin-bottom: 0;">Ubicación Física <span class="text-danger">*</span></label>
                                                    <a href="javascript:void(0)" onclick="abrirGestorCatalogo('ubicacion_fisica')" class="link-gestionar" title="Crear, editar o eliminar">+ Gestionar</a>
                                                </div>
                                                <div class="catalog-select-group">
                                                    <select id="prod-ubicacion-fisica" class="form-control"></select>
                                                    <button type="button" class="btn-icon" onclick="abrirGestorCatalogo('ubicacion_fisica')" title="Gestionar ubicaciones físicas">
                                                        <i class="ph ph-sliders"></i>
                                                    </button>
                                                </div>
                                            </div>
                                            <div class="form-group mb-0">
                                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                                                    <label class="form-label font-bold" style="font-size: 12px; margin-bottom: 0;">Proveedor Habitual</label>
                                                    <a href="javascript:void(0)" onclick="abrirGestorCatalogo('proveedor_habitual')" class="link-gestionar" title="Crear, editar o eliminar">+ Gestionar</a>
                                                </div>
                                                <div class="catalog-select-group">
                                                    <input type="text" id="prod-proveedor" list="dl-proveedores" class="form-control" placeholder="Ej: Distribuidora Agrícola del Valle">
                                                    <datalist id="dl-proveedores"></datalist>
                                                    <button type="button" class="btn-icon" onclick="abrirGestorCatalogo('proveedor_habitual')" title="Gestionar proveedores habituales">
                                                        <i class="ph ph-sliders"></i>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        <!-- Fila 4: CAJA DESTACADA DE COSTEO Y STOCKS -->
                                        <div class="modal-cost-stock-card">
                                            <div class="form-group mb-0">
                                                <label class="form-label font-bold" style="font-size: 11.5px; text-transform: uppercase; color: var(--text-sec); letter-spacing: 0.5px;">STOCK INICIAL</label>
                                                <input type="number" step="0.01" min="0" id="prod-stock-inicial" class="form-control font-bold" placeholder="10.00" value="0.00" required>
                                            </div>
                                            <div class="form-group mb-0">
                                                <label class="form-label font-bold" style="font-size: 11.5px; text-transform: uppercase; color: var(--text-sec); letter-spacing: 0.5px;">STOCK MÍNIMO (ALERTA)</label>
                                                <input type="number" step="0.01" min="0" id="prod-stock-minimo" class="form-control font-bold" placeholder="5.00" value="5.00" required>
                                            </div>
                                            <div class="form-group mb-0 cost-field-span">
                                                <label class="form-label font-bold" style="font-size: 11.5px; text-transform: uppercase; color: #059669; letter-spacing: 0.5px;">COSTO UNITARIO BASE (S/)</label>
                                                <input type="number" step="0.01" min="0" id="prod-costo-unitario" class="form-control font-bold" style="color: #059669;" placeholder="2.50" value="0.00">
                                            </div>
                                        </div>

                                        <!-- Fila 5: Datos de Venta Comercial Complementarios -->
                                        <div class="modal-row-2col">
                                            <div class="form-group mb-0">
                                                <label class="form-label font-bold" style="font-size: 12px;">Precio Venta Comercial (S/)</label>
                                                <input type="number" step="0.10" min="0" id="prod-precio-venta" class="form-control font-bold" placeholder="0.00" value="0.00">
                                            </div>
                                            <div class="form-group mb-0">
                                                <label class="form-label font-bold" style="font-size: 12px;">Estado del Producto</label>
                                                <select id="prod-estado" class="form-control">
                                                    <option value="disponible">Disponible (Activo en operaciones)</option>
                                                    <option value="agotado">Agotado (Sin existencias)</option>
                                                    <option value="inactivo">Inactivo (Deshabilitado)</option>
                                                </select>
                                            </div>
                                        </div>

                                        <!-- Fila 6: Descripción o Notas Adicionales -->
                                        <div class="form-group mb-0">
                                            <label class="form-label font-bold" style="font-size: 12px;">Descripción / Notas Técnicas</label>
                                            <textarea id="prod-descripcion" class="form-control" rows="2" placeholder="Especificaciones, rendimiento, porcionamiento o notas internas..."></textarea>
                                        </div>

                                    </div>
                                </div>
                            </form>
                        </div>

                        <!-- PESTAÑA 2: HISTORIAL DE COMPRAS & COMPROBANTES -->
                        <div id="modal-page-historial" style="display: none;">
                            <!-- Formulario: REGISTRAR NUEVA ORDEN / FACTURA DE COMPRA -->
                            <div class="card mb-3" style="border: 1px solid var(--border-color); border-radius: 14px;">
                                <div class="card-body" style="padding: 16px 20px;">
                                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; flex-wrap: wrap; gap: 8px;">
                                        <div style="display: flex; align-items: center; gap: 8px; font-weight: 700; font-size: 13px; color: var(--text-main);">
                                            <i class="ph ph-receipt" style="color: var(--primary); font-size: 18px;"></i>
                                            REGISTRAR NUEVA ORDEN / FACTURA DE COMPRA
                                        </div>
                                        <span style="font-size: 11.5px; color: var(--text-sec);">Toma foto o sube el comprobante tributario</span>
                                    </div>

                                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; margin-bottom: 12px;">
                                        <div class="form-group mb-0">
                                            <label class="form-label font-bold" style="font-size: 11.5px;">Nº Comprobante / Factura <span class="text-danger">*</span></label>
                                            <input type="text" id="compra-num-comprobante" class="form-control" placeholder="F001-004521">
                                        </div>
                                        <div class="form-group mb-0">
                                            <label class="form-label font-bold" style="font-size: 11.5px;">Proveedor <span class="text-danger">*</span></label>
                                            <input type="text" id="compra-proveedor" list="dl-proveedores" class="form-control" placeholder="Lácteos San Juan S.A.">
                                        </div>
                                        <div class="form-group mb-0">
                                            <label class="form-label font-bold" style="font-size: 11.5px;">Cantidad Comprada <span class="text-danger">*</span></label>
                                            <input type="number" step="0.01" min="0.01" id="compra-cantidad" class="form-control font-bold" placeholder="Ej: 20.0" oninput="recalcularTotalCompraManual()">
                                        </div>
                                        <div class="form-group mb-0">
                                            <label class="form-label font-bold" style="font-size: 11.5px;">Precio Unitario (S/) <span class="text-danger">*</span></label>
                                            <input type="number" step="0.01" min="0" id="compra-precio-unitario" class="form-control font-bold" placeholder="Ej: 8.50" oninput="recalcularTotalCompraManual()">
                                        </div>
                                    </div>

                                    <div style="display: flex; gap: 12px; align-items: flex-end; flex-wrap: wrap; justify-content: space-between;">
                                        <div style="flex: 1; min-width: 280px;">
                                            <label class="form-label font-bold" style="font-size: 11.5px;">Comprobante de Pago & Escaneo OCR</label>
                                            <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
                                                <button type="button" class="btn" onclick="abrirCamaraOCR()" style="background: #10B981; color: #FFFFFF; font-size: 12px; font-weight: 600; border-radius: 10px; padding: 7px 14px; display: inline-flex; align-items: center; gap: 6px;">
                                                    <i class="ph ph-camera"></i> Tomar Foto & OCR
                                                </button>
                                                <button type="button" class="btn btn-secondary" onclick="document.getElementById('compra-input-file').click()" style="font-size: 12px; border-radius: 10px;">
                                                    <i class="ph ph-paperclip"></i> <span id="compra-file-label">Subir Archivo</span>
                                                </button>
                                                <input type="file" id="compra-input-file" accept="image/jpeg,image/png,image/webp,application/pdf" style="display: none;" onchange="manejarSeleccionComprobante(this)">
                                                <button type="button" id="btn-remover-comprobante" class="btn btn-secondary text-danger btn-icon" style="display: none;" onclick="removerComprobanteAdjunto()" title="Remover archivo">
                                                    <i class="ph ph-trash"></i>
                                                </button>
                                                <span id="ocr-badge-status" style="display: none; font-size: 11px; font-weight: 600; color: #059669; padding: 3px 8px; background: rgba(16,185,129,0.12); border-radius: 6px;">
                                                    <i class="ph ph-check"></i> OCR Procesado
                                                </span>
                                            </div>
                                        </div>
                                        <div style="display: flex; align-items: center; gap: 12px;">
                                            <div style="text-align: right;">
                                                <div style="font-size: 10.5px; font-weight: 700; color: var(--text-sec); text-transform: uppercase;">Total Calculado</div>
                                                <div id="compra-total-calculado" style="font-size: 16px; font-weight: 800; color: var(--text-main);">S/ 0.00</div>
                                            </div>
                                            <button type="button" class="btn btn-primary" id="btn-agregar-compra" onclick="guardarCompraHistorial()" style="font-weight: 600; border-radius: 10px; padding: 9px 18px; display: inline-flex; align-items: center; gap: 6px;">
                                                <i class="ph ph-plus-circle"></i> + Añadir a Historial
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Tabla: REGISTRO HISTÓRICO DE COMPRAS CON BUSCADOR Y FILTROS -->
                            <div class="card" style="border: 1px solid var(--border-color); border-radius: 14px;">
                                <div class="card-body" style="padding: 16px 20px;">
                                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; flex-wrap: wrap; gap: 8px;">
                                        <div style="font-weight: 700; font-size: 13px; color: var(--text-main); display: flex; align-items: center; gap: 6px;">
                                            <i class="ph ph-books" style="color: var(--primary); font-size: 16px;"></i>
                                            REGISTRO HISTÓRICO DE COMPRAS Y SUMINISTRO
                                        </div>
                                        <span style="font-size: 11.5px; color: var(--text-sec);">Auditoría contable y recepción</span>
                                    </div>

                                    <!-- Barra de Filtros Avanzados (para 20 o 50+ registros) -->
                                    <div style="display: flex; gap: 10px; align-items: center; justify-content: space-between; flex-wrap: wrap; margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px solid var(--border-color);">
                                        <div style="position: relative; flex: 1; min-width: 200px;">
                                            <i class="ph ph-magnifying-glass" style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--text-sec); font-size: 14px;"></i>
                                            <input type="text" id="filtro-compras-buscar" class="form-control" placeholder="Buscar por comprobante o proveedor..." style="padding-left: 34px; border-radius: 10px; height: 36px; font-size: 12px;" oninput="filtrarComprasDelProducto(1)">
                                        </div>
                                        <div style="display: flex; gap: 6px; align-items: center;">
                                            <span style="font-size: 11px; color: var(--text-sec);">Desde:</span>
                                            <input type="date" id="filtro-compras-desde" class="form-control" style="width: 125px; height: 36px; font-size: 11.5px; border-radius: 10px;" onchange="filtrarComprasDelProducto(1)">
                                            <span style="font-size: 11px; color: var(--text-sec);">Hasta:</span>
                                            <input type="date" id="filtro-compras-hasta" class="form-control" style="width: 125px; height: 36px; font-size: 11.5px; border-radius: 10px;" onchange="filtrarComprasDelProducto(1)">
                                        </div>
                                        <div style="display: flex; gap: 6px; align-items: center;">
                                            <span style="font-size: 11px; color: var(--text-sec);">Mostrar:</span>
                                            <select id="filtro-compras-limite" class="form-control" style="width: 95px; height: 36px; font-size: 12px; border-radius: 10px;" onchange="cambiarLimiteCompras(this.value)">
                                                <option value="10">10</option>
                                                <option value="20">20</option>
                                                <option value="50" selected>50</option>
                                                <option value="999999">Todos</option>
                                            </select>
                                        </div>
                                    </div>

                                    <!-- Barra de Totales y Paginación -->
                                    <div id="compras-resumen-barra" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; font-size: 12px; color: var(--text-sec); flex-wrap: wrap; gap: 8px;">
                                        <div id="compras-totales-info">Mostrando 0 compras</div>
                                        <div id="compras-paginacion-ctrl" style="display: flex; gap: 6px; align-items: center;"></div>
                                    </div>

                                    <div id="contenedor-tabla-compras" style="overflow-x: auto;">
                                        <!-- Renderizado dinámico de compras o empty state -->
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- PIE DEL MODAL -->
                    <div class="modal-footer modal-producto-footer">
                        <div class="modal-cpp-notice">
                            <i class="ph ph-check-circle" style="font-size: 18px; color: #10B981; flex-shrink: 0;"></i>
                            <span>Validado para recálculo de Costo Promedio Ponderado (CPP)</span>
                        </div>
                        <div class="modal-producto-footer-btns">
                            <button type="button" class="btn btn-secondary btn-modal-foot" onclick="cerrarModalProducto()">Cerrar</button>
                            <button type="button" class="btn btn-primary btn-modal-foot" id="btn-guardar-producto" onclick="guardarProducto()" style="display: inline-flex; align-items: center; justify-content: center; gap: 6px; font-weight: 600;">
                                <i class="ph ph-floppy-disk"></i> Guardar Producto
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- MODAL: AJUSTE RÁPIDO DE STOCK -->
            <div id="modal-ajustar-stock" class="modal-backdrop hidden" onclick="if(event.target === this) cerrarModalAjusteStock()">
                <div class="modal" style="max-width: 450px; width: 90%;">
                    <div class="modal-header">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <div style="width: 36px; height: 36px; border-radius: 10px; background: rgba(59, 130, 246, 0.1); color: var(--link); display: flex; align-items: center; justify-content: center; font-size: 20px;">
                                <i class="ph ph-scales"></i>
                            </div>
                            <div>
                                <h3 style="margin: 0; font-size: 17px; font-weight: 600;">Ajustar Existencias</h3>
                                <p style="margin: 0; font-size: 12px; color: var(--text-sec);">Entrada, salida o cuadre físico</p>
                            </div>
                        </div>
                        <button class="btn-icon" onclick="cerrarModalAjusteStock()"><i class="ph ph-x"></i></button>
                    </div>
                    <div class="modal-body" style="padding: 22px;">
                        <input type="hidden" id="ajuste-prod-id" value="">
                        
                        <div style="background: var(--bg-main); padding: 14px 16px; border-radius: 12px; margin-bottom: 18px; border: 1px solid var(--border-color);">
                            <div style="font-weight: 600; color: var(--text-main); font-size: 14px;" id="ajuste-prod-nombre">-</div>
                            <div style="font-size: 12.5px; color: var(--text-sec); margin-top: 4px;">
                                Stock actual registrado: <strong id="ajuste-prod-actual" class="text-primary" style="font-size: 15px;">0</strong> <span id="ajuste-prod-unidad">unidades</span>
                            </div>
                        </div>

                        <div class="form-group mb-3">
                            <label class="form-label font-bold">Tipo de Operación</label>
                            <select id="ajuste-tipo" class="form-control">
                                <option value="entrada">+ Entrada (Compra / Abastecimiento)</option>
                                <option value="salida">- Salida (Merma / Consumo / Merma)</option>
                                <option value="ajuste">= Fijar Cantidad Exacta (Conteo Físico Real)</option>
                            </select>
                        </div>

                        <div class="form-group mb-3">
                            <label class="form-label font-bold">Cantidad <span class="text-danger">*</span></label>
                            <input type="number" step="0.01" min="0.01" id="ajuste-cantidad" class="form-control font-bold" placeholder="Ingresa cantidad" required>
                        </div>

                        <div class="form-group mb-0">
                            <label class="form-label font-bold">Motivo o Justificación</label>
                            <input type="text" id="ajuste-motivo" class="form-control" placeholder="Ej. Conteo físico semanal o merma">
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" onclick="cerrarModalAjusteStock()">Cancelar</button>
                    </div>
                </div>
            </div>

            <!-- MODAL: GESTOR DE CATÁLOGOS AUXILIARES (CRUD) -->
            <div id="modal-gestor-catalogo" class="modal-backdrop hidden" onclick="if(event.target === this) cerrarGestorCatalogo()">
                <div class="modal" style="max-width: 520px; width: 92%; max-height: 85vh; border-radius: 20px; display: flex; flex-direction: column;">
                    <div class="modal-header" style="padding: 16px 22px;">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <div id="gestor-cat-icon" style="width: 38px; height: 38px; border-radius: 10px; background: rgba(239, 68, 68, 0.1); color: var(--primary); border: 1px solid rgba(239, 68, 68, 0.2); display: flex; align-items: center; justify-content: center; font-size: 20px;">
                                <i class="ph ph-sliders"></i>
                            </div>
                            <div>
                                <h3 id="gestor-cat-titulo" style="margin: 0; font-size: 16px; font-weight: 700;">Gestionar Opciones</h3>
                                <p id="gestor-cat-subtitulo" style="margin: 2px 0 0 0; font-size: 11.5px; color: var(--text-sec);">Crea, edita o elimina elementos de este catálogo</p>
                            </div>
                        </div>
                        <button class="btn-icon" onclick="cerrarGestorCatalogo()"><i class="ph ph-x"></i></button>
                    </div>
                    <div class="modal-body" style="padding: 18px 22px; overflow-y: auto; flex: 1;">
                        <!-- Input para agregar -->
                        <div style="display: flex; gap: 8px; margin-bottom: 16px;">
                            <input type="text" id="gestor-input-nuevo" class="form-control" placeholder="Escribe el nuevo nombre..." style="border-radius: 10px;" onkeydown="if(event.key==='Enter') agregarItemCatalogo()">
                            <button type="button" class="btn btn-primary" onclick="agregarItemCatalogo()" style="white-space: nowrap; border-radius: 10px; font-weight: 600; padding: 0 16px;">
                                <i class="ph ph-plus-circle"></i> Agregar
                            </button>
                        </div>
                        <!-- Lista de elementos -->
                        <div id="gestor-cat-lista" style="display: flex; flex-direction: column; gap: 8px;">
                            <!-- Items dinámicos -->
                        </div>
                    </div>
                    <div class="modal-footer" style="padding: 12px 22px; justify-content: flex-end;">
                        <button type="button" class="btn btn-secondary" onclick="cerrarGestorCatalogo()" style="border-radius: 10px;">Listo / Cerrar</button>
                    </div>
                </div>
            </div>

            <!-- MODAL: CARGA MASIVA DE PRODUCTOS (CSV O TABLA MANUAL) -->
            <div id="modal-carga-masiva" class="modal-backdrop hidden" onclick="if(event.target === this) cerrarModalCargaMasiva()">
                <div class="modal" style="max-width: 1080px; width: 95%; height: 88vh; max-height: 90vh; border-radius: 20px; display: flex; flex-direction: column;">
                    <div class="modal-header" style="padding: 18px 26px;">
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <div style="width: 42px; height: 42px; border-radius: 12px; background: rgba(59, 130, 246, 0.12); color: #2563EB; display: flex; align-items: center; justify-content: center; font-size: 22px;">
                                <i class="ph ph-cloud-arrow-up"></i>
                            </div>
                            <div>
                                <h3 style="margin: 0; font-size: 17px; font-weight: 700;">Carga Masiva de Productos e Insumos</h3>
                                <p style="margin: 2px 0 0 0; font-size: 12px; color: var(--text-sec);">Importa por archivo CSV o registra múltiples filas en lote</p>
                            </div>
                        </div>
                        <button class="btn-icon" onclick="cerrarModalCargaMasiva()"><i class="ph ph-x"></i></button>
                    </div>

                    <div class="modal-tabs-strip">
                        <div class="modal-subtab active" id="btn-tab-masiva-archivo" onclick="switchMasivaTab('archivo')">
                            <i class="ph ph-file-csv"></i>
                            <span>1. Importar Archivo CSV</span>
                        </div>
                        <div class="modal-subtab" id="btn-tab-masiva-manual" onclick="switchMasivaTab('manual')">
                            <i class="ph ph-table"></i>
                            <span>2. Tabla Rápida Editable</span>
                        </div>
                    </div>

                    <div class="modal-body" style="padding: 20px 26px; overflow-y: auto; flex: 1;">
                        <!-- Tab 1: CSV Upload -->
                        <div id="view-masiva-archivo">
                            <div style="display: flex; gap: 14px; align-items: center; justify-content: space-between; margin-bottom: 16px; flex-wrap: wrap;">
                                <div style="font-size: 12.5px; color: var(--text-sec);">
                                    Descarga la plantilla con encabezados estándar para completar tus productos y subirlos en bloque.
                                </div>
                                <button type="button" class="btn btn-secondary" onclick="descargarPlantillaCSV()" style="border-radius: 10px; font-size: 12.5px; font-weight: 600; display: inline-flex; align-items: center; gap: 6px;">
                                    <i class="ph ph-download-simple"></i> Descargar Plantilla CSV
                                </button>
                            </div>

                            <div id="dropzone-csv" class="dropzone-area" onclick="document.getElementById('input-archivo-csv').click()" style="border: 2px dashed var(--border-color); border-radius: 14px; padding: 36px 20px; text-align: center; cursor: pointer; background: var(--bg-main); transition: all 0.2s;">
                                <i class="ph ph-file-csv" style="font-size: 44px; color: #2563EB; margin-bottom: 8px; display: block;"></i>
                                <div style="font-weight: 600; font-size: 14px; color: var(--text-main); margin-bottom: 4px;">Haz clic para seleccionar o arrastra tu archivo CSV aquí</div>
                                <div style="font-size: 12px; color: var(--text-sec);">Formato .CSV delimitado por comas o punto y coma (UTF-8)</div>
                                <input type="file" id="input-archivo-csv" accept=".csv" style="display: none;" onchange="procesarArchivoCSV(this)">
                            </div>

                            <div id="contenedor-preview-csv" style="margin-top: 18px; display: none;">
                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                                    <span id="preview-csv-count" style="font-weight: 700; font-size: 13px; color: var(--text-main);">0 productos detectados</span>
                                    <button type="button" class="btn btn-secondary btn-sm" onclick="limpiarPreviewCSV()">Limpiar</button>
                                </div>
                                <div style="max-height: 280px; overflow-y: auto; overflow-x: auto; border: 1px solid var(--border-color); border-radius: 12px;">
                                    <table class="table" style="width: 100%; font-size: 12px;" id="tabla-preview-csv"></table>
                                </div>
                            </div>
                        </div>

                        <!-- Tab 2: Manual Fast Table -->
                        <div id="view-masiva-manual" style="display: none;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                                <span style="font-size: 12.5px; color: var(--text-sec);">Completa los insumos o productos directamente en la tabla y pulsa guardar.</span>
                                <button type="button" class="btn btn-secondary btn-sm" onclick="agregarFilaMasivaManual()" style="border-radius: 8px; font-weight: 600; display: inline-flex; align-items: center; gap: 4px;">
                                    <i class="ph ph-plus"></i> + Añadir Fila
                                </button>
                            </div>
                            <div style="max-height: 380px; overflow-y: auto; overflow-x: auto; border: 1px solid var(--border-color); border-radius: 12px;">
                                <table class="table" style="width: 100%; min-width: 820px; font-size: 12px;" id="tabla-masiva-manual">
                                    <thead>
                                        <tr style="background: var(--bg-main); border-bottom: 1px solid var(--border-color);">
                                            <th style="padding: 8px 10px; width: 40px;">#</th>
                                            <th style="padding: 8px 10px; min-width: 180px;">Nombre *</th>
                                            <th style="padding: 8px 10px; width: 110px;">SKU</th>
                                            <th style="padding: 8px 10px; width: 140px;">Tipo</th>
                                            <th style="padding: 8px 10px; width: 120px;">Unidad</th>
                                            <th style="padding: 8px 10px; width: 90px; text-align: right;">Stock</th>
                                            <th style="padding: 8px 10px; width: 90px; text-align: right;">Costo (S/)</th>
                                            <th style="padding: 8px 10px; width: 90px; text-align: right;">Precio (S/)</th>
                                            <th style="padding: 8px 10px; width: 40px; text-align: center;"></th>
                                        </tr>
                                    </thead>
                                    <tbody id="tbody-masiva-manual"></tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    <div class="modal-footer" style="padding: 14px 26px; display: flex; justify-content: space-between; align-items: center;">
                        <div id="masiva-status-msg" style="font-size: 12.5px; color: var(--text-sec);">Listo para procesar</div>
                        <div style="display: flex; gap: 10px;">
                            <button type="button" class="btn btn-secondary" onclick="cerrarModalCargaMasiva()" style="border-radius: 10px;">Cancelar</button>
                            <button type="button" class="btn btn-primary" id="btn-procesar-masiva" onclick="procesarGuardadoMasivo()" style="border-radius: 10px; font-weight: 600; display: inline-flex; align-items: center; gap: 6px;">
                                <i class="ph ph-check"></i> Guardar Todos los Productos
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- MODAL: CÁMARA EN VIVO Y ESCANEO OCR DE COMPROBANTES -->
            <div id="modal-camara-ocr" class="modal-backdrop hidden" onclick="if(event.target === this) cerrarCamaraOCR()">
                <div class="modal" style="max-width: 580px; width: 92%; border-radius: 20px; display: flex; flex-direction: column; overflow: hidden;">
                    <div class="modal-header" style="padding: 16px 20px;">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <div style="width: 38px; height: 38px; border-radius: 10px; background: rgba(16, 185, 129, 0.12); color: #059669; display: flex; align-items: center; justify-content: center; font-size: 20px;">
                                <i class="ph ph-camera"></i>
                            </div>
                            <div>
                                <h3 style="margin: 0; font-size: 16px; font-weight: 700;">Capturar Factura / Boleta & OCR</h3>
                                <p style="margin: 2px 0 0 0; font-size: 11.5px; color: var(--text-sec);">Enfoca el comprobante físico con buena iluminación</p>
                            </div>
                        </div>
                        <button class="btn-icon" onclick="cerrarCamaraOCR()"><i class="ph ph-x"></i></button>
                    </div>

                    <div class="modal-body" style="padding: 16px 20px; background: #0F172A; text-align: center;">
                        <div style="position: relative; width: 100%; border-radius: 12px; overflow: hidden; background: #000; min-height: 280px; display: flex; align-items: center; justify-content: center;">
                            <video id="camara-video" autoplay playsinline style="width: 100%; height: auto; max-height: 380px; object-fit: contain;"></video>
                            <canvas id="camara-canvas" style="display: none; width: 100%; height: auto; max-height: 380px; object-fit: contain;"></canvas>
                            
                            <!-- Guía de encuadre -->
                            <div id="camara-guia-encuadre" style="position: absolute; inset: 16px; border: 2px dashed rgba(255,255,255,0.4); border-radius: 8px; pointer-events: none; display: flex; flex-direction: column; justify-content: space-between; padding: 8px;">
                                <span style="color: rgba(255,255,255,0.8); font-size: 11px; text-align: left;">Coloca la factura o boleta aquí</span>
                                <span style="color: rgba(255,255,255,0.8); font-size: 11px; text-align: right;">Asegura texto nítido</span>
                            </div>

                            <!-- Overlay de procesamiento OCR -->
                            <div id="camara-ocr-overlay" style="display: none; position: absolute; inset: 0; background: rgba(15, 23, 42, 0.88); flex-direction: column; align-items: center; justify-content: center; color: #fff; padding: 20px;">
                                <i class="ph ph-spinner ph-spin" style="font-size: 36px; color: #10B981; margin-bottom: 12px;"></i>
                                <div id="camara-ocr-status" style="font-size: 13.5px; font-weight: 600;">Reconociendo texto con OCR...</div>
                                <div style="font-size: 11.5px; color: rgba(255,255,255,0.7); margin-top: 4px;">Extrayendo comprobante, proveedor y montos</div>
                            </div>
                        </div>
                    </div>

                    <div class="modal-footer" style="padding: 14px 20px; display: flex; justify-content: space-between; align-items: center;">
                        <button type="button" class="btn btn-secondary" id="btn-cambiar-camara" onclick="cambiarDispositivoCamara()" style="border-radius: 10px; font-size: 12px; display: inline-flex; align-items: center; gap: 4px;">
                            <i class="ph ph-arrows-clockwise"></i> Girar Cámara
                        </button>
                        <div style="display: flex; gap: 8px;" id="camara-controles-captura">
                            <button type="button" class="btn btn-secondary" onclick="cerrarCamaraOCR()" style="border-radius: 10px;">Cancelar</button>
                            <button type="button" class="btn" onclick="capturarFotoCamara()" style="background: #10B981; color: #fff; border-radius: 10px; font-weight: 600; padding: 8px 18px; display: inline-flex; align-items: center; gap: 6px;">
                                <i class="ph ph-aperture"></i> Tomar Foto
                            </button>
                        </div>
                        <div style="display: none; gap: 8px;" id="camara-controles-resultado">
                            <button type="button" class="btn btn-secondary" onclick="repetirCapturaCamara()" style="border-radius: 10px;">↺ Repetir</button>
                            <button type="button" class="btn btn-primary" onclick="confirmarYEjecutarOCR()" style="border-radius: 10px; font-weight: 600; display: inline-flex; align-items: center; gap: 6px;">
                                <i class="ph ph-check"></i> Usar & Aplicar OCR
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Inicializar datos
        cargarCatalogosInventario();
        cargarProductosInventario();
    };

    // Cambio de pestañas principales del módulo
    window.switchInventarioTab = function(tab) {
        activeTab = tab;
        document.querySelectorAll('#inventario-nav-tabs .nav-tab').forEach(el => el.classList.remove('active'));
        const tabBtn = document.getElementById(`tab-inv-${tab}`);
        if (tabBtn) tabBtn.classList.add('active');

        document.querySelectorAll('.inv-tab-content').forEach(el => el.style.display = 'none');
        const view = document.getElementById(`inv-view-${tab}`);
        if (view) view.style.display = 'block';

        if (typeof triggerHaptic === 'function') triggerHaptic(15);
    };

    // Pestañas internas del modal de producto
    window.switchModalProductoTab = function(tab) {
        currentModalTab = tab;
        const btnInfo = document.getElementById('btn-subtab-info');
        const btnHistorial = document.getElementById('btn-subtab-historial');
        const pageInfo = document.getElementById('modal-page-info');
        const pageHistorial = document.getElementById('modal-page-historial');

        if (tab === 'info') {
            if (btnInfo) btnInfo.classList.add('active');
            if (btnHistorial) btnHistorial.classList.remove('active');
            if (pageInfo) pageInfo.style.display = 'block';
            if (pageHistorial) pageHistorial.style.display = 'none';
        } else {
            if (btnHistorial) btnHistorial.classList.add('active');
            if (btnInfo) btnInfo.classList.remove('active');
            if (pageHistorial) pageHistorial.style.display = 'block';
            if (pageInfo) pageInfo.style.display = 'none';

            // Cargar compras del producto actual si está guardado
            const prodId = document.getElementById('prod-id').value;
            if (prodId) {
                cargarHistorialCompras(prodId);
            } else {
                renderizarTablaCompras([]);
            }
        }

        if (typeof triggerHaptic === 'function') triggerHaptic(10);
    };

    // Filtrar por Pill de Categoría
    window.filtrarPorPillCategoria = function(catId) {
        selectedCategoriaPill = catId;
        renderizarCategoryPills();
        filtrarProductosInventario();
        if (typeof triggerHaptic === 'function') triggerHaptic(10);
    };

    function renderizarCategoryPills() {
        const contenedor = document.getElementById('contenedor-category-pills');
        if (!contenedor) return;

        let html = `<button type="button" class="cat-pill ${selectedCategoriaPill === '' ? 'active' : ''}" onclick="filtrarPorPillCategoria('')">Todos</button>`;

        categoriasData.forEach(c => {
            const isActive = String(selectedCategoriaPill) === String(c.id);
            html += `<button type="button" class="cat-pill ${isActive ? 'active' : ''}" onclick="filtrarPorPillCategoria('${c.id}')">${c.nombre}</button>`;
        });

        contenedor.innerHTML = html;
    }

    function escapeHtml(str) {
        if (!str) return '';
        return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    // Cargar Catálogos Auxiliares (Tipos, Unidades, Ubicaciones, Proveedores, Categorías)
    window.cargarCatalogosInventario = async function() {
        try {
            const res = await fetch((window.APP_BASE || '') + '/api/index.php?request=inventario/list_catalogos');
            const data = await res.json();
            if (data.status === 'success' && data.data) {
                catalogosData = data.data;
                categoriasData = (data.data.categoria || []).map(c => ({ id: c.id, nombre: c.valor }));

                // 1. Renderizar pills de categorías
                renderizarCategoryPills();

                // 2. Poblar selector de categorías
                const modalCat = document.getElementById('prod-categoria');
                if (modalCat) {
                    const currentVal = modalCat.value;
                    let catHtml = '<option value="">Sin Categoría</option>';
                    (catalogosData.categoria || []).forEach(c => {
                        catHtml += `<option value="${c.id}">${escapeHtml(c.valor)}</option>`;
                    });
                    modalCat.innerHTML = catHtml;
                    if (currentVal) modalCat.value = currentVal;
                }

                // 3. Poblar selector de tipos de artículo
                const modalTipo = document.getElementById('prod-tipo-articulo');
                if (modalTipo) {
                    const currentVal = modalTipo.value;
                    let tipoHtml = '';
                    (catalogosData.tipo_articulo || []).forEach(t => {
                        tipoHtml += `<option value="${escapeHtml(t.valor)}">${escapeHtml(t.valor)}</option>`;
                    });
                    modalTipo.innerHTML = tipoHtml;
                    if (currentVal) modalTipo.value = currentVal;
                }

                // 4. Poblar selector de unidades de medida
                const modalUnidad = document.getElementById('prod-unidad-medida');
                if (modalUnidad) {
                    const currentVal = modalUnidad.value;
                    let undHtml = '';
                    (catalogosData.unidad_medida || []).forEach(u => {
                        undHtml += `<option value="${escapeHtml(u.valor)}">${escapeHtml(u.valor)}</option>`;
                    });
                    modalUnidad.innerHTML = undHtml;
                    if (currentVal) modalUnidad.value = currentVal;
                }

                // 5. Poblar selector de ubicaciones físicas
                const modalUbicacion = document.getElementById('prod-ubicacion-fisica');
                if (modalUbicacion) {
                    const currentVal = modalUbicacion.value;
                    let ubiHtml = '';
                    (catalogosData.ubicacion_fisica || []).forEach(u => {
                        ubiHtml += `<option value="${escapeHtml(u.valor)}">${escapeHtml(u.valor)}</option>`;
                    });
                    modalUbicacion.innerHTML = ubiHtml;
                    if (currentVal) modalUbicacion.value = currentVal;
                }

                // 6. Poblar datalist de proveedores habituales
                const dlProv = document.getElementById('dl-proveedores');
                if (dlProv) {
                    let provHtml = '';
                    (catalogosData.proveedor_habitual || []).forEach(p => {
                        provHtml += `<option value="${escapeHtml(p.valor)}"></option>`;
                    });
                    dlProv.innerHTML = provHtml;
                }
            }
        } catch (e) {
            console.error('Error cargando catálogos:', e);
        }
    };
    window.cargarCategoriasInventario = window.cargarCatalogosInventario; // compatibilidad


    // Cargar catálogo de productos
    window.cargarProductosInventario = async function(manual = false) {
        const contenedor = document.getElementById('contenedor-productos-catalogo');
        if (!contenedor) return;

        if (manual && typeof showToast === 'function') {
            showToast('Actualizando catálogo...', 'info');
        }

        try {
            const res = await fetch((window.APP_BASE || '') + '/api/index.php?request=inventario/list_productos');
            const data = await res.json();
            if (data.status === 'success') {
                productosData = data.data || [];
                actualizarKpisProductos(productosData);
                renderizarCatalogoProductos(productosData);
                if (manual && typeof showToast === 'function') {
                    showToast('Catálogo actualizado', 'success');
                }
            } else {
                contenedor.innerHTML = `<div style="text-align:center; color:var(--danger); padding:24px;">${data.message || 'Error al cargar productos'}</div>`;
            }
        } catch (e) {
            console.error('Error cargando productos:', e);
            contenedor.innerHTML = `<div style="text-align:center; color:var(--danger); padding:24px;">Error de comunicación con el servidor</div>`;
        }
    };

    // Actualizar KPIs
    function actualizarKpisProductos(items) {
        const total = items.length;
        let disponibles = 0;
        let bajoStock = 0;
        let valorTotal = 0;

        items.forEach(p => {
            const stock = parseFloat(p.stock_actual) || 0;
            const stockMin = parseFloat(p.stock_minimo) || 0;
            const costo = parseFloat(p.costo_unitario) || 0;

            if (p.estado === 'disponible' && stock > 0) disponibles++;
            if (stock <= stockMin || p.estado === 'agotado') bajoStock++;
            valorTotal += (stock * costo);
        });

        const kpiTotal = document.getElementById('kpi-total-productos');
        const kpiDisp = document.getElementById('kpi-disponibles');
        const kpiBajo = document.getElementById('kpi-bajo-stock');
        const kpiValor = document.getElementById('kpi-valor-inventario');

        if (kpiTotal) kpiTotal.innerText = total;
        if (kpiDisp) kpiDisp.innerText = disponibles;
        if (kpiBajo) kpiBajo.innerText = bajoStock;
        if (kpiValor) kpiValor.innerText = `S/ ${valorTotal.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }

    // Toggle desglosable de fila en PC y en Móvil
    window.toggleProductoDetalle = function(id) {
        if (expandedProductIds.has(id)) {
            expandedProductIds.delete(id);
        } else {
            expandedProductIds.add(id);
        }

        // Refrescar vistas específicas
        const pcRow = document.getElementById(`prod-row-${id}`);
        const pcDrawer = document.getElementById(`prod-drawer-${id}`);
        const mobileCard = document.getElementById(`prod-mcard-${id}`);

        if (pcRow && pcDrawer) {
            if (expandedProductIds.has(id)) {
                pcRow.classList.add('prod-row-expanded');
                pcDrawer.style.display = '';
            } else {
                pcRow.classList.remove('prod-row-expanded');
                pcDrawer.style.display = 'none';
            }
        }

        if (mobileCard) {
            if (expandedProductIds.has(id)) {
                mobileCard.classList.add('expanded');
            } else {
                mobileCard.classList.remove('expanded');
            }
        }

        if (typeof triggerHaptic === 'function') triggerHaptic(10);
    };

    // Helper para formato de tipo de artículo
    function formatearTipoArticulo(tipo) {
        const tipos = {
            'materia_prima': 'Materia Prima',
            'producto_terminado': 'Producto Terminado',
            'subreceta': 'Insumo Procesado',
            'bebida': 'Bebida / Envasado',
            'empaque': 'Empaque'
        };
        return tipos[tipo] || (tipo ? tipo.replace('_', ' ') : 'Materia Prima');
    }

    // Abreviar unidad de medida para que no desborde en móvil
    function abreviarUnidad(u) {
        if (!u) return 'und.';
        const s = u.toLowerCase();
        if (s.includes('kilo') || s.includes('(kg)') || s === 'kg') return 'kg';
        if (s.includes('litro') || s.includes('(l)') || s === 'l') return 'L';
        if (s.includes('gram') || s.includes('(g)') || s === 'g') return 'g';
        if (s.includes('mili') || s.includes('(ml)') || s === 'ml') return 'ml';
        if (s.includes('porc')) return 'porc.';
        return 'und.';
    }

    // Renderizado Dual: Tabla Deslizable en PC + Cards Ordenadas en Móvil
    function renderizarCatalogoProductos(items) {
        const contenedor = document.getElementById('contenedor-productos-catalogo');
        if (!contenedor) return;

        if (items.length === 0) {
            contenedor.innerHTML = `
                <div style="text-align: center; padding: 48px 20px; background: var(--bg-panel); border-radius: 16px; border: 1px solid var(--border-color);">
                    <div style="width: 56px; height: 56px; border-radius: 50%; background: var(--bg-main); color: var(--text-sec); display: inline-flex; align-items: center; justify-content: center; font-size: 26px; margin-bottom: 12px;">
                        <i class="ph ph-package"></i>
                    </div>
                    <h4 style="margin-bottom: 4px; font-weight: 600; color: var(--text-main);">No hay insumos ni productos</h4>
                    <p style="color: var(--text-sec); font-size: 13px; margin-bottom: 16px;">Comienza registrando tu primer insumo con costeo e inventario.</p>
                    <button class="btn btn-primary" onclick="abrirModalProducto()" style="border-radius: 10px;">
                        <i class="ph ph-plus"></i> Registrar Primer Insumo
                    </button>
                </div>
            `;
            return;
        }

        // ==========================================
        // 1. GENERAR TABLA PARA PC (DESLIZABLE)
        // ==========================================
        let pcTableHtml = `
            <div class="prod-desktop-table">
                <div class="table-responsive-desktop">
                    <table class="prod-table-scroll">
                        <thead>
                            <tr>
                                <th style="width: 280px;">Insumo / Producto</th>
                                <th>Tipo</th>
                                <th>Ubicación</th>
                                <th>U. Medida</th>
                                <th style="text-align: right;">Costo Base</th>
                                <th style="text-align: right;">Precio Vta.</th>
                                <th style="text-align: center;">Stock Actual</th>
                                <th style="text-align: center;">Compras</th>
                                <th style="text-align: center;">Estado</th>
                                <th style="text-align: center; width: 140px;">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
        `;

        // ==========================================
        // 2. GENERAR CARDS PARA MÓVIL (2 COLUMNAS)
        // ==========================================
        let mobileCardsHtml = `<div class="prod-mobile-cards">`;

        items.forEach(p => {
            const stock = parseFloat(p.stock_actual) || 0;
            const stockMin = parseFloat(p.stock_minimo) || 0;
            const costo = parseFloat(p.costo_unitario) || 0;
            const precio = parseFloat(p.precio_venta) || 0;
            const isExpanded = expandedProductIds.has(p.id);
            const totalCompras = parseInt(p.total_compras) || 0;
            const unidad = p.unidad_medida || 'unidades';
            const unidadCorta = abreviarUnidad(unidad);

            // Alerta visual de stock
            let stockBadgeClass = 'badge-success';
            let stockEstadoTxt = 'Saludable';
            if (stock <= 0) {
                stockBadgeClass = 'badge-danger';
                stockEstadoTxt = 'Agotado';
            } else if (stock <= stockMin) {
                stockBadgeClass = 'badge-warning';
                stockEstadoTxt = 'Crítico / Reabastecer';
            }

            // Estado Badge
            let estadoBadge = '<span class="badge badge-success" style="text-transform:capitalize;">Disponible</span>';
            if (p.estado === 'agotado' || stock <= 0) {
                estadoBadge = '<span class="badge badge-danger" style="text-transform:capitalize;">Agotado</span>';
            } else if (p.estado === 'inactivo') {
                estadoBadge = '<span class="badge" style="background:var(--border-color); color:var(--text-sec); text-transform:capitalize;">Inactivo</span>';
            }

            // Thumbnail
            const thumbImg = p.imagen_url
                ? `<img src="${p.imagen_url}" class="prod-mobile-thumb">`
                : `<div class="prod-mobile-thumb"><i class="ph ph-package"></i></div>`;

            const pcThumb = p.imagen_url
                ? `<img src="${p.imagen_url}" style="width: 38px; height: 38px; border-radius: 10px; object-fit: cover; border: 1px solid var(--border-color); flex-shrink: 0;">`
                : `<div style="width: 38px; height: 38px; border-radius: 10px; background: var(--bg-main); border: 1px solid var(--border-color); display: flex; align-items: center; justify-content: center; color: var(--text-sec); flex-shrink: 0;"><i class="ph ph-package" style="font-size: 20px;"></i></div>`;

            // Fila de Tabla PC
            pcTableHtml += `
                <tr class="prod-row ${isExpanded ? 'prod-row-expanded' : ''}" id="prod-row-${p.id}" onclick="toggleProductoDetalle(${p.id})" style="cursor: pointer;">
                    <td>
                        <div style="display: flex; align-items: center; gap: 12px;">
                            ${pcThumb}
                            <div style="min-width: 0;">
                                <div style="font-weight: 700; color: var(--text-main); font-size: 13.5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 210px;">${p.nombre}</div>
                                <div style="display: flex; align-items: center; gap: 6px; margin-top: 2px;">
                                    <span style="font-family: monospace; font-size: 11px; background: var(--bg-main); padding: 1px 6px; border-radius: 4px; border: 1px solid var(--border-color); color: var(--text-sec);">${p.codigo_sku || 'S/N'}</span>
                                    <span style="font-size: 11px; color: var(--text-sec);">${p.categoria_nombre || 'General'}</span>
                                </div>
                            </div>
                        </div>
                    </td>
                    <td>
                        <span class="badge" style="background: rgba(239, 68, 68, 0.08); color: var(--primary); font-weight: 600; font-size: 11px; border: 1px solid rgba(239, 68, 68, 0.2);">
                            ${formatearTipoArticulo(p.tipo_articulo)}
                        </span>
                    </td>
                    <td style="color: var(--text-sec); font-size: 12.5px;">
                        ${p.ubicacion_fisica ? `<i class="ph ph-map-pin" style="vertical-align: middle;"></i> ${p.ubicacion_fisica}` : '-'}
                    </td>
                    <td style="color: var(--text-sec); font-size: 12.5px;">
                        ${unidad}
                    </td>
                    <td style="text-align: right; font-weight: 600; color: #059669;">
                        S/ ${costo.toFixed(2)}
                    </td>
                    <td style="text-align: right; font-weight: 700; color: var(--text-main);">
                        S/ ${precio.toFixed(2)}
                    </td>
                    <td style="text-align: center;">
                        <span class="badge ${stockBadgeClass}" style="font-size: 11.5px; font-weight: 700; padding: 4px 9px;">
                            ${stock}
                        </span>
                        <div style="font-size: 10.5px; color: var(--text-sec); margin-top: 2px;">Mín: ${stockMin}</div>
                    </td>
                    <td style="text-align: center;" onclick="event.stopPropagation()">
                        <button class="btn btn-secondary btn-sm" onclick="abrirModalProductoConTab(${p.id}, 'historial')" title="Ver historial de facturas y compras" style="border-radius: 8px; font-size: 11.5px; padding: 3px 8px;">
                            <i class="ph ph-receipt"></i> ${totalCompras}
                        </button>
                    </td>
                    <td style="text-align: center;">
                        ${estadoBadge}
                    </td>
                    <td style="text-align: center;" onclick="event.stopPropagation()">
                        <div style="display: inline-flex; gap: 4px; align-items: center;">
                            <button class="btn-icon" style="color: var(--primary);" title="Ajustar existencias" onclick="abrirModalAjusteStock(${p.id}, '${p.nombre.replace(/'/g, "\\'")}', ${stock}, '${unidad}')">
                                <i class="ph ph-scales"></i>
                            </button>
                            <button class="btn-icon" style="color: var(--link);" title="Editar insumo" onclick="abrirModalProducto(${p.id})">
                                <i class="ph ph-pencil-simple"></i>
                            </button>
                            <button class="btn-icon" style="color: var(--danger);" title="Eliminar insumo" onclick="eliminarProducto(${p.id}, '${p.nombre.replace(/'/g, "\\'")}')">
                                <i class="ph ph-trash"></i>
                            </button>
                            <button class="btn-icon" style="color: var(--text-sec);" title="Ver desglose" onclick="toggleProductoDetalle(${p.id})">
                                <i class="ph ph-caret-down" style="transition: transform 0.2s ease; transform: ${isExpanded ? 'rotate(180deg)' : 'rotate(0)'};"></i>
                            </button>
                        </div>
                    </td>
                </tr>
                <tr class="prod-drawer-row" id="prod-drawer-${p.id}" style="${isExpanded ? '' : 'display: none;'}">
                    <td colspan="10">
                        <div class="prod-drawer-content">
                            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px;">
                                <div style="background: var(--bg-panel); border: 1px solid var(--border-color); border-radius: 12px; padding: 12px 14px;">
                                    <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--text-sec); margin-bottom: 6px;">Proveedor & Trazabilidad</div>
                                    <div style="font-size: 13px; color: var(--text-main); margin-bottom: 4px;"><strong>Proveedor Habitual:</strong> ${p.proveedor_habitual || 'No registrado'}</div>
                                    <div style="font-size: 13px; color: var(--text-main);"><strong>Cód. Barras / Lote:</strong> ${p.codigo_barras || 'No registrado'}</div>
                                </div>
                                <div style="background: var(--bg-panel); border: 1px solid var(--border-color); border-radius: 12px; padding: 12px 14px;">
                                    <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--text-sec); margin-bottom: 6px;">Control y Valorización</div>
                                    <div style="font-size: 13px; color: var(--text-main); margin-bottom: 4px;"><strong>Capital Inmovilizado:</strong> S/ ${(stock * costo).toFixed(2)}</div>
                                    <div style="font-size: 13px; color: var(--text-main);"><strong>Estado de Stock:</strong> <span style="color: ${stock <= 0 ? 'var(--danger)' : (stock <= stockMin ? '#F59E0B' : 'var(--success)')}; font-weight: 600;">${stockEstadoTxt}</span></div>
                                </div>
                                <div style="background: var(--bg-panel); border: 1px solid var(--border-color); border-radius: 12px; padding: 12px 14px;">
                                    <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--text-sec); margin-bottom: 6px;">Notas / Especificaciones</div>
                                    <div style="font-size: 12.5px; color: var(--text-sec);">${p.descripcion ? p.descripcion : '<em>Sin notas registradas.</em>'}</div>
                                </div>
                            </div>
                        </div>
                    </td>
                </tr>
            `;

            // Card Móvil Ordenada (2 columnas y sin cortes ni saltos de línea)
            mobileCardsHtml += `
                <div class="prod-mobile-card ${isExpanded ? 'expanded' : ''}" id="prod-mcard-${p.id}">
                    <!-- Cabecera Superior: Foto + Título en 1 fila con Estado Badge + Badges -->
                    <div class="prod-mobile-top">
                        ${thumbImg}
                        <div class="prod-mobile-header-info">
                            <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; margin-bottom: 2px;">
                                <div class="prod-mobile-title" title="${p.nombre}">${p.nombre}</div>
                                <div style="flex-shrink: 0;">${estadoBadge}</div>
                            </div>
                            <div class="prod-mobile-badges">
                                <span class="prod-mobile-sku">${p.codigo_sku || 'S/N'}</span>
                                <span class="badge" style="background: rgba(239, 68, 68, 0.08); color: var(--primary); font-size: 10.5px; font-weight: 600; white-space: nowrap; border: 1px solid rgba(239, 68, 68, 0.2);">
                                    ${formatearTipoArticulo(p.tipo_articulo)}
                                </span>
                                ${p.categoria_nombre ? `<span style="font-size: 11px; color: var(--text-sec); white-space: nowrap;">• ${p.categoria_nombre}</span>` : ''}
                            </div>
                        </div>
                    </div>

                    <!-- Grid de Datos Clave en 2 Columnas (Sin colisiones de texto en móvil) -->
                    <div class="prod-mobile-stats">
                        <div class="prod-stat-col">
                            <span class="prod-stat-title">Existencias</span>
                            <div class="prod-stat-val">
                                <span class="badge ${stockBadgeClass}" style="font-size: 11.5px; font-weight: 700; padding: 2px 7px; display: inline-block;">
                                    ${stock} ${unidadCorta}
                                </span>
                            </div>
                            <div style="font-size: 10px; color: var(--text-sec); margin-top: 2px; white-space: nowrap;">
                                Mín: <strong style="color: var(--text-main);">${stockMin}</strong>
                            </div>
                        </div>
                        <div class="prod-stat-col" style="text-align: right;">
                            <span class="prod-stat-title" style="text-align: right;">
                                ${precio > 0 ? 'Precio Venta' : 'Costo Prom. (CPP)'}
                            </span>
                            <div class="prod-stat-val" style="text-align: right;">
                                <span style="font-weight: 700; color: var(--text-main); font-size: 13.5px;">
                                    ${precio > 0 ? `S/ ${precio.toFixed(2)}` : `<span style="color:#059669;">S/ ${costo.toFixed(2)}</span>`}
                                </span>
                            </div>
                            <div style="font-size: 10px; color: var(--text-sec); text-align: right; margin-top: 2px; white-space: nowrap;">
                                ${precio > 0 && costo > 0 ? `CPP: S/ ${costo.toFixed(2)}` : (precio > 0 ? 'Sin compras' : 'Costo unit.')}
                            </div>
                        </div>
                    </div>

                    <!-- Barra Inferior de Acciones Táctiles y Desglose -->
                    <div class="prod-mobile-actions">
                        <div class="prod-mobile-btns">
                            <button class="btn btn-secondary btn-sm" onclick="abrirModalAjusteStock(${p.id}, '${p.nombre.replace(/'/g, "\\'")}', ${stock}, '${unidad}')" title="Ajustar existencias">
                                <i class="ph ph-scales"></i> Ajustar
                            </button>
                            <button class="btn btn-secondary btn-sm" onclick="abrirModalProducto(${p.id})" title="Editar insumo">
                                <i class="ph ph-pencil-simple"></i> Editar
                            </button>
                            <button class="btn btn-secondary btn-sm text-danger btn-icon" onclick="eliminarProducto(${p.id}, '${p.nombre.replace(/'/g, "\\'")}')" title="Eliminar">
                                <i class="ph ph-trash"></i>
                            </button>
                        </div>

                        <div class="prod-chevron" onclick="toggleProductoDetalle(${p.id})" title="Ver detalles extendidos">
                            <i class="ph ph-caret-down"></i>
                        </div>
                    </div>

                    <!-- Panel Desglosable para Móvil -->
                    <div class="prod-mobile-collapse">
                        <div style="font-size: 12px; color: var(--text-main); margin-bottom: 6px;">
                            <strong>Ubicación Física:</strong> ${p.ubicacion_fisica || 'No asignada'}
                        </div>
                        <div style="font-size: 12px; color: var(--text-main); margin-bottom: 6px;">
                            <strong>Proveedor:</strong> ${p.proveedor_habitual || 'No registrado'}
                        </div>
                        <div style="font-size: 12px; color: var(--text-main); margin-bottom: 6px;">
                            <strong>Código de Barras:</strong> ${p.codigo_barras || 'No registrado'}
                        </div>
                        <div style="font-size: 12px; color: var(--text-main); margin-bottom: 8px;">
                            <strong>Compras Registradas:</strong> 
                            <button class="btn btn-secondary btn-sm" onclick="abrirModalProductoConTab(${p.id}, 'historial')" style="margin-left: 6px; padding: 2px 8px; font-size: 11px;">
                                <i class="ph ph-receipt"></i> Ver ${totalCompras} comprobantes
                            </button>
                        </div>
                        <div style="font-size: 11.5px; color: var(--text-sec); border-top: 1px dashed var(--border-color); padding-top: 6px;">
                            ${p.descripcion || 'Sin descripción adicional.'}
                        </div>
                    </div>
                </div>
            `;
        });

        pcTableHtml += `
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        mobileCardsHtml += `</div>`;

        contenedor.innerHTML = pcTableHtml + mobileCardsHtml;

        if (typeof window.renderPhosphorIcons === 'function') {
            window.renderPhosphorIcons(contenedor);
        }
    }

    // Filtrar catálogo de productos
    window.filtrarProductosInventario = function() {
        const query = (document.getElementById('filtro-prod-buscar')?.value || '').toLowerCase().trim();

        const filtrados = productosData.filter(p => {
            const matchQ = !query || 
                p.nombre.toLowerCase().includes(query) || 
                (p.codigo_sku && p.codigo_sku.toLowerCase().includes(query)) ||
                (p.proveedor_habitual && p.proveedor_habitual.toLowerCase().includes(query)) ||
                (p.codigo_barras && p.codigo_barras.toLowerCase().includes(query)) ||
                (p.descripcion && p.descripcion.toLowerCase().includes(query));

            const matchCat = !selectedCategoriaPill || String(p.id_categoria) === String(selectedCategoriaPill);

            return matchQ && matchCat;
        });

        renderizarCatalogoProductos(filtrados);
    };

    // Abrir Modal de Producto (con soporte de pestaña inicial)
    window.abrirModalProductoConTab = function(id = null, tab = 'info') {
        abrirModalProducto(id);
        if (tab === 'historial') {
            switchModalProductoTab('historial');
        }
    };

    // Abrir Modal de Producto
    window.abrirModalProducto = function(id = null) {
        const modal = document.getElementById('modal-producto');
        const titulo = document.getElementById('modal-producto-titulo');
        const badgeModo = document.getElementById('modal-badge-modo');
        const form = document.getElementById('form-producto');
        if (!modal) return;

        form.reset();
        document.getElementById('prod-id').value = '';
        document.getElementById('prod-imagen-url').value = '';
        document.getElementById('modal-tab-compras-count').innerText = '0';
        comprasDelProducto = [];
        comprasFiltroBusqueda = '';
        comprasFiltroFechaDesde = '';
        comprasFiltroFechaHasta = '';
        comprasFiltroPagina = 1;
        const bInput = document.getElementById('filtro-compras-buscar');
        if (bInput) bInput.value = '';
        const fDesde = document.getElementById('filtro-compras-desde');
        if (fDesde) fDesde.value = '';
        const fHasta = document.getElementById('filtro-compras-hasta');
        if (fHasta) fHasta.value = '';
        const cLim = document.getElementById('filtro-compras-limite');
        if (cLim) cLim.value = '50';
        comprasFiltroLimite = 50;

        document.getElementById('compra-num-comprobante').value = '';
        document.getElementById('compra-proveedor').value = '';
        document.getElementById('compra-cantidad').value = '';
        document.getElementById('compra-precio-unitario').value = '';
        const compTotal = document.getElementById('compra-total-calculado');
        if (compTotal) compTotal.innerText = 'S/ 0.00';
        const ocrBadge = document.getElementById('ocr-badge-status');
        if (ocrBadge) ocrBadge.style.display = 'none';

        comprobanteFileAdjunto = null;
        removerComprobanteAdjunto();

        // Restablecer preview de imagen
        const photoImg = document.getElementById('prod-photo-img');
        const photoPlaceholder = document.getElementById('prod-photo-placeholder');
        if (photoImg && photoPlaceholder) {
            photoImg.src = '';
            photoImg.style.display = 'none';
            photoPlaceholder.style.display = 'block';
        }

        switchModalProductoTab('info');

        if (id) {
            currentProductoEnEdicion = productosData.find(x => String(x.id) === String(id));
            if (currentProductoEnEdicion) {
                const p = currentProductoEnEdicion;
                titulo.innerText = 'Editar Producto / Insumo';
                if (badgeModo) {
                    badgeModo.innerText = 'EDITAR';
                    badgeModo.style.background = 'rgba(59, 130, 246, 0.12)';
                    badgeModo.style.color = '#2563EB';
                    badgeModo.style.borderColor = 'rgba(59, 130, 246, 0.25)';
                }

                document.getElementById('prod-id').value = p.id;
                document.getElementById('prod-sku').value = p.codigo_sku || '';
                document.getElementById('prod-nombre').value = p.nombre || '';
                document.getElementById('prod-tipo-articulo').value = p.tipo_articulo || 'materia_prima';
                document.getElementById('prod-unidad-medida').value = p.unidad_medida || 'Kilogramos (kg)';
                document.getElementById('prod-ubicacion-fisica').value = p.ubicacion_fisica || 'Cámara Fría';
                document.getElementById('prod-proveedor').value = p.proveedor_habitual || '';
                document.getElementById('prod-codigo-barras').value = p.codigo_barras || '';
                document.getElementById('prod-stock-inicial').value = p.stock_actual || '0.00';
                document.getElementById('prod-stock-minimo').value = p.stock_minimo || '5.00';
                document.getElementById('prod-costo-unitario').value = p.costo_unitario || '0.00';
                document.getElementById('prod-precio-venta').value = p.precio_venta || '0.00';
                document.getElementById('prod-categoria').value = p.id_categoria || '';
                document.getElementById('prod-estado').value = p.estado || 'disponible';
                document.getElementById('prod-descripcion').value = p.descripcion || '';

                if (p.imagen_url) {
                    document.getElementById('prod-imagen-url').value = p.imagen_url;
                    if (photoImg && photoPlaceholder) {
                        photoImg.src = p.imagen_url;
                        photoImg.style.display = 'block';
                        photoPlaceholder.style.display = 'none';
                    }
                }

                actualizarEstadoEAN13(p.codigo_barras || '');
                cargarHistorialCompras(p.id);
            }
        } else {
            currentProductoEnEdicion = null;
            titulo.innerText = 'Registrar Nuevo Producto / Insumo';
            if (badgeModo) {
                badgeModo.innerText = 'NUEVO';
                badgeModo.style.background = 'rgba(239, 68, 68, 0.1)';
                badgeModo.style.color = 'var(--primary)';
                badgeModo.style.borderColor = 'rgba(239, 68, 68, 0.2)';
            }
            generarSkuAutomatico();
            actualizarEstadoEAN13('');
            filtrarComprasDelProducto(1);
        }

        modal.classList.remove('hidden');
        requestAnimationFrame(() => modal.classList.add('show'));
        
        if (typeof window.renderPhosphorIcons === 'function') {
            window.renderPhosphorIcons(modal);
        }
    };

    window.cerrarModalProducto = function() {
        const modal = document.getElementById('modal-producto');
        if (!modal) return;
        modal.classList.remove('show');
        setTimeout(() => modal.classList.add('hidden'), 200);
    };

    // Generar SKU automático de insumo
    window.generarSkuAutomatico = function() {
        const num = Math.floor(100 + Math.random() * 900);
        const skuInput = document.getElementById('prod-sku');
        if (skuInput) skuInput.value = `MP-${num}`;
    };

    // Procesar foto seleccionada (local preview + base64)
    window.procesarFotoSeleccionada = function(input) {
        if (!input.files || input.files.length === 0) return;
        const file = input.files[0];
        const reader = new FileReader();

        reader.onload = function(e) {
            const photoImg = document.getElementById('prod-photo-img');
            const photoPlaceholder = document.getElementById('prod-photo-placeholder');
            const inputUrl = document.getElementById('prod-imagen-url');

            if (photoImg && photoPlaceholder) {
                photoImg.src = e.target.result;
                photoImg.style.display = 'block';
                photoPlaceholder.style.display = 'none';
            }
            if (inputUrl) {
                inputUrl.value = e.target.result; // guardamos base64 para subir al guardar
            }
        };

        reader.readAsDataURL(file);
    };

    // Quitar foto del producto
    window.eliminarFotoProducto = async function() {
        const inputUrl = document.getElementById('prod-imagen-url');
        const photoImg = document.getElementById('prod-photo-img');
        const photoPlaceholder = document.getElementById('prod-photo-placeholder');
        const inputFile = document.getElementById('prod-input-foto');

        if ((inputUrl && inputUrl.value) || (photoImg && photoImg.src && !photoImg.src.endsWith('#') && photoImg.style.display !== 'none')) {
            const confirmarFn = window.confirmarAccion || function(opts) {
                return Promise.resolve(confirm(opts.mensaje || '¿Quitar foto?'));
            };
            const confirmado = await confirmarFn({
                titulo: '¿Quitar Fotografía?',
                mensaje: '¿Deseas remover la foto actual de este producto?',
                detalle: 'El producto se mostrará con el icono predeterminado sin imagen.',
                tipo: 'warning',
                icono: 'trash',
                textoConfirmar: 'Sí, Quitar',
                textoCancelar: 'Cancelar'
            });
            if (!confirmado) return;
        }

        if (photoImg) {
            photoImg.src = '';
            photoImg.style.display = 'none';
        }
        if (photoPlaceholder) {
            photoPlaceholder.style.display = 'block';
        }
        if (inputUrl) inputUrl.value = '';
        if (inputFile) inputFile.value = '';

        if (typeof triggerHaptic === 'function') triggerHaptic(10);
    };

    // Guardar Producto
    window.guardarProducto = async function() {
        const btn = document.getElementById('btn-guardar-producto');
        const id = document.getElementById('prod-id').value;
        const nombre = document.getElementById('prod-nombre').value.trim();
        const codigo_sku = document.getElementById('prod-sku').value.trim();
        const tipo_articulo = document.getElementById('prod-tipo-articulo').value;
        const unidad_medida = document.getElementById('prod-unidad-medida').value;
        const ubicacion_fisica = document.getElementById('prod-ubicacion-fisica').value;
        const proveedor_habitual = document.getElementById('prod-proveedor').value.trim();
        const codigo_barras = document.getElementById('prod-codigo-barras').value.trim();
        const stock_actual = parseFloat(document.getElementById('prod-stock-inicial').value) || 0;
        const stock_minimo = parseFloat(document.getElementById('prod-stock-minimo').value) || 0;
        const costo_unitario = parseFloat(document.getElementById('prod-costo-unitario').value) || 0;
        const precio_venta = parseFloat(document.getElementById('prod-precio-venta').value) || 0;
        const id_categoria = document.getElementById('prod-categoria').value || null;
        const estado = document.getElementById('prod-estado').value;
        const descripcion = document.getElementById('prod-descripcion').value.trim();
        let imagen_url = document.getElementById('prod-imagen-url').value;

        if (!nombre) {
            if (typeof showToast === 'function') showToast('El nombre comercial del insumo es obligatorio', 'error');
            return;
        }
        if (!codigo_sku) {
            if (typeof showToast === 'function') showToast('El código SKU es obligatorio', 'error');
            return;
        }

        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Guardando...';
        }

        try {
            // Si la foto es un base64 nuevo, subirla primero
            if (imagen_url && imagen_url.startsWith('data:image/')) {
                try {
                    const upRes = await fetch((window.APP_BASE || '') + '/api/index.php?request=inventario/upload_foto_producto', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            data: imagen_url,
                            extension: 'jpg'
                        })
                    });
                    const upData = await upRes.json();
                    if (upData.status === 'success' && upData.data?.url) {
                        imagen_url = upData.data.url;
                    }
                } catch (imgErr) {
                    console.warn('No se pudo subir la foto por separado:', imgErr);
                }
            }

            const payload = {
                id: id || null,
                nombre,
                codigo_sku,
                tipo_articulo,
                unidad_medida,
                ubicacion_fisica,
                proveedor_habitual,
                codigo_barras,
                stock_actual,
                stock_minimo,
                costo_unitario,
                precio_venta,
                id_categoria,
                estado,
                descripcion,
                imagen_url
            };

            const res = await fetch((window.APP_BASE || '') + '/api/index.php?request=inventario/save_producto', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();

            if (res.ok && data.status === 'success') {
                if (typeof showToast === 'function') showToast(data.message || 'Producto guardado exitosamente', 'success');
                cerrarModalProducto();
                await cargarProductosInventario();
            } else {
                if (typeof showToast === 'function') showToast(data.message || 'Error al guardar producto', 'error');
            }
        } catch (e) {
            console.error('Error al guardar producto:', e);
            if (typeof showToast === 'function') showToast('Error al conectar con el servidor', 'error');
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '<i class="ph ph-floppy-disk"></i> Guardar Producto';
            }
        }
    };

    // ========================================================
    // GESTIÓN DE HISTORIAL DE COMPRAS & COMPROBANTES (TAB 2)
    // ========================================================

    // ========================================================
    // GESTIÓN DE HISTORIAL DE COMPRAS, FILTROS & COMPROBANTES (TAB 2)
    // ========================================================

    // Recalcular total estimado en registro de compra
    window.recalcularTotalCompraManual = function() {
        const cant = parseFloat(document.getElementById('compra-cantidad')?.value) || 0;
        const pu = parseFloat(document.getElementById('compra-precio-unitario')?.value) || 0;
        const tot = cant * pu;
        const el = document.getElementById('compra-total-calculado');
        if (el) el.innerText = 'S/ ' + tot.toFixed(2);
    };

    // Cambiar límite de compras por página (10, 20, 50, Todos)
    window.cambiarLimiteCompras = function(nuevoLimite) {
        comprasFiltroLimite = parseInt(nuevoLimite, 10) || 50;
        filtrarComprasDelProducto(1);
    };

    // Filtrar compras del producto en tiempo real por búsqueda y fechas
    window.filtrarComprasDelProducto = function(pagina = 1) {
        comprasFiltroPagina = pagina;
        const query = (document.getElementById('filtro-compras-buscar')?.value || '').toLowerCase().trim();
        const desde = document.getElementById('filtro-compras-desde')?.value || '';
        const hasta = document.getElementById('filtro-compras-hasta')?.value || '';

        let filtradas = (comprasDelProducto || []).filter(c => {
            if (query) {
                const num = (c.numero_comprobante || '').toLowerCase();
                const prov = (c.proveedor || '').toLowerCase();
                if (!num.includes(query) && !prov.includes(query)) return false;
            }
            const fecha = c.fecha ? c.fecha.substring(0, 10) : '';
            if (desde && fecha && fecha < desde) return false;
            if (hasta && fecha && fecha > hasta) return false;
            return true;
        });

        // Totales de la selección filtrada
        let sumaCantidad = 0;
        let sumaTotal = 0;
        filtradas.forEach(c => {
            const cant = parseFloat(c.cantidad) || 0;
            const pu = parseFloat(c.precio_unitario) || 0;
            const tot = parseFloat(c.total) || (cant * pu);
            sumaCantidad += cant;
            sumaTotal += tot;
        });

        const totalItems = filtradas.length;
        const limite = comprasFiltroLimite || 50;
        const totalPaginas = Math.ceil(totalItems / limite) || 1;
        if (comprasFiltroPagina > totalPaginas) comprasFiltroPagina = totalPaginas;

        const inicio = (comprasFiltroPagina - 1) * limite;
        const fin = inicio + limite;
        const paginadas = filtradas.slice(inicio, fin);

        // Actualizar barra de resumen y totales
        const infoTotales = document.getElementById('compras-totales-info');
        if (infoTotales) {
            infoTotales.innerHTML = `Mostrando <strong>${paginadas.length}</strong> de <strong>${totalItems}</strong> registros &bull; Total compras: <strong style="color:#059669;">S/ ${sumaTotal.toFixed(2)}</strong> (${sumaCantidad.toFixed(2)} unidades)`;
        }

        // Renderizar controles de paginación
        const ctrlPag = document.getElementById('compras-paginacion-ctrl');
        if (ctrlPag) {
            if (totalPaginas <= 1) {
                ctrlPag.innerHTML = '';
            } else {
                ctrlPag.innerHTML = `
                    <button type="button" class="btn btn-secondary btn-sm" ${comprasFiltroPagina <= 1 ? 'disabled' : ''} onclick="filtrarComprasDelProducto(${comprasFiltroPagina - 1})" style="padding: 2px 8px; font-size: 11px; border-radius: 6px;">
                        <i class="ph ph-caret-left"></i> Ant
                    </button>
                    <span style="font-size: 11.5px; font-weight: 600; padding: 0 4px;">Pág. ${comprasFiltroPagina} de ${totalPaginas}</span>
                    <button type="button" class="btn btn-secondary btn-sm" ${comprasFiltroPagina >= totalPaginas ? 'disabled' : ''} onclick="filtrarComprasDelProducto(${comprasFiltroPagina + 1})" style="padding: 2px 8px; font-size: 11px; border-radius: 6px;">
                        Sig <i class="ph ph-caret-right"></i>
                    </button>
                `;
            }
        }

        renderizarTablaCompras(paginadas);
    };

    // Cargar compras del producto desde el servidor
    async function cargarHistorialCompras(idProducto) {
        const contadorBadge = document.getElementById('modal-tab-compras-count');
        try {
            const res = await fetch((window.APP_BASE || '') + `/api/index.php?request=inventario/list_compras_producto&id_producto=${idProducto}`);
            const data = await res.json();
            if (data.status === 'success') {
                comprasDelProducto = data.data || [];
                if (contadorBadge) contadorBadge.innerText = comprasDelProducto.length;
                filtrarComprasDelProducto(1);
            }
        } catch (e) {
            console.error('Error cargando compras:', e);
            comprasDelProducto = [];
            filtrarComprasDelProducto(1);
        }
    }

    // Renderizar filas de la tabla de compras
    function renderizarTablaCompras(compras) {
        const contenedor = document.getElementById('contenedor-tabla-compras');
        if (!contenedor) return;

        if (!compras || compras.length === 0) {
            contenedor.innerHTML = `
                <div style="text-align: center; padding: 36px 16px; color: var(--text-sec);">
                    <div style="width: 48px; height: 48px; border-radius: 50%; background: var(--bg-main); color: var(--text-sec); display: inline-flex; align-items: center; justify-content: center; font-size: 24px; margin-bottom: 8px;">
                        <i class="ph ph-file-text"></i>
                    </div>
                    <div style="font-size: 13.5px; font-weight: 600; color: var(--text-main); margin-bottom: 2px;">
                        No hay compras ni comprobantes registrados que coincidan con la búsqueda.
                    </div>
                    <div style="font-size: 12px; color: var(--text-sec);">
                        Puedes registrar una compra arriba o ajustar los filtros de búsqueda y fechas.
                    </div>
                </div>
            `;
            return;
        }

        let html = `
            <table class="table" style="width: 100%; min-width: 650px; font-size: 12.5px;">
                <thead>
                    <tr style="border-bottom: 1px solid var(--border-color); background: var(--bg-main);">
                        <th style="padding: 9px 12px; font-size: 11px; font-weight: 700; color: var(--text-sec);">FECHA</th>
                        <th style="padding: 9px 12px; font-size: 11px; font-weight: 700; color: var(--text-sec);">Nº COMPROBANTE</th>
                        <th style="padding: 9px 12px; font-size: 11px; font-weight: 700; color: var(--text-sec);">PROVEEDOR</th>
                        <th style="padding: 9px 12px; font-size: 11px; font-weight: 700; color: var(--text-sec); text-align: right;">CANTIDAD</th>
                        <th style="padding: 9px 12px; font-size: 11px; font-weight: 700; color: var(--text-sec); text-align: right;">P. UNITARIO</th>
                        <th style="padding: 9px 12px; font-size: 11px; font-weight: 700; color: var(--text-sec); text-align: right;">TOTAL</th>
                        <th style="padding: 9px 12px; font-size: 11px; font-weight: 700; color: var(--text-sec); text-align: center;">COMPROBANTE ADJUNTO</th>
                    </tr>
                </thead>
                <tbody>
        `;

        compras.forEach(c => {
            const fechaStr = c.fecha ? c.fecha.substring(0, 10) : '-';
            const cant = parseFloat(c.cantidad) || 0;
            const precioUnit = parseFloat(c.precio_unitario) || 0;
            const total = parseFloat(c.total) || (cant * precioUnit);

            let adjuntoBtn = '<span style="color:var(--text-sec); font-size:11px;">Sin archivo</span>';
            if (c.comprobante_url) {
                adjuntoBtn = `
                    <a href="${c.comprobante_url}" target="_blank" class="btn btn-secondary btn-sm" style="padding: 2px 8px; font-size: 11px; border-radius: 6px;" title="Ver o descargar comprobante">
                        <i class="ph ph-file-pdf"></i> Ver Adjunto
                    </a>
                `;
            }

            html += `
                <tr style="border-bottom: 1px solid var(--border-color);">
                    <td style="padding: 10px 12px; font-weight: 500;">${fechaStr}</td>
                    <td style="padding: 10px 12px; font-family: monospace; font-weight: 600;">${c.numero_comprobante}</td>
                    <td style="padding: 10px 12px; color: var(--text-main); font-weight: 500;">${c.proveedor}</td>
                    <td style="padding: 10px 12px; text-align: right; font-weight: 600;">${cant.toFixed(2)}</td>
                    <td style="padding: 10px 12px; text-align: right; color: #059669; font-weight: 600;">S/ ${precioUnit.toFixed(2)}</td>
                    <td style="padding: 10px 12px; text-align: right; font-weight: 700; color: var(--text-main);">S/ ${total.toFixed(2)}</td>
                    <td style="padding: 10px 12px; text-align: center;">${adjuntoBtn}</td>
                </tr>
            `;
        });

        html += `</tbody></table>`;
        contenedor.innerHTML = html;

        if (typeof window.renderPhosphorIcons === 'function') {
            window.renderPhosphorIcons(contenedor);
        }
    }

    // Manejar selección de comprobante
    window.manejarSeleccionComprobante = function(input) {
        if (!input.files || input.files.length === 0) return;
        const file = input.files[0];
        comprobanteFileAdjunto = file;

        const label = document.getElementById('compra-file-label');
        const btnRemove = document.getElementById('btn-remover-comprobante');

        if (label) label.innerText = file.name;
        if (btnRemove) btnRemove.style.display = 'inline-flex';
    };

    window.removerComprobanteAdjunto = function() {
        comprobanteFileAdjunto = null;
        const input = document.getElementById('compra-input-file');
        const label = document.getElementById('compra-file-label');
        const btnRemove = document.getElementById('btn-remover-comprobante');

        if (input) input.value = '';
        if (label) label.innerText = 'Subir Archivo';
        if (btnRemove) btnRemove.style.display = 'none';
    };

    // Guardar compra en el historial
    window.guardarCompraHistorial = async function() {
        const prodId = document.getElementById('prod-id').value;
        if (!prodId) {
            if (typeof showToast === 'function') showToast('Primero guarda los datos básicos del insumo antes de registrar compras', 'info');
            switchModalProductoTab('info');
            return;
        }

        const numComp = document.getElementById('compra-num-comprobante').value.trim();
        const prov = document.getElementById('compra-proveedor').value.trim();
        const cant = parseFloat(document.getElementById('compra-cantidad').value);
        const precioUnit = parseFloat(document.getElementById('compra-precio-unitario').value);
        const btn = document.getElementById('btn-agregar-compra');

        if (!numComp) {
            if (typeof showToast === 'function') showToast('Indica el Nº de Comprobante / Factura', 'error');
            return;
        }
        if (!prov) {
            if (typeof showToast === 'function') showToast('Indica el Proveedor de la compra', 'error');
            return;
        }
        if (!cant || cant <= 0) {
            if (typeof showToast === 'function') showToast('Indica una cantidad comprada válida mayor a 0', 'error');
            return;
        }
        if (isNaN(precioUnit) || precioUnit < 0) {
            if (typeof showToast === 'function') showToast('Indica un precio unitario válido', 'error');
            return;
        }

        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Registrando...';
        }

        try {
            let comprobanteUrl = '';

            // Subir comprobante si hay archivo adjunto
            if (comprobanteFileAdjunto) {
                const formData = new FormData();
                formData.append('file', comprobanteFileAdjunto);

                const upRes = await fetch((window.APP_BASE || '') + '/api/index.php?request=inventario/upload_comprobante', {
                    method: 'POST',
                    body: formData
                });
                const upData = await upRes.json();
                if (upData.status === 'success' && upData.data?.url) {
                    comprobanteUrl = upData.data.url;
                }
            }

            const payload = {
                id_producto: parseInt(prodId),
                numero_comprobante: numComp,
                proveedor: prov,
                cantidad: cant,
                precio_unitario: precioUnit,
                total: cant * precioUnit,
                comprobante_url: comprobanteUrl,
                actualizar_stock: true
            };

            const res = await fetch((window.APP_BASE || '') + '/api/index.php?request=inventario/save_compra_producto', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();

            if (res.ok && data.status === 'success') {
                if (typeof showToast === 'function') showToast('Compra registrada e inventario actualizado', 'success');

                // Limpiar formulario de compra
                document.getElementById('compra-num-comprobante').value = '';
                document.getElementById('compra-proveedor').value = '';
                document.getElementById('compra-cantidad').value = '';
                document.getElementById('compra-precio-unitario').value = '';
                const compTotal = document.getElementById('compra-total-calculado');
                if (compTotal) compTotal.innerText = 'S/ 0.00';
                const ocrB = document.getElementById('ocr-badge-status');
                if (ocrB) ocrB.style.display = 'none';
                removerComprobanteAdjunto();

                // Recargar historial y catálogo
                await cargarHistorialCompras(prodId);
                await cargarProductosInventario();
            } else {
                if (typeof showToast === 'function') showToast(data.message || 'Error al registrar compra', 'error');
            }
        } catch (e) {
            console.error('Error al registrar compra:', e);
            if (typeof showToast === 'function') showToast('Error al conectar con el servidor', 'error');
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '<i class="ph ph-plus-circle"></i> + Añadir a Historial';
            }
        }
    };

    // ========================================================
    // CÓDIGOS DE BARRAS ESTÁNDAR EAN-13
    // ========================================================
    window.calcularDigitoVerificadorEAN13 = function(codigo12) {
        if (!codigo12 || codigo12.length !== 12 || !/^\d{12}$/.test(codigo12)) return null;
        let suma = 0;
        for (let i = 0; i < 12; i++) {
            const digito = parseInt(codigo12.charAt(i), 10);
            suma += (i % 2 === 0) ? digito * 1 : digito * 3;
        }
        const resto = suma % 10;
        return (resto === 0) ? 0 : 10 - resto;
    };

    window.generarCodigoBarrasEAN13 = function() {
        const prefijo = '775'; // Prefijo Perú GS1
        let centro = '';
        for (let i = 0; i < 9; i++) {
            centro += Math.floor(Math.random() * 10).toString();
        }
        const codigo12 = prefijo + centro;
        const dv = calcularDigitoVerificadorEAN13(codigo12);
        const ean13 = codigo12 + dv;

        const input = document.getElementById('prod-codigo-barras');
        if (input) {
            input.value = ean13;
            actualizarEstadoEAN13(ean13);
        }
        if (typeof showToast === 'function') {
            showToast('Código EAN-13 generado: ' + ean13, 'info');
        }
    };

    window.actualizarEstadoEAN13 = function(val) {
        const badge = document.getElementById('prod-ean13-badge');
        if (!badge) return;
        val = (val || '').trim();
        if (!val) {
            badge.style.display = 'none';
            return;
        }
        badge.style.display = 'inline-block';
        if (/^\d{13}$/.test(val)) {
            const codigo12 = val.substring(0, 12);
            const dvReal = parseInt(val.charAt(12), 10);
            const dvCalc = calcularDigitoVerificadorEAN13(codigo12);
            if (dvReal === dvCalc) {
                badge.className = 'ean13-tag valid';
                badge.innerHTML = '<i class="ph ph-check"></i> EAN-13 Válido';
            } else {
                badge.className = 'ean13-tag invalid';
                badge.innerHTML = `<i class="ph ph-warning"></i> DV Inválido (${dvCalc})`;
            }
        } else {
            badge.className = 'ean13-tag invalid';
            badge.innerHTML = `<i class="ph ph-x"></i> ${val.length}/13 dígitos`;
        }
    };

    // ========================================================
    // GESTOR DE CATÁLOGOS AUXILIARES DINÁMICO (CRUD)
    // ========================================================
    const NOMBRES_CATALOGOS = {
        tipo_articulo: { titulo: 'Tipos de Artículo', subtitulo: 'Clasificación operativa (materia prima, perecible, etc.)', icon: 'ph-tag' },
        unidad_medida: { titulo: 'Unidades de Medida', subtitulo: 'Unidades para control de inventario (kg, L, und, etc.)', icon: 'ph-scales' },
        ubicacion_fisica: { titulo: 'Ubicaciones Físicas', subtitulo: 'Zonas de almacenamiento (Cámara Fría, Anaquel, etc.)', icon: 'ph-map-pin' },
        proveedor_habitual: { titulo: 'Proveedores Habituales', subtitulo: 'Directorio de proveedores frecuentes', icon: 'ph-truck' },
        categoria: { titulo: 'Categorías en Catálogo', subtitulo: 'Categorías de productos para carta o almacén', icon: 'ph-squares-four' }
    };

    window.abrirGestorCatalogo = function(tipo) {
        gestorCatalogoTipoActual = tipo;
        const config = NOMBRES_CATALOGOS[tipo] || { titulo: 'Gestor de Opciones', subtitulo: '', icon: 'ph-sliders' };
        
        const tit = document.getElementById('gestor-cat-titulo');
        const sub = document.getElementById('gestor-cat-subtitulo');
        const iconDiv = document.getElementById('gestor-cat-icon');
        const inputNuevo = document.getElementById('gestor-input-nuevo');
        
        if (tit) tit.innerText = 'Gestionar ' + config.titulo;
        if (sub) sub.innerText = config.subtitulo;
        if (iconDiv) iconDiv.innerHTML = `<i class="ph ${config.icon}"></i>`;
        if (inputNuevo) {
            inputNuevo.value = '';
            inputNuevo.placeholder = `Nuevo ítem para ${config.titulo}...`;
        }

        renderizarListaGestorCatalogo();

        const modal = document.getElementById('modal-gestor-catalogo');
        if (modal) {
            modal.classList.remove('hidden');
            requestAnimationFrame(() => modal.classList.add('show'));
            if (typeof window.renderPhosphorIcons === 'function') {
                window.renderPhosphorIcons(modal);
            }
        }
    };

    window.cerrarGestorCatalogo = function() {
        const modal = document.getElementById('modal-gestor-catalogo');
        if (!modal) return;
        modal.classList.remove('show');
        setTimeout(() => modal.classList.add('hidden'), 200);
    };

    window.renderizarListaGestorCatalogo = function() {
        const listaCont = document.getElementById('gestor-cat-lista');
        if (!listaCont) return;

        const tipo = gestorCatalogoTipoActual;
        const items = (catalogosData && catalogosData[tipo]) ? catalogosData[tipo] : [];

        if (items.length === 0) {
            listaCont.innerHTML = `
                <div style="text-align: center; padding: 24px; color: var(--text-sec); font-size: 13px;">
                    <i class="ph ph-folder-open" style="font-size: 28px; display: block; margin-bottom: 6px;"></i>
                    No hay elementos en este catálogo. Agrega el primero arriba.
                </div>
            `;
            return;
        }

        let html = '';
        items.forEach((item, idx) => {
            const id = item.id;
            const valor = (tipo === 'categoria') ? item.nombre : item.valor;
            const extra = (tipo === 'categoria' && item.descripcion) ? `<span style="font-size: 11px; color: var(--text-sec); margin-left: 6px;">(${item.descripcion})</span>` : '';
            const safeValor = (valor || '').replace(/'/g, "\\'");

            html += `
                <div class="gestor-cat-item" style="display: flex; justify-content: space-between; align-items: center; padding: 9px 12px; background: var(--bg-main); border: 1px solid var(--border-color); border-radius: 10px;">
                    <div style="font-size: 13px; font-weight: 500; color: var(--text-main); display: flex; align-items: center; gap: 8px;">
                        <span style="width: 20px; height: 20px; border-radius: 50%; background: var(--bg-card); display: inline-flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; color: var(--text-sec);">${idx + 1}</span>
                        <span>${valor}</span>
                        ${extra}
                    </div>
                    <div style="display: flex; gap: 4px;">
                        <button type="button" class="btn-icon" onclick="editarItemCatalogo(${id}, '${tipo}', '${safeValor}')" title="Editar nombre" style="padding: 4px; border-radius: 6px; color: #2563EB;">
                            <i class="ph ph-pencil-simple"></i>
                        </button>
                        <button type="button" class="btn-icon" onclick="eliminarItemCatalogo(${id}, '${tipo}', '${safeValor}')" title="Eliminar opción" style="padding: 4px; border-radius: 6px; color: #DC2626;">
                            <i class="ph ph-trash"></i>
                        </button>
                    </div>
                </div>
            `;
        });

        listaCont.innerHTML = html;
        if (typeof window.renderPhosphorIcons === 'function') {
            window.renderPhosphorIcons(listaCont);
        }
    };

    window.agregarItemCatalogo = async function() {
        const tipo = gestorCatalogoTipoActual;
        const input = document.getElementById('gestor-input-nuevo');
        const valor = input ? input.value.trim() : '';

        if (!valor) {
            if (typeof showToast === 'function') showToast('Escribe un nombre o valor válido', 'error');
            return;
        }

        try {
            const res = await fetch((window.APP_BASE || '') + '/api/index.php?request=inventario/save_catalogo_item', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tipo, valor })
            });
            const data = await res.json();
            if (res.ok && data.status === 'success') {
                if (typeof showToast === 'function') showToast('Opción agregada exitosamente', 'success');
                if (input) input.value = '';
                await cargarCatalogosInventario();
                renderizarListaGestorCatalogo();

                // Seleccionar automáticamente en el formulario
                if (tipo === 'tipo_articulo') {
                    const sel = document.getElementById('prod-tipo-articulo');
                    if (sel) sel.value = valor;
                } else if (tipo === 'unidad_medida') {
                    const sel = document.getElementById('prod-unidad-medida');
                    if (sel) sel.value = valor;
                } else if (tipo === 'ubicacion_fisica') {
                    const sel = document.getElementById('prod-ubicacion-fisica');
                    if (sel) sel.value = valor;
                } else if (tipo === 'proveedor_habitual') {
                    const inp = document.getElementById('prod-proveedor');
                    if (inp) inp.value = valor;
                } else if (tipo === 'categoria' && data.data?.id) {
                    const sel = document.getElementById('prod-categoria');
                    if (sel) sel.value = data.data.id;
                }
            } else {
                if (typeof showToast === 'function') showToast(data.message || 'Error al guardar elemento', 'error');
            }
        } catch (e) {
            console.error('Error al agregar ítem de catálogo:', e);
            if (typeof showToast === 'function') showToast('Error de conexión', 'error');
        }
    };

    window.editarItemCatalogo = async function(id, tipo, valorActual) {
        const config = NOMBRES_CATALOGOS[tipo] || { titulo: 'opción' };
        const nuevoValor = prompt(`Modificar ${config.titulo.toLowerCase().replace(/s$/, '')}:`, valorActual);
        if (!nuevoValor || nuevoValor.trim() === '' || nuevoValor.trim() === valorActual) return;

        try {
            const res = await fetch((window.APP_BASE || '') + '/api/index.php?request=inventario/save_catalogo_item', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id,
                    tipo,
                    valor: nuevoValor.trim()
                })
            });
            const data = await res.json();
            if (res.ok && data.status === 'success') {
                if (typeof showToast === 'function') showToast('Actualizado con éxito', 'success');
                await cargarCatalogosInventario();
                renderizarListaGestorCatalogo();
            } else {
                if (typeof showToast === 'function') showToast(data.message || 'Error al actualizar', 'error');
            }
        } catch (e) {
            console.error('Error al editar catálogo:', e);
            if (typeof showToast === 'function') showToast('Error de conexión', 'error');
        }
    };

    window.eliminarItemCatalogo = async function(id, tipo, valor) {
        const confirmarFn = window.confirmarAccion || function(opts) {
            return Promise.resolve(confirm(opts.mensaje || '¿Eliminar opción?'));
        };

        const confirmado = await confirmarFn({
            titulo: '¿Eliminar Opción del Catálogo?',
            mensaje: '¿Estás seguro de que deseas eliminar esta opción?',
            item: valor,
            detalle: 'Esta opción dejará de aparecer en las listas desplegables del inventario.',
            tipo: 'danger',
            icono: 'trash',
            textoConfirmar: 'Sí, Eliminar',
            textoCancelar: 'Cancelar'
        });

        if (!confirmado) return;

        try {
            const res = await fetch((window.APP_BASE || '') + '/api/index.php?request=inventario/delete_catalogo_item', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, tipo, valor })
            });
            const data = await res.json();
            if (res.ok && data.status === 'success') {
                if (typeof showToast === 'function') showToast('Opción eliminada', 'success');
                await cargarCatalogosInventario();
                renderizarListaGestorCatalogo();
            } else {
                if (typeof showToast === 'function') showToast(data.message || 'Error al eliminar', 'error');
            }
        } catch (e) {
            console.error('Error al eliminar ítem de catálogo:', e);
            if (typeof showToast === 'function') showToast('Error de conexión', 'error');
        }
    };

    // ========================================================
    // CARGA MASIVA DE PRODUCTOS (CSV O TABLA MANUAL)
    // ========================================================
    window.abrirModalCargaMasiva = function() {
        productosCargaMasiva = [];
        limpiarPreviewCSV();

        const tbody = document.getElementById('tbody-masiva-manual');
        if (tbody && tbody.children.length === 0) {
            for (let i = 0; i < 3; i++) {
                agregarFilaMasivaManual();
            }
        }

        switchMasivaTab('archivo');

        const modal = document.getElementById('modal-carga-masiva');
        if (modal) {
            modal.classList.remove('hidden');
            requestAnimationFrame(() => modal.classList.add('show'));
            if (typeof window.renderPhosphorIcons === 'function') {
                window.renderPhosphorIcons(modal);
            }
        }
    };

    window.cerrarModalCargaMasiva = function() {
        const modal = document.getElementById('modal-carga-masiva');
        if (!modal) return;
        modal.classList.remove('show');
        setTimeout(() => modal.classList.add('hidden'), 200);
    };

    window.switchMasivaTab = function(tab) {
        const tabArchivo = document.getElementById('btn-tab-masiva-archivo');
        const tabManual = document.getElementById('btn-tab-masiva-manual');
        const viewArchivo = document.getElementById('view-masiva-archivo');
        const viewManual = document.getElementById('view-masiva-manual');

        if (tab === 'archivo') {
            if (tabArchivo) tabArchivo.classList.add('active');
            if (tabManual) tabManual.classList.remove('active');
            if (viewArchivo) viewArchivo.style.display = 'block';
            if (viewManual) viewManual.style.display = 'none';
        } else {
            if (tabManual) tabManual.classList.add('active');
            if (tabArchivo) tabArchivo.classList.remove('active');
            if (viewManual) viewManual.style.display = 'block';
            if (viewArchivo) viewArchivo.style.display = 'none';
        }
    };

    window.descargarPlantillaCSV = function() {
        const cabeceras = [
            'Nombre',
            'SKU',
            'Tipo',
            'Categoria',
            'Unidad',
            'StockInicial',
            'StockMinimo',
            'CostoUnitario',
            'PrecioVenta',
            'Ubicacion',
            'Proveedor',
            'CodigoBarras'
        ].join(',');

        const ejemplo1 = [
            'Tomate Chonto Fresco',
            'TOM-001',
            'Materia Prima',
            'Vegetales',
            'Kilogramos (kg)',
            '25.00',
            '5.00',
            '3.20',
            '0.00',
            'Cámara Fría',
            'Agrícola San Juan',
            '7751234567890'
        ].join(',');

        const ejemplo2 = [
            'Aceite Vegetal 1 Litro',
            'ACE-002',
            'Insumo General',
            'Abarrotes',
            'Unidades (und)',
            '40.00',
            '10.00',
            '7.80',
            '12.00',
            'Almacén Seco',
            'Distribuidora Central',
            '7759876543210'
        ].join(',');

        const csvContent = '\uFEFF' + [cabeceras, ejemplo1, ejemplo2].join('\r\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'plantilla_productos_khalessi.csv';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    window.procesarArchivoCSV = function(input) {
        if (!input.files || input.files.length === 0) return;
        const file = input.files[0];

        const reader = new FileReader();
        reader.onload = function(e) {
            const text = e.target.result;
            if (!text) {
                if (typeof showToast === 'function') showToast('El archivo CSV está vacío', 'error');
                return;
            }

            const lineas = text.split(/\r\n|\n/).filter(l => l.trim().length > 0);
            if (lineas.length < 2) {
                if (typeof showToast === 'function') showToast('El archivo no contiene filas de datos', 'error');
                return;
            }

            const sep = lineas[0].includes(';') ? ';' : ',';
            productosCargaMasiva = [];

            for (let i = 1; i < lineas.length; i++) {
                const fila = lineas[i];
                if (!fila.trim()) continue;

                const cols = parsearLineaCSV(fila, sep);
                if (cols.length === 0) continue;

                const prod = {
                    nombre: cols[0] || '',
                    codigo_sku: cols[1] || '',
                    tipo_articulo: cols[2] || 'materia_prima',
                    categoria: cols[3] || '',
                    unidad_medida: cols[4] || 'Kilogramos (kg)',
                    stock_actual: parseFloat(cols[5]) || 0,
                    stock_minimo: parseFloat(cols[6]) || 5,
                    costo_unitario: parseFloat(cols[7]) || 0,
                    precio_venta: parseFloat(cols[8]) || 0,
                    ubicacion_fisica: cols[9] || 'Cámara Fría',
                    proveedor_habitual: cols[10] || '',
                    codigo_barras: cols[11] || ''
                };

                if (prod.nombre) {
                    productosCargaMasiva.push(prod);
                }
            }

            if (productosCargaMasiva.length === 0) {
                if (typeof showToast === 'function') showToast('No se encontraron productos con nombre válido en el CSV', 'warning');
                return;
            }

            renderizarPreviewCSV();
        };

        reader.readAsText(file, 'UTF-8');
        input.value = '';
    };

    function parsearLineaCSV(linea, sep) {
        const res = [];
        let cur = '';
        let insideQuotes = false;
        for (let i = 0; i < linea.length; i++) {
            const char = linea[i];
            if (char === '"') {
                insideQuotes = !insideQuotes;
            } else if (char === sep && !insideQuotes) {
                res.push(cur.trim().replace(/^"|"$/g, ''));
                cur = '';
            } else {
                cur += char;
            }
        }
        res.push(cur.trim().replace(/^"|"$/g, ''));
        return res;
    }

    window.renderizarPreviewCSV = function() {
        const cont = document.getElementById('contenedor-preview-csv');
        const countSpan = document.getElementById('preview-csv-count');
        const tabla = document.getElementById('tabla-preview-csv');
        const statusMsg = document.getElementById('masiva-status-msg');

        if (!cont || !tabla) return;
        cont.style.display = 'block';

        if (countSpan) countSpan.innerText = `${productosCargaMasiva.length} productos listos para importar`;
        if (statusMsg) statusMsg.innerHTML = `<span style="color:#059669; font-weight:600;"><i class="ph ph-check-circle"></i> Archivo validado (${productosCargaMasiva.length} ítems)</span>`;

        let html = `
            <thead>
                <tr style="background: var(--bg-main); border-bottom: 1px solid var(--border-color);">
                    <th style="padding: 6px 10px;">#</th>
                    <th style="padding: 6px 10px;">Nombre</th>
                    <th style="padding: 6px 10px;">SKU</th>
                    <th style="padding: 6px 10px;">Tipo</th>
                    <th style="padding: 6px 10px;">Unidad</th>
                    <th style="padding: 6px 10px; text-align: right;">Stock</th>
                    <th style="padding: 6px 10px; text-align: right;">Costo (S/)</th>
                    <th style="padding: 6px 10px; text-align: right;">Precio (S/)</th>
                    <th style="padding: 6px 10px;">Ubicación</th>
                </tr>
            </thead>
            <tbody>
        `;

        productosCargaMasiva.forEach((p, idx) => {
            html += `
                <tr style="border-bottom: 1px solid var(--border-color);">
                    <td style="padding: 6px 10px; font-weight: 600; color: var(--text-sec);">${idx + 1}</td>
                    <td style="padding: 6px 10px; font-weight: 600; color: var(--text-main);">${p.nombre}</td>
                    <td style="padding: 6px 10px; font-family: monospace;">${p.codigo_sku || '-'}</td>
                    <td style="padding: 6px 10px;">${p.tipo_articulo || '-'}</td>
                    <td style="padding: 6px 10px;">${p.unidad_medida || '-'}</td>
                    <td style="padding: 6px 10px; text-align: right; font-weight: 600;">${p.stock_actual}</td>
                    <td style="padding: 6px 10px; text-align: right; color: #059669; font-weight: 600;">S/ ${p.costo_unitario.toFixed(2)}</td>
                    <td style="padding: 6px 10px; text-align: right;">S/ ${p.precio_venta.toFixed(2)}</td>
                    <td style="padding: 6px 10px; color: var(--text-sec);">${p.ubicacion_fisica || '-'}</td>
                </tr>
            `;
        });

        html += '</tbody>';
        tabla.innerHTML = html;
    };

    window.limpiarPreviewCSV = function() {
        productosCargaMasiva = [];
        const cont = document.getElementById('contenedor-preview-csv');
        const tabla = document.getElementById('tabla-preview-csv');
        const statusMsg = document.getElementById('masiva-status-msg');
        if (cont) cont.style.display = 'none';
        if (tabla) tabla.innerHTML = '';
        if (statusMsg) statusMsg.innerText = 'Listo para procesar';
    };

    window.agregarFilaMasivaManual = function() {
        const tbody = document.getElementById('tbody-masiva-manual');
        if (!tbody) return;

        const rowCount = tbody.children.length + 1;
        const tr = document.createElement('tr');
        tr.style.borderBottom = '1px solid var(--border-color)';

        const tipos = (catalogosData && catalogosData.tipo_articulo) ? catalogosData.tipo_articulo : [];
        let tiposOptions = tipos.map(t => `<option value="${t.valor}">${t.valor}</option>`).join('');
        if (!tiposOptions) tiposOptions = '<option value="materia_prima">Materia Prima</option>';

        const unidades = (catalogosData && catalogosData.unidad_medida) ? catalogosData.unidad_medida : [];
        let unidadesOptions = unidades.map(u => `<option value="${u.valor}">${u.valor}</option>`).join('');
        if (!unidadesOptions) unidadesOptions = '<option value="Kilogramos (kg)">Kilogramos (kg)</option><option value="Unidades (und)">Unidades (und)</option>';

        tr.innerHTML = `
            <td style="padding: 6px 8px; font-weight: 600; color: var(--text-sec);">${rowCount}</td>
            <td style="padding: 6px 8px;">
                <input type="text" class="form-control form-control-sm fila-masiva-nombre" placeholder="Nombre del producto" style="font-size: 12px;">
            </td>
            <td style="padding: 6px 8px;">
                <input type="text" class="form-control form-control-sm fila-masiva-sku" placeholder="SKU" style="font-size: 12px; font-family: monospace;">
            </td>
            <td style="padding: 6px 8px;">
                <select class="form-control form-control-sm fila-masiva-tipo" style="font-size: 11.5px;">${tiposOptions}</select>
            </td>
            <td style="padding: 6px 8px;">
                <select class="form-control form-control-sm fila-masiva-unidad" style="font-size: 11.5px;">${unidadesOptions}</select>
            </td>
            <td style="padding: 6px 8px;">
                <input type="number" step="0.01" min="0" class="form-control form-control-sm fila-masiva-stock" value="0.00" style="font-size: 12px; text-align: right;">
            </td>
            <td style="padding: 6px 8px;">
                <input type="number" step="0.01" min="0" class="form-control form-control-sm fila-masiva-costo" value="0.00" style="font-size: 12px; text-align: right; color: #059669;">
            </td>
            <td style="padding: 6px 8px;">
                <input type="number" step="0.01" min="0" class="form-control form-control-sm fila-masiva-precio" value="0.00" style="font-size: 12px; text-align: right;">
            </td>
            <td style="padding: 6px 8px; text-align: center;">
                <button type="button" class="btn-icon" onclick="eliminarFilaMasivaManual(this)" title="Eliminar fila" style="color: #DC2626; padding: 4px;">
                    <i class="ph ph-trash"></i>
                </button>
            </td>
        `;

        tbody.appendChild(tr);
        if (typeof window.renderPhosphorIcons === 'function') {
            window.renderPhosphorIcons(tr);
        }
    };

    window.eliminarFilaMasivaManual = function(btn) {
        const tr = btn.closest('tr');
        if (tr) {
            tr.remove();
            const tbody = document.getElementById('tbody-masiva-manual');
            if (tbody) {
                Array.from(tbody.children).forEach((row, i) => {
                    row.children[0].innerText = i + 1;
                });
            }
        }
    };

    window.procesarGuardadoMasivo = async function() {
        const btn = document.getElementById('btn-procesar-masiva');
        const isArchivo = document.getElementById('btn-tab-masiva-archivo')?.classList.contains('active');
        let productos = [];

        if (isArchivo) {
            productos = productosCargaMasiva;
            if (productos.length === 0) {
                if (typeof showToast === 'function') showToast('Primero selecciona un archivo CSV con productos', 'warning');
                return;
            }
        } else {
            const tbody = document.getElementById('tbody-masiva-manual');
            if (!tbody) return;
            const filas = tbody.querySelectorAll('tr');
            filas.forEach(f => {
                const nombre = f.querySelector('.fila-masiva-nombre')?.value.trim();
                if (nombre) {
                    productos.push({
                        nombre,
                        codigo_sku: f.querySelector('.fila-masiva-sku')?.value.trim() || '',
                        tipo_articulo: f.querySelector('.fila-masiva-tipo')?.value || 'materia_prima',
                        unidad_medida: f.querySelector('.fila-masiva-unidad')?.value || 'Kilogramos (kg)',
                        stock_actual: parseFloat(f.querySelector('.fila-masiva-stock')?.value) || 0,
                        costo_unitario: parseFloat(f.querySelector('.fila-masiva-costo')?.value) || 0,
                        precio_venta: parseFloat(f.querySelector('.fila-masiva-precio')?.value) || 0
                    });
                }
            });

            if (productos.length === 0) {
                if (typeof showToast === 'function') showToast('Escribe al menos el nombre de un producto en la tabla', 'warning');
                return;
            }
        }

        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Guardando...';
        }

        try {
            const res = await fetch((window.APP_BASE || '') + '/api/index.php?request=inventario/save_batch_productos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ productos })
            });
            const data = await res.json();

            if (res.ok && data.status === 'success') {
                const msg = `Se guardaron ${data.data?.insertados || productos.length} productos correctamente`;
                if (typeof showToast === 'function') showToast(msg, 'success');
                cerrarModalCargaMasiva();
                await cargarProductosInventario();
            } else {
                if (typeof showToast === 'function') showToast(data.message || 'Error al guardar productos masivos', 'error');
            }
        } catch (e) {
            console.error('Error en carga masiva:', e);
            if (typeof showToast === 'function') showToast('Error al procesar la carga masiva', 'error');
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '<i class="ph ph-check"></i> Guardar Todos los Productos';
            }
        }
    };

    // ========================================================
    // CÁMARA EN VIVO & ESCANEO OCR DE COMPROBANTES
    // ========================================================
    window.abrirCamaraOCR = async function() {
        const modal = document.getElementById('modal-camara-ocr');
        if (!modal) return;

        modal.classList.remove('hidden');
        requestAnimationFrame(() => modal.classList.add('show'));

        const video = document.getElementById('camara-video');
        const canvas = document.getElementById('camara-canvas');
        const ctrlCap = document.getElementById('camara-controles-captura');
        const ctrlRes = document.getElementById('camara-controles-resultado');
        const overlay = document.getElementById('camara-ocr-overlay');

        if (video) video.style.display = 'block';
        if (canvas) canvas.style.display = 'none';
        if (ctrlCap) ctrlCap.style.display = 'flex';
        if (ctrlRes) ctrlRes.style.display = 'none';
        if (overlay) overlay.style.display = 'none';

        await iniciarStreamCamara();

        if (typeof window.renderPhosphorIcons === 'function') {
            window.renderPhosphorIcons(modal);
        }
    };

    window.cerrarCamaraOCR = function() {
        const modal = document.getElementById('modal-camara-ocr');
        if (modal) {
            modal.classList.remove('show');
            setTimeout(() => modal.classList.add('hidden'), 200);
        }
        detenerStreamCamara();
    };

    function detenerStreamCamara() {
        if (camaraStream) {
            camaraStream.getTracks().forEach(track => track.stop());
            camaraStream = null;
        }
        const video = document.getElementById('camara-video');
        if (video) video.srcObject = null;
    }

    async function iniciarStreamCamara(facingMode = 'environment') {
        detenerStreamCamara();
        const video = document.getElementById('camara-video');
        if (!video) return;

        try {
            const constraints = {
                video: {
                    facingMode: facingMode,
                    width: { ideal: 1920 },
                    height: { ideal: 1080 }
                },
                audio: false
            };

            let stream;
            try {
                stream = await navigator.mediaDevices.getUserMedia(constraints);
            } catch (errFacing) {
                stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
            }

            camaraStream = stream;
            video.srcObject = stream;
            await video.play();
        } catch (err) {
            console.error('Error accediendo a cámara:', err);
            if (typeof showToast === 'function') {
                showToast('No se pudo acceder a la cámara. Verifica los permisos del navegador.', 'error');
            }
        }
    }

    let camaraFacingActual = 'environment';
    window.cambiarDispositivoCamara = async function() {
        camaraFacingActual = (camaraFacingActual === 'environment') ? 'user' : 'environment';
        await iniciarStreamCamara(camaraFacingActual);
    };

    window.capturarFotoCamara = function() {
        const video = document.getElementById('camara-video');
        const canvas = document.getElementById('camara-canvas');
        const ctrlCap = document.getElementById('camara-controles-captura');
        const ctrlRes = document.getElementById('camara-controles-resultado');

        if (!video || !canvas) return;

        const w = video.videoWidth || 1280;
        const h = video.videoHeight || 720;
        canvas.width = w;
        canvas.height = h;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, w, h);

        video.style.display = 'none';
        canvas.style.display = 'block';

        if (ctrlCap) ctrlCap.style.display = 'none';
        if (ctrlRes) ctrlRes.style.display = 'flex';
    };

    window.repetirCapturaCamara = function() {
        const video = document.getElementById('camara-video');
        const canvas = document.getElementById('camara-canvas');
        const ctrlCap = document.getElementById('camara-controles-captura');
        const ctrlRes = document.getElementById('camara-controles-resultado');

        if (video) video.style.display = 'block';
        if (canvas) canvas.style.display = 'none';
        if (ctrlCap) ctrlCap.style.display = 'flex';
        if (ctrlRes) ctrlRes.style.display = 'none';
    };

    window.confirmarYEjecutarOCR = async function() {
        const canvas = document.getElementById('camara-canvas');
        const overlay = document.getElementById('camara-ocr-overlay');
        const statusText = document.getElementById('camara-ocr-status');

        if (!canvas) return;

        const dataUrl = canvas.toDataURL('image/jpeg', 0.92);

        // Crear objeto File para comprobanteFileAdjunto
        try {
            const arr = dataUrl.split(',');
            const mime = arr[0].match(/:(.*?);/)[1];
            const bstr = atob(arr[1]);
            let n = bstr.length;
            const u8arr = new Uint8Array(n);
            while (n--) {
                u8arr[n] = bstr.charCodeAt(n);
            }
            const blobFile = new File([u8arr], `comprobante_cam_${Date.now()}.jpg`, { type: mime });
            comprobanteFileAdjunto = blobFile;

            const label = document.getElementById('compra-file-label');
            const btnRemove = document.getElementById('btn-remover-comprobante');
            if (label) label.innerText = `Foto Comprobante (${(blobFile.size / 1024).toFixed(0)} KB)`;
            if (btnRemove) btnRemove.style.display = 'inline-flex';
        } catch (fErr) {
            console.warn('Error convirtiendo imagen a File:', fErr);
        }

        if (overlay) overlay.style.display = 'flex';
        if (statusText) statusText.innerText = 'Analizando comprobante con OCR...';

        try {
            await asegurarTesseractCargado();

            if (statusText) statusText.innerText = 'Extrayendo texto y números...';

            const resultadoOCR = await Tesseract.recognize(dataUrl, 'spa+eng', {
                logger: m => {
                    if (m.status === 'recognizing text' && statusText) {
                        statusText.innerText = `Reconociendo texto: ${(m.progress * 100).toFixed(0)}%`;
                    }
                }
            });

            const rawText = resultadoOCR?.data?.text || '';
            const datosDetectados = parsearTextoComprobanteOCR(rawText);

            aplicarDatosOCREnFormulario(datosDetectados);

            const badgeOCR = document.getElementById('ocr-badge-status');
            if (badgeOCR) {
                badgeOCR.style.display = 'inline-block';
                badgeOCR.innerHTML = '<i class="ph ph-check"></i> OCR Procesado';
            }

            if (typeof showToast === 'function') {
                showToast('Foto adjuntada y datos leídos con éxito', 'success');
            }
        } catch (ocrErr) {
            console.warn('OCR no completado:', ocrErr);
            if (typeof showToast === 'function') {
                showToast('Foto adjuntada como comprobante. Completa los campos si faltan datos.', 'info');
            }
        } finally {
            cerrarCamaraOCR();
        }
    };

    function asegurarTesseractCargado() {
        return new Promise((resolve, reject) => {
            if (window.Tesseract) {
                resolve(window.Tesseract);
                return;
            }

            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
            script.async = true;

            const timer = setTimeout(() => {
                reject(new Error('Tiempo de espera agotado al cargar el motor OCR'));
            }, 10000);

            script.onload = () => {
                clearTimeout(timer);
                resolve(window.Tesseract);
            };
            script.onerror = () => {
                clearTimeout(timer);
                reject(new Error('No se pudo descargar el motor OCR'));
            };
            document.head.appendChild(script);
        });
    }

    function parsearTextoComprobanteOCR(rawText) {
        const resultado = {
            numero_comprobante: '',
            proveedor: '',
            monto_total: 0
        };

        if (!rawText) return resultado;

        // Detección de Serie y Número (ej: F001-00012345, B002-123456)
        const regexComprobante = /([FB0-9][0-9A-Z]{2,4}[-\s]\d{3,8})/i;
        const matchComp = rawText.match(regexComprobante);
        if (matchComp) {
            resultado.numero_comprobante = matchComp[1].replace(/\s/g, '-').toUpperCase();
        }

        // Detección de RUC y Proveedor
        const regexRuc = /(?:RUC|R\.U\.C\.?)[\s:]*([12]0\d{9})/i;
        const matchRuc = rawText.match(regexRuc);
        
        const lineas = rawText.split('\n').map(l => l.trim()).filter(l => l.length > 3);
        for (const l of lineas) {
            if (/(?:S\.A\.C|SAC|S\.A\.|E\.I\.R\.L|EIRL|S\.R\.L|SRL|COMERCIAL|DISTRIBUIDORA|AGR[IÍ]COLA|AV[IÍ]COLA|MERCADO)/i.test(l)) {
                resultado.proveedor = l.replace(/[^\w\s\.\,\-áéíóúÁÉÍÓÚñÑ]/g, '').trim();
                break;
            }
        }
        if (!resultado.proveedor && matchRuc) {
            resultado.proveedor = 'RUC ' + matchRuc[1];
        }

        // Detección de Monto Total
        const regexTotal = /(?:TOTAL|IMPORTE\s*TOTAL|VENTA\s*TOTAL)[\s:S/$\.]*([0-9]{1,6}[.,]\d{2})/i;
        const matchTotal = rawText.match(regexTotal);
        if (matchTotal) {
            const rawMonto = matchTotal[1].replace(',', '.');
            resultado.monto_total = parseFloat(rawMonto) || 0;
        } else {
            const montos = rawText.match(/\b\d{1,5}[.,]\d{2}\b/g);
            if (montos && montos.length > 0) {
                const parsedMontos = montos.map(m => parseFloat(m.replace(',', '.'))).filter(n => !isNaN(n));
                if (parsedMontos.length > 0) {
                    resultado.monto_total = Math.max(...parsedMontos);
                }
            }
        }

        return resultado;
    }

    function aplicarDatosOCREnFormulario(datos) {
        if (datos.numero_comprobante) {
            const numInput = document.getElementById('compra-num-comprobante');
            if (numInput) numInput.value = datos.numero_comprobante;
        }

        if (datos.proveedor) {
            const provInput = document.getElementById('compra-proveedor');
            if (provInput) provInput.value = datos.proveedor;
        }

        if (datos.monto_total && datos.monto_total > 0) {
            const cantInput = document.getElementById('compra-cantidad');
            const puInput = document.getElementById('compra-precio-unitario');
            
            if (cantInput && (!cantInput.value || parseFloat(cantInput.value) <= 0)) {
                cantInput.value = '1';
            }
            const cant = parseFloat(cantInput ? cantInput.value : 1) || 1;
            
            if (puInput) {
                puInput.value = (datos.monto_total / cant).toFixed(2);
            }
            recalcularTotalCompraManual();
        }
    }

    // ========================================================
    // MODAL DE AJUSTE RÁPIDO DE STOCK
    // ========================================================
    window.abrirModalAjusteStock = function(id, nombre, stockActual, unidad = 'unidades') {
        const modal = document.getElementById('modal-ajustar-stock');
        if (!modal) return;

        document.getElementById('ajuste-prod-id').value = id;
        document.getElementById('ajuste-prod-nombre').innerText = nombre;
        document.getElementById('ajuste-prod-actual').innerText = stockActual;
        document.getElementById('ajuste-prod-unidad').innerText = unidad;
        document.getElementById('ajuste-cantidad').value = '';
        document.getElementById('ajuste-motivo').value = '';
        document.getElementById('ajuste-tipo').value = 'entrada';

        modal.classList.remove('hidden');
        requestAnimationFrame(() => modal.classList.add('show'));
        
        if (typeof window.renderPhosphorIcons === 'function') {
            window.renderPhosphorIcons(modal);
        }
    };

    window.cerrarModalAjusteStock = function() {
        const modal = document.getElementById('modal-ajustar-stock');
        if (!modal) return;
        modal.classList.remove('show');
        setTimeout(() => modal.classList.add('hidden'), 200);
    };

    // Guardar Ajuste de Stock
    window.guardarAjusteStock = async function() {
        const btn = document.getElementById('btn-guardar-ajuste');
        const id_producto = document.getElementById('ajuste-prod-id').value;
        const tipo = document.getElementById('ajuste-tipo').value;
        const cantidad = parseFloat(document.getElementById('ajuste-cantidad').value);
        const motivo = document.getElementById('ajuste-motivo').value.trim();

        if (!cantidad || cantidad <= 0) {
            if (typeof showToast === 'function') showToast('Ingresa una cantidad válida mayor a 0', 'error');
            return;
        }

        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Procesando...';
        }

        try {
            const res = await fetch((window.APP_BASE || '') + '/api/index.php?request=inventario/ajustar_stock', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id_producto,
                    tipo,
                    cantidad,
                    motivo: motivo || 'Ajuste manual de existencias'
                })
            });
            const data = await res.json();
            if (res.ok && data.status === 'success') {
                if (typeof showToast === 'function') showToast(data.message || 'Existencias actualizadas', 'success');
                cerrarModalAjusteStock();
                await cargarProductosInventario();
            } else {
                if (typeof showToast === 'function') showToast(data.message || 'Error al ajustar stock', 'error');
            }
        } catch (e) {
            console.error('Error ajustando stock:', e);
            if (typeof showToast === 'function') showToast('Error al conectar con el servidor', 'error');
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '<i class="ph ph-check"></i> Confirmar Ajuste';
            }
        }
    };

    // Eliminar Producto (Con Modal Moderno del Sistema)
    window.eliminarProducto = async function(id, nombre) {
        const confirmarFn = window.confirmarAccion || function(opts) {
            return Promise.resolve(confirm(opts.mensaje || '¿Eliminar producto?'));
        };

        const confirmado = await confirmarFn({
            titulo: '¿Eliminar Producto / Insumo?',
            mensaje: '¿Estás seguro de que deseas eliminar este ítem del catálogo?',
            item: nombre,
            detalle: 'Esta acción retirará el ítem del catálogo de existencias. Su historial y registros de compras quedarán archivados para auditoría contable.',
            tipo: 'danger',
            icono: 'trash',
            textoConfirmar: 'Sí, Eliminar',
            textoCancelar: 'Cancelar'
        });

        if (!confirmado) return;

        try {
            const res = await fetch((window.APP_BASE || '') + '/api/index.php?request=inventario/delete_producto', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id })
            });
            const data = await res.json();
            if (data.status === 'success') {
                if (typeof showToast === 'function') showToast('Producto eliminado exitosamente', 'success');
                cargarProductosInventario();
            } else {
                if (typeof showToast === 'function') showToast(data.message || 'Error al eliminar', 'error');
            }
        } catch (err) {
            console.error(err);
            if (typeof showToast === 'function') showToast('Error al eliminar producto', 'error');
        }
    };

})();
