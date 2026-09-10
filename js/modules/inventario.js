// js/modules/inventario.js - Módulo de Inventario (Moderno y Sin Cabecera)

(function() {
    'use strict';

    let productosData = [];
    let categoriasData = [];
    let activeTab = 'productos';

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
                    <!-- Tarjetas de Métricas Rápidas (KPIs) -->
                    <div class="stats-grid mb-4" id="inv-prod-kpis">
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
                        <div class="card-body" style="padding: 16px 20px;">
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

                    <!-- Tabla de Productos -->
                    <div class="card" style="border-radius: 16px; border: 1px solid var(--border-color); overflow: hidden;">
                        <div class="table-responsive">
                            <table class="table" id="tabla-productos-inv" style="margin-bottom: 0;">
                                <thead>
                                    <tr>
                                        <th style="width: 50px;">Item</th>
                                        <th>Producto</th>
                                        <th>SKU / Código</th>
                                        <th>Categoría</th>
                                        <th style="text-align: right;">Precio Venta</th>
                                        <th style="text-align: center;">Stock Actual</th>
                                        <th style="text-align: center;">Stock Mín.</th>
                                        <th style="text-align: center;">Estado</th>
                                        <th style="text-align: center; width: 140px;">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody id="tbody-productos-inv">
                                    <tr>
                                        <td colspan="9" style="text-align: center; padding: 40px; color: var(--text-sec);">
                                            <i class="ph ph-spinner ph-spin" style="font-size: 28px; color: var(--primary); margin-bottom: 8px; display: block; margin-inline: auto;"></i>
                                            Cargando productos...
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            <!-- MODAL: CREAR / EDITAR PRODUCTO -->
            <div id="modal-producto" class="modal-backdrop hidden">
                <div class="modal" style="max-width: 620px; width: 100%; max-height: 90vh; display: flex; flex-direction: column;">
                    <div class="modal-header">
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <i class="ph ph-package" style="font-size: 22px; color: var(--primary);"></i>
                            <h3 id="modal-producto-titulo" style="margin: 0; font-size: 18px;">Nuevo Producto</h3>
                        </div>
                        <button class="btn-icon" onclick="cerrarModalProducto()"><i class="ph ph-x"></i></button>
                    </div>
                    <div class="modal-body" style="overflow-y: auto; padding: 22px;">
                        <form id="form-producto" onsubmit="event.preventDefault(); guardarProducto();">
                            <input type="hidden" id="prod-id" value="">

                            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 14px; margin-bottom: 14px;">
                                <div class="form-group" style="margin-bottom: 0;">
                                    <label class="form-label">Nombre del Producto <span class="text-danger">*</span></label>
                                    <input type="text" id="prod-nombre" class="form-control" placeholder="Ej. Pizza Americana Familiar" required>
                                </div>
                                <div class="form-group" style="margin-bottom: 0;">
                                    <label class="form-label">Categoría <span class="text-danger">*</span></label>
                                    <select id="prod-categoria" class="form-control" required>
                                        <option value="">Seleccione Categoría</option>
                                    </select>
                                </div>
                            </div>

                            <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 14px; margin-bottom: 14px;">
                                <div class="form-group" style="margin-bottom: 0;">
                                    <label class="form-label">Código SKU / Barras</label>
                                    <div style="display: flex; gap: 6px;">
                                        <input type="text" id="prod-sku" class="form-control" placeholder="Ej. PIZ-AME-001">
                                        <button type="button" class="btn btn-secondary" onclick="generarSkuAutomatico()" title="Generar código automático">
                                            <i class="ph ph-sparkle"></i>
                                        </button>
                                    </div>
                                </div>
                                <div class="form-group" style="margin-bottom: 0;">
                                    <label class="form-label">Estado</label>
                                    <select id="prod-estado" class="form-control">
                                        <option value="disponible">Disponible</option>
                                        <option value="agotado">Agotado</option>
                                        <option value="inactivo">Inactivo</option>
                                    </select>
                                </div>
                            </div>

                            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-bottom: 14px;">
                                <div class="form-group" style="margin-bottom: 0;">
                                    <label class="form-label">Precio Venta (S/) <span class="text-danger">*</span></label>
                                    <input type="number" step="0.10" min="0" id="prod-precio" class="form-control" placeholder="0.00" required>
                                </div>
                                <div class="form-group" style="margin-bottom: 0;">
                                    <label class="form-label">Stock Actual</label>
                                    <input type="number" step="1" min="0" id="prod-stock" class="form-control" placeholder="0">
                                </div>
                                <div class="form-group" style="margin-bottom: 0;">
                                    <label class="form-label">Stock Mínimo</label>
                                    <input type="number" step="1" min="0" id="prod-stock-min" class="form-control" placeholder="5" value="5">
                                </div>
                            </div>

                            <div class="form-group" style="margin-bottom: 14px;">
                                <label class="form-label">Descripción</label>
                                <textarea id="prod-descripcion" class="form-control" rows="2" placeholder="Detalles de ingredientes, porciones o especificaciones..."></textarea>
                            </div>

                            <div class="form-group" style="margin-bottom: 0;">
                                <label class="form-label">URL de Imagen (Opcional)</label>
                                <div style="display: flex; gap: 8px;">
                                    <input type="url" id="prod-imagen" class="form-control" placeholder="https://ejemplo.com/foto.jpg">
                                    <button type="button" class="btn btn-secondary" onclick="abrirGestorMediosParaProducto()" title="Seleccionar de galería">
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
            <div id="modal-ajustar-stock" class="modal-backdrop hidden">
                <div class="modal" style="max-width: 440px; width: 100%;">
                    <div class="modal-header">
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <i class="ph ph-scales" style="font-size: 22px; color: var(--primary);"></i>
                            <h3 style="margin: 0; font-size: 18px;">Ajustar Existencias</h3>
                        </div>
                        <button class="btn-icon" onclick="cerrarModalAjusteStock()"><i class="ph ph-x"></i></button>
                    </div>
                    <div class="modal-body" style="padding: 20px;">
                        <input type="hidden" id="ajuste-prod-id" value="">
                        
                        <div style="background: var(--bg-main); padding: 12px 14px; border-radius: 10px; margin-bottom: 16px; border: 1px solid var(--border-color);">
                            <div style="font-weight: 600; color: var(--text-main); font-size: 14px;" id="ajuste-prod-nombre">-</div>
                            <div style="font-size: 12px; color: var(--text-sec); margin-top: 2px;">
                                Stock actual registrado: <strong id="ajuste-prod-actual" class="text-primary" style="font-size: 14px;">0</strong> unidades
                            </div>
                        </div>

                        <div class="form-group mb-3">
                            <label class="form-label">Tipo de Operación</label>
                            <select id="ajuste-tipo" class="form-control">
                                <option value="entrada">+ Entrada de Mercadería (Compra / Abastecimiento)</option>
                                <option value="salida">- Salida / Merma (Consumo interno o descarte)</option>
                                <option value="ajuste">= Fijar Cantidad Exacta (Conteo Físico Real)</option>
                            </select>
                        </div>

                        <div class="form-group mb-3">
                            <label class="form-label">Cantidad <span class="text-danger">*</span></label>
                            <input type="number" step="1" min="0.1" id="ajuste-cantidad" class="form-control" placeholder="Ingresa cantidad" required>
                        </div>

                        <div class="form-group mb-0">
                            <label class="form-label">Motivo o Justificación</label>
                            <input type="text" id="ajuste-motivo" class="form-control" placeholder="Ej. Conteo físico de inicio de semana">
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

    // Cargar lista de categorías
    window.cargarCategoriasInventario = async function() {
        try {
            const res = await fetch((window.APP_BASE || '') + '/api/index.php?request=inventario/list_categorias');
            const data = await res.json();
            if (data.status === 'success') {
                categoriasData = data.data || [];
                
                // Llenar filtro de categorías
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

    // Cargar lista de productos desde la API
    window.cargarProductosInventario = async function(manual = false) {
        const tbody = document.getElementById('tbody-productos-inv');
        if (!tbody) return;

        if (manual && typeof showToast === 'function') {
            showToast('Actualizando catálogo de productos...', 'info');
        }

        try {
            const res = await fetch((window.APP_BASE || '') + '/api/index.php?request=inventario/list_productos');
            const data = await res.json();
            if (data.status === 'success') {
                productosData = data.data || [];
                actualizarKpisProductos(productosData);
                renderizarTablaProductos(productosData);
                if (manual && typeof showToast === 'function') {
                    showToast('Catálogo de productos actualizado', 'success');
                }
            } else {
                tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; color:var(--danger); padding:20px;">${data.message || 'Error al cargar productos'}</td></tr>`;
            }
        } catch (e) {
            console.error('Error cargando productos:', e);
            tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; color:var(--danger); padding:20px;">Error de comunicación con el servidor</td></tr>`;
        }
    };

    // Actualizar métricas / KPIs
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

    // Renderizar filas de la tabla
    function renderizarTablaProductos(items) {
        const tbody = document.getElementById('tbody-productos-inv');
        if (!tbody) return;

        if (items.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="9" style="text-align: center; padding: 48px 20px;">
                        <div style="width: 56px; height: 56px; border-radius: 50%; background: var(--bg-main); color: var(--text-sec); display: inline-flex; align-items: center; justify-content: center; font-size: 26px; margin-bottom: 12px;">
                            <i class="ph ph-package"></i>
                        </div>
                        <h4 style="margin-bottom: 4px; font-weight: 600; color: var(--text-main);">No hay productos registrados</h4>
                        <p style="color: var(--text-sec); font-size: 13px; margin-bottom: 16px;">Comienza registrando tu primer producto en el catálogo.</p>
                        <button class="btn btn-primary" onclick="abrirModalProducto()" style="border-radius: 10px;">
                            <i class="ph ph-plus"></i> Crear Mi Primer Producto
                        </button>
                    </td>
                </tr>
            `;
            return;
        }

        let html = '';
        items.forEach((p, idx) => {
            const stock = parseFloat(p.stock_actual) || 0;
            const stockMin = parseFloat(p.stock_minimo) || 0;
            const precio = parseFloat(p.precio_venta) || 0;

            // Alertas de stock
            let stockBadge = '<span class="badge badge-success" style="font-size:12px; font-weight:600; padding:4px 10px;">' + stock + ' unid.</span>';
            if (stock <= 0) {
                stockBadge = '<span class="badge badge-danger" style="font-size:12px; font-weight:600; padding:4px 10px;">0 (Agotado)</span>';
            } else if (stock <= stockMin) {
                stockBadge = '<span class="badge badge-warning" style="font-size:12px; font-weight:600; padding:4px 10px;">' + stock + ' (Crítico)</span>';
            }

            // Estado
            let estadoBadge = '<span class="badge badge-success" style="text-transform:capitalize;">Disponible</span>';
            if (p.estado === 'agotado' || stock <= 0) {
                estadoBadge = '<span class="badge badge-danger" style="text-transform:capitalize;">Agotado</span>';
            } else if (p.estado === 'inactivo') {
                estadoBadge = '<span class="badge" style="background:var(--border-color); color:var(--text-sec); text-transform:capitalize;">Inactivo</span>';
            }

            // Miniatura o fallback
            const imgHtml = p.imagen_url 
                ? `<img src="${p.imagen_url}" style="width: 36px; height: 36px; border-radius: 8px; object-fit: cover; border: 1px solid var(--border-color);">`
                : `<div style="width: 36px; height: 36px; border-radius: 8px; background: var(--bg-main); border: 1px solid var(--border-color); display: flex; align-items: center; justify-content: center; color: var(--text-sec);"><i class="ph ph-package" style="font-size: 18px;"></i></div>`;

            html += `
                <tr style="transition: background 0.15s ease;">
                    <td style="text-align: center; color: var(--text-sec); font-size: 12px;">${idx + 1}</td>
                    <td>
                        <div style="display: flex; align-items: center; gap: 12px;">
                            ${imgHtml}
                            <div>
                                <strong style="color: var(--text-main); font-size: 13.5px; display: block;">${p.nombre}</strong>
                                ${p.descripcion ? `<span style="font-size: 11.5px; color: var(--text-sec); display: block; max-width: 260px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${p.descripcion}</span>` : ''}
                            </div>
                        </div>
                    </td>
                    <td>
                        <span style="font-family: monospace; font-size: 12px; background: var(--bg-main); padding: 2px 6px; border-radius: 4px; border: 1px solid var(--border-color);">${p.codigo_sku || '-'}</span>
                    </td>
                    <td>
                        <span style="font-size: 12.5px; color: var(--text-sec);">${p.categoria_nombre || 'Sin categoría'}</span>
                    </td>
                    <td style="text-align: right; font-weight: 600; color: var(--text-main);">
                        S/ ${precio.toFixed(2)}
                    </td>
                    <td style="text-align: center;">${stockBadge}</td>
                    <td style="text-align: center; color: var(--text-sec); font-size: 12.5px;">${stockMin} unid.</td>
                    <td style="text-align: center;">${estadoBadge}</td>
                    <td style="text-align: center;">
                        <div style="display: inline-flex; gap: 6px;">
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
                    </td>
                </tr>
            `;
        });

        tbody.innerHTML = html;
        if (typeof window.renderPhosphorIcons === 'function') {
            window.renderPhosphorIcons(tbody);
        }
    }

    // Filtrar productos dinámicamente en memoria
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

        renderizarTablaProductos(filtrados);
    };

    // Abrir Modal de Creación / Edición
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
        if (typeof window.renderPhosphorIcons === 'function') {
            window.renderPhosphorIcons(modal);
        }
    };

    window.cerrarModalProducto = function() {
        const modal = document.getElementById('modal-producto');
        if (modal) modal.classList.add('hidden');
    };

    // Generar SKU aleatorio inteligente
    window.generarSkuAutomatico = function() {
        const num = Math.floor(1000 + Math.random() * 9000);
        const skuInput = document.getElementById('prod-sku');
        if (skuInput) skuInput.value = `PROD-${num}`;
    };

    // Guardar Producto (POST)
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

    // Abrir Modal de Ajuste Rápido de Stock
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
        if (typeof window.renderPhosphorIcons === 'function') {
            window.renderPhosphorIcons(modal);
        }
    };

    window.cerrarModalAjusteStock = function() {
        const modal = document.getElementById('modal-ajustar-stock');
        if (modal) modal.classList.add('hidden');
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
