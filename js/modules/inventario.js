window.renderInventario = function(container) {
    container.innerHTML = `
        <div class="page-header">
            <div>
                <h2 class="page-title">Inventario Multi-Local</h2>
                <p class="page-subtitle">Gestiona stock, transferencias, mermas y caducidades</p>
            </div>
            <button class="btn btn-primary" onclick="showModalMovimiento()"><i class="ph ph-plus"></i> Nuevo Movimiento</button>
        </div>

        <div class="nav-tabs">
            <div class="nav-tab active" onclick="switchInventarioTab('stock')" id="tab-inv-stock">
                <i class="ph ph-package"></i>
                <span>Stock por Local</span>
            </div>
            <div class="nav-tab" onclick="switchInventarioTab('transferencias')" id="tab-inv-transferencias">
                <i class="ph ph-arrows-left-right"></i>
                <span>Transferencias</span>
            </div>
            <div class="nav-tab" onclick="switchInventarioTab('mermas')" id="tab-inv-mermas">
                <i class="ph ph-trash"></i>
                <span>Mermas</span>
            </div>
            <div class="nav-tab" onclick="switchInventarioTab('lotes')" id="tab-inv-lotes">
                <i class="ph ph-barcode"></i>
                <span>Lotes y Caducidad</span>
            </div>
        </div>

        <!-- VISTA: STOCK LOCAL -->
        <div id="inv-view-stock">
            <div class="card">
                <div class="card-header" style="display:flex; justify-content:space-between; align-items:center;">
                    <span>Consolidado de Stock</span>
                    <select id="filtro-local-stock" class="form-control" style="width:200px;" onchange="cargarStock()">
                        <option value="">Todos los Locales</option>
                    </select>
                </div>
                <div class="card-body">
                    <div class="table-responsive">
                        <table class="table">
                            <thead>
                                <tr>
                                    <th>Ítem</th>
                                    <th>Tipo</th>
                                    <th>Disponible</th>
                                    <th>Reservado</th>
                                    <th>Estado</th>
                                </tr>
                            </thead>
                            <tbody id="tbody-stock">
                                <tr><td colspan="5" class="text-center">Cargando stock...</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>

        <!-- VISTA: TRANSFERENCIAS -->
        <div id="inv-view-transferencias" class="hidden">
            <div class="card">
                <div class="card-header">Gestión de Traslados</div>
                <div class="card-body">
                    <p class="text-muted">Módulo en construcción: Aquí se verán las solicitudes de transferencia entre locales.</p>
                </div>
            </div>
        </div>

        <!-- VISTA: MERMAS -->
        <div id="inv-view-mermas" class="hidden">
            <div class="card">
                <div class="card-header">Cierre de Cocina - Registro Rápido de Mermas</div>
                <div class="card-body">
                    <div style="display:flex; gap:16px; margin-bottom:15px;">
                        <div style="flex:1">
                            <label class="form-label">Local</label>
                            <select id="merma-local" class="form-control combo-locales"></select>
                        </div>
                        <div style="flex:1">
                            <label class="form-label">Ingrediente</label>
                            <select id="merma-ing" class="form-control combo-ingredientes"></select>
                        </div>
                        <div style="flex:1">
                            <label class="form-label">Cantidad Perdida</label>
                            <input type="number" id="merma-cant" class="form-control" min="0.01" step="0.01">
                        </div>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Motivo / Observaciones</label>
                        <input type="text" id="merma-obs" class="form-control" placeholder="Ej: Harina pegada en amasadora">
                    </div>
                    <button class="btn btn-danger" onclick="registrarMermaRapida()"><i class="ph ph-warning"></i> Registrar Merma</button>
                </div>
            </div>
        </div>

        <!-- VISTA: LOTES -->
        <div id="inv-view-lotes" class="hidden">
            <div class="card">
                <div class="card-header">Control FIFO de Lotes Perecederos</div>
                <div class="card-body">
                    <p class="text-muted">Módulo en construcción: Aquí se mostrarán alertas de caducidad próximas.</p>
                </div>
            </div>
        </div>
    `;

    setTimeout(() => {
        cargarFiltrosInv();
        cargarStock();
    }, 100);
};

window.switchInventarioTab = function(tabId) {
    document.querySelectorAll('[id^="tab-inv-"]').forEach(el => el.classList.remove('active'));
    const targetTab = document.getElementById('tab-inv-' + tabId);
    if (targetTab) {
        targetTab.classList.add('active');
        targetTab.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
    
    document.querySelectorAll('[id^="inv-view-"]').forEach(el => el.classList.add('hidden'));
    document.getElementById('inv-view-' + tabId).classList.remove('hidden');
};

async function cargarFiltrosInv() {
    try {
        const [resL, resI] = await Promise.all([
            fetch('/khalessierp/api/index.php?request=locales/list'),
            fetch('/khalessierp/api/index.php?request=ingredientes/list')
        ]);
        const datL = await resL.json();
        const datI = await resI.json();

        let optsL = '<option value="">Seleccione local...</option>';
        if (datL.status === 'success') {
            datL.data.forEach(l => optsL += `<option value="${l.id}">${l.nombre}</option>`);
            document.getElementById('filtro-local-stock').innerHTML = '<option value="">Todos los Locales</option>' + optsL.replace('<option value="">Seleccione local...</option>', '');
        }
        document.querySelectorAll('.combo-locales').forEach(el => el.innerHTML = optsL);

        let optsI = '<option value="">Seleccione ingrediente...</option>';
        if (datI.status === 'success') {
            datI.data.forEach(i => optsI += `<option value="${i.id}">${i.nombre} (${i.unidad_medida})</option>`);
        }
        document.querySelectorAll('.combo-ingredientes').forEach(el => el.innerHTML = optsI);
    } catch(e) {}
}

window.cargarStock = async function() {
    const local = document.getElementById('filtro-local-stock').value;
    try {
        const url = local ? '/khalessierp/api/index.php?request=inventario/list_stock&id_local='+local : '/khalessierp/api/index.php?request=inventario/list_stock';
        const res = await fetch(url);
        const data = await res.json();
        
        let html = '';
        if (data.status === 'success' && data.data.length > 0) {
            data.data.forEach(s => {
                let badge = '<span class="badge" style="background:#10B981;color:white;">Óptimo</span>';
                if (s.cantidad_disponible <= 0) badge = '<span class="badge" style="background:#EF4444;color:white;">Agotado</span>';
                else if (s.cantidad_disponible < 10) badge = '<span class="badge" style="background:#F59E0B;color:white;">Bajo</span>'; // Simulado
                
                html += `<tr>
                    <td class="fw-500">${s.ingrediente_nombre || s.producto_nombre}</td>
                    <td><span class="badge bg-secondary">${s.id_ingrediente ? 'Ingrediente' : 'Producto'}</span></td>
                    <td class="fw-bold">${parseFloat(s.cantidad_disponible).toFixed(2)} ${s.unidad_medida || ''}</td>
                    <td class="text-muted">${parseFloat(s.cantidad_reservada).toFixed(2)}</td>
                    <td>${badge}</td>
                </tr>`;
            });
        } else {
            html = '<tr><td colspan="5" class="text-center">No hay registros de stock</td></tr>';
        }
        document.getElementById('tbody-stock').innerHTML = html;
    } catch(e) {
        document.getElementById('tbody-stock').innerHTML = '<tr><td colspan="5" class="text-center text-danger">Error al cargar stock</td></tr>';
    }
};

window.registrarMermaRapida = async function() {
    const local = document.getElementById('merma-local').value;
    const ing = document.getElementById('merma-ing').value;
    const cant = document.getElementById('merma-cant').value;
    const obs = document.getElementById('merma-obs').value;

    if (!local || !ing || !cant) return window.showToast && showToast('Complete local, ingrediente y cantidad', 'error');

    try {
        const res = await fetch('/khalessierp/api/index.php?request=inventario/movimiento', {
            method: 'POST', headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                id_local: local,
                id_ingrediente: ing,
                tipo_movimiento: 'merma',
                cantidad: -Math.abs(parseFloat(cant)), // Negativo
                observaciones: obs
            })
        });
        const data = await res.json();
        if (data.status === 'success') {
            window.showToast && showToast('Merma descontada del stock', 'success');
            document.getElementById('merma-cant').value = '';
            document.getElementById('merma-obs').value = '';
            cargarStock();
        } else {
            window.showToast && showToast(data.message, 'error');
        }
    } catch(e) { console.error(e); }
};

window.showModalMovimiento = function() {
    // Opcional: Implementar un modal completo de compra/ajuste
    window.showToast && showToast('Función "Nuevo Movimiento" en desarrollo', 'info');
};
