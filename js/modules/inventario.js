// js/modules/inventario.js - Módulo de Inventario con Catálogo Dual (Tabla Deslizable PC / Cards Móvil) y Modal Extendido de Producto

(function() {
    'use strict';

    let productosData = [];
    let categoriasData = [];
    let activeTab = 'productos';
    let expandedProductIds = new Set();
    let currentModalTab = 'info';
    let currentProductoEnEdicion = null;
    let comprasDelProducto = [];
    let comprobanteFileAdjunto = null;

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

                    <!-- Barra de Herramientas y Filtros -->
                    <div class="card mb-3" style="border-radius: 16px; border: 1px solid var(--border-color);">
                        <div class="card-body" style="padding: 14px 18px;">
                            <div style="display: flex; gap: 12px; flex-wrap: wrap; align-items: center; justify-content: space-between;">
                                
                                <!-- Buscador y Selectores -->
                                <div style="display: flex; gap: 10px; flex-wrap: wrap; flex: 1; min-width: 280px;">
                                    <div style="position: relative; flex: 1; min-width: 200px;">
                                        <i class="ph ph-magnifying-glass" style="position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: var(--text-sec); font-size: 17px;"></i>
                                        <input type="text" id="filtro-prod-buscar" class="form-control" placeholder="Buscar por nombre, SKU, proveedor..." style="padding-left: 40px; border-radius: 10px;" oninput="filtrarProductosInventario()">
                                    </div>
                                    <select id="filtro-prod-categoria" class="form-control" style="width: auto; min-width: 160px; border-radius: 10px;" onchange="filtrarProductosInventario()">
                                        <option value="">Todas las categorías</option>
                                    </select>
                                    <select id="filtro-prod-tipo" class="form-control" style="width: auto; min-width: 160px; border-radius: 10px;" onchange="filtrarProductosInventario()">
                                        <option value="">Todos los tipos</option>
                                        <option value="materia_prima">Materia Prima</option>
                                        <option value="producto_terminado">Producto Terminado</option>
                                        <option value="subreceta">Insumo Procesado</option>
                                        <option value="bebida">Bebida / Envasado</option>
                                        <option value="empaque">Empaque</option>
                                    </select>
                                    <select id="filtro-prod-estado" class="form-control" style="width: auto; min-width: 140px; border-radius: 10px;" onchange="filtrarProductosInventario()">
                                        <option value="">Todos los estados</option>
                                        <option value="disponible">Disponibles</option>
                                        <option value="agotado">Agotados</option>
                                        <option value="inactivo">Inactivos</option>
                                    </select>
                                </div>

                                <!-- Botones de Acción -->
                                <div style="display: flex; gap: 10px; align-items: center;">
                                    <button class="btn btn-secondary btn-icon" title="Refrescar catálogo" onclick="cargarProductosInventario(true)">
                                        <i class="ph ph-arrows-clockwise"></i>
                                    </button>
                                    <button class="btn btn-primary" onclick="abrirModalProducto()" style="border-radius: 10px; font-weight: 600;">
                                        <i class="ph ph-plus"></i> Nuevo Producto
                                    </button>
                                </div>
                            </div>
                        </div>
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

            <!-- MODAL: CREAR / EDITAR PRODUCTO (85% VH en PC, Tabs e Historial de Compras) -->
            <div id="modal-producto" class="modal-backdrop hidden" onclick="if(event.target === this) cerrarModalProducto()">
                <div class="modal">
                    <!-- Cabecera del Modal -->
                    <div class="modal-header">
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <div style="width: 42px; height: 42px; border-radius: 12px; background: #FEF3C7; color: #D97706; display: flex; align-items: center; justify-content: center; font-size: 24px; flex-shrink: 0;">
                                <i class="ph ph-package"></i>
                            </div>
                            <div>
                                <div style="display: flex; align-items: center; gap: 8px;">
                                    <h3 id="modal-producto-titulo" style="margin: 0; font-size: 17px; font-weight: 700;">Registrar Nuevo Producto / Insumo</h3>
                                    <span id="modal-badge-modo" class="badge" style="background: #E2E8F0; color: #475569; font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 6px; letter-spacing: 0.5px;">NUEVO</span>
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
                            <span>1. Información del Producto & Imagen</span>
                        </div>
                        <div class="modal-subtab" id="btn-subtab-historial" onclick="switchModalProductoTab('historial')">
                            <i class="ph ph-receipt"></i>
                            <span>2. Historial de Compras & Comprobantes</span>
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

                                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 24px; align-items: start;">
                                    
                                    <!-- COLUMNA IZQUIERDA: FOTOGRAFÍA -->
                                    <div class="prod-photo-container">
                                        <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-sec); margin-bottom: 12px; text-align: center;">
                                            FOTOGRAFÍA DEL INSUMO / PRODUCTO
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
                                    </div>

                                    <!-- COLUMNA DERECHA: CAMPOS DEL PRODUCTO -->
                                    <div style="display: flex; flex-direction: column; gap: 14px;">
                                        
                                        <!-- Fila 1: SKU y Nombre Comercial -->
                                        <div style="display: grid; grid-template-columns: 1fr 2fr; gap: 12px;">
                                            <div class="form-group mb-0">
                                                <label class="form-label font-bold" style="font-size: 12px;">Código / SKU <span class="text-danger">*</span></label>
                                                <div style="display: flex; gap: 6px;">
                                                    <input type="text" id="prod-sku" class="form-control font-bold" placeholder="MP-013" style="font-family: monospace;" required>
                                                    <button type="button" class="btn btn-secondary btn-icon" onclick="generarSkuAutomatico()" title="Generar código automático">
                                                        <i class="ph ph-sparkle"></i>
                                                    </button>
                                                </div>
                                            </div>
                                            <div class="form-group mb-0">
                                                <label class="form-label font-bold" style="font-size: 12px;">Nombre Comercial del Insumo <span class="text-danger">*</span></label>
                                                <input type="text" id="prod-nombre" class="form-control font-bold" placeholder="Ej: Champiñones Portobello Frescos" required>
                                            </div>
                                        </div>

                                        <!-- Fila 2: Tipo de Artículo, Unidad de Medida Base y Ubicación Física -->
                                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px;">
                                            <div class="form-group mb-0">
                                                <label class="form-label font-bold" style="font-size: 12px;">Tipo de Artículo <span class="text-danger">*</span></label>
                                                <select id="prod-tipo-articulo" class="form-control" required>
                                                    <option value="materia_prima">Materia Prima (Insumo Base)</option>
                                                    <option value="producto_terminado">Producto Terminado</option>
                                                    <option value="subreceta">Insumo Procesado / Subreceta</option>
                                                    <option value="bebida">Bebida / Envasado</option>
                                                    <option value="empaque">Empaque / Descartable</option>
                                                </select>
                                            </div>
                                            <div class="form-group mb-0">
                                                <label class="form-label font-bold" style="font-size: 12px;">Unidad de Medida Base <span class="text-danger">*</span></label>
                                                <select id="prod-unidad-medida" class="form-control" required>
                                                    <option value="Kilogramos (kg)">Kilogramos (kg)</option>
                                                    <option value="Litros (L)">Litros (L)</option>
                                                    <option value="Unidades (und)">Unidades (und)</option>
                                                    <option value="Gramos (g)">Gramos (g)</option>
                                                    <option value="Mililitros (ml)">Mililitros (ml)</option>
                                                    <option value="Porciones">Porciones</option>
                                                </select>
                                            </div>
                                            <div class="form-group mb-0">
                                                <label class="form-label font-bold" style="font-size: 12px;">Ubicación Física <span class="text-danger">*</span></label>
                                                <select id="prod-ubicacion-fisica" class="form-control">
                                                    <option value="Cámara Fría">Cámara Fría</option>
                                                    <option value="Almacén Seco">Almacén Seco</option>
                                                    <option value="Barra / Mostrador">Barra / Mostrador</option>
                                                    <option value="Cocina Caliente">Cocina Caliente</option>
                                                    <option value="Congelador Principal">Congelador Principal</option>
                                                    <option value="Estantería Central">Estantería Central</option>
                                                </select>
                                            </div>
                                        </div>

                                        <!-- Fila 3: Proveedor Habitual y Código de Barras / Lote Referencial -->
                                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                                            <div class="form-group mb-0">
                                                <label class="form-label font-bold" style="font-size: 12px;">Proveedor Habitual</label>
                                                <input type="text" id="prod-proveedor" class="form-control" placeholder="Ej: Distribuidora Agrícola del Valle">
                                            </div>
                                            <div class="form-group mb-0">
                                                <label class="form-label font-bold" style="font-size: 12px;">Código de Barras / Lote Referencial</label>
                                                <input type="text" id="prod-codigo-barras" class="form-control" placeholder="775123456789">
                                            </div>
                                        </div>

                                        <!-- Fila 4: CAJA DESTACADA DE COSTEO Y STOCKS -->
                                        <div style="background: var(--bg-main); border: 1px solid var(--border-color); border-radius: 14px; padding: 14px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px;">
                                            <div class="form-group mb-0">
                                                <label class="form-label font-bold" style="font-size: 11.5px; text-transform: uppercase; color: var(--text-sec); letter-spacing: 0.5px;">STOCK INICIAL</label>
                                                <input type="number" step="0.01" min="0" id="prod-stock-inicial" class="form-control font-bold" placeholder="10.00" value="0.00" required>
                                            </div>
                                            <div class="form-group mb-0">
                                                <label class="form-label font-bold" style="font-size: 11.5px; text-transform: uppercase; color: var(--text-sec); letter-spacing: 0.5px;">STOCK MÍNIMO (ALERTA)</label>
                                                <input type="number" step="0.01" min="0" id="prod-stock-minimo" class="form-control font-bold" placeholder="5.00" value="5.00" required>
                                            </div>
                                            <div class="form-group mb-0">
                                                <label class="form-label font-bold" style="font-size: 11.5px; text-transform: uppercase; color: #059669; letter-spacing: 0.5px;">COSTO UNITARIO BASE (S/)</label>
                                                <input type="number" step="0.01" min="0" id="prod-costo-unitario" class="form-control font-bold" style="color: #059669;" placeholder="2.50" value="0.00">
                                            </div>
                                        </div>

                                        <!-- Fila 5: Datos de Venta Comercial Complementarios -->
                                        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px;">
                                            <div class="form-group mb-0">
                                                <label class="form-label font-bold" style="font-size: 12px;">Precio Venta Comercial (S/)</label>
                                                <input type="number" step="0.10" min="0" id="prod-precio-venta" class="form-control font-bold" placeholder="0.00" value="0.00">
                                            </div>
                                            <div class="form-group mb-0">
                                                <label class="form-label font-bold" style="font-size: 12px;">Categoría en Catálogo</label>
                                                <select id="prod-categoria" class="form-control">
                                                    <option value="">Sin Categoría</option>
                                                </select>
                                            </div>
                                            <div class="form-group mb-0">
                                                <label class="form-label font-bold" style="font-size: 12px;">Estado</label>
                                                <select id="prod-estado" class="form-control">
                                                    <option value="disponible">Disponible</option>
                                                    <option value="agotado">Agotado</option>
                                                    <option value="inactivo">Inactivo</option>
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
                                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                                        <div style="display: flex; align-items: center; gap: 8px; font-weight: 700; font-size: 13px; color: var(--text-main);">
                                            <i class="ph ph-receipt" style="color: #D97706; font-size: 18px;"></i>
                                            REGISTRAR NUEVA ORDEN / FACTURA DE COMPRA
                                        </div>
                                        <span style="font-size: 11.5px; color: var(--text-sec);">Adjunta comprobante tributario o guía</span>
                                    </div>

                                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; margin-bottom: 12px;">
                                        <div class="form-group mb-0">
                                            <label class="form-label font-bold" style="font-size: 11.5px;">Nº Comprobante / Factura</label>
                                            <input type="text" id="compra-num-comprobante" class="form-control" placeholder="F001-004521">
                                        </div>
                                        <div class="form-group mb-0">
                                            <label class="form-label font-bold" style="font-size: 11.5px;">Proveedor</label>
                                            <input type="text" id="compra-proveedor" class="form-control" placeholder="Lácteos San Juan S.A.">
                                        </div>
                                        <div class="form-group mb-0">
                                            <label class="form-label font-bold" style="font-size: 11.5px;">Cantidad Comprada</label>
                                            <input type="number" step="0.01" min="0.01" id="compra-cantidad" class="form-control font-bold" placeholder="Ej: 20.0">
                                        </div>
                                        <div class="form-group mb-0">
                                            <label class="form-label font-bold" style="font-size: 11.5px;">Precio Unitario (S/)</label>
                                            <input type="number" step="0.01" min="0" id="compra-precio-unitario" class="form-control font-bold" placeholder="Ej: 8.50">
                                        </div>
                                    </div>

                                    <div style="display: flex; gap: 12px; align-items: flex-end; flex-wrap: wrap; justify-content: space-between;">
                                        <div style="flex: 1; min-width: 240px;">
                                            <label class="form-label font-bold" style="font-size: 11.5px;">Adjuntar Comprobante (Factura / Boleta / Foto)</label>
                                            <div style="display: flex; gap: 8px; align-items: center;">
                                                <button type="button" class="btn btn-secondary" onclick="document.getElementById('compra-input-file').click()" style="font-size: 12.5px;">
                                                    <i class="ph ph-paperclip"></i> <span id="compra-file-label">Seleccionar Archivo (PDF / JPG)</span>
                                                </button>
                                                <input type="file" id="compra-input-file" accept="image/jpeg,image/png,image/webp,application/pdf" style="display: none;" onchange="manejarSeleccionComprobante(this)">
                                                <button type="button" id="btn-remover-comprobante" class="btn btn-secondary text-danger btn-icon" style="display: none;" onclick="removerComprobanteAdjunto()" title="Remover archivo">
                                                    <i class="ph ph-trash"></i>
                                                </button>
                                            </div>
                                        </div>
                                        <div>
                                            <button type="button" class="btn" id="btn-agregar-compra" onclick="guardarCompraHistorial()" style="background: #1E293B; color: #FFFFFF; font-weight: 600; border-radius: 10px; padding: 9px 18px;">
                                                <i class="ph ph-plus-circle"></i> + Añadir a Historial
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Tabla: REGISTRO HISTÓRICO DE COMPRAS Y SUMINISTRO -->
                            <div class="card" style="border: 1px solid var(--border-color); border-radius: 14px;">
                                <div class="card-body" style="padding: 16px 20px;">
                                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                                        <div style="font-weight: 700; font-size: 13px; color: var(--text-main);">
                                            REGISTRO HISTÓRICO DE COMPRAS Y SUMINISTRO
                                        </div>
                                        <span style="font-size: 11.5px; color: var(--text-sec);">Auditoría contable y recepción</span>
                                    </div>

                                    <div id="contenedor-tabla-compras" style="overflow-x: auto;">
                                        <!-- Renderizado dinámico de compras o empty state -->
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- PIE DEL MODAL -->
                    <div class="modal-footer" style="display: flex; justify-content: space-between; align-items: center; background: var(--bg-main);">
                        <div style="display: flex; align-items: center; gap: 8px; color: #059669; font-size: 12.5px; font-weight: 500;">
                            <i class="ph ph-check-circle" style="font-size: 18px; color: #10B981;"></i>
                            <span>Validado para recálculo de Costo Promedio Ponderado (CPP)</span>
                        </div>
                        <div style="display: flex; gap: 10px; align-items: center;">
                            <button type="button" class="btn btn-secondary" onclick="cerrarModalProducto()" style="border-radius: 10px;">Cerrar</button>
                            <button type="button" class="btn" id="btn-guardar-producto" onclick="guardarProducto()" style="background: #D97706; color: #FFFFFF; font-weight: 600; border-radius: 10px; display: inline-flex; align-items: center; gap: 6px;">
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
                        <button type="button" class="btn btn-primary" onclick="guardarAjusteStock()" id="btn-guardar-ajuste">
                            <i class="ph ph-check"></i> Confirmar Ajuste
                        </button>
                    </div>
                </div>
            </div>
        `;

        // Inicializar datos
        cargarCategoriasInventario();
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

    // Cargar categorías
    window.cargarCategoriasInventario = async function() {
        try {
            const res = await fetch((window.APP_BASE || '') + '/api/index.php?request=inventario/list_categorias');
            const data = await res.json();
            if (data.status === 'success') {
                categoriasData = data.data || [];
                
                const filtroCat = document.getElementById('filtro-prod-categoria');
                const modalCat = document.getElementById('prod-categoria');
                
                let filtroHtml = '<option value="">Todas las categorías</option>';
                let modalHtml = '<option value="">Sin Categoría</option>';

                categoriasData.forEach(c => {
                    filtroHtml += `<option value="${c.id}">${c.nombre}</option>`;
                    modalHtml += `<option value="${c.id}">${c.nombre}</option>`;
                });

                if (filtroCat) filtroCat.innerHTML = filtroHtml;
                if (modalCat) modalCat.innerHTML = modalHtml;
            }
        } catch (e) {
            console.error('Error cargando categorías:', e);
        }
    };

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
                        <span class="badge" style="background: rgba(217, 119, 6, 0.1); color: #D97706; font-weight: 600; font-size: 11px;">
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

            // Card Móvil Ordenada (2 columnas y sin cortes)
            mobileCardsHtml += `
                <div class="prod-mobile-card ${isExpanded ? 'expanded' : ''}" id="prod-mcard-${p.id}">
                    <!-- Cabecera Superior: Foto + Título Completo sin truncar + Badges -->
                    <div class="prod-mobile-top">
                        ${thumbImg}
                        <div class="prod-mobile-header-info">
                            <div class="prod-mobile-title">${p.nombre}</div>
                            <div class="prod-mobile-badges">
                                <span class="prod-mobile-sku">${p.codigo_sku || 'S/N'}</span>
                                <span class="badge" style="background: rgba(217, 119, 6, 0.1); color: #D97706; font-size: 10.5px; font-weight: 600;">
                                    ${formatearTipoArticulo(p.tipo_articulo)}
                                </span>
                                ${estadoBadge}
                            </div>
                        </div>
                    </div>

                    <!-- Grid de Datos Clave en 2 Columnas -->
                    <div class="prod-mobile-stats">
                        <div class="prod-stat-col">
                            <span class="prod-stat-title">Existencias (${unidad})</span>
                            <div class="prod-stat-val">
                                <span class="badge ${stockBadgeClass}" style="font-size: 12px; font-weight: 700;">
                                    ${stock} ${unidad}
                                </span>
                                <span style="font-size: 10.5px; color: var(--text-sec); margin-left: 4px;">(Mín: ${stockMin})</span>
                            </div>
                        </div>
                        <div class="prod-stat-col" style="text-align: right;">
                            <span class="prod-stat-title">Costo / Venta</span>
                            <div class="prod-stat-val">
                                <span style="color: #059669;">S/ ${costo.toFixed(2)}</span>
                                ${precio > 0 ? `<span style="font-size: 11px; color: var(--text-sec); font-weight: normal;"> / S/ ${precio.toFixed(2)}</span>` : ''}
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
        const categoriaId = document.getElementById('filtro-prod-categoria')?.value || '';
        const tipoArticulo = document.getElementById('filtro-prod-tipo')?.value || '';
        const estado = document.getElementById('filtro-prod-estado')?.value || '';

        const filtrados = productosData.filter(p => {
            const matchQ = !query || 
                p.nombre.toLowerCase().includes(query) || 
                (p.codigo_sku && p.codigo_sku.toLowerCase().includes(query)) ||
                (p.proveedor_habitual && p.proveedor_habitual.toLowerCase().includes(query)) ||
                (p.codigo_barras && p.codigo_barras.toLowerCase().includes(query)) ||
                (p.descripcion && p.descripcion.toLowerCase().includes(query));

            const matchCat = !categoriaId || String(p.id_categoria) === String(categoriaId);
            const matchTipo = !tipoArticulo || p.tipo_articulo === tipoArticulo;
            const matchEst = !estado || p.estado === estado;

            return matchQ && matchCat && matchTipo && matchEst;
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
                    badgeModo.style.background = '#FEF3C7';
                    badgeModo.style.color = '#D97706';
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

                cargarHistorialCompras(p.id);
            }
        } else {
            currentProductoEnEdicion = null;
            titulo.innerText = 'Registrar Nuevo Producto / Insumo';
            if (badgeModo) {
                badgeModo.innerText = 'NUEVO';
                badgeModo.style.background = '#E2E8F0';
                badgeModo.style.color = '#475569';
            }
            generarSkuAutomatico();
            renderizarTablaCompras([]);
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
    window.eliminarFotoProducto = function() {
        const photoImg = document.getElementById('prod-photo-img');
        const photoPlaceholder = document.getElementById('prod-photo-placeholder');
        const inputUrl = document.getElementById('prod-imagen-url');
        const inputFile = document.getElementById('prod-input-foto');

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

    // Cargar compras del producto
    async function cargarHistorialCompras(idProducto) {
        const contadorBadge = document.getElementById('modal-tab-compras-count');
        try {
            const res = await fetch((window.APP_BASE || '') + `/api/index.php?request=inventario/list_compras_producto&id_producto=${idProducto}`);
            const data = await res.json();
            if (data.status === 'success') {
                comprasDelProducto = data.data || [];
                if (contadorBadge) contadorBadge.innerText = comprasDelProducto.length;
                renderizarTablaCompras(comprasDelProducto);
            }
        } catch (e) {
            console.error('Error cargando compras:', e);
            renderizarTablaCompras([]);
        }
    }

    // Renderizar tabla del historial de compras
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
                        No hay compras ni comprobantes registrados para este insumo.
                    </div>
                    <div style="font-size: 12px; color: var(--text-sec);">
                        Puedes registrar una compra arriba y adjuntar su factura escaneada o foto.
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
        if (label) label.innerText = 'Seleccionar Archivo (PDF / JPG)';
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

    // Eliminar Producto
    window.eliminarProducto = function(id, nombre) {
        if (!confirm(`¿Estás seguro de que deseas eliminar el producto / insumo "${nombre}"?\nEsta acción retirará el ítem del catálogo.`)) {
            return;
        }

        fetch((window.APP_BASE || '') + '/api/index.php?request=inventario/delete_producto', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id })
        })
        .then(res => res.json())
        .then(data => {
            if (data.status === 'success') {
                if (typeof showToast === 'function') showToast('Producto eliminado exitosamente', 'success');
                cargarProductosInventario();
            } else {
                if (typeof showToast === 'function') showToast(data.message || 'Error al eliminar', 'error');
            }
        })
        .catch(err => {
            console.error(err);
            if (typeof showToast === 'function') showToast('Error al eliminar producto', 'error');
        });
    };

})();
