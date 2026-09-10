// js/modules/inventario.js - Módulo de Inventario
// Limpiado para nuevo desarrollo y diseño

window.renderInventario = function(container) {
    if (!container) return;

    container.innerHTML = `
        <div class="page-header">
            <div>
                <h2 class="page-title">Inventario</h2>
                <p class="page-subtitle">Gestión y control de existencias</p>
            </div>
        </div>

        <div class="card" style="padding: 48px 24px; text-align: center; border-radius: 12px; border: 1px dashed var(--border-color, #E2E8F0); background: var(--card-bg, #ffffff);">
            <div style="width: 64px; height: 64px; border-radius: 50%; background: var(--bg-hover, #F1F5F9); color: var(--text-secondary, #64748B); display: inline-flex; align-items: center; justify-content: center; font-size: 32px; margin-bottom: 16px;">
                <i class="ph ph-package"></i>
            </div>
            <h3 style="font-size: 1.25rem; font-weight: 600; color: var(--text-color, #0F172A); margin-bottom: 8px;">
                Módulo de Inventario Limpio
            </h3>
            <p style="color: var(--text-secondary, #64748B); max-width: 480px; margin: 0 auto; font-size: 0.95rem; line-height: 1.5;">
                El contenido anterior ha sido eliminado con éxito. Este módulo está listo para recibir el nuevo diseño y las funcionalidades que especifiques.
            </p>
        </div>
    `;
};
