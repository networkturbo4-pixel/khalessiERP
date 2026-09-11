// js/modules/pedidos.js - Módulo de Pedidos Online & Ventas para Khalessi ERP
(function() {
    let pedidosData = [];
    let filtroEstado = 'activos';
    let busquedaTexto = '';
    let autoRefreshTimer = null;

    window.renderPedidos = async function(container) {
        container.innerHTML = `
            <div class="view-header" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px; margin-bottom:24px;">
                <div>
                    <h2 style="font-size:24px; font-weight:700; margin:0; display:flex; align-items:center; gap:10px; color:var(--text-main);">
                        <i class="ph ph-shopping-cart" style="color:var(--primary); font-size:26px;"></i>
                        Pedidos & Ventas Online
                    </h2>
                    <p class="page-subtitle" style="margin:4px 0 0 0;">
                        Recepción y despacho en tiempo real sincronizado con Tienda Roma
                    </p>
                </div>
                <div style="display:flex; gap:12px; align-items:center;">
                    <div style="display:flex; align-items:center; gap:8px; font-size:13px; font-weight:600; color:var(--text-sec); background:var(--bg-panel); padding:8px 14px; border-radius:12px; border:1px solid var(--border-color); box-shadow:var(--shadow-sm);">
                        <span id="pedidos-pulse-dot" style="width:8px; height:8px; border-radius:50%; background:#10B981; display:inline-block; box-shadow:0 0 8px #10B981;"></span>
                        <span id="pedidos-refresh-label">En vivo</span>
                    </div>
                    <button class="btn btn-secondary btn-sm" onclick="window.cargarPedidos()"><i class="ph ph-arrows-clockwise"></i> Actualizar</button>
                </div>
            </div>

            <!-- Métricas Resumen (Stats Grid Nativo del ERP) -->
            <div class="stats-grid" style="margin-bottom: 24px;" id="pedidos-stats-container">
                <div class="stat-card">
                    <div class="stat-icon" style="background: rgba(239, 68, 68, 0.12); color: #EF4444;">
                        <i class="ph ph-bell"></i>
                    </div>
                    <div class="stat-details">
                        <h3 id="stat-pendientes" style="color: #EF4444; font-weight: 700;">0</h3>
                        <p>Pendientes de Aprobación</p>
                    </div>
                </div>

                <div class="stat-card">
                    <div class="stat-icon" style="background: rgba(245, 158, 11, 0.12); color: #F59E0B;">
                        <i class="ph ph-cooking-pot"></i>
                    </div>
                    <div class="stat-details">
                        <h3 id="stat-preparacion" style="color: #F59E0B; font-weight: 700;">0</h3>
                        <p>En Cocina / Preparación</p>
                    </div>
                </div>

                <div class="stat-card">
                    <div class="stat-icon" style="background: rgba(16, 185, 129, 0.12); color: #10B981;">
                        <i class="ph ph-currency-dollar"></i>
                    </div>
                    <div class="stat-details">
                        <h3 id="stat-ventas-dia" style="color: #10B981; font-weight: 700;">S/ 0.00</h3>
                        <p>Ventas del Día</p>
                    </div>
                </div>

                <div class="stat-card">
                    <div class="stat-icon" style="background: rgba(59, 130, 246, 0.12); color: #3B82F6;">
                        <i class="ph ph-receipt"></i>
                    </div>
                    <div class="stat-details">
                        <h3 id="stat-total-hoy" style="color: #3B82F6; font-weight: 700;">0</h3>
                        <p>Total Pedidos Hoy</p>
                    </div>
                </div>
            </div>

            <!-- Barra de Filtros Segmented Pill y Búsqueda -->
            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:14px; margin-bottom:24px;">
                <nav class="nav-tabs" style="margin-bottom:0;">
                    <button class="nav-tab active" id="filter-activos" onclick="window.filtrarPedidosEstado('activos')">
                        <i class="ph ph-lightning"></i>
                        <span>Activos</span>
                    </button>
                    <button class="nav-tab" id="filter-pendiente" onclick="window.filtrarPedidosEstado('pendiente')">
                        <i class="ph ph-bell"></i>
                        <span>Pendientes</span>
                    </button>
                    <button class="nav-tab" id="filter-en_preparacion" onclick="window.filtrarPedidosEstado('en_preparacion')">
                        <i class="ph ph-cooking-pot"></i>
                        <span>En Cocina</span>
                    </button>
                    <button class="nav-tab" id="filter-listo" onclick="window.filtrarPedidosEstado('listo')">
                        <i class="ph ph-package"></i>
                        <span>Listos</span>
                    </button>
                    <button class="nav-tab" id="filter-entregado" onclick="window.filtrarPedidosEstado('entregado')">
                        <i class="ph ph-check-fat"></i>
                        <span>Entregados</span>
                    </button>
                    <button class="nav-tab" id="filter-todos" onclick="window.filtrarPedidosEstado('')">
                        <i class="ph ph-receipt"></i>
                        <span>Historial</span>
                    </button>
                </nav>

                <div style="position:relative; min-width:260px;">
                    <input type="text" id="pedidos-search-input" class="form-control" style="padding-left:36px; height:42px; border-radius:12px; font-size:13.5px;" placeholder="Buscar cliente, código, teléfono..." oninput="window.buscarPedidos(this.value)">
                    <i class="ph ph-magnifying-glass" style="position:absolute; left:12px; top:50%; transform:translateY(-50%); font-size:17px; color:var(--text-sec);"></i>
                </div>
            </div>

            <!-- Contenedor de Tarjetas de Pedidos -->
            <div id="pedidos-cards-container" style="display:grid; grid-template-columns: repeat(auto-fill, minmax(350px, 1fr)); gap:18px;">
                <div style="text-align:center; padding:50px; color:var(--text-sec); grid-column: 1 / -1;">
                    <i class="ph ph-spinner ph-spin" style="font-size:32px; color:var(--primary);"></i>
                    <p style="margin-top:12px; font-size:14px;">Cargando pedidos en tiempo real...</p>
                </div>
            </div>

            <!-- Modal de Detalle / Ticket de Pedido -->
            <div id="modal-pedido-detalle" class="modal-backdrop hidden" onclick="if(event.target === this) window.cerrarModalPedidoDetalle()">
                <div class="modal" style="width:100%; max-width:560px; max-height:90vh; display:flex; flex-direction:column; border-radius:var(--radius);">
                    <div class="modal-header">
                        <div style="display:flex; align-items:center; gap:10px;">
                            <i class="ph ph-receipt" style="font-size:22px; color:var(--primary);"></i>
                            <h3 id="modal-pedido-codigo" style="margin:0; font-size:18px; font-weight:700;">Detalle de Pedido</h3>
                        </div>
                        <button class="btn-icon" onclick="window.cerrarModalPedidoDetalle()"><i class="ph ph-x"></i></button>
                    </div>
                    <div class="modal-body" id="modal-pedido-cuerpo" style="overflow-y:auto; padding:20px;">
                        <!-- Inyectado dinámicamente -->
                    </div>
                    <div class="modal-footer" id="modal-pedido-footer">
                        <button class="btn btn-secondary" onclick="window.cerrarModalPedidoDetalle()">Cerrar</button>
                        <button class="btn btn-primary" onclick="window.imprimirTicketPedido()"><i class="ph ph-printer"></i> Imprimir Ticket</button>
                    </div>
                </div>
            </div>
        `;

        await window.cargarPedidos();
        await window.cargarStatsPedidos();

        if (autoRefreshTimer) clearInterval(autoRefreshTimer);
        autoRefreshTimer = setInterval(() => {
            if (window.location.pathname.includes('/pedidos')) {
                window.cargarPedidos(true);
                window.cargarStatsPedidos();
            } else {
                clearInterval(autoRefreshTimer);
            }
        }, 15000);
    };

    window.cargarStatsPedidos = async function() {
        try {
            const res = await fetch((window.APP_BASE || '') + '/api/pedidos/stats');
            const data = await res.json();
            if (data.status === 'success' && data.data) {
                const s = data.data;
                const elP = document.getElementById('stat-pendientes');
                const elPrep = document.getElementById('stat-preparacion');
                const elV = document.getElementById('stat-ventas-dia');
                const elT = document.getElementById('stat-total-hoy');
                
                if (elP) elP.innerText = s.pedidos_pendientes;
                if (elPrep) elPrep.innerText = s.pedidos_en_preparacion;
                if (elV) elV.innerText = 'S/ ' + Number(s.ventas_dia).toFixed(2);
                if (elT) elT.innerText = s.pedidos_hoy;

                // Actualizar badge en el sidebar
                const badge = document.getElementById('sidebar-pedidos-badge');
                if (badge) {
                    if (Number(s.pedidos_pendientes) > 0) {
                        badge.innerText = s.pedidos_pendientes;
                        badge.style.display = 'inline-block';
                    } else {
                        badge.style.display = 'none';
                    }
                }
            }
        } catch (e) {}
    };

    window.cargarPedidos = async function(isSilent = false) {
        const container = document.getElementById('pedidos-cards-container');
        if (!container) return;

        if (!isSilent) {
            container.innerHTML = `
                <div style="text-align:center; padding:50px; color:var(--text-sec); grid-column: 1 / -1;">
                    <i class="ph ph-spinner ph-spin" style="font-size:32px; color:var(--primary);"></i>
                    <p style="margin-top:12px; font-size:14px;">Cargando pedidos en tiempo real...</p>
                </div>
            `;
        }

        try {
            let url = (window.APP_BASE || '') + `/api/pedidos/list?estado=${encodeURIComponent(filtroEstado)}`;
            if (busquedaTexto) url += `&q=${encodeURIComponent(busquedaTexto)}`;

            const res = await fetch(url);
            const json = await res.json();

            if (json.status === 'success') {
                pedidosData = json.data || [];
                window.renderizarListaPedidos(pedidosData);
            } else {
                container.innerHTML = `
                    <div class="card" style="padding:24px; text-align:center; color:var(--danger); grid-column: 1 / -1;">
                        <i class="ph ph-warning-circle" style="font-size:32px; margin-bottom:8px;"></i>
                        <p style="margin:0; font-weight:600;">${json.message || 'Error al conectar con la base de datos'}</p>
                    </div>
                `;
            }
        } catch (err) {
            if (!isSilent) {
                container.innerHTML = `
                    <div class="card" style="padding:24px; text-align:center; color:var(--danger); grid-column: 1 / -1;">
                        <i class="ph ph-warning-circle" style="font-size:32px; margin-bottom:8px;"></i>
                        <p style="margin:0; font-weight:600;">Error de conexión con el servidor.</p>
                    </div>
                `;
            }
        }
    };

    window.renderizarListaPedidos = function(pedidos) {
        const container = document.getElementById('pedidos-cards-container');
        if (!container) return;

        if (!pedidos || pedidos.length === 0) {
            container.innerHTML = `
                <div style="text-align:center; padding:70px 20px; color:var(--text-sec); grid-column: 1 / -1;">
                    <div style="width:70px; height:70px; border-radius:50%; background:var(--bg-panel); border:1px solid var(--border-color); display:flex; align-items:center; justify-content:center; margin:0 auto 16px; box-shadow:var(--shadow-sm);">
                        <i class="ph ph-tray" style="font-size:34px; color:var(--text-sec);"></i>
                    </div>
                    <h3 style="font-size:18px; margin:0 0 6px; color:var(--text-main); font-weight:600;">No hay pedidos en esta sección</h3>
                    <p style="font-size:14px; margin:0; color:var(--text-sec);">Los pedidos que ingresen desde el catálogo o Tienda Roma se mostrarán aquí al instante.</p>
                </div>
            `;
            return;
        }

        const estadoBadges = {
            'pendiente': { label: 'Pendiente', color: '#EF4444', bg: 'rgba(239, 68, 68, 0.12)', icon: 'ph-bell' },
            'confirmado': { label: 'Confirmado', color: '#3B82F6', bg: 'rgba(59, 130, 246, 0.12)', icon: 'ph-check-circle' },
            'en_preparacion': { label: 'En Cocina', color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.12)', icon: 'ph-cooking-pot' },
            'listo': { label: 'Listo', color: '#8B5CF6', bg: 'rgba(139, 92, 246, 0.12)', icon: 'ph-package' },
            'en_camino': { label: 'En Camino', color: '#06B6D4', bg: 'rgba(6, 182, 212, 0.12)', icon: 'ph-motorcycle' },
            'entregado': { label: 'Entregado', color: '#10B981', bg: 'rgba(16, 185, 129, 0.12)', icon: 'ph-check-fat' },
            'cancelado': { label: 'Cancelado', color: '#6B7280', bg: 'rgba(107, 114, 128, 0.12)', icon: 'ph-x-circle' }
        };

        const html = pedidos.map(p => {
            const badge = estadoBadges[p.estado] || { label: p.estado, color: '#6B7280', bg: 'rgba(0,0,0,0.05)', icon: 'ph-receipt' };
            const fechaFmt = new Date(p.fecha_creacion).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' · ' + new Date(p.fecha_creacion).toLocaleDateString();
            
            // Botones de acción según el estado
            let accionBtn = '';
            if (p.estado === 'pendiente') {
                accionBtn = `
                    <button class="btn btn-sm btn-primary" style="flex:1; border-radius:10px; font-weight:600;" onclick="window.actualizarEstadoPedido(${p.id}, 'en_preparacion')">
                        <i class="ph ph-cooking-pot"></i> Pasar a Cocina
                    </button>
                `;
            } else if (p.estado === 'en_preparacion') {
                accionBtn = `
                    <button class="btn btn-sm" style="flex:1; background:#8B5CF6; color:#fff; border-radius:10px; font-weight:600;" onclick="window.actualizarEstadoPedido(${p.id}, 'listo')">
                        <i class="ph ph-check"></i> Marcar Listo
                    </button>
                `;
            } else if (p.estado === 'listo') {
                accionBtn = `
                    <button class="btn btn-sm" style="flex:1; background:#10B981; color:#fff; border-radius:10px; font-weight:600;" onclick="window.actualizarEstadoPedido(${p.id}, 'entregado')">
                        <i class="ph ph-check-fat"></i> Completar Entrega
                    </button>
                `;
            } else if (p.estado === 'en_camino') {
                accionBtn = `
                    <button class="btn btn-sm" style="flex:1; background:#10B981; color:#fff; border-radius:10px; font-weight:600;" onclick="window.actualizarEstadoPedido(${p.id}, 'entregado')">
                        <i class="ph ph-check-fat"></i> Marcar Entregado
                    </button>
                `;
            }

            // Items listados resumidos
            const itemsHtml = (p.items || []).map(it => `
                <div style="display:flex; justify-content:space-between; font-size:13px; margin-bottom:5px; color:var(--text-main);">
                    <span><b style="color:var(--primary);">${Number(it.cantidad)}x</b> ${escapeHtml(it.producto_nombre)}</span>
                    <span style="font-weight:600;">S/ ${Number(it.subtotal).toFixed(2)}</span>
                </div>
                ${it.notas ? `<div style="font-size:11.5px; color:var(--text-sec); margin-bottom:5px; padding-left:8px; font-style:italic;">↳ ${escapeHtml(it.notas)}</div>` : ''}
            `).join('');

            // Link WhatsApp directo
            let cleanPhone = (p.cliente_telefono || '').replace(/\D/g, '');
            let waLink = '';
            if (cleanPhone) {
                if (cleanPhone.length === 9) cleanPhone = '51' + cleanPhone;
                waLink = `<a href="https://wa.me/${cleanPhone}?text=Hola%20${encodeURIComponent(p.cliente_nombre)},%20te%20escribimos%20de%20Khalessi%20por%20tu%20pedido%20${p.codigo_pedido}" target="_blank" class="btn-icon" style="color:#25D366; font-size:20px; width:34px; height:34px; border-radius:8px; background:rgba(37, 211, 102, 0.1);" title="Contactar por WhatsApp"><i class="ph ph-whatsapp-logo"></i></a>`;
            }

            return `
                <div class="card" style="padding:18px; display:flex; flex-direction:column; justify-content:space-between; border-left:4px solid ${badge.color}; border-radius:var(--radius); box-shadow:var(--shadow-sm); background:var(--bg-panel); border-top:1px solid var(--border-color); border-right:1px solid var(--border-color); border-bottom:1px solid var(--border-color);">
                    <div>
                        <!-- Header Tarjeta -->
                        <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:14px;">
                            <div>
                                <span style="font-size:15px; font-weight:700; color:var(--text-main); letter-spacing:0.3px;">${escapeHtml(p.codigo_pedido)}</span>
                                <div style="font-size:12px; color:var(--text-sec); margin-top:2px;">${fechaFmt}</div>
                            </div>
                            <span style="font-size:12px; font-weight:600; padding:4px 10px; border-radius:20px; background:${badge.bg}; color:${badge.color}; display:flex; align-items:center; gap:5px;">
                                <i class="ph ${badge.icon}"></i> ${badge.label}
                            </span>
                        </div>

                        <!-- Cliente e Info de Entrega -->
                        <div style="background:var(--bg-main); padding:12px; border-radius:12px; margin-bottom:14px; border:1px solid var(--border-color);">
                            <div style="display:flex; justify-content:space-between; align-items:center;">
                                <span style="font-size:13.5px; font-weight:600; color:var(--text-main); display:flex; align-items:center; gap:6px;">
                                    <i class="ph ph-user" style="color:var(--text-sec);"></i> ${escapeHtml(p.cliente_nombre)}
                                </span>
                                ${waLink}
                            </div>
                            ${p.cliente_telefono ? `<div style="font-size:12px; color:var(--text-sec); margin-top:3px;"><i class="ph ph-identification-card" style="vertical-align:middle;"></i> ${escapeHtml(p.cliente_telefono)}</div>` : ''}
                            <div style="font-size:12px; color:var(--text-sec); margin-top:5px; display:flex; align-items:center; gap:6px;">
                                <i class="ph ${p.tipo_entrega === 'delivery' ? 'ph-motorcycle' : 'ph-storefront'}" style="color:var(--primary); font-size:15px;"></i> 
                                <span style="text-transform:capitalize; font-weight:600; color:var(--text-main);">${p.tipo_entrega}</span>
                                ${p.cliente_direccion ? `<span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">· ${escapeHtml(p.cliente_direccion)}</span>` : ''}
                            </div>
                            <div style="font-size:12px; color:var(--text-sec); margin-top:3px;">
                                <i class="ph ph-credit-card" style="vertical-align:middle;"></i> Pago: <b style="color:var(--text-main);">${escapeHtml(p.metodo_pago || 'Efectivo')}</b>
                            </div>
                        </div>

                        <!-- Detalle de Productos -->
                        <div style="margin-bottom:14px; border-bottom:1px dashed var(--border-color); padding-bottom:10px;">
                            ${itemsHtml}
                        </div>
                    </div>

                    <!-- Footer Tarjeta: Total y Acciones -->
                    <div>
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; padding-top:4px;">
                            <span style="font-size:13px; font-weight:500; color:var(--text-sec);">Total a Cobrar:</span>
                            <span style="font-size:20px; font-weight:800; color:var(--primary);">S/ ${Number(p.total).toFixed(2)}</span>
                        </div>

                        <div style="display:flex; gap:8px;">
                            ${accionBtn}
                            <button class="btn btn-sm btn-secondary" onclick="window.abrirModalPedidoDetalle(${p.id})" title="Ver Detalles y Ticket" style="border-radius:10px;"><i class="ph ph-eye"></i></button>
                            ${p.estado !== 'cancelado' && p.estado !== 'entregado' ? `
                                <button class="btn btn-sm btn-ghost" style="color:var(--danger); border-radius:10px;" onclick="window.cancelarPedido(${p.id})" title="Cancelar Pedido"><i class="ph ph-x"></i></button>
                            ` : ''}
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = html;
    };

    window.filtrarPedidosEstado = function(estado) {
        filtroEstado = estado;
        document.querySelectorAll('.nav-tab').forEach(b => b.classList.remove('active'));
        const btnId = estado === '' ? 'filter-todos' : `filter-${estado}`;
        const el = document.getElementById(btnId);
        if (el) el.classList.add('active');
        window.cargarPedidos();
    };

    window.buscarPedidos = function(texto) {
        busquedaTexto = texto.trim().toLowerCase();
        if (!busquedaTexto) {
            window.renderizarListaPedidos(pedidosData);
            return;
        }
        const filtrados = pedidosData.filter(p => 
            p.codigo_pedido.toLowerCase().includes(busquedaTexto) ||
            p.cliente_nombre.toLowerCase().includes(busquedaTexto) ||
            (p.cliente_telefono && p.cliente_telefono.includes(busquedaTexto))
        );
        window.renderizarListaPedidos(filtrados);
    };

    window.actualizarEstadoPedido = async function(id, nuevoEstado) {
        try {
            const res = await fetch((window.APP_BASE || '') + '/api/pedidos/cambiar_estado', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: id, estado: nuevoEstado })
            });
            const data = await res.json();
            if (data.status === 'success') {
                if (typeof showToast === 'function') showToast(`Estado actualizado: ${nuevoEstado}`, 'success');
                window.cargarPedidos(true);
                window.cargarStatsPedidos();
            } else {
                if (typeof showToast === 'function') showToast(data.message, 'danger');
            }
        } catch (e) {
            if (typeof showToast === 'function') showToast('Error al actualizar estado', 'danger');
        }
    };

    window.cancelarPedido = async function(id) {
        if (!confirm('¿Estás seguro de cancelar este pedido?')) return;
        window.actualizarEstadoPedido(id, 'cancelado');
    };

    window.abrirModalPedidoDetalle = function(id) {
        const p = pedidosData.find(x => x.id === id);
        if (!p) return;

        window._pedidoActivo = p;
        document.getElementById('modal-pedido-codigo').innerText = `Pedido ${p.codigo_pedido}`;
        
        const cuerpo = document.getElementById('modal-pedido-cuerpo');
        cuerpo.innerHTML = `
            <div style="font-family: monospace; background: var(--bg-main); padding: 18px; border-radius: 12px; font-size: 13px; line-height: 1.6; border:1px solid var(--border-color);">
                <div style="text-align:center; margin-bottom: 14px; border-bottom: 1px dashed var(--border-color); padding-bottom: 12px;">
                    <h3 style="margin:0; font-size:17px; font-weight:700; color:var(--text-main);">KHALESSI PIZZA & FOOD</h3>
                    <div style="color:var(--text-sec);">${escapeHtml(p.local_nombre || 'Local Principal')}</div>
                    <div style="margin-top:4px;">Código: <b>${escapeHtml(p.codigo_pedido)}</b></div>
                    <div>Fecha: ${new Date(p.fecha_creacion).toLocaleString()}</div>
                    <div>Origen: <span style="text-transform:uppercase; font-weight:600; color:var(--primary);">${escapeHtml(p.origen)}</span></div>
                </div>

                <div style="margin-bottom: 14px; border-bottom: 1px dashed var(--border-color); padding-bottom: 12px;">
                    <div><b>Cliente:</b> ${escapeHtml(p.cliente_nombre)}</div>
                    <div><b>Teléfono:</b> ${escapeHtml(p.cliente_telefono || '-')}</div>
                    <div><b>Entrega:</b> <span style="text-transform:capitalize; font-weight:600;">${escapeHtml(p.tipo_entrega)}</span></div>
                    ${p.cliente_direccion ? `<div><b>Dirección:</b> ${escapeHtml(p.cliente_direccion)}</div>` : ''}
                    <div><b>Pago:</b> ${escapeHtml(p.metodo_pago)}</div>
                    ${p.notas ? `<div style="margin-top:6px; color:var(--primary); font-weight:600;">Nota: ${escapeHtml(p.notas)}</div>` : ''}
                </div>

                <div style="margin-bottom: 14px; border-bottom: 1px dashed var(--border-color); padding-bottom: 12px;">
                    <div style="display:flex; justify-content:space-between; font-weight:700; margin-bottom:6px; color:var(--text-main);">
                        <span>CANT · DESCRIPCIÓN</span>
                        <span>IMPORTE</span>
                    </div>
                    ${(p.items || []).map(it => `
                        <div style="display:flex; justify-content:space-between; margin-bottom:5px;">
                            <span>${Number(it.cantidad)}x ${escapeHtml(it.producto_nombre)}</span>
                            <span style="font-weight:600;">S/ ${Number(it.subtotal).toFixed(2)}</span>
                        </div>
                        ${it.notas ? `<div style="font-size:11.5px; color:var(--text-sec); margin-bottom:4px; font-style:italic;">↳ ${escapeHtml(it.notas)}</div>` : ''}
                    `).join('')}
                </div>

                <div style="text-align:right;">
                    <div>Subtotal: S/ ${Number(p.subtotal).toFixed(2)}</div>
                    ${Number(p.descuento) > 0 ? `<div style="color:var(--danger);">Descuento: - S/ ${Number(p.descuento).toFixed(2)}</div>` : ''}
                    ${Number(p.costo_envio) > 0 ? `<div>Envío: S/ ${Number(p.costo_envio).toFixed(2)}</div>` : ''}
                    <div style="font-size: 18px; font-weight: 800; margin-top: 6px; color:var(--primary);">TOTAL: S/ ${Number(p.total).toFixed(2)}</div>
                </div>
            </div>
        `;

        document.getElementById('modal-pedido-detalle').classList.remove('hidden');
    };

    window.cerrarModalPedidoDetalle = function() {
        document.getElementById('modal-pedido-detalle').classList.add('hidden');
    };

    window.imprimirTicketPedido = function() {
        if (!window._pedidoActivo) return;
        const contenido = document.getElementById('modal-pedido-cuerpo').innerHTML;
        const printWindow = window.open('', '', 'width=400,height=600');
        printWindow.document.write(`
            <html>
                <head>
                    <title>Ticket ${window._pedidoActivo.codigo_pedido}</title>
                    <style>
                        body { font-family: monospace; font-size: 12px; margin: 10px; color: #000; }
                    </style>
                </head>
                <body onload="window.print(); window.close();">
                    ${contenido}
                </body>
            </html>
        `);
        printWindow.document.close();
    };

    function escapeHtml(text) {
        if (!text) return '';
        const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
        return text.toString().replace(/[&<>"']/g, m => map[m]);
    }

})();
