/**
 * Módulo de Tiendas y Sedes - Pizza Khalessi ERP
 * Versión 1.0.0
 * Administra tiendas físicas y virtuales, delivery por tramos de distancia,
 * cobertura departamental, GPS con mapa Leaflet interactivo y métodos de pago.
 */

(function() {
    'use strict';

    let tiendasData = [];
    let currentTiendaEnEdicion = null;
    let currentMetodosPago = [];
    let currentMetodoEnEdicion = null;
    let leafletMapInstance = null;
    let leafletMarkerInstance = null;
    let activeTabTienda = 'info';

    const DEPARTAMENTOS_PERU = [
        'Amazonas', 'Áncash', 'Apurímac', 'Arequipa', 'Ayacucho',
        'Cajamarca', 'Callao', 'Cusco', 'Huancavelica', 'Huánuco',
        'Ica', 'Junín', 'La Libertad', 'Lambayeque', 'Lima',
        'Loreto', 'Madre de Dios', 'Moquegua', 'Pasco', 'Piura',
        'Puno', 'San Martín', 'Tacna', 'Tumbes', 'Ucayali'
    ];

    // =========================================================================
    // VISTA PRINCIPAL DEL MÓDULO TIENDAS
    // =========================================================================
    window.renderTiendas = function(container) {
        if (!container) container = document.getElementById('main-content-area');
        if (!container) return;

        container.innerHTML = `
            <div class="tiendas-module-view">
                <!-- Barra Superior de Título y Acción Principal -->
                <div class="tiendas-header-bar">
                    <div>
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <div class="tiendas-header-icon">
                                <i class="ph ph-storefront"></i>
                            </div>
                            <div>
                                <h1 style="margin: 0; font-size: 22px; font-weight: 800; color: var(--text-main); letter-spacing: -0.5px;">
                                    Tiendas y Sedes
                                </h1>
                                <p style="margin: 3px 0 0 0; font-size: 13px; color: var(--text-sec);">
                                    Administra locales físicos, áreas de delivery, coordenadas GPS, avisos de recojo y métodos de pago
                                </p>
                            </div>
                        </div>
                    </div>
                    <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
                        <button class="btn btn-primary" onclick="abrirModalTienda()" style="border-radius: 12px; font-weight: 700; padding: 10px 18px; display: inline-flex; align-items: center; gap: 8px;">
                            <i class="ph ph-plus" style="font-size: 17px;"></i>
                            <span>+ Nueva Tienda</span>
                        </button>
                    </div>
                </div>

                <!-- Tarjetas de Métricas / KPIs del Módulo -->
                <div class="tiendas-kpis-grid">
                    <div class="card kpi-card">
                        <div class="card-body" style="padding: 16px 20px;">
                            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                                <div>
                                    <div style="font-size: 11.5px; font-weight: 700; color: var(--text-sec); text-transform: uppercase; letter-spacing: 0.5px;">Total Sedes</div>
                                    <div id="kpi-total-tiendas" style="font-size: 26px; font-weight: 800; color: var(--text-main); margin-top: 4px;">0</div>
                                </div>
                                <div class="kpi-icon-pill" style="background: rgba(239, 68, 68, 0.1); color: var(--primary);">
                                    <i class="ph ph-storefront"></i>
                                </div>
                            </div>
                            <div style="font-size: 12px; color: var(--text-sec); margin-top: 8px;">Locales registrados en el ERP</div>
                        </div>
                    </div>

                    <div class="card kpi-card">
                        <div class="card-body" style="padding: 16px 20px;">
                            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                                <div>
                                    <div style="font-size: 11.5px; font-weight: 700; color: var(--text-sec); text-transform: uppercase; letter-spacing: 0.5px;">Sedes Activas</div>
                                    <div id="kpi-tiendas-activas" style="font-size: 26px; font-weight: 800; color: #10B981; margin-top: 4px;">0</div>
                                </div>
                                <div class="kpi-icon-pill" style="background: rgba(16, 185, 129, 0.1); color: #10B981;">
                                    <i class="ph ph-check-circle"></i>
                                </div>
                            </div>
                            <div style="font-size: 12px; color: var(--text-sec); margin-top: 8px;">Visibles y recibiendo pedidos</div>
                        </div>
                    </div>

                    <div class="card kpi-card">
                        <div class="card-body" style="padding: 16px 20px;">
                            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                                <div>
                                    <div style="font-size: 11.5px; font-weight: 700; color: var(--text-sec); text-transform: uppercase; letter-spacing: 0.5px;">Delivery Activo</div>
                                    <div id="kpi-delivery-activo" style="font-size: 26px; font-weight: 800; color: #3B82F6; margin-top: 4px;">0</div>
                                </div>
                                <div class="kpi-icon-pill" style="background: rgba(59, 130, 246, 0.1); color: #2563EB;">
                                    <i class="ph ph-motorcycle"></i>
                                </div>
                            </div>
                            <div style="font-size: 12px; color: var(--text-sec); margin-top: 8px;">Con cálculo de envío por distancia</div>
                        </div>
                    </div>

                    <div class="card kpi-card">
                        <div class="card-body" style="padding: 16px 20px;">
                            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                                <div>
                                    <div style="font-size: 11.5px; font-weight: 700; color: var(--text-sec); text-transform: uppercase; letter-spacing: 0.5px;">Métodos de Pago</div>
                                    <div id="kpi-total-metodos" style="font-size: 26px; font-weight: 800; color: #8B5CF6; margin-top: 4px;">0</div>
                                </div>
                                <div class="kpi-icon-pill" style="background: rgba(139, 92, 246, 0.1); color: #8B5CF6;">
                                    <i class="ph ph-wallet"></i>
                                </div>
                            </div>
                            <div style="font-size: 12px; color: var(--text-sec); margin-top: 8px;">Opciones de pago habilitadas</div>
                        </div>
                    </div>
                </div>

                <!-- Barra de Búsqueda y Filtros -->
                <div class="tiendas-toolbar">
                    <div style="position: relative; flex: 1; min-width: 260px;">
                        <i class="ph ph-magnifying-glass" style="position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: var(--text-sec); font-size: 16px;"></i>
                        <input type="text" id="filtro-tiendas-buscar" class="form-control" placeholder="Buscar tienda por nombre, dirección o slug..." style="padding-left: 40px; border-radius: 12px; height: 42px;" oninput="filtrarTiendasUI()">
                    </div>
                    <button type="button" class="btn btn-secondary btn-icon" style="height: 42px; width: 42px; border-radius: 12px; flex-shrink: 0;" title="Recargar sedes" onclick="cargarTiendas(true)">
                        <i class="ph ph-arrows-clockwise"></i>
                    </button>
                </div>

                <!-- Contenedor Principal: Tarjetas de Tiendas -->
                <div id="contenedor-tiendas-grid" class="tiendas-cards-grid">
                    <div style="grid-column: 1 / -1; text-align: center; padding: 48px; color: var(--text-sec); background: var(--bg-panel); border-radius: 16px; border: 1px solid var(--border-color);">
                        <i class="ph ph-spinner ph-spin" style="font-size: 28px; color: var(--primary); margin-bottom: 8px; display: block; margin-inline: auto;"></i>
                        Cargando tiendas...
                    </div>
                </div>
            </div>

            <!-- MODAL PRINCIPAL: CREAR / EDITAR TIENDA (4 PESTAÑAS) -->
            <div id="modal-tienda" class="modal-backdrop hidden" onclick="if(event.target === this) cerrarModalTienda()">
                <div class="modal modal-tienda-dialog">
                    <!-- Cabecera del Modal -->
                    <div class="modal-header" style="padding: 18px 24px;">
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <div class="tienda-modal-badge-icon">
                                <i class="ph ph-storefront"></i>
                            </div>
                            <div>
                                <div style="display: flex; align-items: center; gap: 8px;">
                                    <h3 id="modal-tienda-titulo" style="margin: 0; font-size: 17px; font-weight: 800; color: var(--text-main);">
                                        Editar Tienda
                                    </h3>
                                    <span id="modal-tienda-badge-modo" class="badge" style="background: rgba(239, 68, 68, 0.1); color: var(--primary); border: 1px solid rgba(239, 68, 68, 0.2); font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 6px;">NUEVA</span>
                                </div>
                                <p style="margin: 2px 0 0 0; font-size: 12px; color: var(--text-sec);">
                                    Configura información, delivery, cobertura, mapa y métodos de pago
                                </p>
                            </div>
                        </div>
                        <button class="btn-icon" onclick="cerrarModalTienda()"><i class="ph ph-x"></i></button>
                    </div>

                    <!-- Tira de 4 Pestañas -->
                    <div class="modal-tabs-strip">
                        <div class="modal-subtab active" id="tab-tienda-info" onclick="switchModalTiendaTab('info')">
                            <i class="ph ph-info"></i>
                            <span class="tab-label-full">Información General</span>
                            <span class="tab-label-mob">1. General</span>
                        </div>
                        <div class="modal-subtab" id="tab-tienda-delivery" onclick="switchModalTiendaTab('delivery')">
                            <i class="ph ph-motorcycle"></i>
                            <span class="tab-label-full">Delivery y Cobertura</span>
                            <span class="tab-label-mob">2. Delivery</span>
                        </div>
                        <div class="modal-subtab" id="tab-tienda-mapa" onclick="switchModalTiendaTab('mapa')">
                            <i class="ph ph-map-pin"></i>
                            <span class="tab-label-full">Mapa y Recojo</span>
                            <span class="tab-label-mob">3. Mapa</span>
                        </div>
                        <div class="modal-subtab" id="tab-tienda-pagos" onclick="switchModalTiendaTab('pagos')">
                            <i class="ph ph-credit-card"></i>
                            <span class="tab-label-full">Métodos de Pago</span>
                            <span class="tab-label-mob">4. Pagos</span>
                            <span class="tab-badge-counter" id="modal-tab-pagos-count">0</span>
                        </div>
                    </div>

                    <!-- Cuerpo del Modal -->
                    <div class="modal-body" style="padding: 20px 24px; overflow-y: auto; flex: 1;">
                        <form id="form-tienda" onsubmit="event.preventDefault(); guardarTienda();">
                            <input type="hidden" id="tienda-id" value="">
                            <input type="hidden" id="tienda-imagen-url" value="">

                            <!-- =================================================== -->
                            <!-- PESTAÑA 1: INFORMACIÓN GENERAL                      -->
                            <!-- =================================================== -->
                            <div id="tienda-page-info">
                                <!-- Tarjeta: DATOS PRINCIPALES DE LA TIENDA -->
                                <div class="card mb-3 tiendas-config-card">
                                    <div class="card-body" style="padding: 16px 20px;">
                                        <div class="tiendas-card-title">
                                            <i class="ph ph-identification-badge"></i>
                                            <span>DATOS PRINCIPALES DE LA TIENDA</span>
                                        </div>

                                        <div style="display: grid; grid-template-columns: 1.2fr 1fr; gap: 14px; margin-bottom: 14px;" class="tiendas-form-grid-2col">
                                            <div class="form-group mb-0">
                                                <label class="form-label font-bold" style="font-size: 12px;">Nombre de la Tienda <span class="text-danger">*</span></label>
                                                <input type="text" id="tienda-nombre" class="form-control font-bold" placeholder="Ej: Local Belaunde" required oninput="actualizarSlugAutomatico(this.value)">
                                            </div>
                                            <div class="form-group mb-0">
                                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                                                    <label class="form-label font-bold" style="font-size: 12px; margin-bottom: 0;">URL (Slug)</label>
                                                    <span class="badge" style="background: rgba(59, 130, 246, 0.12); color: #2563EB; font-size: 10px; font-weight: 700; padding: 1px 6px;">Automático</span>
                                                </div>
                                                <input type="text" id="tienda-slug" class="form-control" placeholder="local-belaunde" style="font-family: monospace;">
                                            </div>
                                        </div>

                                        <div style="display: grid; grid-template-columns: 1.2fr 1fr; gap: 14px; margin-bottom: 14px;" class="tiendas-form-grid-2col">
                                            <div class="form-group mb-0">
                                                <label class="form-label font-bold" style="font-size: 12px;">Dirección del Local</label>
                                                <input type="text" id="tienda-direccion" class="form-control" placeholder="Av. Belaunde Este 126A, Comas 15301">
                                            </div>
                                            <div class="form-group mb-0">
                                                <label class="form-label font-bold" style="font-size: 12px;">Número de WhatsApp (Notificaciones/Pedidos)</label>
                                                <div style="position: relative;">
                                                    <i class="ph ph-whatsapp-logo" style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: #10B981; font-size: 16px;"></i>
                                                    <input type="text" id="tienda-whatsapp" class="form-control" placeholder="51999888777" style="padding-left: 36px; font-family: monospace;">
                                                </div>
                                                <span style="font-size: 10.5px; color: var(--text-sec); margin-top: 3px; display: block;">
                                                    Incluye código de país sin signo '+' (Ej: 51999888777 para Perú).
                                                </span>
                                            </div>
                                        </div>

                                        <div class="form-group mb-3">
                                            <label class="form-label font-bold" style="font-size: 12px;">Estado de la Sede</label>
                                            <select id="tienda-estado" class="form-control font-bold">
                                                <option value="activo">🟢 Activa (Visible y disponible para clientes)</option>
                                                <option value="inactivo">🔴 Inactiva (Oculta en la app)</option>
                                                <option value="mantenimiento">🟡 En Mantenimiento (Temporalmente fuera de servicio)</option>
                                            </select>
                                        </div>

                                        <div class="form-group mb-0">
                                            <label class="form-label font-bold" style="font-size: 12px;">Descripción de la Tienda</label>
                                            <textarea id="tienda-descripcion" class="form-control" rows="2" placeholder="Ej: Especialistas en repostería artesanal, pizzas al horno, atendiendo a todo Lima Norte..."></textarea>
                                            <span style="font-size: 11px; color: var(--text-sec); margin-top: 4px; display: block;">
                                                Se mostrará a los clientes al seleccionar esta sede en la app.
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <!-- Tarjeta: IMAGEN / PORTADA DE LA TIENDA -->
                                <div class="card tiendas-config-card">
                                    <div class="card-body" style="padding: 16px 20px;">
                                        <div class="tiendas-card-title">
                                            <i class="ph ph-image"></i>
                                            <span>IMAGEN / PORTADA DE LA TIENDA</span>
                                        </div>
                                        <p style="font-size: 12px; color: var(--text-sec); margin: 0 0 12px 0;">
                                            Se utilizará para compartir en redes sociales y como portada en enlaces de WhatsApp.
                                        </p>

                                        <div style="display: flex; gap: 16px; align-items: center; flex-wrap: wrap;">
                                            <div id="tienda-portada-box" class="tienda-portada-preview-box">
                                                <img id="tienda-portada-img" src="" alt="Portada" style="display: none; width: 100%; height: 100%; object-fit: cover;">
                                                <div id="tienda-portada-placeholder" style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: var(--text-sec);">
                                                    <i class="ph ph-image" style="font-size: 32px; margin-bottom: 4px;"></i>
                                                    <span style="font-size: 11.5px; font-weight: 600;">Sin Portada</span>
                                                </div>
                                            </div>

                                            <div style="display: flex; flex-direction: column; gap: 8px;">
                                                <button type="button" class="btn btn-secondary" onclick="document.getElementById('tienda-portada-input').click()" style="border-radius: 10px; font-size: 12.5px; font-weight: 600;">
                                                    <i class="ph ph-upload-simple"></i> Subir Portada
                                                </button>
                                                <input type="file" id="tienda-portada-input" accept="image/jpeg,image/png,image/webp" style="display: none;" onchange="procesarFotoPortada(this)">
                                                <button type="button" id="btn-remover-portada" class="btn btn-secondary text-danger" onclick="removerFotoPortada()" style="display: none; border-radius: 10px; font-size: 12px;">
                                                    <i class="ph ph-trash"></i> Quitar Foto
                                                </button>
                                                <span style="font-size: 11px; color: var(--text-sec);">Formatos JPG, PNG o WebP (Recomendado 1200x630px).</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- =================================================== -->
                            <!-- PESTAÑA 2: DELIVERY Y COBERTURA                     -->
                            <!-- =================================================== -->
                            <div id="tienda-page-delivery" style="display: none;">
                                <!-- Tarjeta: RADIO MÁXIMO DE OPERACIÓN -->
                                <div class="card mb-3 tiendas-config-card">
                                    <div class="card-body" style="padding: 16px 20px;">
                                        <div class="tiendas-card-title">
                                            <i class="ph ph-crosshair"></i>
                                            <span>RADIO MÁXIMO DE OPERACIÓN</span>
                                        </div>
                                        <div style="max-width: 260px;">
                                            <label class="form-label font-bold" style="font-size: 12px;">Radio de Delivery (km)</label>
                                            <div style="display: flex; align-items: center; gap: 6px;">
                                                <input type="number" step="0.1" min="0.1" max="100" id="tienda-radio-km" class="form-control font-bold" value="5.00" style="font-size: 15px;">
                                                <span style="font-weight: 700; color: var(--text-sec); font-size: 13px;">km</span>
                                            </div>
                                            <span style="font-size: 11px; color: var(--text-sec); margin-top: 4px; display: block;">
                                                Límite absoluto de entrega para esta sede.
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <!-- Tarjeta: TARIFAS POR DISTANCIA (TRAMOS DINÁMICOS) -->
                                <div class="card mb-3 tiendas-config-card">
                                    <div class="card-body" style="padding: 16px 20px;">
                                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                                            <div class="tiendas-card-title" style="margin-bottom: 0;">
                                                <i class="ph ph-ruler"></i>
                                                <span>Tarifas por Distancia (Tramos Dinámicos)</span>
                                            </div>
                                            <!-- Switch ON/OFF -->
                                            <label class="tienda-switch">
                                                <input type="checkbox" id="tienda-switch-tramos" onchange="toggleTramosVisibility(this.checked)" checked>
                                                <span class="tienda-slider"></span>
                                            </label>
                                        </div>
                                        <p style="font-size: 12px; color: var(--text-sec); margin: 0 0 14px 0;">
                                            Calcula el envío y pedido mínimo según la distancia real al cliente.
                                        </p>

                                        <div id="tienda-tramos-section-body">
                                            <!-- Envío Gratis Global -->
                                            <div class="envio-gratis-box mb-3">
                                                <div style="font-size: 12px; font-weight: 700; color: #10B981; margin-bottom: 6px; display: flex; align-items: center; gap: 6px;">
                                                    <i class="ph ph-sparkle"></i> Envío Gratis Global desde (S/)
                                                </div>
                                                <div style="display: flex; align-items: center; gap: 6px; max-width: 220px;">
                                                    <span style="font-weight: 700; color: var(--text-sec); font-size: 13px;">S/</span>
                                                    <input type="number" step="0.50" min="0" id="tienda-envio-gratis" class="form-control font-bold" value="0.00">
                                                </div>
                                                <span style="font-size: 10.5px; color: var(--text-sec); margin-top: 4px; display: block;">
                                                    Envío gratis en cualquier tramo si supera este monto (0 = desactivado).
                                                </span>
                                            </div>

                                            <!-- Tramos de distancia configurados -->
                                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                                                <div style="display: flex; align-items: center; gap: 8px; font-size: 12px; font-weight: 700; color: var(--text-main);">
                                                    <i class="ph ph-target" style="color: var(--primary);"></i>
                                                    <span>Tramos de Distancia Configurados</span>
                                                </div>
                                                <span class="badge" style="background: rgba(239, 68, 68, 0.08); color: var(--primary); font-size: 10px; font-weight: 700;">
                                                    Orden ascendente
                                                </span>
                                            </div>

                                            <div id="tienda-tramos-lista" style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 12px;">
                                                <!-- Filas de tramos generadas dinámicamente -->
                                            </div>

                                            <button type="button" class="btn btn-secondary btn-sm" onclick="agregarFilaTramo()" style="border-radius: 10px; font-weight: 700; font-size: 12px; color: var(--primary); display: inline-flex; align-items: center; gap: 6px;">
                                                <i class="ph ph-plus-circle"></i> Añadir Tramo de Distancia
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <!-- Tarjeta: ZONAS DE COBERTURA DEPARTAMENTALES -->
                                <div class="card tiendas-config-card">
                                    <div class="card-body" style="padding: 16px 20px;">
                                        <div class="tiendas-card-title">
                                            <i class="ph ph-globe"></i>
                                            <span>ZONAS DE COBERTURA DEPARTAMENTALES</span>
                                        </div>

                                        <div class="form-group mb-3" style="max-width: 320px;">
                                            <select id="tienda-tipo-cobertura" class="form-control font-bold" onchange="toggleDeptsVisibility(this.value)">
                                                <option value="seleccionados">Solo incluir departamentos seleccionados</option>
                                                <option value="todos">Todos los departamentos del Perú</option>
                                            </select>
                                        </div>

                                        <div id="tienda-depts-container">
                                            <span style="font-size: 12px; color: var(--text-sec); display: block; margin-bottom: 10px;">
                                                Selecciona los departamentos donde SÍ haces envíos:
                                            </span>
                                            <div class="depts-checkbox-grid" id="depts-checkbox-grid">
                                                <!-- Checkboxes de departamentos inyectados dinámicamente -->
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- =================================================== -->
                            <!-- PESTAÑA 3: MAPA Y RECOJO                            -->
                            <!-- =================================================== -->
                            <div id="tienda-page-mapa" style="display: none;">
                                <!-- Tarjeta: AVISO PARA RECOJO EN LOCAL (TAKEAWAY) -->
                                <div class="card mb-3 tiendas-config-card">
                                    <div class="card-body" style="padding: 16px 20px;">
                                        <div class="tiendas-card-title">
                                            <i class="ph ph-person-simple-walk"></i>
                                            <span>AVISO PARA RECOJO EN LOCAL (TAKEAWAY)</span>
                                        </div>
                                        <div class="form-group mb-0">
                                            <textarea id="tienda-aviso-recojo" class="form-control takeaway-notice-textarea" rows="2" placeholder="una vez confirmado el pago tu pedido estara disponible en 15 minutos"></textarea>
                                            <span style="font-size: 11px; color: var(--text-sec); margin-top: 4px; display: block;">
                                                Este mensaje aparecerá en el checkout cuando el cliente seleccione recojo en este local.
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <!-- Tarjeta: UBICACIÓN GPS EN MAPA -->
                                <div class="card tiendas-config-card">
                                    <div class="card-body" style="padding: 16px 20px;">
                                        <div class="tiendas-card-title">
                                            <i class="ph ph-map-pin"></i>
                                            <span>UBICACIÓN GPS EN MAPA</span>
                                        </div>

                                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 14px;" class="tiendas-form-grid-2col">
                                            <div class="form-group mb-0">
                                                <label class="form-label font-bold" style="font-size: 12px;">Latitud</label>
                                                <input type="text" id="tienda-latitud" class="form-control font-bold" value="-11.94097575" style="font-family: monospace;" oninput="actualizarPinDesdeInputs()">
                                            </div>
                                            <div class="form-group mb-0">
                                                <label class="form-label font-bold" style="font-size: 12px;">Longitud</label>
                                                <input type="text" id="tienda-longitud" class="form-control font-bold" value="-77.04908715" style="font-family: monospace;" oninput="actualizarPinDesdeInputs()">
                                            </div>
                                        </div>

                                        <!-- Contenedor del Mapa Leaflet -->
                                        <div id="tienda-mapa-leaflet" class="tienda-mapa-box"></div>

                                        <div style="display: flex; align-items: center; gap: 6px; margin-top: 8px; font-size: 11.5px; color: var(--primary);">
                                            <i class="ph ph-info"></i>
                                            <span>Haz clic directamente en el mapa para ubicar o mover el pin de la tienda con precisión.</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- =================================================== -->
                            <!-- PESTAÑA 4: MÉTODOS DE PAGO                          -->
                            <!-- =================================================== -->
                            <div id="tienda-page-pagos" style="display: none;">
                                <div class="card tiendas-config-card">
                                    <div class="card-body" style="padding: 16px 20px;">
                                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; flex-wrap: wrap; gap: 8px;">
                                            <div class="tiendas-card-title" style="margin-bottom: 0;">
                                                <i class="ph ph-wallet"></i>
                                                <span>Métodos de Pago Activos</span>
                                            </div>
                                            <button type="button" class="btn btn-primary btn-sm" onclick="abrirModalMetodoPago()" style="border-radius: 10px; font-weight: 700; padding: 6px 14px; display: inline-flex; align-items: center; gap: 6px;">
                                                <i class="ph ph-plus"></i> + Nuevo Método
                                            </button>
                                        </div>
                                        <p style="font-size: 12px; color: var(--text-sec); margin: 0 0 14px 0;">
                                            Gestiona las opciones de pago que acepta esta sede (Yape, Plin, Tarjeta, etc.).
                                        </p>

                                        <div id="tienda-metodos-lista" style="display: flex; flex-direction: column; gap: 10px;">
                                            <!-- Métodos de pago renderizados dinámicamente -->
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </form>
                    </div>

                    <!-- Pie del Modal Tienda -->
                    <div class="modal-footer" style="padding: 14px 24px; justify-content: flex-end; gap: 10px; background: var(--bg-main); border-top: 1px solid var(--border-color);">
                        <button type="button" class="btn btn-secondary" onclick="cerrarModalTienda()" style="border-radius: 10px; font-weight: 600; padding: 10px 20px;">
                            Cancelar
                        </button>
                        <button type="button" class="btn btn-primary" onclick="guardarTienda()" id="btn-guardar-tienda" style="border-radius: 10px; font-weight: 700; padding: 10px 22px; display: inline-flex; align-items: center; gap: 8px;">
                            <i class="ph ph-floppy-disk"></i> Guardar Tienda
                        </button>
                    </div>
                </div>
            </div>

            <!-- SUBMODAL: CREAR / EDITAR MÉTODO DE PAGO -->
            <div id="modal-metodo-pago" class="modal-backdrop hidden" style="z-index: 10005 !important;" onclick="if(event.target === this) cerrarModalMetodoPago()">
                <div class="modal" style="max-width: 480px; width: 92%; max-height: 88vh; border-radius: 20px; display: flex; flex-direction: column;">
                    <div class="modal-header" style="padding: 16px 22px;">
                        <h3 id="modal-metodo-titulo" style="margin: 0; font-size: 16px; font-weight: 700;">Editar Método de Pago</h3>
                        <button class="btn-icon" onclick="cerrarModalMetodoPago()"><i class="ph ph-x"></i></button>
                    </div>
                    <div class="modal-body" style="padding: 18px 22px; overflow-y: auto; flex: 1;">
                        <form id="form-metodo-pago" onsubmit="event.preventDefault(); guardarMetodoPago();">
                            <input type="hidden" id="metodo-id" value="">

                            <div class="form-group mb-3">
                                <label class="form-label font-bold" style="font-size: 12px;">Título / Nombre <span class="text-danger">*</span></label>
                                <input type="text" id="metodo-nombre" class="form-control font-bold" placeholder="Ej: Pago con Yape" required>
                            </div>

                            <div class="form-group mb-3">
                                <label class="form-label font-bold" style="font-size: 12px;">Descripción / Instrucciones</label>
                                <textarea id="metodo-descripcion" class="form-control" rows="2" placeholder="Copia el numero o escanea el QR y adjunta tu voucher para que nuestro equipo lo valide."></textarea>
                            </div>

                            <div class="form-group mb-3">
                                <label class="form-label font-bold" style="font-size: 12px;">Imagen / Ícono (Opcional)</label>
                                <div style="display: flex; gap: 10px; align-items: center;">
                                    <div id="metodo-icono-box" style="width: 44px; height: 44px; border-radius: 10px; background: var(--bg-main); border: 1.5px solid #CBD5E1; display: flex; align-items: center; justify-content: center; overflow: hidden; flex-shrink: 0;">
                                        <img id="metodo-icono-img" src="" alt="Icono" style="display: none; width: 100%; height: 100%; object-fit: contain;">
                                        <i id="metodo-icono-ph" class="ph ph-wallet" style="font-size: 22px; color: var(--text-sec);"></i>
                                    </div>
                                    <div style="flex: 1;">
                                        <input type="file" id="metodo-icono-file" accept="image/*" class="form-control" style="font-size: 11.5px; padding: 6px;" onchange="procesarIconoMetodo(this)">
                                    </div>
                                </div>
                            </div>

                            <div class="form-group mb-3">
                                <label class="form-label font-bold" style="font-size: 12px;">Tipo de Integración</label>
                                <select id="metodo-tipo" class="form-control font-bold" onchange="toggleMetodoSubbox(this.value)">
                                    <option value="transferencia_qr">Transferencia (QR y Cuentas Bancarias)</option>
                                    <option value="efectivo">Efectivo contra entrega</option>
                                    <option value="tarjeta_pos">Tarjeta / POS contra entrega</option>
                                    <option value="pasarela">Pasarela de Pago Online</option>
                                </select>
                            </div>

                            <!-- Subcaja para Transferencia (QR y Cuentas) -->
                            <div id="metodo-qr-box-container" class="mb-3" style="background: var(--bg-main); border: 1.5px solid #CBD5E1; border-radius: 12px; padding: 14px;">
                                <div class="form-group mb-3">
                                    <label class="form-label font-bold" style="font-size: 12px;">Código QR (Imagen)</label>
                                    <div style="display: flex; gap: 10px; align-items: center; margin-bottom: 6px;">
                                        <div id="metodo-qr-preview-box" style="width: 58px; height: 58px; border-radius: 10px; background: #FFFFFF; border: 1px solid var(--border-color); display: flex; align-items: center; justify-content: center; overflow: hidden; flex-shrink: 0;">
                                            <img id="metodo-qr-img" src="" alt="QR" style="display: none; width: 100%; height: 100%; object-fit: contain;">
                                            <i id="metodo-qr-ph" class="ph ph-qr-code" style="font-size: 28px; color: var(--text-sec);"></i>
                                        </div>
                                        <div style="flex: 1;">
                                            <input type="file" id="metodo-qr-file" accept="image/*" class="form-control" style="font-size: 11.5px; padding: 6px;" onchange="procesarQrMetodo(this)">
                                        </div>
                                    </div>
                                </div>

                                <div class="form-group mb-0">
                                    <label class="form-label font-bold" style="font-size: 12px;">Instrucciones y Cuentas Bancarias</label>
                                    <textarea id="metodo-cuentas" class="form-control font-bold" rows="2" placeholder="998774145 o BCP Soles: 191-000000-0-00"></textarea>
                                </div>
                            </div>

                            <div class="form-group mb-0">
                                <label class="form-label font-bold" style="font-size: 12px;">Estado</label>
                                <select id="metodo-estado" class="form-control">
                                    <option value="activo">Activo</option>
                                    <option value="inactivo">Inactivo</option>
                                </select>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer" style="padding: 12px 22px; justify-content: flex-end; gap: 8px;">
                        <button type="button" class="btn btn-secondary" onclick="cerrarModalMetodoPago()" style="border-radius: 10px;">Cancelar</button>
                        <button type="button" class="btn btn-primary" onclick="guardarMetodoPago()" style="border-radius: 10px; font-weight: 700;">Guardar Método</button>
                    </div>
                </div>
            </div>
        `;

        if (typeof window.renderPhosphorIcons === 'function') {
            window.renderPhosphorIcons(container);
        }

        cargarTiendas();
    };

    // =========================================================================
    // CARGAR TIENDAS DE LA API
    // =========================================================================
    window.cargarTiendas = async function(isManualRefresh = false) {
        try {
            const res = await fetch((window.APP_BASE || '') + '/api/index.php?request=tiendas&action=list');
            const data = await res.json();

            if (data.status === 'success') {
                tiendasData = data.data || [];
                actualizarKpisTiendas(tiendasData);
                filtrarTiendasUI();
                if (isManualRefresh && window.showToast) {
                    window.showToast('Listado de tiendas actualizado', 'info');
                }
            } else {
                throw new Error(data.message || 'Error al cargar tiendas');
            }
        } catch (e) {
            console.error('Error cargando tiendas:', e);
            const grid = document.getElementById('contenedor-tiendas-grid');
            if (grid) {
                grid.innerHTML = `
                    <div style="grid-column: 1 / -1; text-align: center; padding: 36px; color: var(--danger); background: var(--bg-panel); border-radius: 14px; border: 1px solid var(--border-color);">
                        <i class="ph ph-warning-circle" style="font-size: 32px; margin-bottom: 6px;"></i>
                        <p style="margin: 0; font-weight: 600;">No se pudieron cargar las tiendas</p>
                        <button class="btn btn-secondary btn-sm" onclick="cargarTiendas(true)" style="margin-top: 10px; border-radius: 8px;">Reintentar</button>
                    </div>
                `;
            }
        }
    };

    function actualizarKpisTiendas(lista) {
        const elTotal = document.getElementById('kpi-total-tiendas');
        const elActivas = document.getElementById('kpi-tiendas-activas');
        const elDelivery = document.getElementById('kpi-delivery-activo');
        const elMetodos = document.getElementById('kpi-total-metodos');

        if (!elTotal) return;

        const total = lista.length;
        const activas = lista.filter(x => x.estado === 'activo').length;
        const deliveryActivo = lista.filter(x => x.tarifas_distancia_activas == 1).length;
        let totalMetodos = 0;
        lista.forEach(x => { totalMetodos += (parseInt(x.total_metodos_activos) || 0); });

        elTotal.innerText = total;
        elActivas.innerText = activas;
        elDelivery.innerText = deliveryActivo;
        elMetodos.innerText = totalMetodos;
    }

    // =========================================================================
    // FILTRADO Y RENDER DE CARDS DE TIENDAS
    // =========================================================================
    window.filtrarTiendasUI = function() {
        const query = (document.getElementById('filtro-tiendas-buscar')?.value || '').toLowerCase().trim();
        const grid = document.getElementById('contenedor-tiendas-grid');
        if (!grid) return;

        const filtradas = tiendasData.filter(t => {
            if (!query) return true;
            return (t.nombre && t.nombre.toLowerCase().includes(query)) ||
                   (t.direccion && t.direccion.toLowerCase().includes(query)) ||
                   (t.slug && t.slug.toLowerCase().includes(query)) ||
                   (t.ciudad && t.ciudad.toLowerCase().includes(query));
        });

        if (filtradas.length === 0) {
            grid.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 48px 20px; color: var(--text-sec); background: var(--bg-panel); border-radius: 16px; border: 1px solid var(--border-color);">
                    <i class="ph ph-storefront" style="font-size: 38px; color: var(--primary); opacity: 0.6; margin-bottom: 8px;"></i>
                    <h4 style="margin: 0 0 4px 0; color: var(--text-main); font-weight: 700;">No se encontraron tiendas</h4>
                    <p style="margin: 0 0 16px 0; font-size: 13px;">${query ? 'No hay resultados que coincidan con la búsqueda.' : 'Aún no has registrado ninguna tienda en el sistema.'}</p>
                    <button class="btn btn-primary" onclick="abrirModalTienda()" style="border-radius: 10px; font-weight: 700;">
                        <i class="ph ph-plus"></i> Registrar Primera Tienda
                    </button>
                </div>
            `;
            if (typeof window.renderPhosphorIcons === 'function') window.renderPhosphorIcons(grid);
            return;
        }

        grid.innerHTML = filtradas.map(t => {
            const estadoBadge = t.estado === 'activo'
                ? `<span class="badge badge-success"><i class="ph ph-circle-fill" style="font-size: 8px;"></i> Activa</span>`
                : (t.estado === 'mantenimiento'
                    ? `<span class="badge" style="background: rgba(245, 158, 11, 0.12); color: #D97706; font-weight: 700;"><i class="ph ph-circle-fill" style="font-size: 8px;"></i> Mantenimiento</span>`
                    : `<span class="badge badge-danger"><i class="ph ph-circle-fill" style="font-size: 8px;"></i> Inactiva</span>`);

            const portadaHtml = t.imagen_url
                ? `<img src="${t.imagen_url}" class="tienda-card-banner-img" alt="${t.nombre}">`
                : `<div class="tienda-card-banner-fallback"><i class="ph ph-storefront"></i></div>`;

            const totalTramos = Array.isArray(t.tramos_distancia) ? t.tramos_distancia.length : 0;
            const totalDepts = Array.isArray(t.departamentos_cobertura) ? t.departamentos_cobertura.length : 0;
            const cleanWa = (t.whatsapp || '').replace(/[^0-9]/g, '');

            return `
                <div class="tienda-card" id="tienda-card-${t.id}">
                    <!-- Banner de Portada de la Tienda -->
                    <div class="tienda-card-banner">
                        ${portadaHtml}
                        <div class="tienda-card-status-badge">
                            ${estadoBadge}
                        </div>
                    </div>

                    <!-- Contenido de la Tienda -->
                    <div class="tienda-card-body">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; margin-bottom: 4px;">
                            <h3 class="tienda-card-title" title="${t.nombre}">${t.nombre}</h3>
                        </div>

                        <!-- Slug / Enlace Público -->
                        <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 10px;">
                            <span class="tienda-slug-badge" title="Slug identificador">/${t.slug}</span>
                            <button type="button" class="btn-icon" style="width: 26px; height: 26px; font-size: 13px;" title="Copiar enlace" onclick="copiarSlugTienda('${t.slug}')">
                                <i class="ph ph-copy"></i>
                            </button>
                        </div>

                        <!-- Dirección -->
                        <div style="font-size: 12.5px; color: var(--text-sec); display: flex; align-items: flex-start; gap: 6px; margin-bottom: 8px; min-height: 36px;">
                            <i class="ph ph-map-pin" style="color: var(--primary); font-size: 16px; flex-shrink: 0; margin-top: 1px;"></i>
                            <span style="display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
                                ${t.direccion || 'Sin dirección registrada'}
                            </span>
                        </div>

                        <!-- WhatsApp y Teléfono -->
                        <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 14px; padding-bottom: 12px; border-bottom: 1px solid var(--border-color);">
                            <div style="font-size: 12px; color: var(--text-main); font-weight: 600; display: flex; align-items: center; gap: 5px;">
                                <i class="ph ph-whatsapp-logo" style="color: #10B981; font-size: 16px;"></i>
                                <span>${t.whatsapp || 'Sin WhatsApp'}</span>
                            </div>
                            ${cleanWa ? `
                                <a href="https://wa.me/${cleanWa}" target="_blank" rel="noopener noreferrer" class="btn btn-secondary btn-sm" style="border-radius: 8px; font-size: 11px; padding: 2px 8px; color: #10B981; font-weight: 700;">
                                    Abrir Chat
                                </a>
                            ` : ''}
                        </div>

                        <!-- Métricas Clave de la Tienda (Delivery, Tramos y Métodos de Pago) -->
                        <div class="tienda-card-stats-row">
                            <div class="tienda-card-stat-item">
                                <span class="stat-label">Radio Delivery</span>
                                <span class="stat-val font-bold">${t.radio_entrega_km} km</span>
                            </div>
                            <div class="tienda-card-stat-item">
                                <span class="stat-label">Tramos</span>
                                <span class="stat-val font-bold">${t.tarifas_distancia_activas ? `${totalTramos} tramos` : 'Fijo'}</span>
                            </div>
                            <div class="tienda-card-stat-item">
                                <span class="stat-label">Métodos Pago</span>
                                <span class="stat-val font-bold" style="color: var(--primary);">${t.total_metodos_activos || 0} activos</span>
                            </div>
                        </div>

                        <!-- Botones de Acción de la Tarjeta -->
                        <div class="tienda-card-actions">
                            <button type="button" class="btn btn-secondary btn-sm" onclick="abrirModalTienda(${t.id}, 'mapa')" title="Ver ubicación en mapa">
                                <i class="ph ph-map-pin"></i> GPS
                            </button>
                            <button type="button" class="btn btn-secondary btn-sm" onclick="abrirModalTienda(${t.id})" title="Configurar y editar tienda" style="font-weight: 700;">
                                <i class="ph ph-pencil-simple"></i> Configurar
                            </button>
                            <button type="button" class="btn btn-secondary btn-sm text-danger btn-icon" onclick="eliminarTienda(${t.id}, '${t.nombre.replace(/'/g, "\\'")}')" title="Eliminar tienda">
                                <i class="ph ph-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        if (typeof window.renderPhosphorIcons === 'function') {
            window.renderPhosphorIcons(grid);
        }
    };

    window.copiarSlugTienda = function(slug) {
        const fullUrl = window.location.origin + (window.APP_BASE || '') + '/sede/' + slug;
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(fullUrl).then(() => {
                if (window.showToast) window.showToast('Enlace copiado al portapapeles: ' + fullUrl, 'success');
            }).catch(() => {
                prompt('Copia el enlace de la tienda:', fullUrl);
            });
        } else {
            prompt('Copia el enlace de la tienda:', fullUrl);
        }
    };

    // =========================================================================
    // APERTURA Y CONTROL DEL MODAL DE TIENDA
    // =========================================================================
    window.abrirModalTienda = async function(id = null, defaultTab = 'info') {
        const modal = document.getElementById('modal-tienda');
        const titulo = document.getElementById('modal-tienda-titulo');
        const badgeModo = document.getElementById('modal-tienda-badge-modo');
        const form = document.getElementById('form-tienda');
        if (!modal) return;

        form.reset();
        document.getElementById('tienda-id').value = '';
        document.getElementById('tienda-imagen-url').value = '';
        currentMetodosPago = [];

        // Reset foto portada
        const pImg = document.getElementById('tienda-portada-img');
        const pPlaceholder = document.getElementById('tienda-portada-placeholder');
        const btnRemoverP = document.getElementById('btn-remover-portada');
        if (pImg && pPlaceholder) {
            pImg.src = '';
            pImg.style.display = 'none';
            pPlaceholder.style.display = 'flex';
            if (btnRemoverP) btnRemoverP.style.display = 'none';
        }

        // Renderizar checkboxes de departamentos
        renderDepartamentosCheckboxes(['Lima', 'Callao']);

        if (id) {
            titulo.innerText = 'Editar Tienda';
            if (badgeModo) {
                badgeModo.innerText = 'EDITAR';
                badgeModo.style.background = 'rgba(59, 130, 246, 0.12)';
                badgeModo.style.color = '#2563EB';
                badgeModo.style.borderColor = 'rgba(59, 130, 246, 0.25)';
            }

            try {
                const res = await fetch((window.APP_BASE || '') + '/api/index.php?request=tiendas&action=get&id=' + id);
                const data = await res.json();

                if (data.status === 'success' && data.data) {
                    const t = data.data;
                    currentTiendaEnEdicion = t;

                    document.getElementById('tienda-id').value = t.id;
                    document.getElementById('tienda-nombre').value = t.nombre || '';
                    document.getElementById('tienda-slug').value = t.slug || '';
                    document.getElementById('tienda-direccion').value = t.direccion || '';
                    document.getElementById('tienda-whatsapp').value = t.whatsapp || '';
                    document.getElementById('tienda-estado').value = t.estado || 'activo';
                    document.getElementById('tienda-descripcion').value = t.descripcion || '';
                    document.getElementById('tienda-radio-km').value = t.radio_entrega_km || 5.00;
                    document.getElementById('tienda-envio-gratis').value = t.envio_gratis_desde || 0.00;
                    document.getElementById('tienda-tipo-cobertura').value = t.tipo_cobertura_dept || 'seleccionados';
                    document.getElementById('tienda-aviso-recojo').value = t.aviso_recojo || '';
                    document.getElementById('tienda-latitud').value = t.latitud || -11.94097575;
                    document.getElementById('tienda-longitud').value = t.longitud || -77.04908715;

                    const switchTramos = document.getElementById('tienda-switch-tramos');
                    if (switchTramos) {
                        switchTramos.checked = (t.tarifas_distancia_activas == 1);
                        toggleTramosVisibility(switchTramos.checked);
                    }

                    // Tramos de distancia
                    renderFilasTramos(t.tramos_distancia || []);

                    // Departamentos
                    renderDepartamentosCheckboxes(t.departamentos_cobertura || ['Lima', 'Callao']);
                    toggleDeptsVisibility(t.tipo_cobertura_dept || 'seleccionados');

                    // Portada
                    if (t.imagen_url) {
                        document.getElementById('tienda-imagen-url').value = t.imagen_url;
                        if (pImg && pPlaceholder) {
                            pImg.src = t.imagen_url;
                            pImg.style.display = 'block';
                            pPlaceholder.style.display = 'none';
                            if (btnRemoverP) btnRemoverP.style.display = 'inline-flex';
                        }
                    }

                    // Métodos de pago
                    currentMetodosPago = t.metodos_pago || [];
                    renderListaMetodosPago();
                }
            } catch (err) {
                console.error('Error al cargar datos detallados de la tienda:', err);
            }
        } else {
            currentTiendaEnEdicion = null;
            titulo.innerText = 'Registrar Nueva Tienda';
            if (badgeModo) {
                badgeModo.innerText = 'NUEVA';
                badgeModo.style.background = 'rgba(239, 68, 68, 0.1)';
                badgeModo.style.color = 'var(--primary)';
                badgeModo.style.borderColor = 'rgba(239, 68, 68, 0.2)';
            }

            document.getElementById('tienda-nombre').value = '';
            document.getElementById('tienda-slug').value = '';
            document.getElementById('tienda-direccion').value = 'Av. Belaunde Este 126A, Comas 15301';
            document.getElementById('tienda-whatsapp').value = '51999888777';
            document.getElementById('tienda-estado').value = 'activo';
            document.getElementById('tienda-radio-km').value = '5.00';
            document.getElementById('tienda-envio-gratis').value = '0.00';
            document.getElementById('tienda-aviso-recojo').value = 'una vez confirmado el pago tu pedido estara disponible en 15 minutos';
            document.getElementById('tienda-latitud').value = '-11.94097575';
            document.getElementById('tienda-longitud').value = '-77.04908715';

            const switchTramos = document.getElementById('tienda-switch-tramos');
            if (switchTramos) {
                switchTramos.checked = true;
                toggleTramosVisibility(true);
            }

            // Tramos por defecto
            renderFilasTramos([
                { hasta_km: 0.3, costo_envio: 2, min_compra: 20 },
                { hasta_km: 1.5, costo_envio: 4, min_compra: 25 },
                { hasta_km: 3.0, costo_envio: 6, min_compra: 30 },
                { hasta_km: 5.0, costo_envio: 8, min_compra: 35 }
            ]);

            renderDepartamentosCheckboxes(['Lima', 'Callao']);
            currentMetodosPago = [];
            renderListaMetodosPago();
        }

        switchModalTiendaTab(defaultTab);

        modal.classList.remove('hidden');
        requestAnimationFrame(() => modal.classList.add('show'));

        if (typeof window.renderPhosphorIcons === 'function') {
            window.renderPhosphorIcons(modal);
        }
    };

    window.cerrarModalTienda = function() {
        const modal = document.getElementById('modal-tienda');
        if (!modal) return;
        modal.classList.remove('show');
        setTimeout(() => {
            modal.classList.add('hidden');
        }, 200);
    };

    // =========================================================================
    // NAVEGACIÓN POR PESTAÑAS DENTRO DEL MODAL
    // =========================================================================
    window.switchModalTiendaTab = function(tab) {
        activeTabTienda = tab;

        const tabs = ['info', 'delivery', 'mapa', 'pagos'];
        tabs.forEach(t => {
            const btn = document.getElementById('tab-tienda-' + t);
            const page = document.getElementById('tienda-page-' + t);
            if (btn) btn.classList.toggle('active', t === tab);
            if (page) page.style.display = (t === tab) ? 'block' : 'none';
        });

        // Si se abre la pestaña de Mapa, inicializar o re-dimensionar Leaflet
        if (tab === 'mapa') {
            setTimeout(() => {
                inicializarMapaLeaflet();
            }, 150);
        }
    };

    window.actualizarSlugAutomatico = function(val) {
        const slugInput = document.getElementById('tienda-slug');
        if (!slugInput) return;
        if (!currentTiendaEnEdicion || !slugInput.dataset.manualEdited) {
            const slug = (val || '')
                .toLowerCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-+|-+$/g, '');
            slugInput.value = slug;
        }
    };

    // =========================================================================
    // CONTROL DE TRAMOS DE DISTANCIA (DINÁMICOS)
    // =========================================================================
    window.toggleTramosVisibility = function(enabled) {
        const section = document.getElementById('tienda-tramos-section-body');
        if (section) {
            section.style.opacity = enabled ? '1' : '0.45';
            section.style.pointerEvents = enabled ? 'auto' : 'none';
        }
    };

    function renderFilasTramos(tramos) {
        const container = document.getElementById('tienda-tramos-lista');
        if (!container) return;

        if (!Array.isArray(tramos) || tramos.length === 0) {
            tramos = [{ hasta_km: 1.0, costo_envio: 3.0, min_compra: 20.0 }];
        }

        container.innerHTML = tramos.map((tr, idx) => `
            <div class="tienda-tramo-row" id="tramo-row-${idx}">
                <div class="tramo-field">
                    <label class="tramo-label">📍 Hasta Distancia</label>
                    <div style="display: flex; align-items: center; gap: 4px;">
                        <input type="number" step="0.1" min="0.1" class="form-control font-bold tramo-input-km" value="${parseFloat(tr.hasta_km || 0).toFixed(1)}" required>
                        <span style="font-size: 11.5px; font-weight: 700; color: var(--text-sec);">km</span>
                    </div>
                </div>

                <div class="tramo-field">
                    <label class="tramo-label">💵 Costo Envío</label>
                    <div style="display: flex; align-items: center; gap: 4px;">
                        <span style="font-size: 11.5px; font-weight: 700; color: var(--text-sec);">S/</span>
                        <input type="number" step="0.5" min="0" class="form-control font-bold tramo-input-costo" value="${parseFloat(tr.costo_envio || 0).toFixed(2)}" required>
                    </div>
                </div>

                <div class="tramo-field">
                    <label class="tramo-label">🔒 Mín. Compra</label>
                    <div style="display: flex; align-items: center; gap: 4px;">
                        <span style="font-size: 11.5px; font-weight: 700; color: var(--text-sec);">S/</span>
                        <input type="number" step="1" min="0" class="form-control font-bold tramo-input-min" value="${parseFloat(tr.min_compra || 0).toFixed(2)}" required>
                    </div>
                </div>

                <button type="button" class="btn btn-secondary text-danger btn-icon btn-sm" onclick="eliminarFilaTramo(${idx})" title="Eliminar tramo" style="height: 38px; width: 38px; border-radius: 10px; flex-shrink: 0; margin-top: 19px;">
                    <i class="ph ph-trash"></i>
                </button>
            </div>
        `).join('');

        if (typeof window.renderPhosphorIcons === 'function') {
            window.renderPhosphorIcons(container);
        }
    }

    window.agregarFilaTramo = function() {
        const container = document.getElementById('tienda-tramos-lista');
        if (!container) return;

        // Obtener tramos actuales
        const tramos = obtenerTramosDesdeDOM();
        const ultimo = tramos[tramos.length - 1];
        const nuevoKm = ultimo ? parseFloat((ultimo.hasta_km + 2.0).toFixed(1)) : 1.0;
        const nuevoCosto = ultimo ? parseFloat((ultimo.costo_envio + 2.0).toFixed(2)) : 5.0;
        const nuevoMin = ultimo ? parseFloat((ultimo.min_compra + 5.0).toFixed(2)) : 20.0;

        tramos.push({ hasta_km: nuevoKm, costo_envio: nuevoCosto, min_compra: nuevoMin });
        renderFilasTramos(tramos);
    };

    window.eliminarFilaTramo = function(idx) {
        const tramos = obtenerTramosDesdeDOM();
        if (tramos.length <= 1) {
            if (window.showToast) window.showToast('Debe existir al menos un tramo de distancia configurado.', 'warning');
            return;
        }
        tramos.splice(idx, 1);
        renderFilasTramos(tramos);
    };

    function obtenerTramosDesdeDOM() {
        const container = document.getElementById('tienda-tramos-lista');
        if (!container) return [];

        const rows = container.querySelectorAll('.tienda-tramo-row');
        const lista = [];

        rows.forEach(r => {
            const km = parseFloat(r.querySelector('.tramo-input-km')?.value || 0);
            const costo = parseFloat(r.querySelector('.tramo-input-costo')?.value || 0);
            const min = parseFloat(r.querySelector('.tramo-input-min')?.value || 0);
            lista.push({ hasta_km: km, costo_envio: costo, min_compra: min });
        });

        // Orden ascendente por hasta_km
        lista.sort((a, b) => a.hasta_km - b.hasta_km);
        return lista;
    }

    // =========================================================================
    // CONTROL DE DEPARTAMENTOS DEL PERÚ
    // =========================================================================
    function renderDepartamentosCheckboxes(seleccionados = ['Lima', 'Callao']) {
        const container = document.getElementById('depts-checkbox-grid');
        if (!container) return;

        const selSet = new Set(seleccionados || []);

        container.innerHTML = DEPARTAMENTOS_PERU.map(dept => {
            const isChecked = selSet.has(dept);
            return `
                <label class="dept-checkbox-item ${isChecked ? 'selected' : ''}">
                    <input type="checkbox" value="${dept}" ${isChecked ? 'checked' : ''} onchange="this.parentElement.classList.toggle('selected', this.checked)">
                    <span>${dept}</span>
                </label>
            `;
        }).join('');
    }

    window.toggleDeptsVisibility = function(modo) {
        const container = document.getElementById('tienda-depts-container');
        if (container) {
            container.style.display = (modo === 'todos') ? 'none' : 'block';
        }
    };

    function obtenerDepartamentosDesdeDOM() {
        const container = document.getElementById('depts-checkbox-grid');
        if (!container) return ['Lima', 'Callao'];

        const checks = container.querySelectorAll('input[type="checkbox"]:checked');
        const depts = [];
        checks.forEach(c => depts.push(c.value));
        return depts;
    }

    // =========================================================================
    // MAPA GPS LEAFLET INTERACTIVO CON OPENSTREETMAP
    // =========================================================================
    function inicializarMapaLeaflet() {
        const mapContainer = document.getElementById('tienda-mapa-leaflet');
        if (!mapContainer) return;

        const latInput = document.getElementById('tienda-latitud');
        const lngInput = document.getElementById('tienda-longitud');

        let lat = parseFloat(latInput?.value || -11.94097575);
        let lng = parseFloat(lngInput?.value || -77.04908715);

        if (isNaN(lat) || lat === 0) lat = -11.94097575;
        if (isNaN(lng) || lng === 0) lng = -77.04908715;

        // Comprobar que Leaflet L esté cargado
        if (typeof L === 'undefined') {
            mapContainer.innerHTML = `
                <div style="display:flex; align-items:center; justify-content:center; height:100%; color:var(--text-sec); font-size:12px;">
                    Cargando componente de mapas...
                </div>
            `;
            return;
        }

        if (!leafletMapInstance) {
            leafletMapInstance = L.map('tienda-mapa-leaflet', {
                center: [lat, lng],
                zoom: 15,
                scrollWheelZoom: true
            });

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                maxZoom: 19,
                attribution: '© OpenStreetMap contributors'
            }).addTo(leafletMapInstance);

            // Marcador arrastrable
            leafletMarkerInstance = L.marker([lat, lng], {
                draggable: true
            }).addTo(leafletMapInstance);

            leafletMarkerInstance.on('dragend', function() {
                const pos = leafletMarkerInstance.getLatLng();
                if (latInput) latInput.value = pos.lat.toFixed(8);
                if (lngInput) lngInput.value = pos.lng.toFixed(8);
            });

            // Clic directo en el mapa para ubicar pin
            leafletMapInstance.on('click', function(e) {
                leafletMarkerInstance.setLatLng(e.latlng);
                if (latInput) latInput.value = e.latlng.lat.toFixed(8);
                if (lngInput) lngInput.value = e.latlng.lng.toFixed(8);
            });
        } else {
            leafletMapInstance.invalidateSize();
            leafletMapInstance.setView([lat, lng], 15);
            if (leafletMarkerInstance) {
                leafletMarkerInstance.setLatLng([lat, lng]);
            }
        }
    }

    window.actualizarPinDesdeInputs = function() {
        const latInput = document.getElementById('tienda-latitud');
        const lngInput = document.getElementById('tienda-longitud');
        const lat = parseFloat(latInput?.value);
        const lng = parseFloat(lngInput?.value);

        if (!isNaN(lat) && !isNaN(lng) && leafletMapInstance && leafletMarkerInstance) {
            leafletMarkerInstance.setLatLng([lat, lng]);
            leafletMapInstance.panTo([lat, lng]);
        }
    };

    // =========================================================================
    // SUBIDA Y PROCESAMIENTO DE FOTO DE PORTADA
    // =========================================================================
    window.procesarFotoPortada = function(input) {
        const file = input.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async function(e) {
            const base64 = e.target.result;
            const pImg = document.getElementById('tienda-portada-img');
            const pPlaceholder = document.getElementById('tienda-portada-placeholder');
            const btnRemover = document.getElementById('btn-remover-portada');

            if (pImg && pPlaceholder) {
                pImg.src = base64;
                pImg.style.display = 'block';
                pPlaceholder.style.display = 'none';
                if (btnRemover) btnRemover.style.display = 'inline-flex';
            }

            try {
                const res = await fetch((window.APP_BASE || '') + '/api/index.php?request=tiendas&action=upload_foto', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ data: base64, subtipo: 'portadas' })
                });
                const data = await res.json();
                if (data.status === 'success' && data.data?.url) {
                    document.getElementById('tienda-imagen-url').value = data.data.url;
                }
            } catch (err) {
                console.warn('Error subiendo imagen en segundo plano:', err);
                document.getElementById('tienda-imagen-url').value = base64;
            }
        };
        reader.readAsDataURL(file);
    };

    window.removerFotoPortada = function() {
        document.getElementById('tienda-imagen-url').value = '';
        const pImg = document.getElementById('tienda-portada-img');
        const pPlaceholder = document.getElementById('tienda-portada-placeholder');
        const btnRemover = document.getElementById('btn-remover-portada');
        const fileIn = document.getElementById('tienda-portada-input');

        if (pImg && pPlaceholder) {
            pImg.src = '';
            pImg.style.display = 'none';
            pPlaceholder.style.display = 'flex';
        }
        if (btnRemover) btnRemover.style.display = 'none';
        if (fileIn) fileIn.value = '';
    };

    // =========================================================================
    // GUARDAR TIENDA (CREAR O EDITAR)
    // =========================================================================
    window.guardarTienda = async function() {
        const id = document.getElementById('tienda-id').value;
        const nombre = document.getElementById('tienda-nombre').value.trim();
        const slug = document.getElementById('tienda-slug').value.trim();
        const direccion = document.getElementById('tienda-direccion').value.trim();
        const whatsapp = document.getElementById('tienda-whatsapp').value.trim();
        const estado = document.getElementById('tienda-estado').value;
        const descripcion = document.getElementById('tienda-descripcion').value.trim();
        const imagen_url = document.getElementById('tienda-imagen-url').value.trim();

        const radio_entrega_km = parseFloat(document.getElementById('tienda-radio-km').value || 5.00);
        const tarifas_distancia_activas = document.getElementById('tienda-switch-tramos').checked ? 1 : 0;
        const envio_gratis_desde = parseFloat(document.getElementById('tienda-envio-gratis').value || 0.00);
        const tramos_distancia = obtenerTramosDesdeDOM();

        const tipo_cobertura_dept = document.getElementById('tienda-tipo-cobertura').value;
        const departamentos_cobertura = obtenerDepartamentosDesdeDOM();

        const aviso_recojo = document.getElementById('tienda-aviso-recojo').value.trim();
        const latitud = parseFloat(document.getElementById('tienda-latitud').value || -11.94097575);
        const longitud = parseFloat(document.getElementById('tienda-longitud').value || -77.04908715);

        if (!nombre) {
            if (window.showToast) window.showToast('El nombre de la tienda es obligatorio', 'warning');
            switchModalTiendaTab('info');
            document.getElementById('tienda-nombre').focus();
            return;
        }

        const btnGuardar = document.getElementById('btn-guardar-tienda');
        if (btnGuardar) {
            btnGuardar.disabled = true;
            btnGuardar.innerHTML = `<i class="ph ph-spinner ph-spin"></i> Guardando...`;
        }

        try {
            const payload = {
                id: id || null,
                nombre,
                slug,
                direccion,
                ciudad: 'Lima',
                whatsapp,
                estado,
                descripcion,
                imagen_url,
                radio_entrega_km,
                tarifas_distancia_activas,
                envio_gratis_desde,
                tramos_distancia,
                tipo_cobertura_dept,
                departamentos_cobertura,
                aviso_recojo,
                latitud,
                longitud
            };

            const res = await fetch((window.APP_BASE || '') + '/api/index.php?request=tiendas&action=save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            if (data.status === 'success') {
                if (window.showToast) window.showToast(data.message || 'Tienda guardada exitosamente', 'success');
                cerrarModalTienda();
                cargarTiendas(true);
            } else {
                throw new Error(data.message || 'No se pudo guardar la tienda');
            }
        } catch (e) {
            console.error('Error al guardar tienda:', e);
            if (window.showToast) window.showToast(e.message || 'Error de conexión', 'error');
        } finally {
            if (btnGuardar) {
                btnGuardar.disabled = false;
                btnGuardar.innerHTML = `<i class="ph ph-floppy-disk"></i> Guardar Tienda`;
            }
        }
    };

    // =========================================================================
    // ELIMINAR TIENDA
    // =========================================================================
    window.eliminarTienda = async function(id, nombre) {
        if (!id) return;

        let confirmed = false;
        if (typeof window.confirmarAccion === 'function') {
            confirmed = await window.confirmarAccion({
                titulo: '¿Eliminar esta tienda?',
                mensaje: `¿Estás seguro de que deseas eliminar la sede <strong>${nombre}</strong>?`,
                itemNombre: nombre,
                textoAceptar: 'Sí, Eliminar Tienda',
                tipo: 'danger'
            });
        } else {
            confirmed = confirm(`¿Estás seguro de que deseas eliminar la tienda "${nombre}"?`);
        }

        if (!confirmed) return;

        try {
            const res = await fetch((window.APP_BASE || '') + '/api/index.php?request=tiendas&action=delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id })
            });

            const data = await res.json();
            if (data.status === 'success') {
                if (window.showToast) window.showToast('Tienda eliminada exitosamente', 'success');
                cargarTiendas(true);
            } else {
                throw new Error(data.message || 'No se pudo eliminar la tienda');
            }
        } catch (e) {
            console.error('Error al eliminar tienda:', e);
            if (window.showToast) window.showToast(e.message || 'Error de conexión', 'error');
        }
    };

    // =========================================================================
    // GESTIÓN DE MÉTODOS DE PAGO (PESTAÑA 4 & SUBMODAL)
    // =========================================================================
    function renderListaMetodosPago() {
        const container = document.getElementById('tienda-metodos-lista');
        const badgeCount = document.getElementById('modal-tab-pagos-count');
        if (!container) return;

        if (badgeCount) {
            badgeCount.innerText = currentMetodosPago.length;
        }

        if (currentMetodosPago.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 28px 16px; color: var(--text-sec); background: var(--bg-main); border: 1px dashed var(--border-color); border-radius: 12px;">
                    <i class="ph ph-wallet" style="font-size: 28px; color: var(--primary); opacity: 0.6; margin-bottom: 4px;"></i>
                    <div style="font-size: 13px; font-weight: 600;">Sin métodos de pago configurados</div>
                    <button type="button" class="btn btn-secondary btn-sm" onclick="abrirModalMetodoPago()" style="margin-top: 8px; border-radius: 8px; font-weight: 600;">
                        <i class="ph ph-plus"></i> Añadir Primer Método
                    </button>
                </div>
            `;
            if (typeof window.renderPhosphorIcons === 'function') window.renderPhosphorIcons(container);
            return;
        }

        container.innerHTML = currentMetodosPago.map((m, idx) => {
            const badgeTipo = formatearTipoMetodo(m.tipo_integracion);
            const iconoHtml = m.icono_url
                ? `<img src="${m.icono_url}" style="width: 36px; height: 36px; border-radius: 8px; object-fit: contain; border: 1px solid var(--border-color);">`
                : (m.qr_imagen_url
                    ? `<img src="${m.qr_imagen_url}" style="width: 36px; height: 36px; border-radius: 8px; object-fit: contain; border: 1px solid var(--border-color);">`
                    : `<div style="width: 36px; height: 36px; border-radius: 8px; background: rgba(239, 68, 68, 0.08); color: var(--primary); display: flex; align-items: center; justify-content: center; font-size: 18px;"><i class="ph ph-wallet"></i></div>`);

            return `
                <div class="tienda-metodo-item" id="metodo-item-${m.id || idx}">
                    <div style="display: flex; align-items: center; gap: 12px; flex: 1; min-width: 0;">
                        <div class="drag-handle-grip" title="Mover para reordenar">
                            <i class="ph ph-dots-six-vertical"></i>
                        </div>
                        ${iconoHtml}
                        <div style="min-width: 0; flex: 1;">
                            <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                                <span style="font-weight: 700; color: var(--text-main); font-size: 13.5px;">${m.nombre}</span>
                                ${badgeTipo}
                                ${m.estado === 'inactivo' ? `<span class="badge" style="background: rgba(239,68,68,0.1); color: var(--danger); font-size: 10px;">Inactivo</span>` : ''}
                            </div>
                            <div style="font-size: 12px; color: var(--text-sec); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 2px;">
                                ${m.descripcion || m.instrucciones_cuentas || 'Sin instrucciones adicionales'}
                            </div>
                        </div>
                    </div>

                    <div style="display: flex; gap: 6px; align-items: center; flex-shrink: 0;">
                        <button type="button" class="btn-icon" style="color: var(--link); width: 34px; height: 34px; border-radius: 8px;" onclick="editarMetodoPago(${idx})" title="Editar método">
                            <i class="ph ph-pencil-simple"></i>
                        </button>
                        <button type="button" class="btn-icon" style="color: var(--danger); width: 34px; height: 34px; border-radius: 8px;" onclick="eliminarMetodoPago(${idx})" title="Eliminar método">
                            <i class="ph ph-trash"></i>
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        if (typeof window.renderPhosphorIcons === 'function') {
            window.renderPhosphorIcons(container);
        }
    }

    function formatearTipoMetodo(tipo) {
        switch(tipo) {
            case 'transferencia_qr':
                return `<span class="badge" style="background: rgba(245, 158, 11, 0.12); color: #D97706; font-size: 10.5px; font-weight: 700;">Transferencia / QR</span>`;
            case 'efectivo':
                return `<span class="badge" style="background: rgba(16, 185, 129, 0.12); color: #059669; font-size: 10.5px; font-weight: 700;">Efectivo</span>`;
            case 'tarjeta_pos':
                return `<span class="badge" style="background: rgba(59, 130, 246, 0.12); color: #2563EB; font-size: 10.5px; font-weight: 700;">Tarjeta / POS</span>`;
            case 'pasarela':
                return `<span class="badge" style="background: rgba(139, 92, 246, 0.12); color: #7C3AED; font-size: 10.5px; font-weight: 700;">Pasarela Online</span>`;
            default:
                return `<span class="badge" style="background: var(--bg-main); color: var(--text-sec); font-size: 10.5px; font-weight: 700;">Otro</span>`;
        }
    }

    window.abrirModalMetodoPago = function() {
        currentMetodoEnEdicion = null;
        const modal = document.getElementById('modal-metodo-pago');
        const form = document.getElementById('form-metodo-pago');
        const titulo = document.getElementById('modal-metodo-titulo');
        if (!modal) return;

        form.reset();
        document.getElementById('metodo-id').value = '';
        document.getElementById('metodo-nombre').value = 'Pago con Yape';
        document.getElementById('metodo-descripcion').value = 'Copia el numero o escanea el QR y adjunta tu voucher para que nuestro equipo lo valide.';
        document.getElementById('metodo-tipo').value = 'transferencia_qr';
        document.getElementById('metodo-cuentas').value = '998774145';
        document.getElementById('metodo-estado').value = 'activo';

        resetPreviewMetodo('icono');
        resetPreviewMetodo('qr');
        toggleMetodoSubbox('transferencia_qr');

        titulo.innerText = 'Nuevo Método de Pago';
        modal.classList.remove('hidden');
        requestAnimationFrame(() => modal.classList.add('show'));

        if (typeof window.renderPhosphorIcons === 'function') {
            window.renderPhosphorIcons(modal);
        }
    };

    window.editarMetodoPago = function(idx) {
        const m = currentMetodosPago[idx];
        if (!m) return;
        currentMetodoEnEdicion = { index: idx, data: m };

        const modal = document.getElementById('modal-metodo-pago');
        const titulo = document.getElementById('modal-metodo-titulo');
        if (!modal) return;

        document.getElementById('metodo-id').value = m.id || '';
        document.getElementById('metodo-nombre').value = m.nombre || '';
        document.getElementById('metodo-descripcion').value = m.descripcion || '';
        document.getElementById('metodo-tipo').value = m.tipo_integracion || 'transferencia_qr';
        document.getElementById('metodo-cuentas').value = m.instrucciones_cuentas || '';
        document.getElementById('metodo-estado').value = m.estado || 'activo';

        resetPreviewMetodo('icono');
        resetPreviewMetodo('qr');

        if (m.icono_url) {
            const img = document.getElementById('metodo-icono-img');
            const ph = document.getElementById('metodo-icono-ph');
            if (img && ph) {
                img.src = m.icono_url;
                img.style.display = 'block';
                ph.style.display = 'none';
            }
        }

        if (m.qr_imagen_url) {
            const img = document.getElementById('metodo-qr-img');
            const ph = document.getElementById('metodo-qr-ph');
            if (img && ph) {
                img.src = m.qr_imagen_url;
                img.style.display = 'block';
                ph.style.display = 'none';
            }
        }

        toggleMetodoSubbox(m.tipo_integracion || 'transferencia_qr');

        titulo.innerText = 'Editar Método de Pago';
        modal.classList.remove('hidden');
        requestAnimationFrame(() => modal.classList.add('show'));

        if (typeof window.renderPhosphorIcons === 'function') {
            window.renderPhosphorIcons(modal);
        }
    };

    window.cerrarModalMetodoPago = function() {
        const modal = document.getElementById('modal-metodo-pago');
        if (!modal) return;
        modal.classList.remove('show');
        setTimeout(() => modal.classList.add('hidden'), 200);
    };

    window.toggleMetodoSubbox = function(tipo) {
        const qrBox = document.getElementById('metodo-qr-box-container');
        if (qrBox) {
            qrBox.style.display = (tipo === 'transferencia_qr') ? 'block' : 'none';
        }
    };

    function resetPreviewMetodo(tipo) {
        const img = document.getElementById('metodo-' + tipo + '-img');
        const ph = document.getElementById('metodo-' + tipo + '-ph');
        const file = document.getElementById('metodo-' + tipo + '-file');
        if (img && ph) {
            img.src = '';
            img.style.display = 'none';
            ph.style.display = 'block';
        }
        if (file) file.value = '';
    }

    window.procesarIconoMetodo = function(input) {
        const file = input.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = document.getElementById('metodo-icono-img');
            const ph = document.getElementById('metodo-icono-ph');
            if (img && ph) {
                img.src = e.target.result;
                img.style.display = 'block';
                ph.style.display = 'none';
            }
        };
        reader.readAsDataURL(file);
    };

    window.procesarQrMetodo = function(input) {
        const file = input.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = document.getElementById('metodo-qr-img');
            const ph = document.getElementById('metodo-qr-ph');
            if (img && ph) {
                img.src = e.target.result;
                img.style.display = 'block';
                ph.style.display = 'none';
            }
        };
        reader.readAsDataURL(file);
    };

    window.guardarMetodoPago = async function() {
        const id = document.getElementById('metodo-id').value;
        const nombre = document.getElementById('metodo-nombre').value.trim();
        const descripcion = document.getElementById('metodo-descripcion').value.trim();
        const tipo_integracion = document.getElementById('metodo-tipo').value;
        const instrucciones_cuentas = document.getElementById('metodo-cuentas').value.trim();
        const estado = document.getElementById('metodo-estado').value;

        const iconoImgSrc = document.getElementById('metodo-icono-img')?.src || '';
        const qrImgSrc = document.getElementById('metodo-qr-img')?.src || '';

        if (!nombre) {
            if (window.showToast) window.showToast('El nombre del método de pago es obligatorio', 'warning');
            return;
        }

        let icono_url = iconoImgSrc.startsWith('data:image/') ? iconoImgSrc : (currentMetodoEnEdicion?.data?.icono_url || '');
        let qr_imagen_url = qrImgSrc.startsWith('data:image/') ? qrImgSrc : (currentMetodoEnEdicion?.data?.qr_imagen_url || '');

        // Si se cargaron imágenes en base64, intentar subirlas
        if (icono_url.startsWith('data:image/')) {
            try {
                const uRes = await fetch((window.APP_BASE || '') + '/api/index.php?request=tiendas&action=upload_foto', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ data: icono_url, subtipo: 'iconos' })
                });
                const uData = await uRes.json();
                if (uData.status === 'success' && uData.data?.url) icono_url = uData.data.url;
            } catch(e) {}
        }

        if (qr_imagen_url.startsWith('data:image/')) {
            try {
                const qRes = await fetch((window.APP_BASE || '') + '/api/index.php?request=tiendas&action=upload_foto', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ data: qr_imagen_url, subtipo: 'qr' })
                });
                const qData = await qRes.json();
                if (qData.status === 'success' && qData.data?.url) qr_imagen_url = qData.data.url;
            } catch(e) {}
        }

        const tiendaId = document.getElementById('tienda-id').value;

        if (tiendaId) {
            // Guardar directamente en backend si la tienda ya existe
            try {
                const res = await fetch((window.APP_BASE || '') + '/api/index.php?request=tiendas&action=save_metodo', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        id: id || null,
                        id_tienda: tiendaId,
                        nombre,
                        descripcion,
                        icono_url,
                        tipo_integracion,
                        qr_imagen_url,
                        instrucciones_cuentas,
                        estado
                    })
                });
                const data = await res.json();
                if (data.status === 'success') {
                    if (window.showToast) window.showToast('Método de pago guardado', 'success');
                    // Recargar métodos de la tienda
                    const mRes = await fetch((window.APP_BASE || '') + '/api/index.php?request=tiendas&action=list_metodos&id_tienda=' + tiendaId);
                    const mData = await mRes.json();
                    if (mData.status === 'success') {
                        currentMetodosPago = mData.data || [];
                        renderListaMetodosPago();
                    }
                    cerrarModalMetodoPago();
                    return;
                }
            } catch (e) {
                console.error('Error al guardar método en backend:', e);
            }
        }

        // Si la tienda aún no tiene ID (nueva tienda en formulario), guardar en memoria
        const item = {
            id: id || null,
            nombre,
            descripcion,
            icono_url,
            tipo_integracion,
            qr_imagen_url,
            instrucciones_cuentas,
            estado
        };

        if (currentMetodoEnEdicion !== null) {
            currentMetodosPago[currentMetodoEnEdicion.index] = item;
        } else {
            currentMetodosPago.push(item);
        }

        renderListaMetodosPago();
        cerrarModalMetodoPago();
        if (window.showToast) window.showToast('Método de pago listo', 'success');
    };

    window.eliminarMetodoPago = async function(idx) {
        const m = currentMetodosPago[idx];
        if (!m) return;

        let confirmed = false;
        if (typeof window.confirmarAccion === 'function') {
            confirmed = await window.confirmarAccion({
                titulo: '¿Eliminar método de pago?',
                mensaje: `¿Deseas remover la opción <strong>${m.nombre}</strong> de esta tienda?`,
                itemNombre: m.nombre,
                textoAceptar: 'Sí, Eliminar',
                tipo: 'danger'
            });
        } else {
            confirmed = confirm(`¿Deseas eliminar el método de pago "${m.nombre}"?`);
        }

        if (!confirmed) return;

        if (m.id) {
            try {
                const res = await fetch((window.APP_BASE || '') + '/api/index.php?request=tiendas&action=delete_metodo', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: m.id })
                });
                const data = await res.json();
                if (data.status !== 'success') {
                    throw new Error(data.message || 'Error al eliminar método');
                }
            } catch (e) {
                console.error(e);
            }
        }

        currentMetodosPago.splice(idx, 1);
        renderListaMetodosPago();
        if (window.showToast) window.showToast('Método de pago eliminado', 'info');
    };

})();
