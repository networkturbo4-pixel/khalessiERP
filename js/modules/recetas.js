window.renderRecetas = function(container) {
    container.innerHTML = `
        <div class="page-header">
            <div>
                <h2 class="page-title">Gestión de Producción y Recetas</h2>
                <p class="page-subtitle">Matriz de Recetas, Cálculo de Producción y Control de Mermas</p>
            </div>
        </div>

        <div class="nav-tabs">
            <div class="nav-tab active" onclick="switchRecetasTab('calculadora')" id="tab-recetas-calculadora">Calculadora de Producción</div>
            <div class="nav-tab" onclick="switchRecetasTab('compras')" id="tab-recetas-compras">Proyección de Compras</div>
            <div class="nav-tab" onclick="switchRecetasTab('matriz')" id="tab-recetas-matriz">Receta Matriz</div>
            <div class="nav-tab" onclick="switchRecetasTab('mermas')" id="tab-recetas-mermas">Control de Mermas</div>
            <div class="nav-tab" onclick="switchRecetasTab('ingredientes')" id="tab-recetas-ingredientes">Ingredientes</div>
        </div>

        <!-- VISTA: CALCULADORA -->
        <div id="recetas-view-calculadora">
            <div class="card">
                <div class="card-header">Cálculo de Producción para Local</div>
                <div class="card-body">
                    <div style="display:flex; gap:16px; margin-bottom: 20px;">
                        <div style="flex:1">
                            <label class="form-label">Local</label>
                            <select id="calc-local" class="form-control combo-locales"></select>
                        </div>
                        <div style="flex:1">
                            <label class="form-label">Receta Base / Producto</label>
                            <select id="calc-receta" class="form-control combo-recetas"></select>
                        </div>
                        <div style="flex:1">
                            <label class="form-label">Cantidad a Producir</label>
                            <input type="number" id="calc-cantidad" class="form-control" value="1" min="1" step="0.5">
                        </div>
                        <div style="flex:0; display:flex; align-items:flex-end;">
                            <button class="btn btn-primary" onclick="calcularProduccion()"><i class="ph ph-calculator"></i> Calcular</button>
                        </div>
                    </div>
                    
                    <div id="resultado-calculadora" style="display:none;">
                        <h4 style="margin-bottom:10px;">Ingredientes Necesarios:</h4>
                        <div class="table-responsive">
                            <table class="table" id="table-calculo-insumos">
                                <thead>
                                    <tr>
                                        <th>Paso</th>
                                        <th>Ingrediente</th>
                                        <th>Cantidad Requerida</th>
                                        <th>Costo Estimado</th>
                                    </tr>
                                </thead>
                                <tbody></tbody>
                                <tfoot>
                                    <tr><td colspan="3" style="text-align:right; font-weight:bold;">Costo Total Insumos:</td><td id="calc-total-insumos" style="font-weight:bold;">$0.00</td></tr>
                                    <tr><td colspan="3" style="text-align:right;">Mano de Obra (Extra Local):</td><td id="calc-total-mo">$0.00</td></tr>
                                    <tr><td colspan="3" style="text-align:right; font-weight:bold; color:var(--primary);">Costo Total:</td><td id="calc-total-final" style="font-weight:bold; color:var(--primary);">$0.00</td></tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- VISTA: COMPRAS -->
        <div id="recetas-view-compras" class="hidden">
            <div class="card">
                <div class="card-header">Sugerencia de Compras (Proyección)</div>
                <div class="card-body">
                    <div style="margin-bottom: 20px;">
                        <label class="form-label">Local para Compras</label>
                        <select id="compra-local" class="form-control combo-locales" style="max-width:300px;"></select>
                    </div>
                    
                    <h4 style="margin-bottom:10px;">Proyecciones de Venta / Producción</h4>
                    <div class="table-responsive">
                        <table class="table" id="table-proyecciones">
                            <thead>
                                <tr>
                                    <th>Receta / Producto</th>
                                    <th>Cantidad Proyectada</th>
                                    <th>Acción</th>
                                </tr>
                            </thead>
                            <tbody id="tbody-proyecciones">
                            </tbody>
                        </table>
                        <button class="btn btn-secondary mt-2" onclick="addProyeccionRow()"><i class="ph ph-plus"></i> Agregar Proyección</button>
                    </div>
                    
                    <div style="margin-top:24px; display:flex; justify-content:flex-end;">
                        <button class="btn btn-primary" onclick="generarSugerenciaCompras()"><i class="ph ph-shopping-cart"></i> Generar Sugerencia de Compra</button>
                    </div>

                    <div id="resultado-compras" style="display:none; margin-top:30px;">
                        <h4 style="margin-bottom:10px; color:var(--primary);">Lista de Compras Sugerida</h4>
                        <div class="table-responsive">
                            <table class="table">
                                <thead>
                                    <tr>
                                        <th>Ingrediente</th>
                                        <th>Cantidad Base Total</th>
                                        <th>Comprar (Unidades)</th>
                                        <th>Unidad de Compra</th>
                                        <th>Costo Estimado</th>
                                    </tr>
                                </thead>
                                <tbody id="tbody-resultados-compras"></tbody>
                                <tfoot>
                                    <tr>
                                        <td colspan="4" style="text-align:right; font-weight:bold;">Total a Invertir:</td>
                                        <td id="compras-total-final" style="font-weight:bold; color:var(--primary); font-size:16px;">$0.00</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- VISTA: MATRIZ -->
        <div id="recetas-view-matriz" class="hidden">
            <div class="card">
                <div class="card-header">Crear / Editar Receta Matriz</div>
                <div class="card-body">
                    <div style="display:flex; gap:16px; margin-bottom: 20px; flex-wrap: wrap;">
                        <div style="flex:1; min-width: 250px;">
                            <label class="form-label">Nombre de Receta</label>
                            <input type="text" id="matriz-nombre" class="form-control" placeholder="Ej: Masa Madre">
                        </div>
                        <div style="flex:1; min-width: 150px;">
                            <label class="form-label">Tipo</label>
                            <select id="matriz-tipo" class="form-control">
                                <option value="base">Base / Preparación</option>
                                <option value="producto_final">Producto Final (Venta)</option>
                            </select>
                        </div>
                        <div style="flex:1; min-width: 150px;">
                            <label class="form-label">Rendimiento Esp.</label>
                            <input type="text" id="matriz-rendimiento" class="form-control" placeholder="Ej: 14.5kg útiles">
                        </div>
                        <div style="flex:1; min-width: 120px;">
                            <label class="form-label">Horas Ferment.</label>
                            <input type="number" id="matriz-horas" class="form-control" placeholder="Ej: 48" step="0.5">
                        </div>
                        <div style="flex:1; min-width: 120px;">
                            <label class="form-label">Temp. Agua °C</label>
                            <input type="number" id="matriz-temp" class="form-control" placeholder="Ej: 18" step="0.5">
                        </div>
                    </div>
                    
                    <h4 style="margin-bottom:10px;">Ingredientes (Fórmula)</h4>
                    <div class="table-responsive">
                        <table class="table" id="table-matriz">
                            <thead>
                                <tr>
                                    <th>Paso/Orden</th>
                                    <th>Ingrediente</th>
                                    <th>Cantidad Base</th>
                                    <th>Notas / Instrucciones</th>
                                    <th>Acción</th>
                                </tr>
                            </thead>
                            <tbody id="tbody-matriz">
                            </tbody>
                        </table>
                        <button class="btn btn-secondary mt-2" onclick="addMatrizRow()"><i class="ph ph-plus"></i> Agregar Ingrediente</button>
                    </div>
                    
                    <div style="margin-top:24px; display:flex; justify-content:flex-end;">
                        <button class="btn btn-primary" onclick="guardarRecetaMatriz()"><i class="ph ph-floppy-disk"></i> Guardar Receta Matriz</button>
                    </div>
                </div>
            </div>
        </div>

        <!-- VISTA: MERMAS -->
        <div id="recetas-view-mermas" class="hidden">
            <div class="card">
                <div class="card-header">Registro Diario de Mermas</div>
                <div class="card-body">
                    <div style="display:flex; gap:16px; margin-bottom: 20px;">
                        <div style="flex:1">
                            <label class="form-label">Local</label>
                            <select id="merma-local" class="form-control combo-locales"></select>
                        </div>
                        <div style="flex:1">
                            <label class="form-label">Receta Base</label>
                            <select id="merma-receta" class="form-control combo-recetas"></select>
                        </div>
                        <div style="flex:1">
                            <label class="form-label">Cantidad Teórica (Gramos/Lts)</label>
                            <input type="number" id="merma-teorica" class="form-control">
                        </div>
                        <div style="flex:1">
                            <label class="form-label">Cantidad Real Usada (Gramos/Lts)</label>
                            <input type="number" id="merma-real" class="form-control">
                        </div>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Observaciones</label>
                        <textarea id="merma-obs" class="form-control" rows="2" placeholder="Motivo de la merma"></textarea>
                    </div>
                    <button class="btn btn-danger" onclick="registrarMerma()"><i class="ph ph-warning"></i> Registrar Cierre de Mermas</button>
                </div>
            </div>
        </div>

        <!-- VISTA: INGREDIENTES -->
        <div id="recetas-view-ingredientes" class="hidden">
            <div class="card" style="margin-bottom: 24px;">
                <div class="card-header">Registrar Ingrediente</div>
                <div class="card-body">
                    <input type="hidden" id="ingrediente-id">
                    
                    <div style="display:flex; gap:16px; margin-bottom: 20px; flex-wrap: wrap;">
                        <div style="flex:1; min-width: 250px;">
                            <label class="form-label">Nombre del Producto</label>
                            <input type="text" id="ingrediente-nombre" class="form-control" placeholder="Ej: Harina de Trigo">
                        </div>
                        <div style="flex:1; min-width: 200px;">
                            <label class="form-label">Código de Barras</label>
                            <div style="display:flex; gap:8px;">
                                <input type="text" id="ingrediente-codigo" class="form-control" placeholder="Escanear o escribir">
                                <button class="btn btn-secondary" type="button" onclick="window.abrirScanner((code) => { document.getElementById('ingrediente-codigo').value = code; })">
                                    <i class="ph ph-barcode"></i>
                                </button>
                            </div>
                        </div>
                        <div style="flex:1; min-width: 150px;">
                            <label class="form-label">Volumen / Unidad</label>
                            <select id="ingrediente-unidad" class="form-control">
                                <option value="KG">KG</option>
                                <option value="gramos">Gramos</option>
                                <option value="litros">Litros</option>
                                <option value="ml">Mililitros</option>
                                <option value="MG">Miligramos</option>
                                <option value="unidad">Unidad</option>
                            </select>
                        </div>
                    </div>

                    <div style="display:flex; gap:16px; margin-bottom: 20px; flex-wrap: wrap;">
                        <div style="flex:1; min-width: 150px;">
                            <label class="form-label">Fecha Producción</label>
                            <input type="date" id="ingrediente-fprod" class="form-control">
                        </div>
                        <div style="flex:1; min-width: 150px;">
                            <label class="form-label">Fecha Vencimiento</label>
                            <input type="date" id="ingrediente-fvenc" class="form-control">
                        </div>
                        <div style="flex:1; min-width: 120px;">
                            <label class="form-label">Stock Actual</label>
                            <input type="number" id="ingrediente-stock" class="form-control" step="0.01">
                        </div>
                        <div style="flex:1; min-width: 120px;">
                            <label class="form-label">Stock Crítico</label>
                            <input type="number" id="ingrediente-stockc" class="form-control" step="0.01">
                        </div>
                    </div>

                    <div style="margin-bottom: 24px;">
                        <label class="form-label">Foto del Ingrediente</label>
                        <div style="display:flex; gap:16px; align-items:flex-end;">
                            <div id="ingrediente-foto-preview" style="width: 80px; height: 80px; border-radius: 8px; border: 1px solid var(--border-color); background: var(--bg-main); display:flex; align-items:center; justify-content:center; overflow:hidden;">
                                <i class="ph ph-image text-sec" style="font-size:32px;"></i>
                            </div>
                            <input type="hidden" id="ingrediente-foto-url">
                            <button class="btn btn-secondary" type="button" onclick="window.abrirMediaModal((url) => { window.setIngredienteFoto(url); })">
                                <i class="ph ph-upload-simple"></i> Seleccionar de Medios
                            </button>
                        </div>
                    </div>

                    <div style="display:flex; justify-content:flex-end; gap:12px;">
                        <button class="btn btn-secondary" onclick="limpiarFormIngrediente()">Limpiar</button>
                        <button class="btn btn-primary" onclick="guardarIngredienteTab()"><i class="ph ph-floppy-disk"></i> Guardar Ingrediente</button>
                    </div>
                </div>
            </div>

            <div class="card">
                <div class="card-header">Directorio de Ingredientes</div>
                <div class="card-body">
                    <div class="table-responsive">
                        <table class="table" id="table-ingredientes-tab">
                            <thead>
                                <tr>
                                    <th>Foto</th>
                                    <th>Nombre & Código</th>
                                    <th>Unidad</th>
                                    <th>Stock</th>
                                    <th>Vencimiento</th>
                                    <th>Acción</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr><td colspan="6" style="text-align:center;">Cargando...</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    `;

    setTimeout(() => {
        cargarFiltrosGlobales();
        addProyeccionRow();
        addMatrizRow();
    }, 100);
};

window.switchRecetasTab = function(tabId) {
    document.querySelectorAll('.nav-tab').forEach(el => el.classList.remove('active'));
    document.getElementById('tab-recetas-' + tabId).classList.add('active');
    
    document.getElementById('recetas-view-calculadora').classList.add('hidden');
    document.getElementById('recetas-view-compras').classList.add('hidden');
    document.getElementById('recetas-view-matriz').classList.add('hidden');
    document.getElementById('recetas-view-mermas').classList.add('hidden');
    document.getElementById('recetas-view-ingredientes').classList.add('hidden');
    
    document.getElementById('recetas-view-' + tabId).classList.remove('hidden');
    
    if (tabId === 'ingredientes') {
        cargarIngredientesTab();
    }
};

let listaIngredientes = [];
let htmlOpcionesRecetas = '<option value="">Seleccione...</option>';

async function cargarFiltrosGlobales() {
    try {
        const [resLocales, resRecetas, resIngredientes] = await Promise.all([
            fetch('/khalessierp/api/index.php?request=locales/list'),
            fetch('/khalessierp/api/index.php?request=recetas/list'),
            fetch('/khalessierp/api/index.php?request=ingredientes/list')
        ]);
        const datLocales = await resLocales.json();
        const datRecetas = await resRecetas.json();
        const datIngredientes = await resIngredientes.json();

        if (datIngredientes.status === 'success') {
            listaIngredientes = datIngredientes.data;
        }

        let htmlLocales = '<option value="">Seleccione local...</option>';
        if (datLocales.status === 'success') {
            datLocales.data.forEach(l => {
                htmlLocales += `<option value="${l.id}">${l.nombre}</option>`;
            });
        }
        document.querySelectorAll('.combo-locales').forEach(el => el.innerHTML = htmlLocales);

        if (datRecetas.status === 'success') {
            datRecetas.data.forEach(r => {
                htmlOpcionesRecetas += `<option value="${r.id}">${r.nombre} (${r.tipo})</option>`;
            });
        }
        document.querySelectorAll('.combo-recetas').forEach(el => el.innerHTML = htmlOpcionesRecetas);
        
        // Actualizar rows iniciales
        document.querySelectorAll('.select-dinamico-receta').forEach(el => {
            if(!el.value) el.innerHTML = htmlOpcionesRecetas;
        });

    } catch(e) { console.error('Error cargando filtros:', e); }
}

/* =======================================
 * LÓGICA CALCULADORA
 * ======================================= */
window.calcularProduccion = async function() {
    const local = document.getElementById('calc-local').value;
    const receta = document.getElementById('calc-receta').value;
    const cantidad = document.getElementById('calc-cantidad').value;

    if (!local || !receta) return window.showToast && showToast('Seleccione local y receta', 'error');

    try {
        const response = await fetch('/khalessierp/api/index.php?request=recetas/calcular_produccion', {
            method: 'POST', headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ id_local: local, id_receta: receta, porciones: cantidad })
        });
        const data = await response.json();
        
        if (data.status === 'success') {
            document.getElementById('resultado-calculadora').style.display = 'block';
            let tbody = '';
            data.data.insumos.forEach(i => {
                tbody += `<tr><td>${i.orden}</td><td>${i.ingrediente}</td><td>${i.cantidad_calcular} ${i.unidad}</td><td>$${i.costo_estimado.toFixed(2)}</td></tr>`;
            });
            document.querySelector('#table-calculo-insumos tbody').innerHTML = tbody;
            document.getElementById('calc-total-insumos').innerText = '$' + data.data.costo_total_insumos.toFixed(2);
            document.getElementById('calc-total-mo').innerText = '$' + data.data.costo_mano_obra_extra.toFixed(2);
            document.getElementById('calc-total-final').innerText = '$' + data.data.costo_total.toFixed(2);
        } else { window.showToast && showToast(data.message, 'error'); }
    } catch(e) { console.error(e); }
};

/* =======================================
 * LÓGICA PROYECCIÓN COMPRAS
 * ======================================= */
window.addProyeccionRow = function() {
    const tbody = document.getElementById('tbody-proyecciones');
    const tr = document.createElement('tr');
    tr.className = 'row-proyeccion';
    tr.innerHTML = `
        <td><select class="form-control select-dinamico-receta col-receta">${htmlOpcionesRecetas}</select></td>
        <td><input type="number" class="form-control col-cantidad" value="1" min="1"></td>
        <td><button class="btn-icon text-danger" onclick="this.closest('tr').remove()"><i class="ph ph-trash"></i></button></td>
    `;
    tbody.appendChild(tr);
};

window.generarSugerenciaCompras = async function() {
    const local = document.getElementById('compra-local').value;
    if (!local) return window.showToast && showToast('Seleccione un local', 'error');

    const proyecciones = [];
    document.querySelectorAll('.row-proyeccion').forEach(tr => {
        const id_r = tr.querySelector('.col-receta').value;
        const cant = tr.querySelector('.col-cantidad').value;
        if (id_r && cant > 0) proyecciones.push({ id_receta: id_r, cantidad: cant });
    });

    if (proyecciones.length === 0) return window.showToast && showToast('Agregue al menos una proyección', 'error');

    try {
        const response = await fetch('/khalessierp/api/index.php?request=recetas/sugerencia_compras', {
            method: 'POST', headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ id_local: local, proyecciones: proyecciones })
        });
        const data = await response.json();
        
        if (data.status === 'success') {
            document.getElementById('resultado-compras').style.display = 'block';
            let tbody = '';
            data.data.sugerencia.forEach(i => {
                tbody += `<tr>
                    <td>${i.ingrediente}</td>
                    <td>${i.cantidad_base}</td>
                    <td class="fw-500">${i.cantidad_comprar}</td>
                    <td>${i.unidad_compra}</td>
                    <td>$${i.costo_estimado.toFixed(2)}</td>
                </tr>`;
            });
            document.getElementById('tbody-resultados-compras').innerHTML = tbody;
            document.getElementById('compras-total-final').innerText = '$' + data.data.costo_total.toFixed(2);
        } else { window.showToast && showToast(data.message, 'error'); }
    } catch(e) { console.error(e); }
};

/* =======================================
 * LÓGICA RECETA MATRIZ
 * ======================================= */
window.addMatrizRow = function() {
    const tbody = document.getElementById('tbody-matriz');
    const tr = document.createElement('tr');
    tr.className = 'row-matriz';
    let opts = '<option value="">Seleccione ingrediente...</option>';
    listaIngredientes.forEach(i => opts += `<option value="${i.id}" data-unidad="${i.unidad_medida}">${i.nombre}</option>`);
    
    tr.innerHTML = `
        <td><input type="number" class="form-control col-orden" value="${tbody.children.length + 1}" style="width:70px;"></td>
        <td><select class="form-control col-ing" onchange="this.closest('tr').querySelector('.span-unidad').innerText = this.options[this.selectedIndex].getAttribute('data-unidad') || ''">${opts}</select></td>
        <td>
            <div style="display:flex; align-items:center; gap:8px;">
                <input type="number" class="form-control col-cant" placeholder="Ej: 500" min="0" step="0.01" style="width:100px;">
                <span class="span-unidad fw-500 text-muted" style="min-width:30px;"></span>
            </div>
        </td>
        <td><input type="text" class="form-control col-notas" placeholder="Ej: Añadir en seco"></td>
        <td><button class="btn-icon text-danger" onclick="this.closest('tr').remove()"><i class="ph ph-trash"></i></button></td>
    `;
    tbody.appendChild(tr);
};

window.guardarRecetaMatriz = async function() {
    const nombre = document.getElementById('matriz-nombre').value;
    const tipo = document.getElementById('matriz-tipo').value;
    const rendimiento = document.getElementById('matriz-rendimiento').value;
    const horas = document.getElementById('matriz-horas').value;
    const temp = document.getElementById('matriz-temp').value;
    
    if(!nombre) return window.showToast && showToast('El nombre de la receta es obligatorio', 'error');

    const detalles = [];
    let errorDetalle = false;
    document.querySelectorAll('.row-matriz').forEach(tr => {
        const ing = tr.querySelector('.col-ing').value;
        const cant = tr.querySelector('.col-cant').value;
        const orden = tr.querySelector('.col-orden').value;
        const notas = tr.querySelector('.col-notas').value;
        if(ing && cant) {
            detalles.push({ id_ingrediente: ing, cantidad_base: cant, orden_preparacion: orden, notas: notas });
        } else if (ing || cant) {
            errorDetalle = true;
        }
    });

    if(errorDetalle) return window.showToast && showToast('Complete los ingredientes agregados', 'error');
    if(detalles.length === 0) return window.showToast && showToast('Agregue al menos un ingrediente', 'error');

    try {
        const response = await fetch('/khalessierp/api/index.php?request=recetas/save', {
            method: 'POST', headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ nombre: nombre, tipo: tipo, rendimiento_esperado: rendimiento, horas_fermentacion_base: horas, temp_agua_c_base: temp, detalles: detalles })
        });
        const data = await response.json();
        
        if (data.status === 'success') {
            window.showToast && showToast('Receta guardada y asignada a todos los locales', 'success');
            document.getElementById('matriz-nombre').value = '';
            document.getElementById('matriz-rendimiento').value = '';
            document.getElementById('matriz-horas').value = '';
            document.getElementById('matriz-temp').value = '';
            document.getElementById('tbody-matriz').innerHTML = '';
            addMatrizRow();
            cargarFiltrosGlobales(); // Actualiza combos
        } else { window.showToast && showToast(data.message, 'error'); }
    } catch(e) { console.error(e); }
};

/* =======================================
 * LÓGICA MERMAS
 * ======================================= */
window.registrarMerma = async function() {
    const local = document.getElementById('merma-local').value;
    const receta = document.getElementById('merma-receta').value;
    const teorica = document.getElementById('merma-teorica').value;
    const real = document.getElementById('merma-real').value;
    const obs = document.getElementById('merma-obs').value;
    const user = JSON.parse(localStorage.getItem('khalessi_user') || '{}');

    if (!local || !receta || !teorica || !real) return window.showToast && showToast('Complete cantidades', 'error');

    try {
        const response = await fetch('/khalessierp/api/index.php?request=recetas/registrar_merma', {
            method: 'POST', headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ id_local: local, id_receta: receta, cantidad_teorica: teorica, cantidad_real: real, observaciones: obs, id_usuario: user.id || 1 })
        });
        const data = await response.json();
        if (data.status === 'success') {
            document.getElementById('merma-teorica').value = '';
            document.getElementById('merma-real').value = '';
            if (data.data.alerta && window.showModal) {
                window.showModal('⚠️ Alerta de Merma Alta', 
                    `<p>Porcentaje: <b>${data.data.porcentaje_merma}%</b>, supera el 5% permitido.</p>`
                );
            } else { window.showToast && showToast('Merma registrada: ' + data.data.porcentaje_merma + '%', 'success'); }
        } else { window.showToast && showToast(data.message, 'error'); }
    } catch(e) { console.error(e); }
};

/* =======================================
 * LÓGICA INGREDIENTES
 * ======================================= */
window.setIngredienteFoto = function(url) {
    document.getElementById('ingrediente-foto-url').value = url;
    document.getElementById('ingrediente-foto-preview').innerHTML = `<img src="${url}" style="width:100%; height:100%; object-fit:cover;">`;
};

window.limpiarFormIngrediente = function() {
    document.getElementById('ingrediente-id').value = '';
    document.getElementById('ingrediente-nombre').value = '';
    document.getElementById('ingrediente-codigo').value = '';
    document.getElementById('ingrediente-unidad').value = 'KG';
    document.getElementById('ingrediente-fprod').value = '';
    document.getElementById('ingrediente-fvenc').value = '';
    document.getElementById('ingrediente-stock').value = '';
    document.getElementById('ingrediente-stockc').value = '';
    document.getElementById('ingrediente-foto-url').value = '';
    document.getElementById('ingrediente-foto-preview').innerHTML = `<i class="ph ph-image text-sec" style="font-size:32px;"></i>`;
};

window.cargarIngredientesTab = async function() {
    try {
        const response = await fetch('/khalessierp/api/index.php?request=ingredientes/list');
        const data = await response.json();
        
        if (data.status === 'success') {
            window.listaIngredientesTab = data.data; // Store globally for editing
            const tbody = document.querySelector('#table-ingredientes-tab tbody');
            tbody.innerHTML = '';
            
            if(data.data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">No hay ingredientes registrados.</td></tr>';
                return;
            }

            data.data.forEach(item => {
                const fotoHtml = item.foto_url 
                    ? `<img src="${item.foto_url}" style="width:40px; height:40px; border-radius:8px; object-fit:cover;">`
                    : `<div style="width:40px; height:40px; border-radius:8px; background:var(--border-color); display:flex; align-items:center; justify-content:center;"><i class="ph ph-image text-sec"></i></div>`;
                
                const stockColor = (item.stock <= item.stock_critico) ? 'var(--danger)' : 'var(--success)';
                const stockText = `<span style="color:${stockColor}; font-weight:600;">${item.stock}</span> (Mín: ${item.stock_critico})`;

                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${fotoHtml}</td>
                    <td>
                        <div class="fw-500">${item.nombre}</div>
                        <div class="text-sec text-small"><i class="ph ph-barcode"></i> ${item.codigo_barras || 'Sin código'}</div>
                    </td>
                    <td>${item.unidad_medida}</td>
                    <td>${stockText}</td>
                    <td>${item.fecha_vencimiento || '-'}</td>
                    <td>
                        <button class="btn-icon text-primary" onclick="editarIngredienteTab(${item.id})"><i class="ph ph-pencil-simple"></i></button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        }
    } catch(e) { console.error('Error al cargar ingredientes en tab:', e); }
};

window.editarIngredienteTab = function(id) {
    const item = window.listaIngredientesTab.find(i => i.id == id);
    if (!item) return;

    document.getElementById('ingrediente-id').value = item.id;
    document.getElementById('ingrediente-nombre').value = item.nombre || '';
    document.getElementById('ingrediente-codigo').value = item.codigo_barras || '';
    document.getElementById('ingrediente-unidad').value = item.unidad_medida || 'KG';
    document.getElementById('ingrediente-fprod').value = item.fecha_produccion || '';
    document.getElementById('ingrediente-fvenc').value = item.fecha_vencimiento || '';
    document.getElementById('ingrediente-stock').value = item.stock || '';
    document.getElementById('ingrediente-stockc').value = item.stock_critico || '';
    
    if (item.foto_url) {
        window.setIngredienteFoto(item.foto_url);
    } else {
        document.getElementById('ingrediente-foto-url').value = '';
        document.getElementById('ingrediente-foto-preview').innerHTML = `<i class="ph ph-image text-sec" style="font-size:32px;"></i>`;
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

window.guardarIngredienteTab = async function() {
    const id = document.getElementById('ingrediente-id').value;
    const data = {
        id: id,
        nombre: document.getElementById('ingrediente-nombre').value,
        codigo_barras: document.getElementById('ingrediente-codigo').value,
        unidad_medida: document.getElementById('ingrediente-unidad').value,
        fecha_produccion: document.getElementById('ingrediente-fprod').value,
        fecha_vencimiento: document.getElementById('ingrediente-fvenc').value,
        stock: document.getElementById('ingrediente-stock').value,
        stock_critico: document.getElementById('ingrediente-stockc').value,
        foto_url: document.getElementById('ingrediente-foto-url').value
    };

    if (!data.nombre || !data.unidad_medida) {
        return window.showToast && showToast('Nombre y unidad son obligatorios', 'error');
    }

    try {
        const response = await fetch('/khalessierp/api/index.php?request=ingredientes/save', {
            method: 'POST', 
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(data)
        });
        const res = await response.json();
        
        if (res.status === 'success') {
            window.showToast && showToast('Ingrediente guardado correctamente', 'success');
            limpiarFormIngrediente();
            cargarIngredientesTab();
            cargarFiltrosGlobales(); // Actualiza combos de matriz/calculadora si cambian nombres
        } else {
            window.showToast && showToast(res.message, 'error');
        }
    } catch(e) { 
        console.error(e);
        window.showToast && showToast('Error de conexión', 'error');
    }
};
