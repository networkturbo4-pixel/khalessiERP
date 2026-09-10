// js/modules/inventario.js - Módulo de Inventario (Moderno, Sin Cabecera y con Cards Desglosables)

(function() {
    'use strict';

    let productosData = [];
    let categoriasData = [];
    let activeTab = 'productos';
    let expandedProductIds = new Set();

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
                            <div class="stat-icon" style="background: rgba(245, 158, 11, 0.1); color: #F59E0B);">
                                <i class="ph ph-warning-circle"></i>
                            </div>
                            <div>
                                <div class="stat-value" id="kpi-bajo-stock">0</div>
                                <div class="stat-label">Bajo Stock / Agotados</div>
                            </div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-icon" style="background: rgba(59, 130, 246, 0.1); color: #3B82F6);">
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
                                        <input type="text" id="filtro-prod-buscar" class="form-control" placeholder="Buscar por nombre, SKU o detalle..." style="padding-left: 40px; border-radius: 10px;" oninput="filtrarProductosInventario()">
                                    </div>
                                    <select id="filtro-prod-categoria" class="form-control" style="width: auto; min-width: 170px; border-radius: 10px;" onchange="filtrarProductosInventario()">
                                        <option value="">Todas las categorías</option>
                                    </select>
                                    <select id="filtro-prod-estado" class="form-control" style="width: auto; min-width: 150px; border-radius: 10px;" onchange="filtrarProductosInventario()">
                                        <option value="">Todos los estados</option>
                                        <option value="disponible">Disponibles</option>
                                        <option value="agotado">Agotados</option>
                                        <option value="inactivo">Inactivos</option>
                                    </select>
                                </div>

                                <!-- Botones de Acción -->
                                <div style="display: flex; gap: 10px; align-items: center;">
                                    <button class="btn btn-secondary btn-icon" title="Refrescar productos" onclick="cargarProductosInventario(true)">
                                        <i class="ph ph-arrows-clockwise"></i>
                                    </button>
                                    <button class="btn btn-primary" onclick="abrirModalProducto()" style="border-radius: 10px; font-weight: 600;">
                                        <i class="ph ph-plus"></i> Nuevo Producto
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Contenedor de Filas en Card Desglosables -->
                    <div id="contenedor-productos-cards">
                        <div style="text-align: center; padding: 48px; color: var(--text-sec); background: var(--bg-panel); border-radius: 16px; border: 1px solid var(--border-color);">
                            <i class="ph ph-spinner ph-spin" style="font-size: 28px; color: var(--primary); margin-bottom: 8px; display: block; margin-inline: auto;"></i>
                            Cargando productos...
                        </div>
                    </div>
                </div>
            </div>

            <!-- MODAL: CREAR / EDITAR PRODUCTO (85% VH en PC) -->
            <div id="modal-producto" class="modal-backdrop hidden" onclick="if(event.target === this) cerrarModalProducto()">
                <div class="modal">
                    <div class="modal-header">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <div style="width: 36px; height: 36px; border-radius: 10px; background: rgba(239, 68, 68, 0.1); color: var(--primary); display: flex; align-items: center; justify-content: center; font-size: 20px;">
                                <i class="ph ph-package"></i>
                            </div>
                            <div>
                                <h3 id="modal-producto-titulo" style="margin: 0; font-size: 17px; font-weight: 600;">Nuevo Producto</h3>
                                <p style="margin: 0; font-size: 12px; color: var(--text-sec);">Completa los datos del ítem para el catálogo</p>
                            </div>
                        </div>
                        <button class="btn-icon" onclick="cerrarModalProducto()"><i class="ph ph-x"></i></button>
                    </div>
                    <div class="modal-body">
                        <form id="form-producto" onsubmit="event.preventDefault(); guardarProducto();">
                            <input type="hidden" id="prod-id" value="">

                            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px; margin-bottom: 16px;">
                                <div class="form-group" style="margin-bottom: 0;">
                                    <label class="form-label font-bold">Nombre del Producto <span class="text-danger">*</span></label>
                                    <input type="text" id="prod-nombre" class="form-control" placeholder="Ej. Pizza Americana Familiar" required>
                                </div>
                                <div class="form-group" style="margin-bottom: 0;">
                                    <label class="form-label font-bold">Categoría <span class="text-danger">*</span></label>
                                    <select id="prod-categoria" class="form-control" required>
                                        <option value="">Seleccione Categoría</option>
                                    </select>
                                </div>
                            </div>

                            <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 16px; margin-bottom: 16px;">
                                <div class="form-group" style="margin-bottom: 0;">
                                    <label class="form-label font-bold">Código SKU / Barras</label>
                                    <div style="display: flex; gap: 6px;">
                                        <input type="text" id="prod-sku" class="form-control" placeholder="Ej. PIZ-AME-001" style="font-family: monospace;">
                                        <button type="button" class="btn btn-secondary" onclick="generarSkuAutomatico()" title="Generar código automático">
                                            <i class="ph ph-sparkle"></i> Auto
                                        </button>
                                    </div>
                                </div>
                                <div class="form-group" style="margin-bottom: 0;">
                                    <label class="form-label font-bold">Estado</label>
                                    <select id="prod-estado" class="form-control">
                                        <option value="disponible">Disponible</option>
                                        <option value="agotado">Agotado</option>
                                        <option value="inactivo">Inactivo</option>
                                    </select>
                                </div>
                            </div>

                            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 16px;">
                                <div class="form-group" style="margin-bottom: 0;">
                                    <label class="form-label font-bold">Precio Venta (S/) <span class="text-danger">*</span></label>
                                    <input type="number" step="0.10" min="0" id="prod-precio" class="form-control font-bold" placeholder="0.00" required>
                                </div>
                                <div class="form-group" style="margin-bottom: 0;">
                                    <label class="form-label font-bold">Stock Actual</label>
                                    <input type="number" step="1" min="0" id="prod-stock" class="form-control" placeholder="0">
                                </div>
                                <div class="form-group" style="margin-bottom: 0;">
                                    <label class="form-label font-bold">Stock Mínimo</label>
                                    <input type="number" step="1" min="0" id="prod-stock-min" class="form-control" placeholder="5" value="5">
                                </div>
                            </div>

                            <div class="form-group" style="margin-bottom: 16px;">
                                <label class="form-label font-bold">Descripción / Detalles del Producto</label>
                                <textarea id="prod-descripcion" class="form-control" rows="3" placeholder="Ingredientes, porciones, especificaciones o notas de venta..."></textarea>
                            </div>

                            <div class="form-group" style="margin-bottom: 0;">
                                <label class="form-label font-bold">URL de Imagen (Opcional)</label>
                                <div style="display: flex; gap: 8px;">
                                    <input type="url" id="prod-imagen" class="form-control" placeholder="https://ejemplo.com/foto.jpg">
                                    <button type="button" class="btn btn-secondary" onclick="abrirGestorMediosParaProducto()" title="Seleccionar imagen">
                                        <i class="ph ph-image"></i>
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" onclick="cerrarModalProducto()">Cancelar</button>
                        <button type="button" class="btn btn-primary" onclick="guardarProducto()" id="btn-guardar-producto">
                            <i class="ph ph-floppy-disk"></i> Guardar Producto
                        </button>
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
                                Stock actual registrado: <strong id="ajuste-prod-actual" class="text-primary" style="font-size: 15px;">0</strong> unidades
                            </div>
                        </div>

                        <div class="form-group mb-3">
                            <label class="form-label font-bold">Tipo de Operación</label>
                            <select id="ajuste-tipo" class="form-control">
                                <option value="entrada">+ Entrada (Compra / Abastecimiento)</option>
                                <option value="salida">- Salida (Merma / Consumo / Venta)</option>
                                <option value="ajuste">= Fijar Cantidad Exacta (Conteo Físico Real)</option>
                            </select>
                        </div>

                        <div class="form-group mb-3">
                            <label class="form-label font-bold">Cantidad de Unidades <span class="text-danger">*</span></label>
                            <input type="number" step="1" min="0.1" id="ajuste-cantidad" class="form-control font-bold" placeholder="Ingresa cantidad" required>
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

        // Cargar datos
        cargarCategoriasInventario();
        cargarProductosInventario();
    };

    // Cambio de pestañas
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
                let modalHtml = '<option value="">Seleccione Categoría</option>';

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

    // Cargar productos
    window.cargarProductosInventario = async function(manual = false) {
        const contenedor = document.getElementById('contenedor-productos-cards');
        if (!contenedor) return;

        if (manual && typeof showToast === 'function') {
            showToast('Actualizando catálogo de productos...', 'info');
        }

        try {
            const res = await fetch((window.APP_BASE || '') + '/api/index.php?request=inventario/list_productos');
            const data = await res.json();
            if (data.status === 'success') {
                productosData = data.data || [];
                actualizarKpisProductos(productosData);
                renderizarCardsProductos(productosData);
                if (manual && typeof showToast === 'function') {
                    showToast('Catálogo de productos actualizado', 'success');
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
            const precio = parseFloat(p.precio_venta) || 0;

            if (p.estado === 'disponible' && stock > 0) disponibles++;
            if (stock <= stockMin || p.estado === 'agotado') bajoStock++;
            valorTotal += (stock * precio);
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

    // Toggle de desglosable de cada producto
    window.toggleProductoCard = function(id) {
        const card = document.getElementById(`prod-card-${id}`);
        if (!card) return;

        if (card.classList.contains('expanded')) {
            card.classList.remove('expanded');
            expandedProductIds.delete(id);
        } else {
            card.classList.add('expanded');
            expandedProductIds.add(id);
        }
        if (typeof triggerHaptic === 'function') triggerHaptic(10);
    };

    // Renderizar lista en cards desglosables
    function renderizarCardsProductos(items) {
        const contenedor = document.getElementById('contenedor-productos-cards');
        if (!contenedor) return;

        if (items.length === 0) {
            contenedor.innerHTML = `
                <div style="text-align: center; padding: 48px 20px; background: var(--bg-panel); border-radius: 16px; border: 1px solid var(--border-color);">
                    <div style="width: 56px; height: 56px; border-radius: 50%; background: var(--bg-main); color: var(--text-sec); display: inline-flex; align-items: center; justify-content: center; font-size: 26px; margin-bottom: 12px;">
                        <i class="ph ph-package"></i>
                    </div>
                    <h4 style="margin-bottom: 4px; font-weight: 600; color: var(--text-main);">No hay productos registrados</h4>
                    <p style="color: var(--text-sec); font-size: 13px; margin-bottom: 16px;">Comienza registrando tu primer producto en el catálogo.</p>
                    <button class="btn btn-primary" onclick="abrirModalProducto()" style="border-radius: 10px;">
                        <i class="ph ph-plus"></i> Crear Mi Primer Producto
                    </button>
                </div>
            `;
            return;
        }

        let html = '';
        items.forEach((p) => {
            const stock = parseFloat(p.stock_actual) || 0;
            const stockMin = parseFloat(p.stock_minimo) || 0;
            const precio = parseFloat(p.precio_venta) || 0;
            const valorTotalProd = stock * precio;
            const isExpanded = expandedProductIds.has(p.id);

            // Alerta visual de stock
            let stockColorClass = 'badge-success';
            let stockEstadoTxt = 'Saludable';
            if (stock <= 0) {
                stockColorClass = 'badge-danger';
                stockEstadoTxt = 'Agotado';
            } else if (stock <= stockMin) {
                stockColorClass = 'badge-warning';
                stockEstadoTxt = 'Crítico / Reabastecer';
            }

            // Barra de progreso de stock relativo al mínimo (100% si stock >= 2 * stockMin)
            const targetMin = stockMin > 0 ? stockMin * 2 : 10;
            const stockPorcentaje = Math.min(100, Math.round((stock / targetMin) * 100));
            const barColor = stock <= 0 ? 'var(--danger)' : (stock <= stockMin ? '#F59E0B' : 'var(--success)');

            // Estado Badge
            let estadoBadge = '<span class="badge badge-success" style="text-transform:capitalize;">Disponible</span>';
            if (p.estado === 'agotado' || stock <= 0) {
                estadoBadge = '<span class="badge badge-danger" style="text-transform:capitalize;">Agotado</span>';
            } else if (p.estado === 'inactivo') {
                estadoBadge = '<span class="badge" style="background:var(--border-color); color:var(--text-sec); text-transform:capitalize;">Inactivo</span>';
            }

            // Imagen / Thumbnail
            const imgHtml = p.imagen_url 
                ? `<img src="${p.imagen_url}" style="width: 42px; height: 42px; border-radius: 10px; object-fit: cover; border: 1px solid var(--border-color); flex-shrink: 0;">`
                : `<div style="width: 42px; height: 42px; border-radius: 10px; background: var(--bg-main); border: 1px solid var(--border-color); display: flex; align-items: center; justify-content: center; color: var(--text-sec); flex-shrink: 0;"><i class="ph ph-package" style="font-size: 22px;"></i></div>`;

            html += `
                <div class="prod-card-row ${isExpanded ? 'expanded' : ''}" id="prod-card-${p.id}">
                    <!-- Cabecera Principal de la Fila (Click para desglosar) -->
                    <div class="prod-card-header" onclick="toggleProductoCard(${p.id})">
                        <div style="display: flex; align-items: center; gap: 14px; flex: 1; min-width: 0;">
                            ${imgHtml}
                            <div style="min-width: 0;">
                                <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                                    <strong style="color: var(--text-main); font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${p.nombre}</strong>
                                    <span style="font-family: monospace; font-size: 11px; background: var(--bg-main); padding: 1px 6px; border-radius: 4px; border: 1px solid var(--border-color);">${p.codigo_sku || 'S/N'}</span>
                                </div>
                                <div style="display: flex; align-items: center; gap: 10px; margin-top: 3px; font-size: 12px; color: var(--text-sec);">
                                    <span><i class="ph ph-tag" style="vertical-align: middle;"></i> ${p.categoria_nombre || 'General'}</span>
                                    <span style="display: inline-block; width: 4px; height: 4px; border-radius: 50%; background: var(--border-color);"></span>
                                    <span style="font-weight: 600; color: var(--text-main);">S/ ${precio.toFixed(2)}</span>
                                </div>
                            </div>
                        </div>

                        <!-- Lado Derecho: Stock, Estado y Acciones Rápidas -->
                        <div style="display: flex; align-items: center; gap: 12px; flex-shrink: 0;" onclick="event.stopPropagation()">
                            <div style="text-align: right; display: flex; flex-direction: column; align-items: flex-end;">
                                <span class="badge ${stockColorClass}" style="font-size: 12px; font-weight: 600; padding: 4px 10px;">
                                    ${stock} unid.
                                </span>
                                <span style="font-size: 11px; color: var(--text-sec); margin-top: 2px;">Mín: ${stockMin}</span>
                            </div>

                            <div style="display: none; align-items: center;" class="d-md-flex">
                                ${estadoBadge}
                            </div>

                            <div style="display: inline-flex; gap: 4px; align-items: center;">
                                <button class="btn-icon" style="color: var(--primary);" title="Ajustar existencias" onclick="abrirModalAjusteStock(${p.id}, '${p.nombre.replace(/'/g, "\\'")}', ${stock})">
                                    <i class="ph ph-scales"></i>
                                </button>
                                <button class="btn-icon" style="color: var(--link);" title="Editar producto" onclick="abrirModalProducto(${p.id})">
                                    <i class="ph ph-pencil-simple"></i>
                                </button>
                                <button class="btn-icon" style="color: var(--danger);" title="Eliminar producto" onclick="eliminarProducto(${p.id}, '${p.nombre.replace(/'/g, "\\'")}')">
                                    <i class="ph ph-trash"></i>
                                </button>
                            </div>

                            <!-- Icono Flecha Desglosable -->
                            <div class="prod-chevron" onclick="toggleProductoCard(${p.id})" title="Ver más detalles">
                                <i class="ph ph-caret-down"></i>
                            </div>
                        </div>
                    </div>

                    <!-- Panel Desglosable con Información Extendida (Accordion) -->
                    <div class="prod-card-collapse">
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; margin-bottom: 16px;">
                            
                            <!-- 1. Estado y Salud de Stock -->
                            <div style="background: var(--bg-panel); padding: 14px; border-radius: 12px; border: 1px solid var(--border-color);">
                                <div style="font-size: 11.5px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-sec); margin-bottom: 8px;">
                                    <i class="ph ph-chart-bar"></i> Control de Existencias
                                </div>
                                <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 6px;">
                                    <span style="font-size: 13px; color: var(--text-main);">Nivel de Inventario:</span>
                                    <strong style="color: ${barColor}; font-size: 13px;">${stockEstadoTxt}</strong>
                                </div>
                                <div style="width: 100%; height: 7px; background: var(--bg-main); border-radius: 6px; overflow: hidden; margin-bottom: 8px; border: 1px solid var(--border-color);">
                                    <div style="width: ${stockPorcentaje}%; height: 100%; background: ${barColor}; border-radius: 6px; transition: width 0.3s ease;"></div>
                                </div>
                                <div style="display: flex; justify-content: space-between; font-size: 11.5px; color: var(--text-sec);">
                                    <span>Stock Actual: <strong>${stock}</strong></span>
                                    <span>Alerta Mínima: <strong>${stockMin}</strong></span>
                                </div>
                            </div>

                            <!-- 2. Información Comercial y Financiera -->
                            <div style="background: var(--bg-panel); padding: 14px; border-radius: 12px; border: 1px solid var(--border-color);">
                                <div style="font-size: 11.5px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-sec); margin-bottom: 8px;">
                                    <i class="ph ph-currency-dollar"></i> Finanzas del Producto
                                </div>
                                <div style="display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 13px;">
                                    <span style="color: var(--text-sec);">Precio de Venta Unitario:</span>
                                    <strong style="color: var(--text-main);">S/ ${precio.toFixed(2)}</strong>
                                </div>
                                <div style="display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 13px;">
                                    <span style="color: var(--text-sec);">Capital Inmovilizado:</span>
                                    <strong style="color: #3B82F6;">S/ ${valorTotalProd.toFixed(2)}</strong>
                                </div>
                                <div style="display: flex; justify-content: space-between; font-size: 13px;">
                                    <span style="color: var(--text-sec);">Estado en Catálogo:</span>
                                    <span>${estadoBadge}</span>
                                </div>
                            </div>

                            <!-- 3. Especificaciones y Receta -->
                            <div style="background: var(--bg-panel); padding: 14px; border-radius: 12px; border: 1px solid var(--border-color);">
                                <div style="font-size: 11.5px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-sec); margin-bottom: 8px;">
                                    <i class="ph ph-file-text"></i> Detalles y Producción
                                </div>
                                <div style="font-size: 12.5px; color: var(--text-main); margin-bottom: 6px;">
                                    <strong>SKU:</strong> <code style="background: var(--bg-main); padding: 1px 5px; border-radius: 4px;">${p.codigo_sku || 'No asignado'}</code>
                                </div>
                                <div style="font-size: 12.5px; color: var(--text-main); margin-bottom: 6px;">
                                    <strong>Receta Vinculada:</strong> ${p.receta_nombre ? `<span class="badge badge-info"><i class="ph ph-cooking-pot"></i> ${p.receta_nombre}</span>` : '<span style="color:var(--text-sec);">Ninguna</span>'}
                                </div>
                                <div style="font-size: 12px; color: var(--text-sec); line-height: 1.4;">
                                    ${p.descripcion ? p.descripcion : '<em>Sin descripción adicional registrada.</em>'}
                                </div>
                            </div>
                        </div>

                        <!-- Barra de Acciones Directas desde el Drawer -->
                        <div style="display: flex; gap: 10px; justify-content: flex-end; flex-wrap: wrap; padding-top: 8px; border-top: 1px dashed var(--border-color);">
                            <button class="btn btn-secondary btn-sm" onclick="abrirModalAjusteStock(${p.id}, '${p.nombre.replace(/'/g, "\\'")}', ${stock})">
                                <i class="ph ph-scales"></i> Registrar Movimiento / Ajuste
                            </button>
                            <button class="btn btn-secondary btn-sm" onclick="abrirModalProducto(${p.id})">
                                <i class="ph ph-pencil-simple"></i> Editar Información
                            </button>
                            <button class="btn btn-secondary btn-sm text-danger" onclick="eliminarProducto(${p.id}, '${p.nombre.replace(/'/g, "\\'")}')">
                                <i class="ph ph-trash"></i> Eliminar
                            </button>
                        </div>
                    </div>
                </div>
            `;
        });

        contenedor.innerHTML = html;
        if (typeof window.renderPhosphorIcons === 'function') {
            window.renderPhosphorIcons(contenedor);
        }
    }

    // Filtrar productos
    window.filtrarProductosInventario = function() {
        const query = (document.getElementById('filtro-prod-buscar')?.value || '').toLowerCase().trim();
        const categoriaId = document.getElementById('filtro-prod-categoria')?.value || '';
        const estado = document.getElementById('filtro-prod-estado')?.value || '';

        const filtrados = productosData.filter(p => {
            const matchQ = !query || 
                p.nombre.toLowerCase().includes(query) || 
                (p.codigo_sku && p.codigo_sku.toLowerCase().includes(query)) ||
                (p.descripcion && p.descripcion.toLowerCase().includes(query));

            const matchCat = !categoriaId || String(p.id_categoria) === String(categoriaId);
            const matchEst = !estado || p.estado === estado;

            return matchQ && matchCat && matchEst;
        });

        renderizarCardsProductos(filtrados);
    };

    // Abrir Modal de Producto (con .show y .hidden manejados con precisión)
    window.abrirModalProducto = function(id = null) {
        const modal = document.getElementById('modal-producto');
        const titulo = document.getElementById('modal-producto-titulo');
        const form = document.getElementById('form-producto');
        if (!modal) return;

        form.reset();
        document.getElementById('prod-id').value = '';
        document.getElementById('prod-stock-min').value = '5';
        document.getElementById('prod-estado').value = 'disponible';

        if (id) {
            const prod = productosData.find(x => String(x.id) === String(id));
            if (prod) {
                titulo.innerText = 'Editar Producto';
                document.getElementById('prod-id').value = prod.id;
                document.getElementById('prod-nombre').value = prod.nombre;
                document.getElementById('prod-categoria').value = prod.id_categoria || '';
                document.getElementById('prod-sku').value = prod.codigo_sku || '';
                document.getElementById('prod-precio').value = prod.precio_venta || '';
                document.getElementById('prod-stock').value = prod.stock_actual || '0';
                document.getElementById('prod-stock-min').value = prod.stock_minimo || '5';
                document.getElementById('prod-estado').value = prod.estado || 'disponible';
                document.getElementById('prod-descripcion').value = prod.descripcion || '';
                document.getElementById('prod-imagen').value = prod.imagen_url || '';
            }
        } else {
            titulo.innerText = 'Nuevo Producto';
            generarSkuAutomatico();
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

    // Generar SKU aleatorio
    window.generarSkuAutomatico = function() {
        const num = Math.floor(1000 + Math.random() * 9000);
        const skuInput = document.getElementById('prod-sku');
        if (skuInput) skuInput.value = `PROD-${num}`;
    };

    // Guardar Producto
    window.guardarProducto = async function() {
        const btn = document.getElementById('btn-guardar-producto');
        const id = document.getElementById('prod-id').value;
        const nombre = document.getElementById('prod-nombre').value.trim();
        const id_categoria = document.getElementById('prod-categoria').value;
        const codigo_sku = document.getElementById('prod-sku').value.trim();
        const precio_venta = document.getElementById('prod-precio').value;
        const stock_actual = document.getElementById('prod-stock').value;
        const stock_minimo = document.getElementById('prod-stock-min').value;
        const estado = document.getElementById('prod-estado').value;
        const descripcion = document.getElementById('prod-descripcion').value.trim();
        const imagen_url = document.getElementById('prod-imagen').value.trim();

        if (!nombre) {
            if (typeof showToast === 'function') showToast('El nombre del producto es obligatorio', 'error');
            return;
        }
        if (!precio_venta || parseFloat(precio_venta) < 0) {
            if (typeof showToast === 'function') showToast('Indica un precio de venta válido', 'error');
            return;
        }

        const payload = {
            id: id || null,
            nombre,
            id_categoria: id_categoria || null,
            codigo_sku,
            precio_venta: parseFloat(precio_venta) || 0,
            stock_actual: parseFloat(stock_actual) || 0,
            stock_minimo: parseFloat(stock_minimo) || 0,
            estado,
            descripcion,
            imagen_url
        };

        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Guardando...';
        }

        try {
            const res = await fetch((window.APP_BASE || '') + '/api/index.php?request=inventario/save_producto', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (res.ok && data.status === 'success') {
                if (typeof showToast === 'function') showToast(data.message || 'Producto guardado', 'success');
                cerrarModalProducto();
                await cargarProductosInventario();
            } else {
                if (typeof showToast === 'function') showToast(data.message || 'Error al guardar producto', 'error');
            }
        } catch (e) {
            console.error('Error al guardar:', e);
            if (typeof showToast === 'function') showToast('Error al conectar con el servidor', 'error');
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '<i class="ph ph-floppy-disk"></i> Guardar Producto';
            }
        }
    };

    // Abrir Modal de Ajuste de Stock
    window.abrirModalAjusteStock = function(id, nombre, stockActual) {
        const modal = document.getElementById('modal-ajustar-stock');
        if (!modal) return;

        document.getElementById('ajuste-prod-id').value = id;
        document.getElementById('ajuste-prod-nombre').innerText = nombre;
        document.getElementById('ajuste-prod-actual').innerText = stockActual;
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
        if (!confirm(`¿Estás seguro de que deseas eliminar el producto "${nombre}"?\nEsta acción retirará el ítem del catálogo.`)) {
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

    // Integración opcional con gestor de medios
    window.abrirGestorMediosParaProducto = function() {
        if (typeof window.openMediaManager === 'function') {
            window.openMediaManager(function(url) {
                const imgInput = document.getElementById('prod-imagen');
                if (imgInput) imgInput.value = url;
            });
        } else {
            const url = prompt('Ingresa la URL pública de la imagen del producto:');
            if (url) {
                const imgInput = document.getElementById('prod-imagen');
                if (imgInput) imgInput.value = url.trim();
            }
        }
    };

})();
