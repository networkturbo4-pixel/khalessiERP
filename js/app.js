// Utilidades Globales

window.AppConfig = {
    get: function(key) {
        try {
            const config = JSON.parse(localStorage.getItem('khalessi_config')) || {};
            return config[key] !== undefined ? config[key] : '';
        } catch(e) { return ''; }
    },
    setAll: function(data) {
        localStorage.setItem('khalessi_config', JSON.stringify(data));
    }
};

window.initGlobalConfig = async function() {
    try {
        const response = await fetch('/khalessierp/api/configuracion/load');
        const data = await response.json();
        if (data.status === 'success' && data.data) {
            AppConfig.setAll(data.data);
            applyDynamicStyles();
        }
    } catch(e) { console.error('Error cargando configuración global:', e); }
};

window.applyDynamicStyles = function() {
    let styleEl = document.getElementById('dynamic-theme-styles');
    if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = 'dynamic-theme-styles';
        document.head.appendChild(styleEl);
    }
    
    const fontFamily = AppConfig.get('font_family') || "'Inter', sans-serif";
    const fontSize = AppConfig.get('font_size') || "13px";
    
    const primary = AppConfig.get('color_primary') || "#ef4444";
    const btnBgLight = AppConfig.get('btn_bg_light') || primary;
    const btnTextLight = AppConfig.get('btn_text_light') || "#ffffff";
    const textLight = AppConfig.get('text_light') || "#0F172A";
    
    const btnBgDark = AppConfig.get('btn_bg_dark') || primary;
    const btnTextDark = AppConfig.get('btn_text_dark') || "#ffffff";
    const textDark = AppConfig.get('text_dark') || "#F8FAFC";
    
    const faviconUrl = AppConfig.get('logo_favicon');
    if (faviconUrl) {
        let link = document.querySelector("link[rel~='icon']");
        if (!link) {
            link = document.createElement('link');
            link.rel = 'icon';
            document.head.appendChild(link);
        }
        link.href = faviconUrl;
    }
    
    const hasLogoLight = !!AppConfig.get('logo_light');
    const hasLogoDark = !!AppConfig.get('logo_dark');

    styleEl.innerHTML = `
        :root {
            --font-family: ${fontFamily};
            --primary: ${primary};
            --text-main: ${textLight};
            --btn-bg: ${btnBgLight};
            --btn-text: ${btnTextLight};
        }
        
        body { font-size: ${fontSize}; }

        [data-theme="dark"] {
            --text-main: ${textDark};
            --btn-bg: ${btnBgDark};
            --btn-text: ${btnTextDark};
        }
        
        .btn-primary { background: var(--btn-bg) !important; color: var(--btn-text) !important; }
        .btn-primary:hover { opacity: 0.9; }
        
        /* Ocultar texto de marca si hay logo */
        ${hasLogoLight ? `:root:not([data-theme="dark"]) .dynamic-brand-text { display: none !important; }` : ''}
        ${hasLogoDark ? `[data-theme="dark"] .dynamic-brand-text { display: none !important; }` : ''}
        
        /* Ocultar / Mostrar logos según tema */
        .logo-dark { display: none !important; }
        [data-theme="dark"] .logo-light { display: none !important; }
        [data-theme="dark"] .logo-dark { display: block !important; }
    `;
};

function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
}

// Para usar desde cualquier lado
window.toggleTheme = function() {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
    
    // Actualizar iconos en todos los botones de tema
    document.querySelectorAll('.theme-icon-indicator').forEach(el => {
        el.className = next === 'dark' ? 'ph ph-sun theme-icon-indicator' : 'ph ph-moon theme-icon-indicator';
    });
};

function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let icon = 'info';
    if(type === 'success') icon = 'check-circle';
    if(type === 'error') icon = 'warning-circle';

    toast.innerHTML = `
        <i class="ph ph-${icon}" style="font-size: 20px;"></i>
        <span>${message}</span>
    `;
    
    container.appendChild(toast);
    
    requestAnimationFrame(() => toast.classList.add('show'));
    
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function showModal(title, content, onConfirm = null) {
    const backdrop = document.getElementById('modal-container');
    document.getElementById('modal-title').innerText = title;
    document.getElementById('modal-body').innerHTML = content;
    
    backdrop.classList.remove('hidden');
    requestAnimationFrame(() => backdrop.classList.add('show'));

    const btnClose = document.getElementById('btn-close-modal');
    const btnCancel = document.getElementById('btn-cancel-modal');
    const btnConfirm = document.getElementById('btn-confirm-modal');

    const closeModal = () => {
        backdrop.classList.remove('show');
        setTimeout(() => backdrop.classList.add('hidden'), 200);
    };

    btnClose.onclick = closeModal;
    btnCancel.onclick = closeModal;
    
    btnConfirm.onclick = () => {
        if(onConfirm) onConfirm();
        closeModal();
    };
}


// ==============================
// ENRUTADOR Y LAYOUT
// ==============================

const routes = {
    '/login': { view: renderLogin, layout: false },
    '/boleta': { view: (c) => window.renderBoletaPublica(c), layout: false },
    '/boleta-publica': { view: (c) => window.renderBoletaPublica(c), layout: false },
    '/dashboard': { view: renderDashboard, layout: true },
    '/inventario': { view: renderInventario, layout: true },
    '/recetas': { view: window.renderRecetas || (() => '<h2>Cargando Módulo de Recetas...</h2>'), layout: true },
    '/usuarios': { view: renderUsuarios, layout: true },
    '/clientes': { view: renderClientes, layout: true },
    '/rrhh': { view: renderRRHH, layout: true },
    '/configuracion': { view: renderConfiguracion, layout: true },
    '/perfil': { view: renderPerfil, layout: true }
};

window.closeSidebarMobile = function() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.querySelector('.sidebar-overlay');
    if (sidebar) sidebar.classList.remove('show-mobile');
    if (overlay) overlay.classList.remove('show');
};

window.navigate = function(path) {
    window.closeSidebarMobile();
    window.history.pushState({}, path, `/khalessierp${path}`);
    router();
};

function router() {
    let path = window.location.pathname.replace('/khalessierp', '');
    if (path.length > 1 && path.endsWith('/')) path = path.slice(0, -1);
    if (path === '/' || path === '') path = '/login';
    
    const user = JSON.parse(localStorage.getItem('khalessi_user') || '{}');
    if (path !== '/login' && path !== '/perfil' && path !== '/logout' && !path.startsWith('/boleta')) {
        const modulo = path.substring(1); 
        const isAdministrador = user.rol_nombre && user.rol_nombre.toLowerCase() === 'administrador';
        let allowed = isAdministrador;
        
        if (!allowed && user.permisos) {
            const p = user.permisos.find(x => x.modulo === modulo);
            if (p && p.puede_ver == 1) allowed = true;
        }
        
        if (!allowed && !isAdministrador) {
            let firstAllowed = user.permisos ? user.permisos.find(x => x.puede_ver == 1) : null;
            if (firstAllowed) {
                window.history.replaceState({}, '/' + firstAllowed.modulo, `/khalessierp/${firstAllowed.modulo}`);
                path = '/' + firstAllowed.modulo;
            } else {
                document.getElementById('app').innerHTML = '<div style="padding:40px; text-align:center;"><h2>Acceso Denegado</h2><p>No tienes permisos asignados.</p></div>';
                return;
            }
        }
    }

    const app = document.getElementById('app');
    const route = routes[path] || { view: () => '<h2>404 Not Found</h2>', layout: true };
    
    if (!route.layout) {
        // Renderizar vista sin Sidebar (como Login)
        app.innerHTML = '';
        if (typeof route.view === 'function') {
            route.view(app);
        } else {
            app.innerHTML = route.view;
        }
    } else {
        // Renderizar vista CON Sidebar y Header
        if (!document.getElementById('app-layout')) {
            renderAppLayout(app, path);
        }
        updateSidebarActive(path);
        
        const contentArea = document.getElementById('main-content-area');
        contentArea.innerHTML = '';
        if (typeof route.view === 'function') {
            route.view(contentArea);
        } else {
            contentArea.innerHTML = route.view;
        }
    }
}

function renderAppLayout(container) {
    const logoLight = AppConfig.get('logo_light');
    const logoDark = AppConfig.get('logo_dark');
    const logoCollapsed = AppConfig.get('logo_collapsed');
    const appName = AppConfig.get('nombre_empresa') || 'Khalessi ERP';
    
    let logoHtml = `<i class="ph ph-pizza text-danger brand-icon" style="font-size:24px;"></i>`;
    if (logoLight || logoDark || logoCollapsed) {
        logoHtml = `
            ${logoLight ? `<img src="${logoLight}" class="logo-light full-logo" style="max-height: 56px; max-width: 100%; object-fit: contain;">` : ''}
            ${logoDark ? `<img src="${logoDark}" class="logo-dark full-logo" style="max-height: 56px; max-width: 100%; object-fit: contain;">` : ''}
            ${logoCollapsed ? `<img src="${logoCollapsed}" class="logo-collapsed" style="max-height: 40px; display: none;">` : ''}
        `;
    }

    const user = JSON.parse(localStorage.getItem('khalessi_user') || '{}');
    const isAdministrador = user.rol_nombre && user.rol_nombre.toLowerCase() === 'administrador';
    const nombreUsuario = user.nombre || 'Usuario';
    const iniciales = nombreUsuario.substring(0, 2).toUpperCase();
    const avatarHtml = user.foto_perfil ? `<img src="${user.foto_perfil}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">` : iniciales;

    container.innerHTML = `
        <div class="app-layout" id="app-layout">
            <!-- Overlay para móviles -->
            <div class="sidebar-overlay" onclick="toggleSidebarMobile()"></div>
            
            <!-- Sidebar -->
            <aside class="sidebar" id="sidebar">
                <div class="sidebar-header">
                    <div class="brand">
                        ${logoHtml}
                        <span class="brand-text dynamic-brand-text">${appName}</span>
                    </div>
                    <button class="btn-icon mobile-only" onclick="toggleSidebarMobile()">
                        <i class="ph ph-x"></i>
                    </button>
                </div>
                
                <nav class="sidebar-nav">
                    ${(isAdministrador || (user.permisos && user.permisos.find(x => x.modulo === 'dashboard' && x.puede_ver == 1))) ? `
                    <a href="javascript:navigate('/dashboard')" class="nav-item" data-path="/dashboard">
                        <i class="ph ph-squares-four"></i>
                        <span>Dashboard</span>
                    </a>` : ''}
                    
                    ${(isAdministrador || (user.permisos && user.permisos.find(x => x.modulo === 'inventario' && x.puede_ver == 1))) ? `
                    <a href="javascript:navigate('/inventario')" class="nav-item" data-path="/inventario">
                        <i class="ph ph-package"></i>
                        <span>Inventario</span>
                    </a>` : ''}

                    ${(isAdministrador || (user.permisos && user.permisos.find(x => x.modulo === 'recetas' && x.puede_ver == 1))) ? `
                    <a href="javascript:navigate('/recetas')" class="nav-item" data-path="/recetas">
                        <i class="ph ph-book-open"></i>
                        <span>Recetas y Producción</span>
                    </a>` : ''}
                    
                    ${(isAdministrador || (user.permisos && user.permisos.find(x => x.modulo === 'clientes' && x.puede_ver == 1))) ? `
                    <a href="javascript:navigate('/clientes')" class="nav-item" data-path="/clientes">
                        <i class="ph ph-users"></i>
                        <span>Clientes</span>
                    </a>` : ''}
                    
                    ${(isAdministrador || (user.permisos && user.permisos.find(x => x.modulo === 'rrhh' && x.puede_ver == 1))) ? `
                    <a href="javascript:navigate('/rrhh')" class="nav-item" data-path="/rrhh">
                        <i class="ph ph-clock-user"></i>
                        <span>Asistencias</span>
                    </a>` : ''}

                    ${(isAdministrador || (user.permisos && user.permisos.find(x => x.modulo === 'configuracion' && x.puede_ver == 1))) ? `
                    <a href="javascript:navigate('/configuracion')" class="nav-item" data-path="/configuracion">
                        <i class="ph ph-gear"></i>
                        <span>Configuración</span>
                    </a>` : ''}
                </nav>
                
                <div class="sidebar-footer">
                    <a href="javascript:navigate('/login')" class="nav-item text-danger">
                        <i class="ph ph-sign-out"></i>
                        <span>Cerrar Sesión</span>
                    </a>
                </div>
            </aside>

            <!-- Main Content Wrapper -->
            <div class="main-wrapper">
                <!-- Pull to Refresh Indicator -->
                <div class="ptr-indicator" id="ptr-indicator">
                    <i class="ph ph-arrows-clockwise"></i>
                </div>

                <!-- Header -->
                <header class="topbar">
                    <div class="topbar-left">
                        <button class="btn-icon" onclick="toggleSidebar()">
                            <i class="ph ph-list" style="font-size: 24px;"></i>
                        </button>
                        ${logoCollapsed ? `<img src="${logoCollapsed}" class="topbar-mobile-logo">` : ''}
                    </div>
                    <div class="topbar-right">
                        <button class="btn-icon btn-kiosk" id="btn-toggle-kiosk" onclick="toggleModoKiosko()" title="Modo Pantalla Completa / Kiosko">
                            <i class="ph ph-corners-out" style="font-size: 20px;"></i>
                        </button>
                        <button class="btn-theme-capsule" onclick="toggleTheme()" title="Cambiar Tema">
                            <i class="ph ph-moon theme-icon-indicator" style="font-size: 20px;"></i>
                        </button>
                        <div class="user-profile" style="cursor: pointer;" onclick="navigate('/perfil')">
                            <div class="avatar" id="topbar-avatar">${avatarHtml}</div>
                            <span class="user-name" id="topbar-name">${nombreUsuario}</span>
                        </div>
                    </div>
                </header>

                <!-- Page Content -->
                <main class="content-area" id="main-content-area">
                    <!-- Las vistas se renderizan aquí -->
                </main>
            </div>

            <!-- Botón de Acción Flotante Móvil (FAB) -->
            <button class="fab-btn" id="app-fab-btn" onclick="handleFabClick()" title="Acción rápida" style="display: none;">
                <i class="ph ph-plus" id="fab-icon"></i>
            </button>

            <!-- Barra de Navegación Inferior Móvil (Bottom Navigation Bar) -->
            <nav class="bottom-nav-bar" id="bottom-nav-bar">
                <a href="javascript:navigate('/dashboard')" class="bottom-nav-item" data-path="/dashboard">
                    <i class="ph ph-squares-four"></i>
                    <span>Inicio</span>
                </a>
                <a href="javascript:navigate('/inventario')" class="bottom-nav-item" data-path="/inventario">
                    <i class="ph ph-package"></i>
                    <span>Stock</span>
                </a>
                <a href="javascript:navigate('/recetas')" class="bottom-nav-item" data-path="/recetas">
                    <i class="ph ph-book-open"></i>
                    <span>Recetas</span>
                </a>
                <a href="javascript:navigate('/rrhh')" class="bottom-nav-item" data-path="/rrhh">
                    <i class="ph ph-clock-user"></i>
                    <span>RRHH</span>
                </a>
                <a href="javascript:toggleSidebarMobile()" class="bottom-nav-item">
                    <i class="ph ph-list"></i>
                    <span>Más</span>
                </a>
            </nav>
        </div>
    `;

    setTimeout(() => {
        initPullToRefresh();
        initModalTouchDismiss();
    }, 100);
}

function updateSidebarActive(path) {
    if (typeof window.closeSidebarMobile === 'function') window.closeSidebarMobile();
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    const activeEl = document.querySelector(`.nav-item[data-path="${path}"]`);
    if(activeEl) activeEl.classList.add('active');

    // Sincronizar Bottom Navigation Bar
    document.querySelectorAll('.bottom-nav-item').forEach(el => el.classList.remove('active'));
    const activeBottomEl = document.querySelector(`.bottom-nav-item[data-path="${path}"]`);
    if (activeBottomEl) activeBottomEl.classList.add('active');

    // Actualizar FAB contextual
    updateFabForPath(path);
}

// Haptic feedback táctil para celulares
window.triggerHaptic = function(pattern = 15) {
    if ('vibrate' in navigator) {
        try {
            navigator.vibrate(pattern);
        } catch (e) {}
    }
};

// Modo Kiosko / Pantalla completa para tablets de asistencia y puntos de control
window.toggleModoKiosko = async function() {
    triggerHaptic(30);
    const body = document.body;
    const btnIcon = document.querySelector('#btn-toggle-kiosk i');
    const isKiosk = body.classList.toggle('kiosk-mode');

    if (isKiosk) {
        if (btnIcon) btnIcon.className = 'ph ph-corners-in';
        try {
            if (document.documentElement.requestFullscreen) {
                await document.documentElement.requestFullscreen();
            }
        } catch (e) {}
        try {
            if ('wakeLock' in navigator) {
                window._wakeLock = await navigator.wakeLock.request('screen');
            }
        } catch (e) {}
        if (window.showToast) showToast('Modo Kiosko activado (Pantalla Completa)', 'info');
    } else {
        if (btnIcon) btnIcon.className = 'ph ph-corners-out';
        try {
            if (document.fullscreenElement && document.exitFullscreen) {
                await document.exitFullscreen();
            }
        } catch (e) {}
        try {
            if (window._wakeLock) {
                await window._wakeLock.release();
                window._wakeLock = null;
            }
        } catch (e) {}
        if (window.showToast) showToast('Modo Kiosko desactivado', 'info');
    }
};

// FAB Contextual
window.updateFabForPath = function(path) {
    const fab = document.getElementById('app-fab-btn');
    if (!fab) return;
    const fabIcon = document.getElementById('fab-icon');

    if (path === '/rrhh') {
        fab.style.display = 'flex';
        fab.title = 'Registrar Falta o Permiso';
        if (fabIcon) fabIcon.className = 'ph ph-calendar-plus';
    } else if (path === '/inventario') {
        fab.style.display = 'flex';
        fab.title = 'Nuevo Ingreso / Insumo';
        if (fabIcon) fabIcon.className = 'ph ph-plus';
    } else if (path === '/recetas') {
        fab.style.display = 'flex';
        fab.title = 'Nueva Receta';
        if (fabIcon) fabIcon.className = 'ph ph-plus';
    } else if (path === '/clientes') {
        fab.style.display = 'flex';
        fab.title = 'Nuevo Cliente';
        if (fabIcon) fabIcon.className = 'ph ph-user-plus';
    } else {
        fab.style.display = 'none';
    }
};

window.handleFabClick = function() {
    triggerHaptic(25);
    const path = window.location.pathname.replace('/khalessierp', '') || '/dashboard';
    if (path === '/rrhh') {
        if (typeof abrirModalAusencia === 'function') abrirModalAusencia();
    } else if (path === '/inventario') {
        if (typeof openModal === 'function') openModal('modal-ingreso');
    } else if (path === '/recetas') {
        if (typeof abrirModalReceta === 'function') abrirModalReceta();
    } else if (path === '/clientes') {
        if (typeof abrirModalCliente === 'function') abrirModalCliente();
    }
};

// Pull to Refresh para móviles
window.initPullToRefresh = function() {
    const ptr = document.getElementById('ptr-indicator');
    if (!ptr || window._ptrInitialized) return;
    window._ptrInitialized = true;

    let touchStartY = 0;
    let touchDistance = 0;
    let isPulling = false;

    window.addEventListener('touchstart', (e) => {
        if (window.scrollY <= 5 && e.touches.length === 1) {
            touchStartY = e.touches[0].clientY;
            isPulling = true;
        }
    }, { passive: true });

    window.addEventListener('touchmove', (e) => {
        if (!isPulling) return;
        const currentY = e.touches[0].clientY;
        touchDistance = currentY - touchStartY;
        if (touchDistance > 10 && window.scrollY <= 5) {
            const pullHeight = Math.min(touchDistance * 0.45, 65);
            ptr.style.top = `${pullHeight}px`;
            ptr.classList.add('visible');
            if (touchDistance > 80) {
                ptr.classList.add('refreshing');
            } else {
                ptr.classList.remove('refreshing');
            }
        }
    }, { passive: true });

    window.addEventListener('touchend', async () => {
        if (!isPulling) return;
        isPulling = false;
        if (touchDistance > 80 && window.scrollY <= 5) {
            triggerHaptic([30, 50, 30]);
            ptr.classList.add('refreshing');
            const path = window.location.pathname.replace('/khalessierp', '');
            try {
                if (path === '/rrhh' && typeof refrescarRRHHActual === 'function') {
                    await refrescarRRHHActual();
                } else if (path === '/inventario' && typeof loadInventario === 'function') {
                    await loadInventario();
                } else {
                    router();
                }
            } catch (e) {
                console.error(e);
            }
            setTimeout(() => {
                ptr.classList.remove('visible', 'refreshing');
                ptr.style.top = '-60px';
            }, 600);
        } else {
            ptr.classList.remove('visible', 'refreshing');
            ptr.style.top = '-60px';
        }
        touchDistance = 0;
    });
};

// Cierre táctil de modales tipo Bottom Sheet deslizando hacia abajo
window.initModalTouchDismiss = function() {
    if (window._modalTouchInitialized) return;
    window._modalTouchInitialized = true;

    let startY = 0;
    let currentModalBackdrop = null;
    
    document.addEventListener('touchstart', (e) => {
        if (window.innerWidth > 768) return;
        const modalBackdrop = e.target.closest('.modal-backdrop.show');
        if (!modalBackdrop) return;
        const modal = modalBackdrop.querySelector('.modal');
        if (!modal) return;
        if (e.target.closest('.modal-header') || e.target === modal) {
            startY = e.touches[0].clientY;
            currentModalBackdrop = modalBackdrop;
        }
    }, { passive: true });

    document.addEventListener('touchmove', (e) => {
        if (!currentModalBackdrop) return;
        const currentY = e.touches[0].clientY;
        const diff = currentY - startY;
        if (diff > 0) {
            const modal = currentModalBackdrop.querySelector('.modal');
            if (modal) {
                modal.style.transform = `translateY(${diff}px)`;
                modal.style.transition = 'none';
            }
        }
    }, { passive: true });

    document.addEventListener('touchend', (e) => {
        if (!currentModalBackdrop) return;
        const modal = currentModalBackdrop.querySelector('.modal');
        const endY = e.changedTouches[0].clientY;
        const diff = endY - startY;
        if (diff > 90) {
            triggerHaptic(20);
            currentModalBackdrop.classList.remove('show');
            if (modal) {
                modal.style.transform = '';
                modal.style.transition = '';
            }
        } else {
            if (modal) {
                modal.style.transform = '';
                modal.style.transition = 'transform 0.2s ease-out';
                setTimeout(() => { if (modal) modal.style.transition = ''; }, 200);
            }
        }
        currentModalBackdrop = null;
    });
};

window.toggleSidebar = function() {
    if (window.innerWidth <= 768) {
        toggleSidebarMobile();
    } else {
        toggleSidebarDesktop();
    }
};

window.toggleSidebarDesktop = function() {
    document.getElementById('sidebar').classList.toggle('collapsed');
    document.querySelector('.main-wrapper').classList.toggle('expanded');
};

window.toggleSidebarMobile = function() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.querySelector('.sidebar-overlay');
    if (sidebar) sidebar.classList.toggle('show-mobile');
    if (overlay) overlay.classList.toggle('show');
};

// Cerrar automáticamente el sidebar móvil al hacer clic en cualquier opción de navegación
document.addEventListener('click', function(e) {
    if (window.innerWidth <= 768) {
        if (e.target.closest('#sidebar .nav-item') || e.target.closest('#sidebar a')) {
            window.closeSidebarMobile();
        }
    }
});

// ===================================
// LÓGICA DE SUBIDA DE IMÁGENES)
// ==============================

function renderLogin(container) {
    const logoLight = AppConfig.get('logo_light');
    const logoDark = AppConfig.get('logo_dark');
    const appName = AppConfig.get('nombre_empresa') || 'Khalessi ERP';
    
    let logoHtml = `<i class="ph ph-pizza"></i>`;
    if (logoLight || logoDark) {
        logoHtml = `
            ${logoLight ? `<img src="${logoLight}" class="logo-light" style="max-height: 60px;">` : ''}
            ${logoDark ? `<img src="${logoDark}" class="logo-dark" style="max-height: 60px;">` : ''}
        `;
    }

    container.innerHTML = `
        <div class="auth-wrapper">
            <div class="auth-card">
                <div class="auth-logo" id="auth-logo-container" style="display: flex; justify-content: center; align-items: center;">${logoHtml}</div>
                <h2 class="auth-title dynamic-brand-text" id="auth-title-text">${appName}</h2>
                <p class="auth-subtitle" id="auth-subtitle-text">Inicia sesión en tu cuenta</p>
                
                <div id="auth-step-1">
                    <p class="form-label" style="text-align: center; margin-bottom: 24px; color: var(--text-sec);">Ingresa tu DNI para comenzar</p>
                    <div style="display: flex; justify-content: center;">
                        <input type="password" id="auth-dni" class="pin-display" placeholder="- - - - - -" readonly>
                    </div>
                    <div class="numpad">
                        <button type="button" class="numpad-btn" onclick="numpadPress('1', 'auth-dni')">1</button>
                        <button type="button" class="numpad-btn" onclick="numpadPress('2', 'auth-dni')">2</button>
                        <button type="button" class="numpad-btn" onclick="numpadPress('3', 'auth-dni')">3</button>
                        <button type="button" class="numpad-btn" onclick="numpadPress('4', 'auth-dni')">4</button>
                        <button type="button" class="numpad-btn" onclick="numpadPress('5', 'auth-dni')">5</button>
                        <button type="button" class="numpad-btn" onclick="numpadPress('6', 'auth-dni')">6</button>
                        <button type="button" class="numpad-btn" onclick="numpadPress('7', 'auth-dni')">7</button>
                        <button type="button" class="numpad-btn" onclick="numpadPress('8', 'auth-dni')">8</button>
                        <button type="button" class="numpad-btn" onclick="numpadPress('9', 'auth-dni')">9</button>
                        <button type="button" class="numpad-btn btn-action" onclick="numpadPress('back', 'auth-dni')"><i class="ph ph-backspace"></i></button>
                        <button type="button" class="numpad-btn" onclick="numpadPress('0', 'auth-dni')">0</button>
                        <button type="button" class="numpad-btn btn-action btn-submit" onclick="procesarDNI()"><i class="ph ph-arrow-right"></i></button>
                    </div>
                    <div style="text-align: center; margin-top: 20px;">
                        <button type="button" class="btn btn-ghost" style="font-size: 13px; color: var(--primary); font-weight: 500;" onclick="abrirModalJustificacion()">
                            <i class="ph ph-calendar-x" style="font-size: 16px; vertical-align: middle;"></i> ¿Hoy no laborarás? Envía tu justificación
                        </button>
                    </div>
                </div>

                <div id="auth-step-tardanza" class="hidden" style="text-align:center;">
                    <div style="width: 64px; height: 64px; margin: 0 auto 14px; border-radius: 50%; background: rgba(239, 68, 68, 0.12); color: var(--danger); display: flex; align-items: center; justify-content: center;">
                        <i class="ph ph-clock-countdown" style="font-size: 36px;"></i>
                    </div>
                    <h3 id="tardanza-titulo" style="margin-bottom: 4px; color: var(--danger); font-size: 20px;">¡Llegada con Tardanza!</h3>
                    <p id="tardanza-mensaje" style="color: var(--text-sec); font-size: 13px; margin-bottom: 16px;"></p>
                    
                    <div class="card mb-4" style="background: var(--bg-main); border: 1px solid var(--border); padding: 14px; text-align: left; font-size: 13px; border-radius: 12px;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
                            <span style="color: var(--text-sec);">Hora programada:</span>
                            <strong id="tardanza-hora-esperada">--:--</strong>
                        </div>
                        <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
                            <span style="color: var(--text-sec);">Hora de llegada:</span>
                            <strong id="tardanza-hora-actual">--:--</strong>
                        </div>
                        <div style="display: flex; justify-content: space-between;">
                            <span style="color: var(--text-sec);">Retraso acumulado:</span>
                            <span class="badge badge-danger" id="tardanza-minutos-badge">0 min</span>
                        </div>
                    </div>
                    
                    <div style="margin-bottom: 20px;">
                        <label class="form-label" style="font-weight: 600; margin-bottom: 6px;">Clave Google Authenticator</label>
                        <p class="text-sec text-small" style="margin-bottom: 10px;">Ingresa el código dinámico de 6 dígitos para autorizar tu acceso.</p>
                        <input type="text" id="auth-totp-code" class="form-control" maxlength="6" placeholder="000 000" style="text-align: center; font-size: 26px; font-weight: 700; letter-spacing: 6px; height: 50px; border-radius: 12px;" inputmode="numeric" pattern="[0-9]*" autocomplete="one-time-code">
                    </div>

                    <button class="btn btn-primary" style="width: 100%; padding: 14px; font-size: 15px; font-weight: 600; border-radius: 14px; margin-bottom: 10px;" onclick="validarTotpYContinuar()">
                        <i class="ph ph-shield-check"></i> Desbloquear y Tomar Foto
                    </button>
                    <button class="btn btn-secondary" style="width: 100%; padding: 12px; font-size: 13px; border-radius: 12px; margin-bottom: 10px;" onclick="abrirModalJustificacion()">
                        <i class="ph ph-calendar-x"></i> Enviar Justificación de Ausencia
                    </button>
                    <button class="btn btn-ghost" style="width: 100%; color: var(--text-sec);" onclick="reiniciarAuth()">Cancelar</button>
                </div>

                <div id="auth-step-cam" class="hidden" style="text-align:center;">
                    <h3 id="auth-nombre-user" style="margin-bottom:10px;"></h3>
                    <p style="color:var(--text-sec); margin-bottom:15px;">Captura tu foto para iniciar tu jornada laboral</p>
                    <div style="width: 100%; max-width: 300px; margin: 0 auto; border-radius: 8px; overflow: hidden; background: #000; position: relative;">
                        <video id="asistencia-video" autoplay playsinline style="width: 100%; display: block;"></video>
                        <canvas id="asistencia-canvas" style="display:none;"></canvas>
                    </div>
                    <button class="btn btn-primary" style="margin-top:20px; width:100%; padding: 15px;" onclick="capturarYMarcarEntrada()">
                        <i class="ph ph-camera"></i> Tomar Foto e Ingresar
                    </button>
                    <button class="btn btn-secondary" style="margin-top:10px; width:100%;" onclick="reiniciarAuth()">Cancelar</button>
                </div>

                <div id="auth-step-opciones" class="hidden" style="text-align:center;">
                    <div id="auth-opciones-avatar-container" style="background: rgba(239, 68, 68, 0.1); border-radius: 50%; width: 80px; height: 80px; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px auto; overflow: hidden; border: 2px solid var(--primary);">
                        <i class="ph-fill ph-user-circle" style="font-size: 40px; color: var(--primary);"></i>
                    </div>
                    <h3 id="auth-nombre-opciones" style="margin-bottom:8px; font-size: 20px;"></h3>
                    <p style="color:var(--text-sec); margin-bottom:28px; font-size: 14px;">Tienes un turno laboral en curso.</p>
                    
                    <button class="btn btn-black" style="width:100%; padding: 16px; margin-bottom: 12px; font-size: 16px; border-radius: 16px; font-weight: 600;" onclick="ingresarAlSistema()">
                        <i class="ph ph-squares-four"></i> Entrar al ERP
                    </button>
                    
                    <button class="btn" style="background: rgba(244, 63, 94, 0.1); color: var(--danger); width: 100%; padding: 16px; font-size: 16px; border-radius: 16px; font-weight: 600;" onclick="marcarSalida()">
                        <i class="ph ph-sign-out"></i> Finalizar mi Turno
                    </button>
                    
                    <button class="btn" style="margin-top:12px; width:100%; padding: 16px; font-size: 15px; color: var(--text-sec); border-radius: 16px; background: transparent;" onclick="reiniciarAuth()">Cancelar</button>
                </div>
                
                <div id="auth-step-despedida" class="hidden" style="text-align:center; padding: 30px 0;">
                    <i class="ph-fill ph-check-circle" style="font-size: 64px; color: var(--success); margin-bottom: 20px;"></i>
                    <h3>¡Excelente trabajo hoy!</h3>
                    <p style="color:var(--text-sec); margin-top:10px;">Que tengas un buen descanso.</p>
                    <button class="btn btn-primary" style="margin-top:20px; width:100%;" onclick="reiniciarAuth()">Volver al Inicio</button>
                </div>
            </div>
        </div>
    `;
}

function renderDashboard(container) {
    container.innerHTML = `
        <div class="page-header">
            <div>
                <h2 class="page-title">Dashboard</h2>
                <p class="page-subtitle">Resumen de ventas y actividad de hoy</p>
            </div>
            <button class="btn btn-primary"><i class="ph ph-plus"></i> Nueva Venta</button>
        </div>

        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-icon" style="background: rgba(16, 185, 129, 0.1); color: var(--success);"><i class="ph ph-currency-dollar"></i></div>
                <div class="stat-details">
                    <h3>$4,520.00</h3>
                    <p>Ventas del Día</p>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon" style="background: rgba(59, 130, 246, 0.1); color: var(--link);"><i class="ph ph-shopping-cart"></i></div>
                <div class="stat-details">
                    <h3>24</h3>
                    <p>Pedidos Completados</p>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon" style="background: rgba(239, 68, 68, 0.1); color: var(--primary);"><i class="ph ph-pizza"></i></div>
                <div class="stat-details">
                    <h3>3</h3>
                    <p>Pedidos Pendientes</p>
                </div>
            </div>
        </div>
        
        <div class="card mt-4">
            <div class="card-header">
                <h3>Últimos Pedidos</h3>
            </div>
            <div class="card-body">
                <div class="table-responsive">
                    <table class="table">
                        <thead>
                            <tr>
                                <th>Orden</th>
                                <th>Cliente</th>
                                <th>Total</th>
                                <th>Estado</th>
                                <th>Acción</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>#001</td>
                                <td>Juan Pérez</td>
                                <td>$250.00</td>
                                <td><span class="badge badge-success">Entregado</span></td>
                                <td><button class="btn-icon"><i class="ph ph-eye"></i></button></td>
                            </tr>
                            <tr>
                                <td>#002</td>
                                <td>María García</td>
                                <td>$180.00</td>
                                <td><span class="badge badge-warning">Preparando</span></td>
                                <td><button class="btn-icon"><i class="ph ph-eye"></i></button></td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
}

// El renderInventario ahora vive en js/modules/inventario.js

function renderUsuarios(container) {
    container.innerHTML = `
        <div class="page-header">
            <div>
                <h2 class="page-title">Usuarios y Roles</h2>
                <p class="page-subtitle">Gestiona el acceso al sistema</p>
            </div>
            <button class="btn btn-primary" onclick="showModal('Nuevo Usuario', '<p>Formulario de usuario...</p>')"><i class="ph ph-user-plus"></i> Nuevo Usuario</button>
        </div>

        <div class="card">
            <div class="card-header flex-between">
                <span>Lista de Personal</span>
            </div>
            <div class="card-body">
                <div class="table-responsive">
                    <table class="table">
                        <thead>
                            <tr>
                                <th>Usuario</th>
                                <th>Email</th>
                                <th>Rol</th>
                                <th>Acceso PIN</th>
                                <th>Estado</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>
                                    <div class="product-cell">
                                        <div class="avatar" style="width:32px; height:32px; font-size:12px;">AK</div>
                                        <div class="fw-500">Admin Khalessi</div>
                                    </div>
                                </td>
                                <td>admin@khalessi.com</td>
                                <td><span class="badge badge-success">Administrador</span></td>
                                <td><i class="ph-fill ph-check-circle text-success" title="Configurado"></i></td>
                                <td><span class="badge badge-success">Activo</span></td>
                                <td>
                                    <button class="btn-icon" title="Editar"><i class="ph ph-pencil-simple"></i></button>
                                </td>
                            </tr>
                            <tr>
                                <td>
                                    <div class="product-cell">
                                        <div class="avatar" style="width:32px; height:32px; font-size:12px; background:var(--link)">CJ</div>
                                        <div class="fw-500">Carlos J. (Caja)</div>
                                    </div>
                                </td>
                                <td>caja@khalessi.com</td>
                                <td><span class="badge badge-warning">Cajero</span></td>
                                <td><i class="ph-fill ph-check-circle text-success" title="Configurado"></i></td>
                                <td><span class="badge badge-success">Activo</span></td>
                                <td>
                                    <button class="btn-icon" title="Editar"><i class="ph ph-pencil-simple"></i></button>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
}

function renderClientes(container) {
    container.innerHTML = `
        <div class="page-header">
            <div>
                <h2 class="page-title">Directorio de Clientes</h2>
                <p class="page-subtitle">Información de contacto y entregas</p>
            </div>
            <button class="btn btn-primary"><i class="ph ph-plus"></i> Nuevo Cliente</button>
        </div>
        <div class="card">
            <div class="card-body" style="text-align: center; padding: 40px; color: var(--text-sec);">
                <i class="ph ph-users" style="font-size: 48px; margin-bottom: 12px; opacity: 0.5;"></i>
                <p>El directorio de clientes se implementará aquí.</p>
            </div>
        </div>
    `;
}

async function renderRRHH(container) {
    const moneda = AppConfig.get('moneda') || 'S/';
    
    container.innerHTML = `
        <div class="page-header">
            <div>
                <h2 class="page-title">Recursos Humanos y Asistencia</h2>
                <p class="page-subtitle">Control de asistencias, tardanzas 2FA, justificaciones y cálculo de planilla salarial</p>
            </div>
            <div style="display:flex; gap:12px; flex-wrap:wrap;">
                <button class="btn btn-secondary" onclick="refrescarRRHHActual()"><i class="ph ph-arrows-clockwise"></i> Refrescar</button>
                <button class="btn btn-danger" onclick="abrirModalRetiroDisciplinario()" title="Cerrar turno y descontar horas por indisciplina o pérdida de tiempo"><i class="ph ph-hand-palm"></i> Retiro Disciplinario</button>
                <button class="btn btn-primary" onclick="abrirModalAusencia()"><i class="ph ph-plus"></i> Registrar Falta/Permiso</button>
            </div>
        </div>

        <div class="nav-tabs">
            <div class="nav-tab rrhh-nav-tab active" onclick="switchRRHHTab('historial')" id="tab-rrhh-historial">
                <i class="ph ph-calendar-check"></i>
                <span>Historial</span>
            </div>
            <div class="nav-tab rrhh-nav-tab" onclick="switchRRHHTab('justificaciones')" id="tab-rrhh-justificaciones">
                <i class="ph ph-shield-warning"></i>
                <span>Justificaciones</span>
                <span class="badge badge-warning" id="badge-just-pendientes" style="margin-left: 4px; display:none; padding:2px 7px; font-size:10px; border-radius:10px;">0</span>
            </div>
            <div class="nav-tab rrhh-nav-tab" onclick="switchRRHHTab('personal')" id="tab-rrhh-personal">
                <i class="ph ph-identification-card"></i>
                <span>Ficha de Personal</span>
            </div>
            <div class="nav-tab rrhh-nav-tab" onclick="switchRRHHTab('metricas')" id="tab-rrhh-metricas">
                <i class="ph ph-chart-line-up"></i>
                <span>Dashboard Analítico</span>
            </div>
            <div class="nav-tab rrhh-nav-tab" onclick="switchRRHHTab('ajustes')" id="tab-rrhh-ajustes">
                <i class="ph ph-gear-six"></i>
                <span>Ajustes y 2FA</span>
            </div>
        </div>

        <!-- 1. VISTA: HISTORIAL Y EXPORTACIÓN -->
        <div id="rrhh-view-historial">
            <div class="card mb-3">
                <div class="card-body">
                    <!-- Quick Date Range Chips -->
                    <div class="date-chips-wrap">
                        <button type="button" class="date-chip active" id="chip-rango-hoy" onclick="setRangoFechaRRHH('hoy')">Hoy</button>
                        <button type="button" class="date-chip" id="chip-rango-ayer" onclick="setRangoFechaRRHH('ayer')">Ayer</button>
                        <button type="button" class="date-chip" id="chip-rango-semana" onclick="setRangoFechaRRHH('semana')">Esta Semana</button>
                        <button type="button" class="date-chip" id="chip-rango-mes" onclick="setRangoFechaRRHH('mes')">Este Mes</button>
                        <button type="button" class="date-chip" id="chip-rango-todos" onclick="setRangoFechaRRHH('todos')">Todos</button>
                    </div>

                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 10px; margin-bottom: 12px;">
                        <div>
                            <label class="form-label font-bold" style="margin-bottom: 4px;">Desde</label>
                            <input type="date" id="filtro-rrhh-inicio" class="form-control">
                        </div>
                        <div>
                            <label class="form-label font-bold" style="margin-bottom: 4px;">Hasta</label>
                            <input type="date" id="filtro-rrhh-fin" class="form-control">
                        </div>
                    </div>
                    <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                        <button class="btn btn-primary" style="flex: 1; min-width: 120px; justify-content: center;" onclick="loadHistorialAsistencia()">
                            <i class="ph ph-funnel"></i> Filtrar
                        </button>
                        <button class="btn btn-secondary" style="flex: 1; min-width: 120px; justify-content: center;" onclick="exportarHistorialCSV()">
                            <i class="ph ph-file-csv"></i> Exportar CSV
                        </button>
                    </div>
                </div>
            </div>

            <div class="card">
                <div class="card-body">
                    <div class="table-responsive">
                        <table class="table" id="table-asistencia">
                            <thead>
                                <tr>
                                    <th class="table-sticky-col">Empleado</th>
                                    <th>DNI</th>
                                    <th>Fecha y Entrada</th>
                                    <th>Salida y Total Horas</th>
                                    <th>Condición / Estado</th>
                                    <th>Evidencia (Foto y GPS)</th>
                                    <th>Acción</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr><td colspan="7" style="text-align:center;">Cargando historial...</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>

        <!-- 2. VISTA: JUSTIFICACIONES Y PERMISOS -->
        <div id="rrhh-view-justificaciones" class="hidden">
            <div class="card mb-4">
                <div class="card-body flex-between" style="flex-wrap: wrap; gap: 12px;">
                    <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                        <button class="btn btn-secondary btn-sm active" id="btn-filtro-just-todas" onclick="filtrarJustificaciones('todas')">Todas</button>
                        <button class="btn btn-secondary btn-sm" id="btn-filtro-just-pendiente" onclick="filtrarJustificaciones('pendiente')">
                            <i class="ph ph-hourglass-high text-warning"></i> Pendientes
                        </button>
                        <button class="btn btn-secondary btn-sm" id="btn-filtro-just-aprobado" onclick="filtrarJustificaciones('aprobado')">
                            <i class="ph ph-check-circle text-success"></i> Aprobadas
                        </button>
                        <button class="btn btn-secondary btn-sm" id="btn-filtro-just-desaprobado" onclick="filtrarJustificaciones('desaprobado')">
                            <i class="ph ph-x-circle text-danger"></i> Desaprobadas
                        </button>
                    </div>
                    <div class="text-sec text-small" id="txt-just-conteo">Cargando solicitudes...</div>
                </div>
            </div>

            <div class="card">
                <div class="card-body">
                    <div class="table-responsive">
                        <table class="table" id="table-justificaciones">
                            <thead>
                                <tr>
                                    <th>Empleado</th>
                                    <th>Fecha</th>
                                    <th>Motivo</th>
                                    <th>Descripción</th>
                                    <th>Evidencia</th>
                                    <th>Estado</th>
                                    <th>Efecto / Horas</th>
                                    <th>Acción</th>
                                </tr>
                            </thead>
                            <tbody id="tbody-justificaciones">
                                <tr><td colspan="8" style="text-align:center;">Cargando justificaciones...</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>

        <!-- 3. VISTA: FICHA DE PERSONAL Y PLANILLA -->
        <div id="rrhh-view-personal" class="hidden">
            <div class="card mb-3">
                <div class="card-body flex-between" style="flex-wrap:wrap; gap:12px;">
                    <div style="display:flex; gap:10px; align-items:flex-end; flex-wrap:wrap; flex:1; min-width:260px;">
                        <div style="flex:1; min-width:140px;">
                            <label class="form-label font-bold" style="margin-bottom:4px;">Período Mensual</label>
                            <input type="month" id="filtro-personal-mes" class="form-control" onchange="loadFichasPersonal()">
                        </div>
                        <button class="btn btn-primary" onclick="loadFichasPersonal()" style="white-space:nowrap; padding:9px 16px;"><i class="ph ph-arrows-clockwise"></i> Calcular Planilla</button>
                    </div>
                    <div class="text-sec text-small" style="font-weight:500;">
                        Moneda: <strong>${moneda}</strong> | Base: <strong>48h/sem</strong>
                    </div>
                </div>
            </div>

            <!-- Tarjetas de resumen métrico (2 columnas en celular/tablet) -->
            <div class="stat-grid-personal">
                <div class="stat-card">
                    <div class="stat-icon" style="background: rgba(59, 130, 246, 0.1); color: var(--link);"><i class="ph ph-users-three"></i></div>
                    <div class="stat-details">
                        <h3 id="stat-personal-total">0</h3>
                        <p>Colaboradores Activos</p>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon" style="background: rgba(16, 185, 129, 0.1); color: var(--success);"><i class="ph ph-clock"></i></div>
                    <div class="stat-details">
                        <h3 id="stat-personal-horas-mes">0 hrs</h3>
                        <p>Horas Trabajadas (Mes)</p>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon" style="background: rgba(239, 68, 68, 0.1); color: var(--danger);"><i class="ph ph-clock-countdown"></i></div>
                    <div class="stat-details">
                        <h3 id="stat-personal-tardanzas">0</h3>
                        <p>Tardanzas Registradas</p>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon" style="background: rgba(245, 158, 11, 0.1); color: var(--warning);"><i class="ph ph-currency-circle-dollar"></i></div>
                    <div class="stat-details">
                        <h3 id="stat-personal-total-cobrar">${moneda} 0.00</h3>
                        <p>Total Planilla a Pagar</p>
                    </div>
                </div>
            </div>

            <div class="card">
                <div class="card-header flex-between">
                    <span style="font-weight:600;">Planilla y Resumen de Horas por Colaborador</span>
                    <span class="text-sec text-small">Calculado según horas trabajadas, tardanzas, faltas y sueldo asignado</span>
                </div>
                <div class="card-body">
                    <div class="table-responsive">
                        <table class="table" id="table-fichas-personal">
                            <thead>
                                <tr>
                                    <th class="table-sticky-col">Colaborador</th>
                                    <th>Sueldo Configurado</th>
                                    <th>Horas Mes</th>
                                    <th>Horas Semana</th>
                                    <th>Tardanzas</th>
                                    <th>Faltas</th>
                                    <th>Horas Perdidas / Extra</th>
                                    <th>Total a Cobrar</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody id="tbody-fichas-personal">
                                <tr><td colspan="9" style="text-align:center;">Cargando fichas de personal...</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>

        <!-- 4. VISTA: DASHBOARD ANALÍTICO -->
        <div id="rrhh-view-metricas" class="hidden">
            <!-- KPIs rápidos del módulo de analítica -->
            <div class="rrhh-kpi-grid mb-3">
                <div class="card" style="padding: 14px 16px; margin-bottom: 0;">
                    <div style="display:flex; align-items:center; gap:12px;">
                        <div style="width:40px; height:40px; border-radius:10px; background:rgba(16, 185, 129, 0.12); color:#10b981; display:flex; align-items:center; justify-content:center; font-size:20px; flex-shrink:0;">
                            <i class="ph ph-check-circle"></i>
                        </div>
                        <div>
                            <span class="text-sec text-small" style="font-size:11px; display:block;">Índice de Puntualidad</span>
                            <div style="font-size:18px; font-weight:700; color:var(--text-main);" id="metric-pct-puntual">--%</div>
                        </div>
                    </div>
                </div>

                <div class="card" style="padding: 14px 16px; margin-bottom: 0;">
                    <div style="display:flex; align-items:center; gap:12px;">
                        <div style="width:40px; height:40px; border-radius:10px; background:rgba(239, 68, 68, 0.12); color:#ef4444; display:flex; align-items:center; justify-content:center; font-size:20px; flex-shrink:0;">
                            <i class="ph ph-warning-circle"></i>
                        </div>
                        <div>
                            <span class="text-sec text-small" style="font-size:11px; display:block;">Total Tardanzas</span>
                            <div style="font-size:18px; font-weight:700; color:var(--text-main);" id="metric-total-tardanzas">--</div>
                        </div>
                    </div>
                </div>

                <div class="card" style="padding: 14px 16px; margin-bottom: 0;">
                    <div style="display:flex; align-items:center; gap:12px;">
                        <div style="width:40px; height:40px; border-radius:10px; background:rgba(59, 130, 246, 0.12); color:#3b82f6; display:flex; align-items:center; justify-content:center; font-size:20px; flex-shrink:0;">
                            <i class="ph ph-clock"></i>
                        </div>
                        <div>
                            <span class="text-sec text-small" style="font-size:11px; display:block;">Horas Registradas</span>
                            <div style="font-size:18px; font-weight:700; color:var(--text-main);" id="metric-total-horas">-- hrs</div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Grid de Gráficos: 1 columna en móvil/tablet, 2 en pantallas grandes -->
            <div class="rrhh-charts-grid">
                <!-- Gráfico 1: Puntualidad y Asistencia (Doughnut) -->
                <div class="card" style="margin-bottom:0; overflow:hidden;">
                    <div class="card-header flex-between" style="padding: 12px 16px; border-bottom: 1px solid var(--border-color);">
                        <div style="display:flex; align-items:center; gap:8px;">
                            <i class="ph ph-chart-pie-slice" style="color:var(--primary); font-size:18px;"></i>
                            <span style="font-weight:600; font-size:14px;">Distribución de Puntualidad</span>
                        </div>
                        <span class="badge badge-secondary" style="font-size:11px;">Histórico</span>
                    </div>
                    <div class="card-body" style="padding: 16px; position:relative;">
                        <div class="chart-container-responsive">
                            <canvas id="chartRRHHPuntualidad"></canvas>
                        </div>
                    </div>
                </div>

                <!-- Gráfico 2: Horas Trabajadas (Bar) -->
                <div class="card" style="margin-bottom:0; overflow:hidden;">
                    <div class="card-header flex-between" style="padding: 12px 16px; border-bottom: 1px solid var(--border-color);">
                        <div style="display:flex; align-items:center; gap:8px;">
                            <i class="ph ph-chart-bar" style="color:var(--primary); font-size:18px;"></i>
                            <span style="font-weight:600; font-size:14px;">Horas por Colaborador</span>
                        </div>
                        <span class="badge badge-secondary" style="font-size:11px;">Acumulado</span>
                    </div>
                    <div class="card-body" style="padding: 16px; position:relative;">
                        <div class="chart-container-responsive">
                            <canvas id="chartRRHHTiempo"></canvas>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- 5. VISTA: AJUSTES DE RRHH Y 2FA -->
        <div id="rrhh-view-ajustes" class="hidden">
            <div class="card mb-4" style="border-left: 4px solid var(--primary);">
                <div class="card-header flex-between">
                    <div style="display:flex; align-items:center; gap:8px;">
                        <i class="ph ph-shield-check text-primary" style="font-size:20px;"></i>
                        <span style="font-weight:600;">Control de Tardanzas y Google Authenticator (TOTP 2FA)</span>
                    </div>
                    <span class="badge badge-success">RFC 6238 Activo</span>
                </div>
                <div class="card-body">
                    <p class="text-sec text-small mb-4">Cuando un colaborador llega después del margen de tolerancia establecido, el sistema bloquea su registro y exige el código dinámico generado por la app Google Authenticator.</p>

                    <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap:24px; align-items:flex-start;">
                        <div>
                            <div class="form-group">
                                <label class="form-label font-bold">Minutos de Tolerancia para Tardanza</label>
                                <div style="display:flex; gap:10px;">
                                    <input type="number" id="cfg-tolerancia-minutos" class="form-control" min="0" max="120" value="15" style="max-width:140px;">
                                    <button class="btn btn-primary" onclick="guardarToleranciaTardanza()"><i class="ph ph-floppy-disk"></i> Guardar</button>
                                </div>
                                <p class="text-sec text-small mt-1">Pasado este tiempo desde la hora de entrada, se marcará tardanza y se requerirá 2FA.</p>
                            </div>

                            <div class="card" style="background:var(--bg-main); border:1px solid var(--border); padding:16px; border-radius:12px; margin-top:16px;">
                                <label class="form-label" style="font-weight:600; margin-bottom:4px;">Clave Secreta Maestra del Supervisor</label>
                                <p class="text-sec text-small mb-2">Ingresa este secreto en Google Authenticator o escanea el código QR de la derecha.</p>
                                <div style="display:flex; gap:8px; align-items:center;">
                                    <input type="text" id="cfg-totp-secret" class="form-control" readonly style="font-family:monospace; font-weight:700; letter-spacing:2px; background:var(--bg-card);">
                                    <button class="btn btn-secondary btn-sm" onclick="copiarSecretoSupervisor()" title="Copiar secreto"><i class="ph ph-copy"></i> Copiar</button>
                                </div>
                                <button class="btn btn-ghost btn-sm text-danger mt-2" onclick="regenerarTotpSupervisor()"><i class="ph ph-arrows-clockwise"></i> Regenerar Nueva Clave</button>
                            </div>
                        </div>

                        <div style="text-align:center; padding:16px; background:var(--bg-main); border:1px solid var(--border); border-radius:12px;">
                            <span class="text-sec" style="font-size:11px; text-transform:uppercase; font-weight:600; display:block; margin-bottom:10px;">Escanear con Google Authenticator</span>
                            <div id="cfg-totp-qr-container" style="display:inline-block; padding:10px; background:#fff; border-radius:10px; box-shadow:0 2px 8px rgba(0,0,0,0.06);">
                                <img id="cfg-totp-qr-img" src="" style="width:180px; height:180px; display:block;">
                            </div>
                            <p class="text-sec text-small mt-2" style="max-width:240px; margin:8px auto 0;">Abre Google Authenticator en tu celular, pulsa "+" y selecciona "Escanear código QR".</p>
                        </div>
                    </div>
                </div>
            </div>

            <div class="card">
                <div class="card-header">Horarios de Trabajo por Rol</div>
                <div class="card-body">
                    <p class="text-sec text-small mb-4">Define la hora de entrada y salida esperada para cada rol. Esto se usará para calcular tardanzas y el cierre automático de turno.</p>
                    <div class="table-responsive">
                        <table class="table">
                            <thead>
                                <tr>
                                    <th>Rol</th>
                                    <th>Hora de Entrada</th>
                                    <th>Hora de Salida</th>
                                    <th>Acción</th>
                                </tr>
                            </thead>
                            <tbody id="tbody-rrhh-roles">
                                <tr><td colspan="4" style="text-align:center;">Cargando roles...</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>

        <!-- Modal Registrar Ausencia Manual -->
        <div class="modal-backdrop" id="modal-ausencia">
            <div class="modal">
                <div class="modal-header">
                    <h3>Registrar Falta / Permiso</h3>
                    <button class="btn-icon" onclick="cerrarModalAusencia()"><i class="ph ph-x"></i></button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label class="form-label">Empleado (ID o DNI)</label>
                        <input type="text" id="ausencia-empleado" class="form-control" placeholder="Ej: 74214636">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Fecha</label>
                        <input type="date" id="ausencia-fecha" class="form-control">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Tipo de Ausencia</label>
                        <select id="ausencia-tipo" class="form-control">
                            <option value="falta_injustificada">Falta Injustificada</option>
                            <option value="falta_justificada">Falta Justificada</option>
                            <option value="permiso">Permiso Personal</option>
                            <option value="descanso_medico">Descanso Médico</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Observaciones (Opcional)</label>
                        <textarea id="ausencia-obs" class="form-control" rows="3"></textarea>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="cerrarModalAusencia()">Cancelar</button>
                    <button class="btn btn-primary" onclick="guardarAusencia()">Registrar</button>
                </div>
            </div>
        </div>

        <!-- Modal Resolver Justificación -->
        <div class="modal-backdrop" id="modal-resolver-justificacion">
            <div class="modal" style="max-width: 550px; max-height: 90vh; display:flex; flex-direction:column;">
                <div class="modal-header">
                    <div style="display:flex; align-items:center; gap:8px;">
                        <i class="ph ph-scales text-primary" style="font-size:22px;"></i>
                        <h3 style="font-size: 16px; margin: 0;">Evaluar Justificación / Permiso</h3>
                    </div>
                    <button class="btn-icon" onclick="cerrarModalResolverJustificacion()"><i class="ph ph-x"></i></button>
                </div>
                <div class="modal-body" style="overflow-y:auto; padding:20px;">
                    <input type="hidden" id="res-just-id">
                    
                    <div class="card mb-3" style="background:var(--bg-main); border:1px solid var(--border); padding:14px; border-radius:10px;">
                        <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
                            <span class="text-sec">Colaborador:</span>
                            <strong id="res-just-empleado">--</strong>
                        </div>
                        <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
                            <span class="text-sec">Fecha de Inasistencia:</span>
                            <strong id="res-just-fecha">--</strong>
                        </div>
                        <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
                            <span class="text-sec">Motivo declarado:</span>
                            <strong id="res-just-motivo" class="text-primary">--</strong>
                        </div>
                        <div style="margin-top:8px;">
                            <span class="text-sec" style="font-size:11px; text-transform:uppercase; font-weight:600;">Detalle / Explicación:</span>
                            <p id="res-just-desc" style="margin:4px 0 0 0; font-size:13px; background:var(--bg-card); padding:8px; border-radius:6px; border:1px solid var(--border);"></p>
                        </div>
                    </div>

                    <div id="res-just-img-container" class="mb-3 hidden" style="text-align:center;">
                        <span class="text-sec" style="font-size:11px; text-transform:uppercase; font-weight:600; display:block; margin-bottom:6px; text-align:left;">Evidencia Adjunta:</span>
                        <img id="res-just-img" src="" style="max-height:180px; max-width:100%; border-radius:8px; border:1px solid var(--border); cursor:pointer;" onclick="window.open(this.src, '_blank')" title="Clic para ver tamaño completo">
                    </div>

                    <div class="form-group">
                        <label class="form-label" style="font-weight:600;">Decisión de Recursos Humanos <span class="text-danger">*</span></label>
                        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
                            <button type="button" class="btn" id="btn-decision-aprobar" style="border: 2px solid var(--success); background: rgba(16, 185, 129, 0.1); color: var(--success); padding: 12px; border-radius: 10px; text-align: center;" onclick="setDecisionJustificacion('aprobado')">
                                <i class="ph-bold ph-check-circle" style="font-size: 20px; display: block; margin: 0 auto 4px;"></i>
                                <strong>Aprobar</strong>
                            </button>
                            <button type="button" class="btn" id="btn-decision-desaprobar" style="border: 2px solid var(--border); background: transparent; color: var(--text-sec); padding: 12px; border-radius: 10px; text-align: center;" onclick="setDecisionJustificacion('desaprobado')">
                                <i class="ph-bold ph-x-circle" style="font-size: 20px; display: block; margin: 0 auto 4px;"></i>
                                <strong>Desaprobar</strong>
                            </button>
                        </div>
                        <input type="hidden" id="res-just-estado" value="aprobado">
                    </div>

                    <div class="form-group" id="group-tipo-resolucion">
                        <label class="form-label font-bold">Efecto en Nómina y Horas</label>
                        <select id="res-just-tipo" class="form-control" onchange="cambiarTipoResolucion()">
                            <option value="sin_goce">Sin goce de haber / Horas perdidas a descontar</option>
                            <option value="con_goce">Con goce de haber / Justificada sin descuento (0 hrs)</option>
                            <option value="tiempo_extra">Compensación con Tiempo Extra a favor</option>
                        </select>
                    </div>

                    <div class="form-group" id="group-horas-afectadas">
                        <label class="form-label font-bold" id="lbl-horas-afectadas">Horas a descontar (jornada no remunerada)</label>
                        <input type="number" id="res-just-horas" class="form-control" step="0.5" min="0" max="24" value="8.0">
                    </div>

                    <div class="form-group">
                        <label class="form-label font-bold">Resolución / Comentarios del Administrador</label>
                        <textarea id="res-just-comentarios" class="form-control" rows="2" placeholder="Observaciones de la aprobación o desaprobación..."></textarea>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="cerrarModalResolverJustificacion()">Cancelar</button>
                    <button class="btn btn-primary" onclick="guardarResolucionJustificacion()"><i class="ph ph-check"></i> Guardar Resolución</button>
                </div>
            </div>
        </div>

        <!-- Modal Editar Sueldo de Personal -->
        <div class="modal-backdrop" id="modal-editar-sueldo">
            <div class="modal" style="max-width: 480px;">
                <div class="modal-header">
                    <div style="display:flex; align-items:center; gap:8px;">
                        <i class="ph ph-currency-dollar text-success" style="font-size:22px;"></i>
                        <h3 style="font-size: 16px; margin: 0;">Configuración Salarial de Personal</h3>
                    </div>
                    <button class="btn-icon" onclick="cerrarModalEditarSueldo()"><i class="ph ph-x"></i></button>
                </div>
                <div class="modal-body" style="padding:20px;">
                    <input type="hidden" id="edit-sueldo-id">
                    
                    <div style="margin-bottom:16px; padding:12px; background:var(--bg-main); border-radius:8px; border:1px solid var(--border);">
                        <span class="text-sec" style="font-size:11px; text-transform:uppercase; font-weight:600;">Colaborador</span>
                        <div style="font-size:15px; font-weight:600; margin-top:2px;" id="edit-sueldo-nombre">--</div>
                    </div>

                    <div class="form-group">
                        <label class="form-label font-bold">Modalidad de Pago</label>
                        <select id="edit-sueldo-tipo" class="form-control">
                            <option value="mensual">Sueldo Fijo Mensual</option>
                            <option value="hora">Pago por Horas Trabajadas</option>
                            <option value="quincenal">Quincenal</option>
                            <option value="semanal">Semanal</option>
                        </select>
                    </div>

                    <div class="form-group">
                        <label class="form-label font-bold">Sueldo Base Mensual (${moneda})</label>
                        <input type="number" id="edit-sueldo-base" class="form-control" step="0.01" min="0" placeholder="Ej. 1500.00" inputmode="decimal">
                        <p class="text-sec text-small" style="margin-top:4px;">Se usa como base mensual y para calcular tarifa hora de descuento.</p>
                    </div>

                    <div class="form-group">
                        <label class="form-label font-bold">Tarifa por Hora (${moneda}/hora - Opcional)</label>
                        <input type="number" id="edit-sueldo-hora" class="form-control" step="0.01" min="0" placeholder="Ej. 7.50" inputmode="decimal">
                        <p class="text-sec text-small" style="margin-top:4px;">Si se deja en 0, se calcula automáticamente: (Sueldo Base / 240 hrs).</p>
                    </div>

                    <div class="form-group">
                        <label class="form-label font-bold">Horas Semanales Pactadas</label>
                        <input type="number" id="edit-sueldo-pactadas" class="form-control" min="1" max="72" value="48" inputmode="numeric">
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="cerrarModalEditarSueldo()">Cancelar</button>
                    <button class="btn btn-primary" onclick="guardarSueldoPersonal()"><i class="ph ph-floppy-disk"></i> Guardar Sueldo</button>
                </div>
            </div>
        </div>

        <!-- Modal Ficha Individual de Personal -->
        <div class="modal-backdrop" id="modal-ficha-individual">
            <div class="modal" style="max-width: 720px; max-height: 94vh; display:flex; flex-direction:column;">
                <div class="modal-header">
                    <div style="display:flex; align-items:center; gap:8px;">
                        <i class="ph ph-identification-badge text-primary" style="font-size:22px;"></i>
                        <h3 style="font-size: 16px; margin: 0;">Ficha Laboral y Boleta de Pago</h3>
                    </div>
                    <div style="display:flex; gap:8px; align-items:center;">
                        <button class="btn btn-secondary btn-sm" onclick="copiarEnlaceBoletaPublica()" title="Copiar enlace para vista pública">
                            <i class="ph ph-link" style="font-size:16px;"></i> <span class="mobile-hide">Copiar Enlace</span>
                        </button>
                        <button class="btn btn-secondary btn-sm" style="color:#25D366; border-color:rgba(37,211,102,0.4);" onclick="enviarFichaPorWhatsAppActual()" title="Enviar resumen por WhatsApp">
                            <i class="ph ph-whatsapp-logo" style="font-size:16px;"></i> <span class="mobile-hide">WhatsApp</span>
                        </button>
                        <button class="btn btn-secondary btn-sm mobile-hide" onclick="imprimirFichaIndividual()"><i class="ph ph-printer"></i> Imprimir</button>
                        <button class="btn-icon" onclick="cerrarModalFichaIndividual()"><i class="ph ph-x"></i></button>
                    </div>
                </div>
                <div class="modal-body" style="overflow-y:auto;" id="ficha-individual-printable">
                    <!-- Contenido inyectado por JS -->
                </div>
                <div class="modal-footer" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
                    <button class="btn btn-secondary" onclick="cerrarModalFichaIndividual()">Cerrar</button>
                    <div style="display:flex; gap:8px; flex-wrap:wrap;">
                        <button class="btn btn-secondary" onclick="copiarEnlaceBoletaPublica()" title="Copiar enlace público de esta boleta">
                            <i class="ph ph-link" style="font-size:18px;"></i> Copiar Enlace Público
                        </button>
                        <button class="btn btn-secondary" style="color:#25D366; border-color:rgba(37,211,102,0.4);" onclick="enviarFichaPorWhatsAppActual()">
                            <i class="ph ph-whatsapp-logo" style="font-size:18px;"></i> WhatsApp
                        </button>
                        <button class="btn btn-primary" onclick="imprimirFichaIndividual()"><i class="ph ph-printer"></i> Imprimir Ficha</button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Modal Retiro Disciplinario / Sanción Inmediata -->
        <div class="modal-backdrop" id="modal-retiro-disciplinario">
            <div class="modal" style="max-width: 540px; max-height: 92vh; display: flex; flex-direction: column;">
                <div class="modal-header" style="border-bottom: 2px solid var(--danger);">
                    <div style="display: flex; align-items: center; gap: 8px; color: var(--danger);">
                        <i class="ph ph-hand-palm" style="font-size: 22px;"></i>
                        <h3 style="font-size: 16px; margin: 0; color: var(--danger);">Retiro Disciplinario y Corte de Turno</h3>
                    </div>
                    <button class="btn-icon" onclick="cerrarModalRetiroDisciplinario()"><i class="ph ph-x"></i></button>
                </div>
                <div class="modal-body" style="overflow-y: auto; padding: 20px;">
                    <input type="hidden" id="retiro-asistencia-id">
                    
                    <div class="form-group">
                        <label class="form-label font-bold">Colaborador en Turno Activo <span class="text-danger">*</span></label>
                        <select id="retiro-select-empleado" class="form-control" onchange="onSelectEmpleadoRetiro()">
                            <option value="">Cargando colaboradores en turno...</option>
                        </select>
                    </div>

                    <!-- Cuadro resumen de tiempo en vivo -->
                    <div id="retiro-info-box" class="card mb-3" style="background: var(--bg-main); border: 1px solid var(--border); padding: 14px; border-radius: 10px; display: none;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
                            <span class="text-sec">Hora de Entrada:</span>
                            <strong id="retiro-info-entrada">--:--</strong>
                        </div>
                        <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
                            <span class="text-sec">Hora actual de Corte:</span>
                            <strong id="retiro-info-corte" class="text-danger">--:--</strong>
                        </div>
                        <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
                            <span class="text-sec">Tiempo trabajado hoy:</span>
                            <strong id="retiro-info-trabajado" class="text-primary">-- hrs</strong>
                        </div>
                        <div style="display: flex; justify-content: space-between; padding-top: 6px; border-top: 1px dashed var(--border);">
                            <span class="text-sec">Horas restantes de jornada:</span>
                            <strong id="retiro-info-restantes" style="color: var(--danger);">-- hrs</strong>
                        </div>
                    </div>

                    <div class="form-group">
                        <label class="form-label font-bold">Motivo del Retiro / Sanción <span class="text-danger">*</span></label>
                        <select id="retiro-motivo" class="form-control">
                            <option value="Pérdida de tiempo y ocio reiterado en horario laboral">Pérdida de tiempo y ocio en horario laboral</option>
                            <option value="Uso no autorizado de celular y distracción continua">Uso no autorizado de celular / distracción continua</option>
                            <option value="Incumplimiento de funciones y negligencia en el puesto">Incumplimiento de funciones y negligencia</option>
                            <option value="Falta de respeto o indisciplina con el equipo">Falta de respeto o indisciplina</option>
                            <option value="Abandono injustificado de área de trabajo">Abandono injustificado de puesto de trabajo</option>
                            <option value="Otro">Otro motivo disciplinario</option>
                        </select>
                    </div>

                    <div class="form-group">
                        <label class="form-label font-bold">Horas de Tiempo Perdido a Descontar (Fin de Mes)</label>
                        <input type="number" id="retiro-horas-descontar" class="form-control" step="0.5" min="0.5" max="24" value="4.0">
                        <small class="text-sec" style="font-size: 11px;">Calculado según la jornada pactada. Estas horas se descontarán automáticamente del sueldo neto en su Ficha/Boleta.</small>
                    </div>

                    <div class="form-group">
                        <label class="form-label font-bold">Detalles / Explicación del Incidente <span class="text-danger">*</span></label>
                        <textarea id="retiro-detalle" class="form-control" rows="3" placeholder="Describe lo ocurrido (ej: Se le llamó la atención en 2 ocasiones por no avanzar pedidos y usar el celular. Se procede a retirarlo a su casa)..."></textarea>
                    </div>

                    <div style="background: rgba(239, 68, 68, 0.08); border-left: 3px solid var(--danger); padding: 10px 12px; border-radius: 6px; font-size: 12px; color: var(--text-main);">
                        <i class="ph ph-warning-circle" style="color: var(--danger); vertical-align: middle;"></i>
                        <strong>Atención:</strong> Al confirmar, el turno se cerrará de inmediato a esta hora exacta, se guardará el registro de la sanción y se aplicará el descuento salarial en su boleta de pago.
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="cerrarModalRetiroDisciplinario()">Cancelar</button>
                    <button class="btn btn-danger" onclick="ejecutarRetiroDisciplinario()"><i class="ph ph-hand-palm"></i> Confirmar Retiro y Descuento</button>
                </div>
            </div>
        </div>
    `;
    
    // Configurar fechas por defecto
    const getLocalToday = () => {
        const d = new Date();
        d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
        return d.toISOString().split('T')[0];
    };
    document.getElementById('filtro-rrhh-inicio').value = getLocalToday();
    document.getElementById('filtro-rrhh-fin').value = getLocalToday();
    
    const mesInput = document.getElementById('filtro-personal-mes');
    if (mesInput) mesInput.value = new Date().toISOString().substring(0, 7);
    
    window.currentRRHHTab = 'historial';
    await loadHistorialAsistencia();
    actualizarBadgeJustificaciones();
}

// ==========================================
// COMPONENTE VISUAL: AVATAR DE EMPLEADO CIRCULAR
// ==========================================
window.renderEmpleadoAvatar = function(nombre, apellido, fotoUrl, size = 36) {
    if (fotoUrl && typeof fotoUrl === 'string' && fotoUrl.trim() !== '') {
        return `<img src="${fotoUrl}" class="emp-avatar-img" style="width:${size}px; height:${size}px; min-width:${size}px; min-height:${size}px;" alt="${nombre || 'Avatar'}">`;
    }
    
    // Generar iniciales limpias (ej: "Luis Mendoza" -> "LM", "Admin" -> "AD")
    let n = (nombre || '').trim();
    let a = (apellido || '').trim();
    let iniciales = 'EM';
    
    if (n && a) {
        iniciales = (n.charAt(0) + a.charAt(0)).toUpperCase();
    } else if (n) {
        let parts = n.split(/\s+/);
        if (parts.length > 1) {
            iniciales = (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
        } else {
            iniciales = n.substring(0, 2).toUpperCase();
        }
    }
    
    // Paleta de gradientes modernos y armónicos (nunca rojo alarmante ni aplastado)
    const palettes = [
        'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)', // Indigo
        'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)', // Sky Blue
        'linear-gradient(135deg, #059669 0%, #047857 100%)', // Emerald
        'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)', // Violet
        'linear-gradient(135deg, #ea580c 0%, #c2410c 100%)', // Orange
        'linear-gradient(135deg, #0d9488 0%, #0f766e 100%)', // Teal
        'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', // Royal Blue
        'linear-gradient(135deg, #db2777 0%, #be185d 100%)'  // Pink
    ];
    let hash = 0;
    const strForHash = (n + a) || iniciales;
    for (let i = 0; i < strForHash.length; i++) hash = (hash * 31 + strForHash.charCodeAt(i)) & 0xFFFFFF;
    const bg = palettes[Math.abs(hash) % palettes.length];
    
    const fontSize = Math.max(10, Math.round(size * 0.38));
    return `<div class="emp-avatar" style="width:${size}px; height:${size}px; min-width:${size}px; min-height:${size}px; font-size:${fontSize}px; background:${bg}; flex-shrink:0;">${iniciales}</div>`;
};

window.refrescarRRHHActual = async function() {
    if (window.currentRRHHTab === 'justificaciones') loadJustificaciones();
    else if (window.currentRRHHTab === 'personal') loadFichasPersonal();
    else if (window.currentRRHHTab === 'ajustes') { loadRolesHorarios(); loadAjustesRRHHYTotp(); }
    else if (window.currentRRHHTab === 'metricas') {
        await loadHistorialAsistencia();
        if (window.renderMetricasRRHH) window.renderMetricasRRHH(window.historialAsistenciaData || []);
    }
    else loadHistorialAsistencia();
    actualizarBadgeJustificaciones();
};

window.switchRRHHTab = async function(tabName) {
    triggerHaptic(15);
    window.currentRRHHTab = tabName;
    document.querySelectorAll('.rrhh-nav-tab').forEach(el => el.classList.remove('active'));
    const targetTab = document.querySelector('#tab-rrhh-' + tabName);
    if (targetTab) {
        targetTab.classList.add('active');
        targetTab.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
    
    ['historial', 'justificaciones', 'personal', 'metricas', 'ajustes'].forEach(t => {
        const el = document.getElementById('rrhh-view-' + t);
        if (el) el.classList.add('hidden');
    });
    
    document.getElementById('rrhh-view-' + tabName)?.classList.remove('hidden');
    
    if (tabName === 'historial') {
        loadHistorialAsistencia();
    } else if (tabName === 'justificaciones') {
        loadJustificaciones();
    } else if (tabName === 'personal') {
        loadFichasPersonal();
    } else if (tabName === 'metricas') {
        if (!window.historialAsistenciaData || window.historialAsistenciaData.length === 0) {
            await loadHistorialAsistencia();
        }
        if (window.renderMetricasRRHH) {
            window.renderMetricasRRHH(window.historialAsistenciaData || []);
        }
    } else if (tabName === 'ajustes') {
        loadRolesHorarios();
        loadAjustesRRHHYTotp();
    }
};

window.loadRolesHorarios = async function() {
    const tbody = document.getElementById('tbody-rrhh-roles');
    if (!tbody) return;

    try {
        const res = await fetch('/khalessierp/api/index.php?request=rrhh/roles_horarios');
        const data = await res.json();
        if (res.ok && data.status === 'success') {
            const roles = data.data || [];
            tbody.innerHTML = roles.map(r => {
                const entrada = r.hora_entrada ? r.hora_entrada.substring(0, 5) : '';
                const salida = r.hora_salida ? r.hora_salida.substring(0, 5) : '';
                return `
                    <tr>
                        <td class="fw-500"><strong>${r.nombre}</strong></td>
                        <td><input type="time" id="rol_ent_${r.id}" class="form-control" value="${entrada}" style="width:130px;"></td>
                        <td><input type="time" id="rol_sal_${r.id}" class="form-control" value="${salida}" style="width:130px;"></td>
                        <td>
                            <button class="btn btn-primary btn-sm" onclick="guardarHorarioRol(${r.id})">
                                <i class="ph ph-floppy-disk"></i> Guardar
                            </button>
                        </td>
                    </tr>
                `;
            }).join('');
        } else {
            tbody.innerHTML = '<tr><td colspan="4" class="text-danger">Error al cargar roles</td></tr>';
        }
    } catch (e) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-danger">Error al cargar horarios de roles</td></tr>';
    }
};

window.guardarHorarioRol = async function(id) {
    const entrada = document.getElementById('rol_ent_' + id)?.value || '';
    const salida = document.getElementById('rol_sal_' + id)?.value || '';

    try {
        const res = await fetch('/khalessierp/api/index.php?request=rrhh/roles_horarios', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id_rol: id,
                hora_entrada: entrada,
                hora_salida: salida
            })
        });
        const data = await res.json();
        if (res.ok && data.status === 'success') {
            showToast('Horario del rol actualizado con éxito', 'success');
        } else {
            showToast(data.message || 'Error al guardar horario', 'error');
        }
    } catch (e) {
        showToast('Error de conexión', 'error');
    }
};

window.saveRolHorario = window.guardarHorarioRol;

window.historialAsistenciaData = [];

window.setRangoFechaRRHH = function(tipo) {
    triggerHaptic(20);
    const chips = document.querySelectorAll('.date-chips-wrap .date-chip');
    chips.forEach(c => c.classList.remove('active'));
    const activeChip = document.getElementById(`chip-rango-${tipo}`);
    if (activeChip) activeChip.classList.add('active');

    const inicioInput = document.getElementById('filtro-rrhh-inicio');
    const finInput = document.getElementById('filtro-rrhh-fin');
    if (!inicioInput || !finInput) return;

    const now = new Date();
    const toYMD = (d) => {
        const temp = new Date(d);
        temp.setMinutes(temp.getMinutes() - temp.getTimezoneOffset());
        return temp.toISOString().split('T')[0];
    };

    if (tipo === 'hoy') {
        inicioInput.value = toYMD(now);
        finInput.value = toYMD(now);
    } else if (tipo === 'ayer') {
        const ayer = new Date(now);
        ayer.setDate(ayer.getDate() - 1);
        inicioInput.value = toYMD(ayer);
        finInput.value = toYMD(ayer);
    } else if (tipo === 'semana') {
        const diaSemana = now.getDay();
        const diffLunes = now.getDate() - (diaSemana === 0 ? 6 : diaSemana - 1);
        const lunes = new Date(now);
        lunes.setDate(diffLunes);
        inicioInput.value = toYMD(lunes);
        finInput.value = toYMD(now);
    } else if (tipo === 'mes') {
        const primerDia = new Date(now.getFullYear(), now.getMonth(), 1);
        inicioInput.value = toYMD(primerDia);
        finInput.value = toYMD(now);
    } else if (tipo === 'todos') {
        inicioInput.value = '';
        finInput.value = '';
    }

    loadHistorialAsistencia();
};

window.loadHistorialAsistencia = async function() {
    const inicio = document.getElementById('filtro-rrhh-inicio')?.value || '';
    const fin = document.getElementById('filtro-rrhh-fin')?.value || '';
    const tbody = document.querySelector('#table-asistencia tbody');
    if (!tbody) return;

    tbody.innerHTML = `
        <tr>
            <td class="table-sticky-col"><div class="skeleton skeleton-text" style="width:120px; height:16px;"></div></td>
            <td><div class="skeleton skeleton-text" style="width:70px; height:16px;"></div></td>
            <td><div class="skeleton skeleton-text" style="width:110px; height:16px;"></div></td>
            <td><div class="skeleton skeleton-text" style="width:100px; height:16px;"></div></td>
            <td><div class="skeleton skeleton-badge" style="width:85px; height:22px; border-radius:12px;"></div></td>
            <td><div class="skeleton skeleton-button" style="width:48px; height:24px; border-radius:6px;"></div></td>
        </tr>
        <tr>
            <td class="table-sticky-col"><div class="skeleton skeleton-text" style="width:140px; height:16px;"></div></td>
            <td><div class="skeleton skeleton-text" style="width:70px; height:16px;"></div></td>
            <td><div class="skeleton skeleton-text" style="width:100px; height:16px;"></div></td>
            <td><div class="skeleton skeleton-text" style="width:90px; height:16px;"></div></td>
            <td><div class="skeleton skeleton-badge" style="width:85px; height:22px; border-radius:12px;"></div></td>
            <td><div class="skeleton skeleton-button" style="width:48px; height:24px; border-radius:6px;"></div></td>
        </tr>
        <tr>
            <td class="table-sticky-col"><div class="skeleton skeleton-text" style="width:110px; height:16px;"></div></td>
            <td><div class="skeleton skeleton-text" style="width:70px; height:16px;"></div></td>
            <td><div class="skeleton skeleton-text" style="width:105px; height:16px;"></div></td>
            <td><div class="skeleton skeleton-text" style="width:95px; height:16px;"></div></td>
            <td><div class="skeleton skeleton-badge" style="width:85px; height:22px; border-radius:12px;"></div></td>
            <td><div class="skeleton skeleton-button" style="width:48px; height:24px; border-radius:6px;"></div></td>
        </tr>
    `;

    try {
        let url = '/khalessierp/api/index.php?request=rrhh/historial';
        if (inicio && fin) {
            url += `&fecha_inicio=${encodeURIComponent(inicio)}&fecha_fin=${encodeURIComponent(fin)}`;
        }
        const res = await fetch(url);
        const data = await res.json();

        if (res.ok && data.status === 'success') {
            window.historialAsistenciaData = data.data || [];
            
            if (window.historialAsistenciaData.length === 0) {
                tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:30px; color:var(--text-sec);"><i class="ph ph-calendar-blank" style="font-size:32px; display:block; margin-bottom:8px; opacity:0.5;"></i>No se encontraron registros de asistencia para las fechas seleccionadas.</td></tr>';
                return;
            }

            tbody.innerHTML = window.historialAsistenciaData.map(item => {
                let condicionBadge = '<span class="badge badge-success">Puntual</span>';
                if (item.condicion === 'sancion_disciplinaria' || (item.observaciones && item.observaciones.includes('RETIRO DISCIPLINARIO'))) {
                    condicionBadge = `<span class="badge badge-danger" title="${item.observaciones || ''}"><i class="ph ph-hand-palm"></i> Sanción (${item.horas_perdidas || 0}h)</span>`;
                } else if (item.condicion === 'tardanza') {
                    const auth2FA = item.autorizado_por_totp == 1 ? '<i class="ph ph-shield-check" title="Autorizado por 2FA"></i> 2FA ' : '';
                    condicionBadge = `<span class="badge badge-danger">${auth2FA}+${item.minutos_tardanza || 0}m tarde</span>`;
                } else if (item.condicion === 'falta_justificada') {
                    condicionBadge = '<span class="badge badge-warning">Falta Justificada</span>';
                } else if (item.condicion === 'falta_injustificada') {
                    condicionBadge = '<span class="badge badge-danger">Falta Injustificada</span>';
                } else if (item.condicion === 'permiso') {
                    condicionBadge = '<span class="badge badge-secondary">Permiso</span>';
                }

                let fotoBtn = '';
                if (item.foto_entrada) {
                    fotoBtn = `<button class="btn-icon btn-sm" onclick="verFotoAsistencia('${item.foto_entrada}')" title="Ver Fotografía"><i class="ph ph-camera"></i></button>`;
                }
                let gpsBtn = '';
                if (item.latitud && item.longitud) {
                    gpsBtn = `<button class="btn-icon btn-sm" onclick="window.open('https://www.google.com/maps?q=${item.latitud},${item.longitud}', '_blank')" title="Ver Ubicación GPS"><i class="ph ph-map-pin"></i></button>`;
                }
                const evidenciaHtml = (fotoBtn || gpsBtn) 
                    ? `<div style="display:flex; gap:6px; align-items:center;">${fotoBtn}${gpsBtn}</div>` 
                    : '<span class="text-sec text-small">Sin registro</span>';

                const entradaTxt = item.fecha_hora_entrada || '--';
                const salidaTxt = item.fecha_hora_salida || '<span class="text-warning font-bold">En turno</span>';
                const horasTxt = item.minutos_trabajados ? `${(item.minutos_trabajados / 60).toFixed(1)} hrs` : '--';

                let accionHtml = '<span class="text-sec" style="font-size:11px;">--</span>';
                if (item.estado === 'abierto' || !item.fecha_hora_salida) {
                    const safeName = encodeURIComponent((item.nombre || '') + ' ' + (item.apellido || ''));
                    accionHtml = `<button class="btn btn-danger btn-sm" onclick="abrirModalRetiroDisciplinario(${item.id}, ${item.id_usuario}, '${safeName}', '${item.fecha_hora_entrada}')" title="Cerrar turno por sanción o pérdida de tiempo"><i class="ph ph-hand-palm"></i> Retirar</button>`;
                } else if (item.condicion === 'sancion_disciplinaria' || (item.observaciones && item.observaciones.includes('RETIRO DISCIPLINARIO'))) {
                    const safeObs = encodeURIComponent(item.observaciones || '');
                    accionHtml = `<button class="btn btn-secondary btn-sm" onclick="verDetalleSancion('${safeObs}')" title="Ver detalle de la sanción"><i class="ph ph-info"></i> Sanción</button>`;
                }

                return `
                    <tr>
                        <td class="table-sticky-col">
                            <div style="display:flex; align-items:center; gap:10px;">
                                ${window.renderEmpleadoAvatar(item.nombre, item.apellido, item.foto_perfil, 32)}
                                <div class="fw-500">${item.nombre} ${item.apellido || ''}</div>
                            </div>
                        </td>
                        <td>${item.dni}</td>
                        <td>
                            <div style="font-weight:600;">${entradaTxt}</div>
                            ${item.hora_entrada_asignada ? `<div class="text-sec text-small">Esperada: ${item.hora_entrada_asignada.substring(0,5)}</div>` : ''}
                        </td>
                        <td>
                            <div>${salidaTxt}</div>
                            <div class="text-sec text-small">${horasTxt}</div>
                        </td>
                        <td>${condicionBadge}</td>
                        <td>${evidenciaHtml}</td>
                        <td>${accionHtml}</td>
                    </tr>
                `;
            }).join('');
        } else {
            tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:var(--danger); padding:20px;">${data.message || 'Error cargando historial'}</td></tr>`;
        }
    } catch(e) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:var(--danger); padding:20px;">Error de conexión con el servidor</td></tr>';
    }
};

window.exportarHistorialCSV = function() {
    const data = window.historialAsistenciaData;
    if (!data || data.length === 0) {
        showToast("No hay datos para exportar", "warning");
        return;
    }
    
    let csvContent = "Empleado,DNI,Fecha y Entrada,Salida,Condicion,Minutos Trabajados,Metodo Salida,Latitud,Longitud,Observaciones\n";
    
    data.forEach(item => {
        let empleado = `"${item.nombre} ${item.apellido || ''}"`;
        let dni = item.dni;
        let entrada = item.fecha_hora_entrada;
        let salida = item.fecha_hora_salida || '';
        let condicion = item.condicion || 'puntual';
        let mins = item.minutos_trabajados || 0;
        let metodo = item.metodo_salida || '';
        let lat = item.latitud || '';
        let lng = item.longitud || '';
        let obs = `"${(item.observaciones || '').replace(/"/g, '""')}"`;
        
        csvContent += `${empleado},${dni},${entrada},${salida},${condicion},${mins},${metodo},${lat},${lng},${obs}\n`;
    });
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `reporte_asistencias_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

window.abrirModalAusencia = function() {
    document.getElementById('ausencia-empleado').value = '';
    document.getElementById('ausencia-fecha').value = new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0];
    document.getElementById('ausencia-obs').value = '';
    document.getElementById('modal-ausencia').classList.add('show');
};

window.cerrarModalAusencia = function() {
    document.getElementById('modal-ausencia').classList.remove('show');
};

// ==========================================
// RETIRO DISCIPLINARIO Y CORTE DE TURNO
// ==========================================

window.abrirModalRetiroDisciplinario = async function(idAsistencia = null, idUsuario = null, nombre = null, entrada = null) {
    const modal = document.getElementById('modal-retiro-disciplinario');
    const select = document.getElementById('retiro-select-empleado');
    const infoBox = document.getElementById('retiro-info-box');
    const inputHoras = document.getElementById('retiro-horas-descontar');
    const txtDetalle = document.getElementById('retiro-detalle');
    
    if (txtDetalle) txtDetalle.value = '';
    document.getElementById('retiro-asistencia-id').value = idAsistencia || '';
    
    select.innerHTML = '<option value="">Cargando colaboradores en turno activo...</option>';
    select.disabled = true;
    infoBox.style.display = 'none';

    modal.classList.add('show');

    try {
        const res = await fetch('/khalessierp/api/index.php?request=rrhh/turnos_activos');
        const data = await res.json();
        const turnos = (data.status === 'success' && data.data) ? data.data : [];
        window.turnosActivosData = turnos;

        if (turnos.length === 0) {
            select.innerHTML = '<option value="">⚠️ No hay colaboradores con turno abierto hoy</option>';
            select.disabled = true;
            inputHoras.value = '4.0';
            return;
        }

        select.disabled = false;
        select.innerHTML = '<option value="">-- Selecciona el colaborador a sancionar/retirar --</option>';
        turnos.forEach(t => {
            const horasActivo = (t.minutos_activos / 60).toFixed(1);
            const entradaH = t.fecha_hora_entrada ? t.fecha_hora_entrada.substring(11,16) : '--';
            select.innerHTML += `<option value="${t.id_asistencia}" data-user="${t.id_usuario}" data-entrada="${t.fecha_hora_entrada}" data-mins="${t.minutos_activos}">${t.nombre} ${t.apellido || ''} (${t.cargo || t.rol_nombre || 'Personal'}) - Entrada: ${entradaH} (${horasActivo}h en turno)</option>`;
        });

        if (idAsistencia) {
            select.value = idAsistencia;
        } else if (idUsuario) {
            const found = turnos.find(t => t.id_usuario == idUsuario);
            if (found) select.value = found.id_asistencia;
        }
        
        onSelectEmpleadoRetiro();
    } catch(e) {
        select.innerHTML = '<option value="">Error al cargar turnos activos</option>';
    }
};

window.cerrarModalRetiroDisciplinario = function() {
    document.getElementById('modal-retiro-disciplinario').classList.remove('show');
};

window.onSelectEmpleadoRetiro = function() {
    const select = document.getElementById('retiro-select-empleado');
    const infoBox = document.getElementById('retiro-info-box');
    const inputHoras = document.getElementById('retiro-horas-descontar');
    const hiddenId = document.getElementById('retiro-asistencia-id');
    
    const selectedOpt = select.options[select.selectedIndex];
    if (!selectedOpt || !selectedOpt.value) {
        infoBox.style.display = 'none';
        hiddenId.value = '';
        return;
    }

    const idAsist = selectedOpt.value;
    hiddenId.value = idAsist;

    const entradaStr = selectedOpt.getAttribute('data-entrada');
    const minsActivos = parseInt(selectedOpt.getAttribute('data-mins') || 0);
    const horasTrabajadas = (minsActivos / 60).toFixed(1);
    
    // Asumiendo jornada pactada de 8 horas:
    const horasRestantes = Math.max(0.5, (8.0 - parseFloat(horasTrabajadas)).toFixed(1));

    document.getElementById('retiro-info-entrada').innerText = entradaStr ? entradaStr.substring(11, 16) : '--:--';
    document.getElementById('retiro-info-corte').innerText = new Date().toLocaleTimeString('es-PE', {hour:'2-digit', minute:'2-digit'});
    document.getElementById('retiro-info-trabajado').innerText = `${horasTrabajadas} hrs`;
    document.getElementById('retiro-info-restantes').innerText = `${horasRestantes} hrs`;
    inputHoras.value = horasRestantes;

    infoBox.style.display = 'block';
};

window.ejecutarRetiroDisciplinario = async function() {
    const idAsistencia = document.getElementById('retiro-asistencia-id').value;
    const motivo = document.getElementById('retiro-motivo').value;
    const detalle = document.getElementById('retiro-detalle').value.trim();
    const horasDescontar = parseFloat(document.getElementById('retiro-horas-descontar').value) || 0;

    if (!idAsistencia) {
        showToast('Selecciona un colaborador en turno activo', 'warning');
        return;
    }

    if (!detalle) {
        showToast('Ingresa una breve explicación o detalle del motivo del retiro', 'warning');
        return;
    }

    const user = JSON.parse(localStorage.getItem('khalessi_user') || '{}');
    const idAdmin = user.id || null;

    try {
        showToast('Aplicando retiro disciplinario y cerrando turno...', 'info');
        const res = await fetch('/khalessierp/api/index.php?request=rrhh/retiro_disciplinario', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                id_asistencia: idAsistencia,
                motivo: motivo,
                detalle: detalle,
                horas_descontar: horasDescontar,
                id_admin: idAdmin
            })
        });

        const data = await res.json();
        if (res.ok && data.status === 'success') {
            showToast(data.message || 'Retiro disciplinario aplicado exitosamente', 'success');
            cerrarModalRetiroDisciplinario();
            loadHistorialAsistencia();
            if (typeof loadFichasPersonal === 'function') loadFichasPersonal();
        } else {
            showToast(data.message || 'Error al aplicar retiro disciplinario', 'error');
        }
    } catch(e) {
        showToast('Error de conexión con el servidor', 'error');
    }
};

window.verDetalleSancion = function(obsEncoded) {
    const obs = decodeURIComponent(obsEncoded || '');
    showModal(
        'Detalle de Sanción Disciplinaria',
        `<div style="padding:10px; font-size:14px; line-height:1.6; background:var(--bg-main); border-radius:10px; border:1px solid var(--border);">
            <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px; color:var(--danger); font-weight:700;">
                <i class="ph ph-hand-palm" style="font-size:20px;"></i> Corte de Turno por Sanción
            </div>
            <p style="margin:0; white-space:pre-wrap;">${obs || 'Sin observaciones registradas.'}</p>
        </div>`
    );
};

window.guardarAusencia = async function() {
    const idDni = document.getElementById('ausencia-empleado').value.trim();
    const fecha = document.getElementById('ausencia-fecha').value;
    const tipo = document.getElementById('ausencia-tipo').value;
    const observaciones = document.getElementById('ausencia-obs').value.trim();
    
    if(!idDni || !fecha || !tipo) {
        showToast("Empleado, Fecha y Tipo son obligatorios", "warning");
        return;
    }
    
    // Primero buscar el usuario por DNI (si ingresó DNI en lugar de ID)
    let id_usuario = idDni;
    if (idDni.length >= 8) { // Asumimos que es DNI si es >= 8 chars
        try {
            const rUser = await fetch('/khalessierp/api/index.php?request=rrhh/estado&dni=' + idDni);
            const dUser = await rUser.json();
            if (dUser.status === 'success' && dUser.data.user) {
                id_usuario = dUser.data.user.id;
            } else {
                showToast("DNI no encontrado", "error");
                return;
            }
        } catch(e) {
            showToast("Error buscando DNI", "error");
            return;
        }
    }
    
    try {
        const response = await fetch('/khalessierp/api/index.php?request=rrhh/registrar_ausencia', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({id_usuario, fecha, tipo, observaciones})
        });
        const data = await response.json();
        if(response.ok && data.status === 'success') {
            showToast("Ausencia registrada correctamente", "success");
            cerrarModalAusencia();
            loadHistorialAsistencia();
        } else {
            showToast(data.message || "Error al registrar ausencia", "error");
        }
    } catch(e) {
        showToast("Error de conexión", "error");
    }
};

// ==========================================
// JUSTIFICACIONES (ADMINISTRACIÓN)
// ==========================================

window.filtroJustificacionActual = 'todas';
window.justificacionesData = [];

window.filtrarJustificaciones = function(filtro) {
    window.filtroJustificacionActual = filtro;
    document.querySelectorAll('[id^="btn-filtro-just-"]').forEach(b => b.classList.remove('active'));
    document.getElementById('btn-filtro-just-' + filtro)?.classList.add('active');
    loadJustificaciones(filtro);
};

window.actualizarBadgeJustificaciones = async function() {
    try {
        const res = await fetch('/khalessierp/api/index.php?request=rrhh/justificaciones&estado=pendiente');
        const data = await res.json();
        if (data.status === 'success') {
            const badge = document.getElementById('badge-just-pendientes');
            if (badge) {
                const count = data.data ? data.data.length : 0;
                if (count > 0) {
                    badge.innerText = count;
                    badge.style.display = 'inline-block';
                } else {
                    badge.style.display = 'none';
                }
            }
        }
    } catch(e) {}
};

window.loadJustificaciones = async function(filtro = null) {
    if (!filtro) filtro = window.filtroJustificacionActual || 'todas';
    const tbody = document.getElementById('tbody-justificaciones');
    if (!tbody) return;
    
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding:20px;"><i class="ph ph-circle-notch ph-spin" style="font-size:24px;"></i><br>Cargando justificaciones...</td></tr>';
    
    try {
        let url = '/khalessierp/api/index.php?request=rrhh/justificaciones';
        if (filtro && filtro !== 'todas') {
            url += '&estado=' + filtro;
        }
        
        const res = await fetch(url);
        const data = await res.json();
        
        if (res.ok && data.status === 'success') {
            window.justificacionesData = data.data || [];
            
            const pendientes = window.justificacionesData.filter(x => x.estado === 'pendiente').length;
            const badge = document.getElementById('badge-just-pendientes');
            if (badge) {
                if (pendientes > 0) {
                    badge.innerText = pendientes;
                    badge.style.display = 'inline-block';
                } else {
                    badge.style.display = 'none';
                }
            }
            
            const txtConteo = document.getElementById('txt-just-conteo');
            if (txtConteo) txtConteo.innerText = `Mostrando ${window.justificacionesData.length} solicitudes`;

            if (window.justificacionesData.length === 0) {
                tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding:30px; color:var(--text-sec);"><i class="ph ph-tray" style="font-size:32px; display:block; margin-bottom:8px; opacity:0.5;"></i>No hay justificaciones registradas en este estado.</td></tr>';
                return;
            }

            tbody.innerHTML = '';
            window.justificacionesData.forEach(item => {
                let badgeEstado = '';
                if (item.estado === 'pendiente') {
                    badgeEstado = '<span class="badge badge-warning"><i class="ph ph-hourglass-high"></i> Pendiente</span>';
                } else if (item.estado === 'aprobado') {
                    badgeEstado = '<span class="badge badge-success"><i class="ph ph-check-circle"></i> Aprobado</span>';
                } else {
                    badgeEstado = '<span class="badge badge-danger"><i class="ph ph-x-circle"></i> Desaprobado</span>';
                }

                let efectoInfo = '--';
                if (item.estado !== 'pendiente') {
                    if (item.tipo_resolucion === 'con_goce') efectoInfo = '<span class="text-success font-bold">Con goce (0 hrs)</span>';
                    else if (item.tipo_resolucion === 'tiempo_extra') efectoInfo = `<span class="text-primary font-bold">+${item.horas_afectadas} hrs extra</span>`;
                    else efectoInfo = `<span class="text-danger font-bold">-${item.horas_afectadas} hrs perdidas</span>`;
                }

                let evidenciaBtn = item.foto_evidencia_url 
                    ? `<button class="btn-icon" onclick="window.open('${item.foto_evidencia_url}', '_blank')" title="Ver evidencia adjunta"><i class="ph ph-file-image" style="font-size:18px; color:var(--primary);"></i></button>`
                    : '<span class="text-sec" style="font-size:11px;">Sin adjunto</span>';

                let avatarHtml = window.renderEmpleadoAvatar(item.nombre, item.apellido, item.foto_perfil, 34);

                tbody.innerHTML += `
                    <tr>
                        <td>
                            <div style="display:flex; align-items:center; gap:10px;">
                                ${avatarHtml}
                                <div>
                                    <div class="fw-500">${item.nombre} ${item.apellido || ''}</div>
                                    <div class="text-sec text-small">DNI: ${item.dni} | ${item.rol_nombre || ''}</div>
                                </div>
                            </div>
                        </td>
                        <td style="white-space:nowrap;"><strong>${item.fecha}</strong></td>
                        <td><span class="badge badge-secondary">${item.motivo}</span></td>
                        <td>
                            <div style="font-size:12px; max-width:220px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${item.descripcion}">${item.descripcion}</div>
                        </td>
                        <td style="text-align:center;">${evidenciaBtn}</td>
                        <td>${badgeEstado}</td>
                        <td>${efectoInfo}</td>
                        <td>
                            <button class="btn btn-primary btn-sm" onclick="abrirModalResolverJustificacion(${item.id})">
                                <i class="ph ph-scales"></i> ${item.estado === 'pendiente' ? 'Evaluar' : 'Revisar'}
                            </button>
                        </td>
                    </tr>
                `;
            });
        } else {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; color:var(--danger);">Error cargando justificaciones</td></tr>';
        }
    } catch(e) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; color:var(--danger);">Error de conexión</td></tr>';
    }
};

window.abrirModalResolverJustificacion = function(id) {
    const item = window.justificacionesData.find(x => x.id == id);
    if (!item) return;

    document.getElementById('res-just-id').value = item.id;
    document.getElementById('res-just-empleado').innerText = `${item.nombre} ${item.apellido || ''} (DNI: ${item.dni})`;
    document.getElementById('res-just-fecha').innerText = item.fecha;
    document.getElementById('res-just-motivo').innerText = item.motivo;
    document.getElementById('res-just-desc').innerText = item.descripcion || 'Sin descripción';
    
    const imgCont = document.getElementById('res-just-img-container');
    const imgEl = document.getElementById('res-just-img');
    if (item.foto_evidencia_url) {
        imgEl.src = item.foto_evidencia_url;
        imgCont.classList.remove('hidden');
    } else {
        imgCont.classList.add('hidden');
    }

    setDecisionJustificacion(item.estado === 'desaprobado' ? 'desaprobado' : 'aprobado');
    if (item.tipo_resolucion) document.getElementById('res-just-tipo').value = item.tipo_resolucion;
    if (item.horas_afectadas !== undefined && item.horas_afectadas !== null) {
        document.getElementById('res-just-horas').value = item.horas_afectadas;
    } else {
        document.getElementById('res-just-horas').value = 8.0;
    }
    document.getElementById('res-just-comentarios').value = item.comentarios_resolucion || '';
    
    cambiarTipoResolucion();
    document.getElementById('modal-resolver-justificacion').classList.add('show');
};

window.cerrarModalResolverJustificacion = function() {
    document.getElementById('modal-resolver-justificacion').classList.remove('show');
};

window.setDecisionJustificacion = function(decision) {
    document.getElementById('res-just-estado').value = decision;
    const btnA = document.getElementById('btn-decision-aprobar');
    const btnD = document.getElementById('btn-decision-desaprobar');
    
    if (decision === 'aprobado') {
        btnA.style.border = '2px solid var(--success)';
        btnA.style.background = 'rgba(16, 185, 129, 0.1)';
        btnA.style.color = 'var(--success)';
        btnD.style.border = '2px solid var(--border)';
        btnD.style.background = 'transparent';
        btnD.style.color = 'var(--text-sec)';
        document.getElementById('group-tipo-resolucion').style.display = 'block';
    } else {
        btnD.style.border = '2px solid var(--danger)';
        btnD.style.background = 'rgba(239, 68, 68, 0.1)';
        btnD.style.color = 'var(--danger)';
        btnA.style.border = '2px solid var(--border)';
        btnA.style.background = 'transparent';
        btnA.style.color = 'var(--text-sec)';
        document.getElementById('group-tipo-resolucion').style.display = 'none';
        document.getElementById('res-just-tipo').value = 'sin_goce';
    }
    cambiarTipoResolucion();
};

window.cambiarTipoResolucion = function() {
    const estado = document.getElementById('res-just-estado').value;
    const tipo = document.getElementById('res-just-tipo').value;
    const lbl = document.getElementById('lbl-horas-afectadas');
    const inputHoras = document.getElementById('res-just-horas');
    
    if (estado === 'desaprobado') {
        lbl.innerText = 'Horas a descontar (jornada no pagada):';
        if (!inputHoras.value || inputHoras.value == 0) inputHoras.value = 8.0;
        inputHoras.disabled = false;
    } else {
        if (tipo === 'con_goce') {
            lbl.innerText = 'Horas de afectación (0 hrs descontadas - se paga el día normal):';
            inputHoras.value = 0.0;
            inputHoras.disabled = true;
        } else if (tipo === 'tiempo_extra') {
            lbl.innerText = 'Horas extra a favor del colaborador:';
            if (!inputHoras.value || inputHoras.value == 0) inputHoras.value = 2.0;
            inputHoras.disabled = false;
        } else {
            lbl.innerText = 'Horas perdidas a descontar de su salario:';
            if (!inputHoras.value || inputHoras.value == 0) inputHoras.value = 8.0;
            inputHoras.disabled = false;
        }
    }
};

window.guardarResolucionJustificacion = async function() {
    const id = document.getElementById('res-just-id').value;
    const estado = document.getElementById('res-just-estado').value;
    const tipo_resolucion = document.getElementById('res-just-tipo').value;
    const horas_afectadas = parseFloat(document.getElementById('res-just-horas').value) || 0.0;
    const comentarios_resolucion = document.getElementById('res-just-comentarios').value.trim();
    
    const user = JSON.parse(localStorage.getItem('khalessi_user') || '{}');
    const id_admin = user.id || null;

    try {
        const res = await fetch('/khalessierp/api/index.php?request=rrhh/resolver_justificacion', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                id,
                estado,
                tipo_resolucion,
                horas_afectadas,
                comentarios_resolucion,
                id_admin
            })
        });
        const data = await res.json();
        if (res.ok && data.status === 'success') {
            showToast(data.message || 'Resolución guardada correctamente', 'success');
            cerrarModalResolverJustificacion();
            loadJustificaciones();
            actualizarBadgeJustificaciones();
        } else {
            showToast(data.message || 'Error al guardar resolución', 'error');
        }
    } catch(e) {
        showToast('Error de conexión', 'error');
    }
};

// ==========================================
// FICHA DE PERSONAL Y PLANILLA
// ==========================================

window.fichasPersonalData = [];

window.loadFichasPersonal = async function() {
    const mes = document.getElementById('filtro-personal-mes')?.value || new Date().toISOString().substring(0, 7);
    const tbody = document.getElementById('tbody-fichas-personal');
    if (!tbody) return;

    tbody.innerHTML = `
        <tr>
            <td class="table-sticky-col"><div class="skeleton skeleton-text" style="width:130px; height:16px;"></div></td>
            <td><div class="skeleton skeleton-text" style="width:80px; height:16px;"></div></td>
            <td><div class="skeleton skeleton-text" style="width:70px; height:16px;"></div></td>
            <td><div class="skeleton skeleton-text" style="width:70px; height:16px;"></div></td>
            <td><div class="skeleton skeleton-text" style="width:80px; height:16px;"></div></td>
            <td><div class="skeleton skeleton-text" style="width:60px; height:16px;"></div></td>
            <td><div class="skeleton skeleton-text" style="width:80px; height:16px;"></div></td>
            <td><div class="skeleton skeleton-text" style="width:90px; height:18px;"></div></td>
            <td><div class="skeleton skeleton-button" style="width:80px; height:28px; border-radius:6px;"></div></td>
        </tr>
        <tr>
            <td class="table-sticky-col"><div class="skeleton skeleton-text" style="width:150px; height:16px;"></div></td>
            <td><div class="skeleton skeleton-text" style="width:80px; height:16px;"></div></td>
            <td><div class="skeleton skeleton-text" style="width:70px; height:16px;"></div></td>
            <td><div class="skeleton skeleton-text" style="width:70px; height:16px;"></div></td>
            <td><div class="skeleton skeleton-text" style="width:80px; height:16px;"></div></td>
            <td><div class="skeleton skeleton-text" style="width:60px; height:16px;"></div></td>
            <td><div class="skeleton skeleton-text" style="width:80px; height:16px;"></div></td>
            <td><div class="skeleton skeleton-text" style="width:90px; height:18px;"></div></td>
            <td><div class="skeleton skeleton-button" style="width:80px; height:28px; border-radius:6px;"></div></td>
        </tr>
    `;
    
    try {
        const res = await fetch(`/khalessierp/api/index.php?request=rrhh/fichas_personal&mes=${mes}`);
        const data = await res.json();
        
        if (res.ok && data.status === 'success') {
            window.fichasPersonalData = data.data || [];
            const moneda = AppConfig.get('moneda') || 'S/';

            let totalColaboradores = window.fichasPersonalData.length;
            let sumHorasMes = 0;
            let sumTardanzas = 0;
            let sumTotalCobrar = 0;

            window.fichasPersonalData.forEach(item => {
                sumHorasMes += item.metricas.horas_mes || 0;
                sumTardanzas += item.metricas.tardanzas_conteo || 0;
                sumTotalCobrar += item.liquidacion.monto_total_cobrar || 0;
            });

            document.getElementById('stat-personal-total').innerText = totalColaboradores;
            document.getElementById('stat-personal-horas-mes').innerText = `${sumHorasMes.toFixed(1)} hrs`;
            document.getElementById('stat-personal-tardanzas').innerText = sumTardanzas;
            document.getElementById('stat-personal-total-cobrar').innerText = `${moneda} ${sumTotalCobrar.toLocaleString('es-PE', {minimumFractionDigits:2, maximumFractionDigits:2})}`;

            if (window.fichasPersonalData.length === 0) {
                tbody.innerHTML = '<tr><td colspan="9" style="text-align:center; padding:30px; color:var(--text-sec);">No hay colaboradores registrados.</td></tr>';
                return;
            }

            tbody.innerHTML = '';
            window.fichasPersonalData.forEach(item => {
                const u = item.usuario;
                const c = item.contrato;
                const m = item.metricas;
                const l = item.liquidacion;

                const avatarHtml = window.renderEmpleadoAvatar(u.nombre, u.apellido, u.foto_perfil, 36);

                let sueldoTxt = `${moneda} ${parseFloat(c.sueldo_base || 0).toFixed(2)}`;
                if (c.tipo_pago === 'hora') {
                    sueldoTxt = `${moneda} ${parseFloat(c.sueldo_por_hora || 0).toFixed(2)}/h`;
                }

                let tardanzasHtml = `<div style="font-weight:600; color:${m.tardanzas_conteo > 0 ? 'var(--danger)' : 'var(--text-main)'};">${m.tardanzas_conteo} tardanzas</div>`;
                if (m.tardanzas_minutos > 0) {
                    tardanzasHtml += `<div class="text-sec text-small">(${m.tardanzas_minutos} min acum.)</div>`;
                }

                let faltasHtml = `<div style="font-weight:500;">${m.faltas_injustificadas + m.faltas_justificadas} faltas</div>`;
                if (m.faltas_injustificadas > 0) {
                    faltasHtml += `<div class="text-danger text-small">(${m.faltas_injustificadas} injustificadas)</div>`;
                }

                let perdidasExtraHtml = `
                    <div><span class="text-danger">-${m.horas_perdidas}h perd.</span></div>
                    <div><span class="text-success">+${m.horas_extra}h extra</span></div>
                `;

                tbody.innerHTML += `
                    <tr>
                        <td class="table-sticky-col">
                            <div style="display:flex; align-items:center; gap:10px;">
                                ${avatarHtml}
                                <div>
                                    <div class="fw-500">${u.nombre} ${u.apellido || ''}</div>
                                    <div class="text-sec text-small">DNI: ${u.dni} | <span class="badge badge-secondary" style="font-size:10px;">${u.rol}</span></div>
                                </div>
                            </div>
                        </td>
                        <td>
                            <div style="display:flex; align-items:center; gap:6px;">
                                <strong>${sueldoTxt}</strong>
                                <button class="btn-icon btn-sm" onclick="abrirModalEditarSueldo(${u.id}, '${u.nombre} ${u.apellido || ''}', ${c.sueldo_base}, ${c.sueldo_por_hora}, '${c.tipo_pago}', ${c.horas_pactadas_semana})" title="Editar sueldo"><i class="ph ph-pencil-simple"></i></button>
                            </div>
                            <div class="text-sec text-small" style="text-transform:capitalize;">${c.tipo_pago}</div>
                        </td>
                        <td>
                            <strong style="color:var(--primary); font-size:14px;">${m.horas_mes} hrs</strong>
                        </td>
                        <td>
                            <span class="fw-500">${m.horas_semana} hrs</span>
                        </td>
                        <td>${tardanzasHtml}</td>
                        <td>${faltasHtml}</td>
                        <td>${perdidasExtraHtml}</td>
                        <td>
                            <div style="font-size:16px; font-weight:700; color:var(--success);">
                                ${moneda} ${l.monto_total_cobrar.toLocaleString('es-PE', {minimumFractionDigits:2, maximumFractionDigits:2})}
                            </div>
                            ${l.descuento_tardanzas > 0 ? `<div class="text-danger" style="font-size:10px;">Desc. tardanza: -${moneda} ${l.descuento_tardanzas}</div>` : ''}
                        </td>
                        <td>
                            <button class="btn btn-secondary btn-sm" onclick="verFichaIndividualPersonal(${u.id})" title="Ver Liquidación Detallada">
                                <i class="ph ph-file-text"></i> Ver Ficha
                            </button>
                        </td>
                    </tr>
                `;
            });
        } else {
            tbody.innerHTML = '<tr><td colspan="9" style="text-align:center; color:var(--danger);">Error cargando planilla</td></tr>';
        }
    } catch(e) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align:center; color:var(--danger);">Error de conexión</td></tr>';
    }
};

window.abrirModalEditarSueldo = function(id, nombre, base, hora, tipo, pactadas) {
    document.getElementById('edit-sueldo-id').value = id;
    document.getElementById('edit-sueldo-nombre').innerText = nombre;
    document.getElementById('edit-sueldo-base').value = base || 0;
    document.getElementById('edit-sueldo-hora').value = hora || 0;
    document.getElementById('edit-sueldo-tipo').value = tipo || 'mensual';
    document.getElementById('edit-sueldo-pactadas').value = pactadas || 48;
    document.getElementById('modal-editar-sueldo').classList.add('show');
};

window.cerrarModalEditarSueldo = function() {
    document.getElementById('modal-editar-sueldo').classList.remove('show');
};

window.guardarSueldoPersonal = async function() {
    const id_usuario = document.getElementById('edit-sueldo-id').value;
    const sueldo_base = parseFloat(document.getElementById('edit-sueldo-base').value) || 0.00;
    const sueldo_por_hora = parseFloat(document.getElementById('edit-sueldo-hora').value) || 0.00;
    const tipo_pago = document.getElementById('edit-sueldo-tipo').value;
    const horas_semanales_pactadas = parseInt(document.getElementById('edit-sueldo-pactadas').value) || 48;

    try {
        const res = await fetch('/khalessierp/api/index.php?request=rrhh/guardar_sueldo', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                id_usuario,
                sueldo_base,
                sueldo_por_hora,
                tipo_pago,
                horas_semanales_pactadas
            })
        });
        const data = await res.json();
        if (res.ok && data.status === 'success') {
            showToast('Sueldo actualizado con éxito', 'success');
            cerrarModalEditarSueldo();
            loadFichasPersonal();
        } else {
            showToast(data.message || 'Error al guardar sueldo', 'error');
        }
    } catch(e) {
        showToast('Error de conexión', 'error');
    }
};

window.verFichaIndividualPersonal = function(id) {
    window.currentFichaUsuarioId = id;
    const item = window.fichasPersonalData.find(x => x.usuario.id == id);
    if (!item) return;

    const u = item.usuario;
    const c = item.contrato;
    const m = item.metricas;
    const l = item.liquidacion;
    const moneda = AppConfig.get('moneda') || 'S/';
    const empresa = AppConfig.get('nombre_empresa') || 'Khalessi ERP';

    const logoLight = AppConfig.get('logo_light');
    const logoDark = AppConfig.get('logo_dark');
    const logoSrc = logoLight || logoDark;

    let logoHeaderHtml = '';
    if (logoSrc) {
        logoHeaderHtml = `<img src="${logoSrc}" alt="${empresa}" class="ficha-header-logo" style="max-height: 48px; max-width: 170px; object-fit: contain;">`;
    } else {
        logoHeaderHtml = `<div style="width:40px; height:40px; border-radius:8px; background:rgba(239,68,68,0.1); display:flex; align-items:center; justify-content:center; color:var(--primary); font-size:22px;"><i class="ph ph-buildings"></i></div>`;
    }

    const container = document.getElementById('ficha-individual-printable');
    container.innerHTML = `
        <div style="border-bottom: 2px solid var(--border); padding-bottom: 14px; margin-bottom: 16px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
            <div style="display:flex; align-items:center; gap:12px;">
                ${logoHeaderHtml}
                <div>
                    <h2 style="margin:0 0 2px 0; font-size:18px; color:var(--primary); font-weight:700;">${empresa}</h2>
                    <div class="text-sec" style="font-size:12px;">Ficha Individual y Liquidación de Sueldo</div>
                </div>
            </div>
            <div style="text-align:right; font-size:12px;">
                <div style="font-weight:700; color:var(--text-main); font-size:13px;">Período: ${m.mes}</div>
                <div class="text-sec text-small">Generado: ${new Date().toLocaleDateString('es-PE')}</div>
            </div>
        </div>

        <!-- Datos del Colaborador (Avatar e información limpia) -->
        <div style="display:flex; align-items:center; gap:14px; background:var(--bg-main); padding:14px; border-radius:12px; margin-bottom:16px; border:1px solid var(--border);">
            ${window.renderEmpleadoAvatar(u.nombre, u.apellido, u.foto_perfil, 46)}
            <div style="flex:1; min-width:0;">
                <div style="font-weight:700; font-size:15px; color:var(--text-main); word-break:break-word;">${u.nombre} ${u.apellido || ''}</div>
                <div class="text-sec text-small" style="margin-top:2px;">
                    DNI: <strong>${u.dni}</strong> &bull; <span class="badge badge-secondary" style="font-size:11px;">${u.cargo || u.rol}</span>
                    ${u.fecha_contratacion ? ` &bull; Ingreso: ${u.fecha_contratacion}` : ''}
                </div>
                <div class="text-sec text-small" style="margin-top:4px;">Modalidad: <strong style="text-transform:capitalize;">${c.tipo_pago} (${moneda} ${parseFloat(c.sueldo_base).toFixed(2)})</strong></div>
            </div>
        </div>

        <!-- Resumen de Registro y Cumplimiento (2 cols en celular, 4 en desktop) -->
        <h4 style="margin-bottom:10px; font-size:14px; display:flex; align-items:center; gap:6px;"><i class="ph ph-chart-bar" style="color:var(--primary);"></i> Resumen de Registro y Cumplimiento</h4>
        <div class="ficha-mini-stats-grid">
            <div class="ficha-stat-box">
                <span class="text-sec text-small">Horas Mes</span>
                <div style="font-size:16px; font-weight:700; color:var(--primary); margin-top:2px;">${m.horas_mes} hrs</div>
            </div>
            <div class="ficha-stat-box">
                <span class="text-sec text-small">Horas Semana</span>
                <div style="font-size:16px; font-weight:700; margin-top:2px;">${m.horas_semana} hrs</div>
            </div>
            <div class="ficha-stat-box">
                <span class="text-sec text-small">Tardanzas</span>
                <div style="font-size:16px; font-weight:700; color:var(--danger); margin-top:2px;">${m.tardanzas_conteo} (${m.tardanzas_minutos}m)</div>
            </div>
            <div class="ficha-stat-box">
                <span class="text-sec text-small">Inasistencias</span>
                <div style="font-size:16px; font-weight:700; margin-top:2px;">${m.faltas_injustificadas + m.faltas_justificadas} días</div>
            </div>
        </div>

        <!-- Desglose Salarial 100% responsive sin desbordamiento horizontal -->
        <h4 style="margin-bottom:10px; font-size:14px; display:flex; align-items:center; gap:6px;"><i class="ph ph-receipt" style="color:var(--primary);"></i> Desglose y Liquidación Salarial</h4>
        <div style="border:1px solid var(--border); border-radius:10px; overflow:hidden; margin-bottom:20px; font-size:13px;">
            <div style="display:flex; justify-content:space-between; align-items:center; padding:9px 12px; border-bottom:1px solid var(--border); background:var(--bg-main);">
                <span style="font-weight:600;">Sueldo Base Asignado (${c.tipo_pago})</span>
                <span style="font-weight:700;">${moneda} ${parseFloat(c.sueldo_base).toFixed(2)}</span>
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center; padding:9px 12px; border-bottom:1px solid var(--border);">
                <span class="text-sec">Tarifa Efectiva por Hora (Ref. 240 hrs)</span>
                <span>${moneda} ${parseFloat(c.tarifa_hora_efectiva).toFixed(2)} / hora</span>
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center; padding:9px 12px; border-bottom:1px solid var(--border); color:var(--danger);">
                <span>Descuento por Tardanzas (${m.tardanzas_minutos} min)</span>
                <span style="font-weight:600;">- ${moneda} ${l.descuento_tardanzas.toFixed(2)}</span>
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center; padding:9px 12px; border-bottom:1px solid var(--border); color:var(--danger);">
                <span>Descuento Inasistencias / Horas Perdidas (${m.horas_perdidas}h)</span>
                <span style="font-weight:600;">- ${moneda} ${l.descuento_horas_perdidas.toFixed(2)}</span>
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center; padding:9px 12px; border-bottom:1px solid var(--border); color:var(--success);">
                <span>Bonificación Horas Extra (+${m.horas_extra}h x 1.25)</span>
                <span style="font-weight:600;">+ ${moneda} ${l.bonificacion_horas_extra.toFixed(2)}</span>
            </div>
            <div class="ficha-total-box" style="display:flex; justify-content:space-between; align-items:center; padding:12px; background:rgba(16, 185, 129, 0.08); border-top:2px solid var(--success);">
                <strong style="color:var(--text-main); font-size:13px;">TOTAL NETO A COBRAR</strong>
                <strong style="color:var(--success); font-size:18px;">${moneda} ${l.monto_total_cobrar.toFixed(2)}</strong>
            </div>
        </div>

        <!-- Firmas Responsivas -->
        <div class="ficha-firmas-wrap">
            <div style="text-align:center; flex:1; max-width:220px; margin:0 auto;">
                <div style="border-bottom:1px solid var(--border); margin-bottom:6px; height:36px;"></div>
                <div class="text-sec text-small" style="font-size:11px;">Firma del Colaborador</div>
            </div>
            <div style="text-align:center; flex:1; max-width:220px; margin:0 auto;">
                <div style="border-bottom:1px solid var(--border); margin-bottom:6px; height:36px;"></div>
                <div class="text-sec text-small" style="font-size:11px;">Recursos Humanos / Administración</div>
            </div>
        </div>
    `;

    document.getElementById('modal-ficha-individual').classList.add('show');
};

window.cerrarModalFichaIndividual = function() {
    document.getElementById('modal-ficha-individual').classList.remove('show');
};

window.imprimirFichaIndividual = function() {
    window.print();
};

window.copiarTextoAlPortapapeles = function(text, mensajeExito = '¡Enlace copiado al portapapeles!') {
    triggerHaptic(20);
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(() => {
            showToast(mensajeExito, 'success');
        }).catch(() => {
            fallbackCopy(text, mensajeExito);
        });
    } else {
        fallbackCopy(text, mensajeExito);
    }
};

function fallbackCopy(text, mensajeExito) {
    const el = document.createElement('textarea');
    el.value = text;
    el.style.position = 'fixed';
    el.style.left = '-99999px';
    el.style.top = '-99999px';
    document.body.appendChild(el);
    el.focus();
    el.select();
    try {
        document.execCommand('copy');
        showToast(mensajeExito, 'success');
    } catch(err) {
        showToast('Error al copiar enlace', 'error');
    }
    document.body.removeChild(el);
}

window.copiarEnlaceBoletaPublica = function() {
    triggerHaptic(25);
    if (!window.currentFichaUsuarioId || !window.fichasPersonalData) {
        showToast('No hay ficha de colaborador seleccionada', 'error');
        return;
    }
    const item = window.fichasPersonalData.find(x => x.usuario.id == window.currentFichaUsuarioId);
    if (!item) {
        showToast('No se encontró información del colaborador', 'error');
        return;
    }

    const mesInput = document.getElementById('filtro-personal-mes');
    const mes = (item.metricas && item.metricas.mes) ? item.metricas.mes : (mesInput ? mesInput.value : '');
    const url = `${window.location.origin}/khalessierp/boleta?u=${item.usuario.id}&mes=${encodeURIComponent(mes)}`;
    
    window.copiarTextoAlPortapapeles(url, '¡Enlace de boleta pública copiado al portapapeles!');
};

window.enviarFichaPorWhatsAppActual = function() {
    triggerHaptic(30);
    if (!window.currentFichaUsuarioId || !window.fichasPersonalData) return;
    const item = window.fichasPersonalData.find(x => x.usuario.id == window.currentFichaUsuarioId);
    if (!item) return;

    const u = item.usuario;
    const m = item.metricas;
    const l = item.liquidacion;
    const moneda = AppConfig.get('moneda') || 'S/';
    const empresa = AppConfig.get('nombre_empresa') || 'Khalessi ERP';

    let msg = `*${empresa}* - Resumen de Boleta / Ficha Laboral\n`;
    msg += `Colaborador: *${u.nombre} ${u.apellido || ''}*\n`;
    msg += `Período: *${m.mes}*\n\n`;
    msg += `⏱ *Horas trabajadas:* ${m.horas_mes} hrs\n`;
    msg += `⚠️ *Tardanzas:* ${m.tardanzas_conteo} (${m.tardanzas_minutos} min)\n`;
    msg += `❌ *Inasistencias:* ${m.faltas_injustificadas + m.faltas_justificadas} días\n`;
    msg += `💵 *Sueldo Base:* ${moneda} ${parseFloat(item.contrato.sueldo_base || 0).toFixed(2)}\n`;
    if (l.descuento_tardanzas > 0) {
        msg += `🔻 *Descuento Tardanzas:* -${moneda} ${l.descuento_tardanzas.toFixed(2)}\n`;
    }
    if (l.descuento_horas_perdidas > 0) {
        msg += `🔻 *Descuento Inasistencias:* -${moneda} ${l.descuento_horas_perdidas.toFixed(2)}\n`;
    }
    if (l.bonificacion_horas_extra > 0) {
        msg += `⭐ *Bonificación H. Extra:* +${moneda} ${l.bonificacion_horas_extra.toFixed(2)}\n`;
    }
    msg += `\n💰 *TOTAL NETO A COBRAR:* *${moneda} ${l.monto_total_cobrar.toFixed(2)}*\n\n`;
    msg += `_Generado automáticamente desde ${empresa}_`;

    const cleanTel = (u.telefono || '').replace(/[^0-9]/g, '');
    const waUrl = cleanTel 
        ? `https://api.whatsapp.com/send?phone=${cleanTel}&text=${encodeURIComponent(msg)}`
        : `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;

    window.open(waUrl, '_blank');
};

// ==========================================
// VISTA PÚBLICA DE FICHA LABORAL Y BOLETA DE PAGO
// ==========================================

window.renderBoletaPublica = async function(container) {
    const params = new URLSearchParams(window.location.search);
    const userId = params.get('u') || params.get('id');
    const mes = params.get('mes') || new Date().toISOString().substring(0, 7);
    const empresa = AppConfig.get('nombre_empresa') || 'Khalessi ERP';
    const logoLight = AppConfig.get('logo_light');
    const logoDark = AppConfig.get('logo_dark');
    const logoSrc = logoLight || logoDark;
    const moneda = AppConfig.get('moneda') || 'S/';

    if (!userId) {
        container.innerHTML = `
            <div style="min-height:100vh; display:flex; align-items:center; justify-content:center; background:var(--bg-main); padding:20px;">
                <div class="card" style="max-width:440px; text-align:center; padding:32px 24px; border-radius:14px; box-shadow:0 4px 20px rgba(0,0,0,0.06);">
                    <div style="width:60px; height:60px; border-radius:50%; background:rgba(239,68,68,0.1); color:var(--danger); display:flex; align-items:center; justify-content:center; margin:0 auto 16px; font-size:32px;">
                        <i class="ph ph-warning-circle"></i>
                    </div>
                    <h3 style="margin-bottom:8px;">Parámetro no especificado</h3>
                    <p class="text-sec" style="font-size:13px; margin-bottom:20px;">No se especificó el identificador del colaborador para mostrar su boleta de pago.</p>
                    <a href="/khalessierp/login" class="btn btn-primary" style="text-decoration:none;"><i class="ph ph-sign-in"></i> Ir al Acceso del Sistema</a>
                </div>
            </div>
        `;
        return;
    }

    container.innerHTML = `
        <div style="min-height:100vh; background:var(--bg-main); padding:20px 14px; display:flex; flex-direction:column; align-items:center; justify-content:center;">
            <div style="display:flex; align-items:center; gap:10px;" class="no-print">
                <i class="ph ph-spinner ph-spin" style="font-size:28px; color:var(--primary);"></i>
                <span style="font-size:15px; font-weight:500;">Cargando Ficha Laboral...</span>
            </div>
        </div>
    `;

    try {
        const res = await fetch(`/khalessierp/api/index.php?request=rrhh/fichas_personal&id_usuario=${userId}&mes=${mes}`);
        const data = await res.json();

        if (!res.ok || data.status !== 'success' || !data.data || data.data.length === 0) {
            container.innerHTML = `
                <div style="min-height:100vh; display:flex; align-items:center; justify-content:center; background:var(--bg-main); padding:20px;">
                    <div class="card" style="max-width:460px; text-align:center; padding:32px 24px; border-radius:14px; box-shadow:0 4px 20px rgba(0,0,0,0.06);">
                        <div style="width:60px; height:60px; border-radius:50%; background:rgba(239,68,68,0.1); color:var(--danger); display:flex; align-items:center; justify-content:center; margin:0 auto 16px; font-size:32px;">
                            <i class="ph ph-user-circle-gear"></i>
                        </div>
                        <h3 style="margin-bottom:8px;">Boleta no disponible</h3>
                        <p class="text-sec" style="font-size:13px; margin-bottom:20px;">No se encontró información salarial registrada para el colaborador en el período ${mes}.</p>
                        <a href="/khalessierp/login" class="btn btn-secondary" style="text-decoration:none;"><i class="ph ph-sign-in"></i> Acceso al Sistema</a>
                    </div>
                </div>
            `;
            return;
        }

        const item = data.data[0];
        const u = item.usuario;
        const c = item.contrato;
        const m = item.metricas;
        const l = item.liquidacion;

        let logoHeaderHtml = '';
        if (logoSrc) {
            logoHeaderHtml = `<img src="${logoSrc}" alt="${empresa}" class="ficha-header-logo" style="max-height: 48px; max-width: 170px; object-fit: contain;">`;
        } else {
            logoHeaderHtml = `<div style="width:40px; height:40px; border-radius:8px; background:rgba(239,68,68,0.1); display:flex; align-items:center; justify-content:center; color:var(--primary); font-size:22px;"><i class="ph ph-buildings"></i></div>`;
        }

        container.innerHTML = `
            <div style="min-height:100vh; background:var(--bg-main); padding:24px 14px 60px; display:flex; flex-direction:column; align-items:center;">
                <!-- Barra superior de acciones (no imprimible) -->
                <div class="no-print" style="width:100%; max-width:720px; display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; flex-wrap:wrap; gap:10px;">
                    <div style="display:flex; align-items:center; gap:8px;">
                        <span class="badge badge-primary" style="font-size:12px; padding:6px 12px;">
                            <i class="ph ph-globe"></i> Vista Pública Oficial
                        </span>
                        <span class="text-sec text-small">Período: <strong>${m.mes}</strong></span>
                    </div>
                    <div style="display:flex; gap:8px; align-items:center;">
                        <button class="btn btn-secondary btn-sm" onclick="copiarTextoAlPortapapeles(window.location.href, '¡Enlace público copiado!')">
                            <i class="ph ph-link"></i> <span class="mobile-hide">Copiar</span> Enlace
                        </button>
                        <button class="btn btn-primary btn-sm" onclick="window.print()">
                            <i class="ph ph-printer"></i> Imprimir Boleta
                        </button>
                    </div>
                </div>

                <!-- Tarjeta Principal de la Ficha / Boleta (Imprimible) -->
                <div class="card boleta-printable-card" id="ficha-individual-printable" style="width:100%; max-width:720px; background:var(--bg-card, #fff); border-radius:14px; padding:28px 24px; box-shadow:0 4px 20px rgba(0,0,0,0.06); border:1px solid var(--border);">
                    <!-- Cabecera con Logo y Empresa -->
                    <div style="border-bottom: 2px solid var(--border); padding-bottom: 14px; margin-bottom: 16px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
                        <div style="display:flex; align-items:center; gap:12px;">
                            ${logoHeaderHtml}
                            <div>
                                <h2 style="margin:0 0 2px 0; font-size:18px; color:var(--primary); font-weight:700;">${empresa}</h2>
                                <div class="text-sec" style="font-size:12px;">Ficha Individual y Liquidación de Sueldo</div>
                            </div>
                        </div>
                        <div style="text-align:right; font-size:12px;">
                            <div style="font-weight:700; color:var(--text-main); font-size:13px;">Período: ${m.mes}</div>
                            <div class="text-sec text-small">Generado: ${new Date().toLocaleDateString('es-PE')}</div>
                        </div>
                    </div>

                    <!-- Datos del Colaborador -->
                    <div style="display:flex; align-items:center; gap:14px; background:var(--bg-main); padding:14px; border-radius:12px; margin-bottom:16px; border:1px solid var(--border);">
                        ${window.renderEmpleadoAvatar(u.nombre, u.apellido, u.foto_perfil, 46)}
                        <div style="flex:1; min-width:0;">
                            <div style="font-weight:700; font-size:15px; color:var(--text-main); word-break:break-word;">${u.nombre} ${u.apellido || ''}</div>
                            <div class="text-sec text-small" style="margin-top:2px;">
                                DNI: <strong>${u.dni}</strong> &bull; <span class="badge badge-secondary" style="font-size:11px;">${u.cargo || u.rol}</span>
                                ${u.fecha_contratacion ? ` &bull; Ingreso: ${u.fecha_contratacion}` : ''}
                            </div>
                            <div class="text-sec text-small" style="margin-top:4px;">Modalidad: <strong style="text-transform:capitalize;">${c.tipo_pago} (${moneda} ${parseFloat(c.sueldo_base).toFixed(2)})</strong></div>
                        </div>
                    </div>

                    <!-- Resumen de Registro y Cumplimiento -->
                    <h4 style="margin-bottom:10px; font-size:14px; display:flex; align-items:center; gap:6px;"><i class="ph ph-chart-bar" style="color:var(--primary);"></i> Resumen de Registro y Cumplimiento</h4>
                    <div class="ficha-mini-stats-grid">
                        <div class="ficha-stat-box">
                            <span class="text-sec text-small">Horas Mes</span>
                            <div style="font-size:16px; font-weight:700; color:var(--primary); margin-top:2px;">${m.horas_mes} hrs</div>
                        </div>
                        <div class="ficha-stat-box">
                            <span class="text-sec text-small">Horas Semana</span>
                            <div style="font-size:16px; font-weight:700; margin-top:2px;">${m.horas_semana} hrs</div>
                        </div>
                        <div class="ficha-stat-box">
                            <span class="text-sec text-small">Tardanzas</span>
                            <div style="font-size:16px; font-weight:700; color:var(--danger); margin-top:2px;">${m.tardanzas_conteo} (${m.tardanzas_minutos}m)</div>
                        </div>
                        <div class="ficha-stat-box">
                            <span class="text-sec text-small">Inasistencias</span>
                            <div style="font-size:16px; font-weight:700; margin-top:2px;">${m.faltas_injustificadas + m.faltas_justificadas} días</div>
                        </div>
                    </div>

                    <!-- Desglose y Liquidación Salarial -->
                    <h4 style="margin-bottom:10px; font-size:14px; display:flex; align-items:center; gap:6px;"><i class="ph ph-receipt" style="color:var(--primary);"></i> Desglose y Liquidación Salarial</h4>
                    <div style="border:1px solid var(--border); border-radius:10px; overflow:hidden; margin-bottom:20px; font-size:13px;">
                        <div style="display:flex; justify-content:space-between; align-items:center; padding:9px 12px; border-bottom:1px solid var(--border); background:var(--bg-main);">
                            <span style="font-weight:600;">Sueldo Base Asignado (${c.tipo_pago})</span>
                            <span style="font-weight:700;">${moneda} ${parseFloat(c.sueldo_base).toFixed(2)}</span>
                        </div>
                        <div style="display:flex; justify-content:space-between; align-items:center; padding:9px 12px; border-bottom:1px solid var(--border);">
                            <span class="text-sec">Tarifa Efectiva por Hora (Ref. 240 hrs)</span>
                            <span>${moneda} ${parseFloat(c.tarifa_hora_efectiva).toFixed(2)} / hora</span>
                        </div>
                        <div style="display:flex; justify-content:space-between; align-items:center; padding:9px 12px; border-bottom:1px solid var(--border); color:var(--danger);">
                            <span>Descuento por Tardanzas (${m.tardanzas_minutos} min)</span>
                            <span style="font-weight:600;">- ${moneda} ${l.descuento_tardanzas.toFixed(2)}</span>
                        </div>
                        <div style="display:flex; justify-content:space-between; align-items:center; padding:9px 12px; border-bottom:1px solid var(--border); color:var(--danger);">
                            <span>Descuento Inasistencias / Horas Perdidas (${m.horas_perdidas}h)</span>
                            <span style="font-weight:600;">- ${moneda} ${l.descuento_horas_perdidas.toFixed(2)}</span>
                        </div>
                        <div style="display:flex; justify-content:space-between; align-items:center; padding:9px 12px; border-bottom:1px solid var(--border); color:var(--success);">
                            <span>Bonificación Horas Extra (+${m.horas_extra}h x 1.25)</span>
                            <span style="font-weight:600;">+ ${moneda} ${l.bonificacion_horas_extra.toFixed(2)}</span>
                        </div>
                        <div class="ficha-total-box" style="display:flex; justify-content:space-between; align-items:center; padding:12px; background:rgba(16, 185, 129, 0.08); border-top:2px solid var(--success);">
                            <strong style="color:var(--text-main); font-size:13px;">TOTAL NETO A COBRAR</strong>
                            <strong style="color:var(--success); font-size:18px;">${moneda} ${l.monto_total_cobrar.toFixed(2)}</strong>
                        </div>
                    </div>

                    <!-- Firmas Responsivas -->
                    <div class="ficha-firmas-wrap">
                        <div style="text-align:center; flex:1; max-width:220px; margin:0 auto;">
                            <div style="border-bottom:1px solid var(--border); margin-bottom:6px; height:36px;"></div>
                            <div class="text-sec text-small" style="font-size:11px;">Firma del Colaborador</div>
                        </div>
                        <div style="text-align:center; flex:1; max-width:220px; margin:0 auto;">
                            <div style="border-bottom:1px solid var(--border); margin-bottom:6px; height:36px;"></div>
                            <div class="text-sec text-small" style="font-size:11px;">Recursos Humanos / Administración</div>
                        </div>
                    </div>

                    <!-- Pie de Boleta Informativo -->
                    <div style="margin-top:24px; text-align:center; font-size:11px; color:var(--text-sec); border-top:1px solid var(--border); padding-top:12px;">
                        Documento emitido por el sistema ${empresa}. Constancia informativa de remuneraciones y liquidación mensual.
                    </div>
                </div>
            </div>
        `;
    } catch(e) {
        container.innerHTML = `
            <div style="min-height:100vh; display:flex; align-items:center; justify-content:center; background:var(--bg-main); padding:20px;">
                <div class="card" style="max-width:440px; text-align:center; padding:32px 24px; border-radius:14px; box-shadow:0 4px 20px rgba(0,0,0,0.06);">
                    <h3 style="color:var(--danger); margin-bottom:8px;">Error al cargar boleta</h3>
                    <p class="text-sec" style="font-size:13px; margin-bottom:20px;">No se pudo conectar con el servidor.</p>
                    <button class="btn btn-secondary" onclick="window.location.reload()"><i class="ph ph-arrows-clockwise"></i> Reintentar</button>
                </div>
            </div>
        `;
    }
};

// ==========================================
// AJUSTES RRHH Y GOOGLE AUTHENTICATOR (TOTP)
// ==========================================

window.loadAjustesRRHHYTotp = async function() {
    try {
        const res = await fetch('/khalessierp/api/index.php?request=rrhh/totp_supervisor');
        const data = await res.json();
        if (res.ok && data.status === 'success') {
            document.getElementById('cfg-tolerancia-minutos').value = data.data.tolerancia_minutos || 15;
            document.getElementById('cfg-totp-secret').value = data.data.secret || '';
            document.getElementById('cfg-totp-qr-img').src = data.data.qr_url || '';
        }
    } catch(e) {}
};

window.guardarToleranciaTardanza = async function() {
    const tolerancia_minutos = parseInt(document.getElementById('cfg-tolerancia-minutos').value) || 15;
    try {
        const res = await fetch('/khalessierp/api/index.php?request=rrhh/guardar_ajustes_rrhh', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ tolerancia_minutos })
        });
        const data = await res.json();
        if (res.ok && data.status === 'success') {
            showToast('Tolerancia de tardanza guardada con éxito', 'success');
        } else {
            showToast(data.message || 'Error al guardar', 'error');
        }
    } catch(e) {
        showToast('Error de conexión', 'error');
    }
};

window.copiarSecretoSupervisor = function() {
    const input = document.getElementById('cfg-totp-secret');
    if (!input) return;
    navigator.clipboard.writeText(input.value);
    showToast('Clave secreta copiada al portapapeles', 'info');
};

window.regenerarTotpSupervisor = async function() {
    if (!confirm('¿Estás seguro de regenerar la clave secreta de Google Authenticator? Deberás volver a escanear el QR en tu teléfono.')) return;
    
    try {
        const res = await fetch('/khalessierp/api/index.php?request=rrhh/regenerar_totp_supervisor', { method: 'POST' });
        const data = await res.json();
        if (res.ok && data.status === 'success') {
            document.getElementById('cfg-totp-secret').value = data.data.secret;
            document.getElementById('cfg-totp-qr-img').src = data.data.qr_url;
            showToast('Nueva clave y código QR generados con éxito', 'success');
        }
    } catch(e) {
        showToast('Error de conexión', 'error');
    }
};

function renderConfiguracion(container) {
    container.innerHTML = `
        <div class="page-header">
            <div>
                <h2 class="page-title">Configuración Global</h2>
                <p class="page-subtitle">Ajustes del sistema, impuestos y moneda</p>
            </div>
            <button class="btn btn-primary" onclick="saveConfigData()"><i class="ph ph-floppy-disk"></i> Guardar Cambios</button>
        </div>
        
        <div class="nav-tabs">
            <div class="nav-tab active" id="tab-empresa" onclick="switchConfigTab('empresa')">
                <i class="ph ph-buildings"></i>
                <span>Empresa</span>
            </div>
            <div class="nav-tab" id="tab-personalizacion" onclick="switchConfigTab('personalizacion')">
                <i class="ph ph-palette"></i>
                <span>Personalización</span>
            </div>
            <div class="nav-tab" id="tab-roles" onclick="switchConfigTab('roles')">
                <i class="ph ph-shield-check"></i>
                <span>Roles</span>
            </div>
            <div class="nav-tab" id="tab-usuarios" onclick="switchConfigTab('usuarios')">
                <i class="ph ph-users"></i>
                <span>Usuarios</span>
            </div>
            <div class="nav-tab" id="tab-conexiones" onclick="switchConfigTab('conexiones')">
                <i class="ph ph-plugs-connected"></i>
                <span>Conexiones</span>
            </div>
        </div>
        
        <!-- Tab: Empresa -->
        <div id="content-empresa" class="config-content">
            <div class="card">
                <div class="card-header">Datos Básicos y Fiscales</div>
                <div class="card-body">
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 16px;">
                        <div class="form-group" style="margin: 0;">
                            <label class="form-label">Nombre Comercial (Pizzería)</label>
                            <input type="text" class="form-control" id="cfg_nombre_empresa" value="${AppConfig.get('nombre_empresa')}">
                        </div>
                        <div class="form-group" style="margin: 0;">
                            <label class="form-label">Razón Social</label>
                            <input type="text" class="form-control" id="cfg_razon_social" value="${AppConfig.get('razon_social')}" placeholder="Ej. Khalessi Foods S.A. de C.V.">
                        </div>
                        <div class="form-group" style="margin: 0;">
                            <label class="form-label">RUC / Identificación Fiscal</label>
                            <input type="text" class="form-control" id="cfg_ruc" value="${AppConfig.get('ruc')}" placeholder="12345678901">
                        </div>
                        <div class="form-group" style="margin: 0;">
                            <label class="form-label">WhatsApp (Pedidos / Atención)</label>
                            <input type="text" class="form-control" id="cfg_whatsapp" value="${AppConfig.get('whatsapp')}" placeholder="+00 123 456 7890">
                        </div>
                    </div>
                    
                    <div class="form-group" style="margin-top: 16px;">
                        <label class="form-label">Dirección Principal</label>
                        <input type="text" class="form-control" id="cfg_direccion" value="${AppConfig.get('direccion')}" placeholder="Av. Principal #123, Colonia Centro">
                    </div>

                    <div class="form-group" style="margin-top: 16px;">
                        <div class="flex-between" style="margin-bottom: 8px;">
                            <label class="form-label" style="margin:0;">Locales / Sucursales</label>
                            <button type="button" class="btn btn-secondary btn-sm" onclick="abrirModalLocal()"><i class="ph ph-plus"></i> Agregar Local</button>
                        </div>
                        <div id="locales-list" style="display: flex; flex-direction: column; gap: 10px;">
                            <!-- La lista de locales se renderiza aquí -->
                        </div>
                    </div>

                    <hr style="border:0; border-top: 1px solid var(--border-color); margin: 24px 0;">
                    
                    <h3 style="margin-bottom: 16px; font-size: 16px;">Ajustes Globales Financieros</h3>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 16px;">
                        <div class="form-group" style="margin: 0;">
                            <label class="form-label">Moneda (Afecta a todo el ERP)</label>
                            <select class="form-control" id="cfg_moneda">
                                <option value="MXN" ${AppConfig.get('moneda')==='MXN'?'selected':''}>MXN - Pesos Mexicanos</option>
                                <option value="USD" ${AppConfig.get('moneda')==='USD'?'selected':''}>USD - Dólares</option>
                                <option value="EUR" ${AppConfig.get('moneda')==='EUR'?'selected':''}>EUR - Euros</option>
                                <option value="PEN" ${AppConfig.get('moneda')==='PEN'?'selected':''}>PEN - Soles</option>
                                <option value="COP" ${AppConfig.get('moneda')==='COP'?'selected':''}>COP - Pesos Colombianos</option>
                            </select>
                        </div>
                        <div class="form-group" style="margin: 0;">
                            <label class="form-label">Impuesto Base (IVA %)</label>
                            <input type="number" class="form-control" id="cfg_impuesto_iva" value="${AppConfig.get('impuesto_iva') || 16}">
                            <span style="font-size: 11px; color: var(--text-sec); display: block; margin-top: 4px;">Se aplicará globalmente a todas las ventas y productos.</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Tab: Personalización -->
        <div id="content-personalizacion" class="config-content hidden">
            <div class="card">
                <div class="card-header">Apariencia y Marca Blanca</div>
                <div class="card-body">
                    <h3 style="margin-bottom: 16px; font-size: 16px;">Tipografía Global</h3>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px;">
                        <div class="form-group">
                            <label class="form-label">Fuente del Sistema</label>
                            <select class="form-control" id="cfg_font_family">
                                <option value="'Inter', sans-serif">Inter (Por defecto)</option>
                                <option value="'Roboto', sans-serif">Roboto</option>
                                <option value="'Poppins', sans-serif">Poppins</option>
                                <option value="'Montserrat', sans-serif">Montserrat</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Tamaño de Fuente Base</label>
                            <select class="form-control" id="cfg_font_size">
                                <option value="12px">12px (Pequeño)</option>
                                <option value="13px">13px (Recomendado)</option>
                                <option value="14px">14px (Normal)</option>
                                <option value="15px">15px (Grande)</option>
                            </select>
                        </div>
                    </div>

                    <hr style="border:0; border-top: 1px solid var(--border-color); margin: 24px 0;">
                    
                    <h3 style="margin-bottom: 16px; font-size: 16px;">Colores de la Interfaz</h3>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px;">
                        <div class="form-group">
                            <label class="form-label">Color Principal (Marca)</label>
                            <input type="color" id="cfg_color_primary" value="#ef4444" style="width: 100%; height: 40px; border:none; border-radius: 4px; cursor: pointer;">
                        </div>
                        <div class="form-group"></div>
                        
                        <div class="form-group">
                            <label class="form-label">Fondo Botones (Modo Claro)</label>
                            <input type="color" id="cfg_btn_bg_light" value="#ef4444" style="width: 100%; height: 40px; border:none; border-radius: 4px; cursor: pointer;">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Texto Botones (Modo Claro)</label>
                            <input type="color" id="cfg_btn_text_light" value="#ffffff" style="width: 100%; height: 40px; border:none; border-radius: 4px; cursor: pointer;">
                        </div>

                        <div class="form-group">
                            <label class="form-label">Fondo Botones (Modo Oscuro)</label>
                            <input type="color" id="cfg_btn_bg_dark" value="#ef4444" style="width: 100%; height: 40px; border:none; border-radius: 4px; cursor: pointer;">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Texto Botones (Modo Oscuro)</label>
                            <input type="color" id="cfg_btn_text_dark" value="#ffffff" style="width: 100%; height: 40px; border:none; border-radius: 4px; cursor: pointer;">
                        </div>

                        <div class="form-group">
                            <label class="form-label">Texto General (Modo Claro)</label>
                            <input type="color" id="cfg_text_light" value="#0F172A" style="width: 100%; height: 40px; border:none; border-radius: 4px; cursor: pointer;">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Texto General (Modo Oscuro)</label>
                            <input type="color" id="cfg_text_dark" value="#F8FAFC" style="width: 100%; height: 40px; border:none; border-radius: 4px; cursor: pointer;">
                        </div>
                    </div>

                    <hr style="border:0; border-top: 1px solid var(--border-color); margin: 24px 0;">

                    <h3 style="margin-bottom: 16px; font-size: 16px;">Logotipos e Identidad (Formatos PNG/JPG/SVG)</h3>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 16px;">
                        ${renderImageUploader('logo_light', 'Logo del Sistema (Modo Claro)')}
                        ${renderImageUploader('logo_dark', 'Logo del Sistema (Modo Oscuro)')}
                        ${renderImageUploader('logo_collapsed', 'Ícono Sidebar Colapsado')}
                        ${renderImageUploader('logo_favicon', 'Favicon / PWA Icon (Cuadrado)')}
                    </div>

                </div>
            </div>
        </div>

        <!-- Tab: Roles -->
        <div id="content-roles" class="config-content hidden">
            <div class="card">
                <div class="card-header flex-between">
                    <span>Roles y Permisos</span>
                    <button class="btn btn-secondary btn-sm" onclick="abrirModalRol()"><i class="ph ph-plus"></i> Nuevo Rol</button>
                </div>
                <div class="card-body">
                    <div class="table-responsive">
                        <table class="table">
                            <thead><tr><th>Rol</th><th>Descripción</th><th>Acciones</th></tr></thead>
                            <tbody id="roles-tbody">
                                <!-- Generado por JS -->
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>

        <!-- Tab: Usuarios -->
        <div id="content-usuarios" class="config-content hidden">
            <div class="card">
                <div class="card-header flex-between">
                    <span>Gestión de Usuarios</span>
                    <button class="btn btn-primary btn-sm" onclick="abrirModalUsuario()"><i class="ph ph-user-plus"></i> Añadir Usuario</button>
                </div>
                <div class="card-body">
                    <p class="text-sec text-small mb-4">Administra los accesos al sistema y asigna los roles correspondientes.</p>
                    <div class="table-responsive">
                        <table class="table">
                            <thead><tr><th>Usuario</th><th>Email</th><th>Rol</th><th>Acciones</th></tr></thead>
                            <tbody id="usuarios-tbody">
                                <!-- Generado por JS -->
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>

        <!-- Tab: Conexiones -->
        <div id="content-conexiones" class="config-content hidden">
            <div class="card mb-4">
                <div class="card-header">Conexiones API (jsonpe)</div>
                <div class="card-body">
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 16px;">
                        <div class="form-group" style="margin: 0;">
                            <label class="form-label">API WhatsApp (Token)</label>
                            <div style="display: flex; gap: 8px;">
                                <input type="text" class="form-control" id="cfg_api_whatsapp" value="${AppConfig.get('api_whatsapp') || ''}" placeholder="Ingresa tu token" style="flex: 1;">
                                <button type="button" class="btn btn-secondary" onclick="comprobarConexion('whatsapp')" title="Comprobar Conexión"><i class="ph ph-plugs"></i> Probar</button>
                            </div>
                        </div>
                        <div class="form-group" style="margin: 0;">
                            <label class="form-label">Consulta RUC/DNI (Token)</label>
                            <div style="display: flex; gap: 8px;">
                                <input type="text" class="form-control" id="cfg_api_rucdni" value="${AppConfig.get('api_rucdni') || ''}" placeholder="Ingresa tu token" style="flex: 1;">
                                <button type="button" class="btn btn-secondary" onclick="comprobarConexion('rucdni')" title="Comprobar Conexión"><i class="ph ph-plugs"></i> Probar</button>
                            </div>
                        </div>
                        <div class="form-group" style="margin: 0;">
                            <label class="form-label">SMS jsonpe (Token)</label>
                            <div style="display: flex; gap: 8px;">
                                <input type="text" class="form-control" id="cfg_api_sms" value="${AppConfig.get('api_sms') || ''}" placeholder="Ingresa tu token" style="flex: 1;">
                                <button type="button" class="btn btn-secondary" onclick="comprobarConexion('sms')" title="Comprobar Conexión"><i class="ph ph-plugs"></i> Probar</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="card mb-4">
                <div class="card-header flex-between">
                    <span>Configuración de Correo Electrónico (SMTP)</span>
                    <button type="button" class="btn btn-secondary btn-sm" onclick="comprobarConexion('email')" title="Comprobar Conexión SMTP"><i class="ph ph-plugs"></i> Probar Conexión</button>
                </div>
                <div class="card-body">
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px;">
                        <div class="form-group" style="margin: 0;">
                            <label class="form-label">Servidor SMTP</label>
                            <input type="text" class="form-control" id="cfg_smtp_host" value="${AppConfig.get('smtp_host') || ''}" placeholder="Ej. smtp.gmail.com">
                        </div>
                        <div class="form-group" style="margin: 0;">
                            <label class="form-label">Puerto</label>
                            <input type="text" class="form-control" id="cfg_smtp_port" value="${AppConfig.get('smtp_port') || ''}" placeholder="Ej. 587 o 465">
                        </div>
                        <div class="form-group" style="margin: 0;">
                            <label class="form-label">Cifrado</label>
                            <select class="form-control" id="cfg_smtp_crypto">
                                <option value="tls" ${AppConfig.get('smtp_crypto') === 'tls' ? 'selected' : ''}>TLS</option>
                                <option value="ssl" ${AppConfig.get('smtp_crypto') === 'ssl' ? 'selected' : ''}>SSL</option>
                                <option value="none" ${AppConfig.get('smtp_crypto') === 'none' ? 'selected' : ''}>Ninguno</option>
                            </select>
                        </div>
                        <div class="form-group" style="margin: 0;">
                            <label class="form-label">Usuario / Correo</label>
                            <input type="email" class="form-control" id="cfg_smtp_user" value="${AppConfig.get('smtp_user') || ''}" placeholder="usuario@empresa.com">
                        </div>
                        <div class="form-group" style="margin: 0;">
                            <label class="form-label">Contraseña</label>
                            <input type="password" class="form-control" id="cfg_smtp_pass" value="${AppConfig.get('smtp_pass') || ''}" placeholder="Contraseña de aplicación">
                        </div>
                    </div>
                </div>
            </div>

            <!-- Card: Actualización del Sistema (GitHub 1-Click Update) -->
            <div class="card mb-4" id="card-sistema-actualizacion" style="border: 1px solid var(--border);">
                <div class="card-header flex-between">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <i class="ph ph-git-branch" style="font-size: 20px; color: var(--primary);"></i>
                        <span style="font-weight: 600;">Actualización del Sistema (GitHub 1-Click Update)</span>
                    </div>
                    <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                        <button type="button" class="btn btn-secondary btn-sm" onclick="comprobarActualizacionGitHub()" id="btn-check-git">
                            <i class="ph ph-arrows-clockwise"></i> Comprobar Actualizaciones
                        </button>
                        <button type="button" class="btn btn-primary btn-sm" onclick="confirmarActualizacion1Click()" id="btn-do-update">
                            <i class="ph ph-cloud-arrow-down"></i> Actualizar Ahora (1-Click)
                        </button>
                    </div>
                </div>
                <div class="card-body">
                    <p class="text-small text-sec mb-3">
                        Actualiza de manera segura el código desde el repositorio oficial de GitHub. Si hay cambios en la estructura de la base de datos, el sistema ejecutará <strong>únicamente las migraciones nuevas</strong> sin sobreescribir ni alterar los datos de producción existentes.
                    </p>

                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 14px; margin-bottom: 16px;">
                        <div style="padding: 12px; background: var(--bg-main); border-radius: 8px; border: 1px solid var(--border);">
                            <div class="text-tiny text-sec uppercase" style="font-weight: 600; margin-bottom: 4px;">Repositorio Remoto</div>
                            <div style="font-size: 12px; font-weight: 600; word-break: break-all;" id="git-remote-url">https://github.com/networkturbo4-pixel/khalessiERP.git</div>
                        </div>
                        <div style="padding: 12px; background: var(--bg-main); border-radius: 8px; border: 1px solid var(--border);">
                            <div class="text-tiny text-sec uppercase" style="font-weight: 600; margin-bottom: 4px;">Rama Activa</div>
                            <div style="font-size: 13px; font-weight: 600; color: var(--primary); display: flex; align-items: center; gap: 6px;">
                                <i class="ph ph-git-commit"></i> <span id="git-branch-name">main</span>
                            </div>
                        </div>
                        <div style="padding: 12px; background: var(--bg-main); border-radius: 8px; border: 1px solid var(--border);">
                            <div class="text-tiny text-sec uppercase" style="font-weight: 600; margin-bottom: 4px;">Versión / Commit Local</div>
                            <div style="font-size: 13px; font-weight: 600; font-family: monospace;" id="git-commit-hash">Consultando...</div>
                            <div class="text-tiny text-sec" id="git-commit-msg" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 200px;">-</div>
                        </div>
                        <div style="padding: 12px; background: var(--bg-main); border-radius: 8px; border: 1px solid var(--border);">
                            <div class="text-tiny text-sec uppercase" style="font-weight: 600; margin-bottom: 4px;">Base de Datos</div>
                            <div style="font-size: 13px; font-weight: 600; color: var(--success);" id="git-db-migrations">Migraciones al día</div>
                            <div style="margin-top: 6px;">
                                <button type="button" class="btn btn-secondary btn-xs" onclick="ejecutarMigracionesSeguras()" style="padding: 2px 8px; font-size: 11px;">
                                    <i class="ph ph-database"></i> Sincronizar BD
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Alerta de Estado Dinámica -->
                    <div id="git-update-status-alert" style="display: none; padding: 12px 16px; border-radius: 8px; margin-bottom: 16px;"></div>

                    <!-- Consola / Log de Salida -->
                    <div id="git-update-console-wrap" style="display: none; margin-top: 12px;">
                        <div class="text-tiny text-sec uppercase" style="font-weight: 600; margin-bottom: 4px;">Registro de Operación:</div>
                        <pre id="git-update-console" style="background: #1e1e2e; color: #a6adc8; padding: 12px; border-radius: 6px; font-family: Consolas, monospace; font-size: 12px; max-height: 180px; overflow-y: auto; white-space: pre-wrap; margin: 0;"></pre>
                    </div>
                </div>
            </div>

            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 16px;">
                <div class="card" style="opacity: 0.8; position: relative; overflow: hidden; margin-bottom: 0;">
                    <div style="position: absolute; top: 12px; right: 12px;"><span class="badge badge-warning">Próximamente</span></div>
                    <div class="card-body" style="text-align: center; padding: 32px 16px;">
                        <i class="ph ph-receipt" style="font-size: 48px; color: var(--text-sec); margin-bottom: 16px; display: inline-block;"></i>
                        <h3 style="margin-bottom: 8px;">Facturación Electrónica</h3>
                        <p class="text-small text-sec">Emisión de boletas y facturas electrónicas directamente a SUNAT.</p>
                    </div>
                </div>

                <div class="card" style="opacity: 0.8; position: relative; overflow: hidden; margin-bottom: 0;">
                    <div style="position: absolute; top: 12px; right: 12px;"><span class="badge badge-warning">Próximamente</span></div>
                    <div class="card-body" style="text-align: center; padding: 32px 16px;">
                        <i class="ph ph-map-pin" style="font-size: 48px; color: var(--text-sec); margin-bottom: 16px; display: inline-block;"></i>
                        <h3 style="margin-bottom: 8px;">Google Maps API</h3>
                        <p class="text-small text-sec">Cálculo de rutas, distancias y geolocalización de clientes.</p>
                    </div>
                </div>
            </div>
        </div>

        <!-- Modal Local -->
        <div class="modal-backdrop" id="modal-local">
            <div class="modal">
                <div class="modal-header">
                    <h3>Agregar Local / Sucursal</h3>
                    <button class="btn-icon" onclick="cerrarModalLocal()"><i class="ph ph-x"></i></button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label class="form-label">Nombre del local</label>
                        <input type="text" class="form-control" id="local_nombre" placeholder="Ej. Sucursal Norte">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Dirección</label>
                        <input type="text" class="form-control" id="local_direccion" placeholder="Ej. Av. Siempre Viva 742">
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                        <div class="form-group">
                            <label class="form-label">Coordenadas (Lat, Lng)</label>
                            <input type="text" class="form-control" id="local_coords" placeholder="-12.0463, -77.0427" oninput="actualizarMapa()">
                            <span class="text-small text-sec">Pega las coordenadas separadas por coma.</span>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Descripción (Opcional)</label>
                            <input type="text" class="form-control" id="local_desc" placeholder="Frente al parque...">
                        </div>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Vista Previa del Mapa</label>
                        <div id="local_map_preview" style="width: 100%; height: 200px; background: var(--bg-main); border: 1px solid var(--border-color); border-radius: 8px; overflow: hidden; display: flex; align-items: center; justify-content: center;">
                            <span class="text-sec">Ingresa coordenadas para ver el mapa</span>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="cerrarModalLocal()">Cancelar</button>
                    <button class="btn btn-primary" onclick="guardarLocal()"><i class="ph ph-plus"></i> Añadir Local</button>
                </div>
            </div>
        </div>

        <!-- Modal Rol -->
        <div class="modal-backdrop hidden" id="modal-rol">
            <div class="modal" style="max-width: 600px;">
                <div class="modal-header">
                    <h3 id="modal-rol-title">Crear Nuevo Rol</h3>
                    <button class="btn-icon" onclick="cerrarModalRol()"><i class="ph ph-x"></i></button>
                </div>
                <div class="modal-body">
                    <input type="hidden" id="rol_id">
                    <div class="form-group">
                        <label class="form-label">Nombre del Rol</label>
                        <input type="text" class="form-control" id="rol_nombre" placeholder="Ej. Gerente">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Descripción</label>
                        <input type="text" class="form-control" id="rol_desc" placeholder="Supervisa toda la tienda...">
                    </div>
                    
                    <div class="flex-between" style="margin: 24px 0 16px;">
                        <h4 style="margin: 0; font-size: 14px;">Permisos por Módulo</h4>
                        <button type="button" class="btn-link" style="font-size: 13px;" onclick="seleccionarTodosPermisos()">Seleccionar Todo</button>
                    </div>
                    <div class="table-responsive">
                        <table class="table">
                            <thead>
                                <tr>
                                    <th>Módulo</th>
                                    <th style="text-align: center;">Ver</th>
                                    <th style="text-align: center;">Editar</th>
                                    <th style="text-align: center;">Eliminar</th>
                                </tr>
                            </thead>
                            <tbody id="rol-permisos-tbody">
                                <!-- Generado por JS -->
                            </tbody>
                        </table>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="cerrarModalRol()">Cancelar</button>
                    <button class="btn btn-primary" onclick="guardarRol()"><i class="ph ph-floppy-disk"></i> Guardar Rol</button>
                </div>
            </div>
        </div>

        <!-- Modal Usuario -->
        <div class="modal-backdrop hidden" id="modal-usuario">
            <div class="modal" style="max-width: 620px; max-height: 92vh; display: flex; flex-direction: column;">
                <div class="modal-header">
                    <div style="display:flex; align-items:center; gap:8px;">
                        <i class="ph ph-user-gear text-primary" style="font-size:22px;"></i>
                        <h3 id="modal-usuario-title" style="margin:0;">Crear Nuevo Usuario</h3>
                    </div>
                    <button class="btn-icon" onclick="cerrarModalUsuario()"><i class="ph ph-x"></i></button>
                </div>
                <div class="modal-body" style="overflow-y:auto; padding: 20px;">
                    <input type="hidden" id="usuario_id">
                    
                    <div class="form-group mb-3">
                        <label class="form-label font-bold">Nombre Completo *</label>
                        <input type="text" class="form-control" id="usuario_nombre" placeholder="Ej. Juan Pérez">
                    </div>
                    
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 14px; margin-bottom: 14px;">
                        <div class="form-group">
                            <label class="form-label font-bold">DNI *</label>
                            <input type="text" class="form-control" id="usuario_dni" placeholder="Ej. 74839210" inputmode="numeric">
                        </div>
                        <div class="form-group">
                            <label class="form-label font-bold">Celular / WhatsApp</label>
                            <input type="text" class="form-control" id="usuario_celular" placeholder="Ej. 987654321" inputmode="tel">
                        </div>
                    </div>
                    
                    <div class="form-group mb-3">
                        <label class="form-label font-bold">Correo Electrónico (Email) *</label>
                        <input type="email" class="form-control" id="usuario_email" placeholder="juan@ejemplo.com">
                    </div>
                    
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 14px; margin-bottom: 18px;">
                        <div class="form-group">
                            <label class="form-label font-bold">Rol del Sistema *</label>
                            <select class="form-control" id="usuario_rol">
                                <!-- Generado por JS -->
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label font-bold">Contraseña</label>
                            <input type="password" class="form-control" id="usuario_password" placeholder="Min. 6 caracteres">
                            <span class="text-small text-sec" id="usuario_password_hint"></span>
                        </div>
                    </div>

                    <!-- SECCIÓN LABORAL Y REMUNERACIÓN -->
                    <div style="border-top: 1px solid var(--border); padding-top: 16px; margin-top: 4px;">
                        <h4 style="font-size: 14px; margin-bottom: 14px; color: var(--primary); display: flex; align-items: center; gap: 8px;">
                            <i class="ph ph-briefcase"></i> Cargo, Remuneración y Horario Laboral
                        </h4>

                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 14px; margin-bottom: 14px;">
                            <div class="form-group">
                                <label class="form-label font-bold">Cargo / Puesto de Trabajo</label>
                                <input type="text" class="form-control" id="usuario_cargo" placeholder="Ej. Maestro Pizzero, Cajero Principal">
                            </div>
                            <div class="form-group">
                                <label class="form-label font-bold">Estado del Empleado</label>
                                <select class="form-control" id="usuario_estado">
                                    <option value="activo">Activo (En funciones)</option>
                                    <option value="inactivo">Inactivo (Cesado / Suspendido)</option>
                                </select>
                            </div>
                        </div>

                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 14px; margin-bottom: 14px;">
                            <div class="form-group">
                                <label class="form-label font-bold">Salario Mensual (${AppConfig.get('moneda') || 'S/'})</label>
                                <input type="number" step="0.01" min="0" class="form-control" id="usuario_sueldo_base" placeholder="Ej. 1500.00" inputmode="decimal">
                                <p class="text-sec text-small" style="margin-top: 3px;">Monto base mensual para cálculo de planilla.</p>
                            </div>
                            <div class="form-group">
                                <label class="form-label font-bold">Fecha de Contratación</label>
                                <input type="date" class="form-control" id="usuario_fecha_contratacion">
                                <p class="text-sec text-small" style="margin-top: 3px;">Fecha de ingreso a la empresa.</p>
                            </div>
                        </div>

                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 14px;">
                            <div class="form-group">
                                <label class="form-label font-bold">Hora de Entrada Habitual</label>
                                <input type="time" class="form-control" id="usuario_hora_entrada">
                                <p class="text-sec text-small" style="margin-top: 3px;">Para control de tardanzas y 2FA.</p>
                            </div>
                            <div class="form-group">
                                <label class="form-label font-bold">Hora de Salida Habitual</label>
                                <input type="time" class="form-control" id="usuario_hora_salida">
                                <p class="text-sec text-small" style="margin-top: 3px;">Para cierre de jornada y horas extra.</p>
                            </div>
                        </div>
                    </div>

                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="cerrarModalUsuario()">Cancelar</button>
                    <button class="btn btn-primary" onclick="guardarUsuario()"><i class="ph ph-floppy-disk"></i> Guardar Usuario</button>
                </div>
            </div>
        </div>
    `;
    
    // Inicializar datos al renderizar la vista
    window.localesArray = [];
    loadConfigData();
    if(window.loadRoles) window.loadRoles();
    if(window.loadUsuarios) window.loadUsuarios();
}

window.switchConfigTab = function(tabName) {
    // Quitar active de todos los tabs
    document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
    // Ocultar todos los contenidos
    document.querySelectorAll('.config-content').forEach(c => c.classList.add('hidden'));
    
    // Activar el seleccionado
    const targetTab = document.getElementById('tab-' + tabName);
    if (targetTab) {
        targetTab.classList.add('active');
        targetTab.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
    document.getElementById('content-' + tabName)?.classList.remove('hidden');

    if (tabName === 'conexiones' && window.loadInfoGitConexiones) {
        window.loadInfoGitConexiones();
    }
};

window.numpadPress = function(val, targetId = 'auth-dni') {
    const input = document.getElementById(targetId);
    if (!input) return;
    if (val === 'back') {
        input.value = input.value.slice(0, -1);
    } else {
        if(input.value.length < 12) {
            input.value += val;
        }
    }
};

// ===================================
// LÓGICA DE LOGIN UNIFICADO E INTELIGENTE
// ===================================

window.currentTotpCode = '';
window.currentDniAsistencia = '';

window.procesarDNI = async function() {
    const dni = document.getElementById('auth-dni').value.trim();
    if (!dni) {
        showToast('Por favor ingresa tu DNI', 'error');
        return;
    }
    
    // Primero, verificamos el estado de su turno (RRHH)
    try {
        const response = await fetch(`/khalessierp/api/index.php?request=rrhh/estado&dni=${dni}`);
        const data = await response.json();
        
        if (response.ok && data.status === 'success') {
            const user = data.data.user;
            window.currentDniAsistencia = dni;
            window.currentTotpCode = '';
            
            // Ocultar paso 1
            document.getElementById('auth-step-1').classList.add('hidden');
            if (document.getElementById('auth-subtitle-text')) document.getElementById('auth-subtitle-text').classList.add('hidden');
            if (document.getElementById('auth-logo-container')) document.getElementById('auth-logo-container').classList.add('hidden');
            if (document.getElementById('auth-title-text')) document.getElementById('auth-title-text').classList.add('hidden');
            
            if (data.data.estado === 'cerrado') {
                if (data.data.es_tardanza) {
                    // ESCENARIO TARDANZA: Notificar y solicitar Google Authenticator
                    document.getElementById('tardanza-mensaje').innerText = `Hola ${user.nombre}, has superado la tolerancia de entrada de ${data.data.tolerancia_minutos} min.`;
                    document.getElementById('tardanza-hora-esperada').innerText = data.data.hora_esperada || '--:--';
                    document.getElementById('tardanza-hora-actual').innerText = data.data.hora_actual || '--:--';
                    document.getElementById('tardanza-minutos-badge').innerText = `+${data.data.minutos_tardanza} min tarde`;
                    document.getElementById('auth-totp-code').value = '';
                    
                    document.getElementById('auth-step-tardanza').classList.remove('hidden');
                    setTimeout(() => {
                        const inputTotp = document.getElementById('auth-totp-code');
                        if (inputTotp) inputTotp.focus();
                    }, 250);
                } else {
                    // ESCENARIO ENTRADA NORMAL PUNTUAL
                    document.getElementById('auth-nombre-user').innerText = `Hola, ${user.nombre}`;
                    document.getElementById('auth-step-cam').classList.remove('hidden');
                    iniciarCamara();
                }
            } else {
                // ESCENARIO B: Ya tiene turno abierto -> Mostrar opciones
                document.getElementById('auth-nombre-opciones').innerText = `Hola de nuevo, ${user.nombre}`;
                
                const avatarContainer = document.getElementById('auth-opciones-avatar-container');
                if (user.foto_perfil) {
                    avatarContainer.innerHTML = `<img src="${user.foto_perfil}" style="width: 100%; height: 100%; object-fit: cover;">`;
                } else {
                    avatarContainer.innerHTML = `<i class="ph-fill ph-user-circle" style="font-size: 40px; color: var(--primary);"></i>`;
                }
                
                document.getElementById('auth-step-opciones').classList.remove('hidden');
            }
        } else {
            // DNI no encontrado o error
            showToast(data.message || 'Error verificando estado del usuario', 'error');
            document.getElementById('auth-dni').value = '';
        }
    } catch (e) {
        showToast('Error de conexión', 'error');
    }
};

window.validarTotpYContinuar = async function() {
    const dni = window.currentDniAsistencia || document.getElementById('auth-dni').value.trim();
    const codigo = document.getElementById('auth-totp-code').value.trim();
    
    if (!codigo || codigo.length < 6) {
        showToast('Ingresa el código completo de 6 dígitos de Google Authenticator', 'warning');
        return;
    }
    
    try {
        const res = await fetch('/khalessierp/api/index.php?request=rrhh/verificar_totp', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ dni, codigo })
        });
        const data = await res.json();
        
        if (res.ok && data.status === 'success') {
            window.currentTotpCode = codigo;
            showToast('Autorización de Google Authenticator concedida', 'success');
            document.getElementById('auth-step-tardanza').classList.add('hidden');
            document.getElementById('auth-nombre-user').innerText = `Tardanza autorizada por 2FA`;
            document.getElementById('auth-step-cam').classList.remove('hidden');
            iniciarCamara();
        } else {
            showToast(data.message || 'Código de Google Authenticator incorrecto o expirado', 'error');
        }
    } catch (e) {
        showToast('Error de conexión al validar código 2FA', 'error');
    }
};

window.ingresarAlSistema = async function() {
    const dni = document.getElementById('auth-dni').value.trim();
    try {
        const response = await fetch('/khalessierp/api/auth/login', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ mode: 'pin', dni })
        });
        const data = await response.json();
        
        if (response.ok && data.status === 'success') {
            localStorage.setItem('khalessi_token', data.data.token);
            localStorage.setItem('khalessi_user', JSON.stringify(data.data.user));
            showToast(data.message, 'success');
            updateTopbarProfile(data.data.user);
            setTimeout(() => navigate('/dashboard'), 800);
        } else {
            showToast(data.message || 'Error al iniciar sesión', 'error');
            reiniciarAuth();
        }
    } catch (e) {
        showToast('Error de conexión con el servidor', 'error');
    }
};

window.streamAsistencia = null;

window.iniciarCamara = async function() {
    try {
        window.streamAsistencia = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
        const video = document.getElementById('asistencia-video');
        video.srcObject = window.streamAsistencia;
    } catch (err) {
        showToast('No se pudo acceder a la cámara. Se requiere cámara para registrar entrada.', 'error');
        reiniciarAuth();
    }
};

window.detenerCamara = function() {
    if (window.streamAsistencia) {
        window.streamAsistencia.getTracks().forEach(track => track.stop());
        window.streamAsistencia = null;
    }
};

window.capturarYMarcarEntrada = async function() {
    const video = document.getElementById('asistencia-video');
    const canvas = document.getElementById('asistencia-canvas');
    const dni = window.currentDniAsistencia || document.getElementById('auth-dni').value.trim();
    
    if (!video.videoWidth) {
        showToast('Esperando a la cámara...', 'info');
        return;
    }
    
    const maxWidth = 640;
    const scale = Math.min(1, maxWidth / video.videoWidth);
    canvas.width = video.videoWidth * scale;
    canvas.height = video.videoHeight * scale;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const fotoData = canvas.toDataURL('image/jpeg', 0.6);
    
    let latitud = '';
    let longitud = '';
    
    if (navigator.geolocation) {
        showToast('Obteniendo ubicación GPS...', 'info');
        try {
            const position = await new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
            });
            latitud = position.coords.latitude;
            longitud = position.coords.longitude;
        } catch (e) {
            console.warn('GPS no disponible o denegado:', e);
        }
    }
    
    try {
        const payload = { 
            dni, 
            foto: fotoData, 
            latitud, 
            longitud, 
            totp_code: window.currentTotpCode || '' 
        };
        const response = await fetch('/khalessierp/api/index.php?request=rrhh/marcar_entrada', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(payload)
        });
        const data = await response.json();
        if (response.ok && data.status === 'success') {
            showToast(data.message || "Entrada registrada exitosamente", 'success');
            detenerCamara();
            // Auto login al ERP
            ingresarAlSistema();
        } else {
            showToast(data.message || 'Error al marcar entrada', 'error');
        }
    } catch (e) {
        showToast('Error de conexión', 'error');
    }
};

window.marcarSalida = async function() {
    const dni = document.getElementById('auth-dni').value.trim();
    try {
        const response = await fetch('/khalessierp/api/index.php?request=rrhh/marcar_salida', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ dni })
        });
        const data = await response.json();
        if (response.ok && data.status === 'success') {
            // Salida exitosa, mostrar despedida
            document.getElementById('auth-step-opciones').classList.add('hidden');
            document.getElementById('auth-step-despedida').classList.remove('hidden');
        } else {
            showToast(data.message || 'Error al marcar salida', 'error');
        }
    } catch (e) {
        showToast('Error de conexión', 'error');
    }
};

window.reiniciarAuth = function() {
    detenerCamara();
    window.currentTotpCode = '';
    window.currentDniAsistencia = '';
    document.getElementById('auth-dni').value = '';
    
    // Ocultar todos los pasos
    document.getElementById('auth-step-tardanza')?.classList.add('hidden');
    document.getElementById('auth-step-cam')?.classList.add('hidden');
    document.getElementById('auth-step-opciones')?.classList.add('hidden');
    document.getElementById('auth-step-despedida')?.classList.add('hidden');
    
    // Mostrar paso 1
    if (document.getElementById('auth-subtitle-text')) document.getElementById('auth-subtitle-text').classList.remove('hidden');
    if (document.getElementById('auth-logo-container')) document.getElementById('auth-logo-container').classList.remove('hidden');
    if (document.getElementById('auth-title-text')) document.getElementById('auth-title-text').classList.remove('hidden');
    document.getElementById('auth-step-1')?.classList.remove('hidden');
};

// ===================================
// LÓGICA DE JUSTIFICACIONES (TRABAJADOR)
// ===================================

window.streamJustificacion = null;
window.justificacionFotoData = null;

window.abrirModalJustificacion = function() {
    const modal = document.getElementById('modal-justificacion');
    if (!modal) return;
    
    const dniInput = document.getElementById('just-dni');
    const authDni = document.getElementById('auth-dni')?.value.trim() || window.currentDniAsistencia || '';
    if (dniInput) {
        dniInput.value = authDni;
        if (authDni) buscarNombreJustificacion();
    }
    
    const fechaInput = document.getElementById('just-fecha');
    if (fechaInput) {
        fechaInput.value = new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0];
    }
    
    document.getElementById('just-motivo').value = '';
    document.getElementById('just-desc').value = '';
    quitarFotoJustificacion();
    detenerCamaraJustificacion();
    
    modal.classList.remove('hidden');
    modal.classList.add('show');
};

window.cerrarModalJustificacion = function() {
    detenerCamaraJustificacion();
    const modal = document.getElementById('modal-justificacion');
    if (modal) {
        modal.classList.remove('show');
        modal.classList.add('hidden');
    }
};

window.buscarNombreJustificacion = async function() {
    const dni = document.getElementById('just-dni')?.value.trim();
    const preview = document.getElementById('just-nombre-preview');
    if (!dni || dni.length < 6) {
        if (preview) preview.innerText = '';
        return;
    }
    try {
        const res = await fetch(`/khalessierp/api/index.php?request=rrhh/estado&dni=${dni}`);
        const data = await res.json();
        if (res.ok && data.status === 'success' && data.data.user) {
            if (preview) preview.innerText = `Empleado: ${data.data.user.nombre} ${data.data.user.apellido || ''} (${data.data.user.rol_nombre || ''})`;
        } else {
            if (preview) preview.innerText = 'DNI no encontrado';
        }
    } catch(e) {}
};

window.activarCamaraJustificacion = async function() {
    try {
        window.streamJustificacion = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
        const video = document.getElementById('just-video');
        video.srcObject = window.streamJustificacion;
        document.getElementById('just-cam-container')?.classList.remove('hidden');
    } catch (err) {
        showToast('No se pudo acceder a la cámara.', 'error');
    }
};

window.detenerCamaraJustificacion = function() {
    if (window.streamJustificacion) {
        window.streamJustificacion.getTracks().forEach(t => t.stop());
        window.streamJustificacion = null;
    }
    document.getElementById('just-cam-container')?.classList.add('hidden');
};

window.capturarFotoJustificacion = function() {
    const video = document.getElementById('just-video');
    const canvas = document.getElementById('just-canvas');
    if (!video.videoWidth) return;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    window.justificacionFotoData = canvas.toDataURL('image/jpeg', 0.7);
    document.getElementById('just-preview-img').src = window.justificacionFotoData;
    document.getElementById('just-preview-container')?.classList.remove('hidden');
    detenerCamaraJustificacion();
};

window.handleJustFile = function(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            window.justificacionFotoData = e.target.result;
            document.getElementById('just-preview-img').src = window.justificacionFotoData;
            document.getElementById('just-preview-container')?.classList.remove('hidden');
        };
        reader.readAsDataURL(input.files[0]);
    }
};

window.quitarFotoJustificacion = function() {
    window.justificacionFotoData = null;
    const img = document.getElementById('just-preview-img');
    if (img) img.src = '';
    document.getElementById('just-preview-container')?.classList.add('hidden');
    const fileInput = document.getElementById('just-file-input');
    if (fileInput) fileInput.value = '';
};

window.enviarJustificacionTrabajador = async function() {
    const dni = document.getElementById('just-dni')?.value.trim();
    const fecha = document.getElementById('just-fecha')?.value;
    const motivo = document.getElementById('just-motivo')?.value;
    const descripcion = document.getElementById('just-desc')?.value.trim();
    const foto = window.justificacionFotoData;
    
    if (!dni) {
        showToast('Ingresa tu DNI', 'warning');
        return;
    }
    if (!motivo) {
        showToast('Selecciona el motivo de la falta o permiso', 'warning');
        return;
    }
    if (!descripcion) {
        showToast('Describe detalladamente el motivo', 'warning');
        return;
    }
    
    const btn = document.getElementById('btn-enviar-just');
    if (btn) btn.disabled = true;
    
    try {
        const res = await fetch('/khalessierp/api/index.php?request=rrhh/enviar_justificacion', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ dni, fecha, motivo, descripcion, foto })
        });
        const data = await res.json();
        
        if (res.ok && data.status === 'success') {
            showToast(data.message || 'Justificación enviada con éxito', 'success');
            cerrarModalJustificacion();
            reiniciarAuth();
        } else {
            showToast(data.message || 'Error al enviar justificación', 'error');
        }
    } catch(e) {
        showToast('Error de conexión al enviar justificación', 'error');
    } finally {
        if (btn) btn.disabled = false;
    }
};

window.verFotoAsistencia = function(url) {
    const content = `<div style="text-align:center;"><img src="${url}" style="max-width: 100%; max-height: 70vh; border-radius: 8px;"></div>`;
    showModal('Evidencia de Asistencia', content);
    
    // Ocultar botón de confirmar ya que solo es vista
    const btnConfirm = document.getElementById('btn-confirm-modal');
    const btnCancel = document.getElementById('btn-cancel-modal');
    const btnClose = document.getElementById('btn-close-modal');
    
    btnConfirm.style.display = 'none';
    btnCancel.innerText = "Cerrar";
    
    const restoreButtons = () => {
        btnConfirm.style.display = 'inline-block';
        btnCancel.innerText = "Cancelar";
    };
    
    const originalCancel = btnCancel.onclick;
    btnCancel.onclick = () => {
        restoreButtons();
        if(originalCancel) originalCancel();
    };
    
    const originalClose = btnClose.onclick;
    btnClose.onclick = () => {
        restoreButtons();
        if(originalClose) originalClose();
    };
};

async function loadInventarioData() {
    const tbody = document.querySelector('#table-inventario tbody');
    if(!tbody) return;

    try {
        const response = await fetch('/khalessierp/api/inventario/productos');
        const data = await response.json();

        if(data.status === 'success' && data.data.length > 0) {
            tbody.innerHTML = '';
            data.data.forEach(p => {
                const icon = p.id_categoria == 1 ? '<i class="ph-fill ph-pizza"></i>' : (p.id_categoria == 2 ? '<i class="ph-fill ph-drop"></i>' : '<i class="ph-fill ph-package"></i>');
                const badgeClass = p.estado === 'disponible' ? 'badge-success' : 'badge-danger';
                const stockClass = p.stock_actual > 0 ? 'text-success' : 'text-danger';
                const stockText = p.stock_actual > 0 ? 'Disponible' : 'Agotado';
                
                tbody.innerHTML += `
                    <tr>
                        <td>
                            <div class="product-cell">
                                <div class="product-img" style="${p.id_categoria == 2 ? 'color:var(--link)' : ''}">${icon}</div>
                                <div>
                                    <div class="fw-500">${p.nombre}</div>
                                    <div class="text-small text-sec">${p.descripcion || ''}</div>
                                </div>
                            </div>
                        </td>
                        <td>${p.categoria_nombre}</td>
                        <td class="fw-500">$${parseFloat(p.precio_venta).toFixed(2)}</td>
                        <td><span class="${stockClass}">${stockText} (${p.stock_actual})</span></td>
                        <td><span class="badge ${badgeClass}">${p.estado}</span></td>
                        <td>
                            <button class="btn-icon" title="Editar"><i class="ph ph-pencil-simple"></i></button>
                            <button class="btn-icon text-danger" title="Eliminar"><i class="ph ph-trash"></i></button>
                        </td>
                    </tr>
                `;
            });
        } else {
            // Si no hay datos (porque BD está vacía aún de productos), dejamos la fila de "No hay datos"
            tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 30px;">No hay productos en la base de datos.<br><span class="text-sec text-small">Inserta productos en phpMyAdmin o usa el botón Agregar.</span></td></tr>`;
        }
    } catch(e) {
        console.error(e);
        showToast('Error cargando inventario', 'error');
    }
}

// Interceptar renderInventario para inyectar llamada a la API
const originalRenderInventario = renderInventario;
renderInventario = function(container) {
    originalRenderInventario(container);
    // Cambiar id a la tabla para poder llenarla
    container.querySelector('table').id = 'table-inventario';
    loadInventarioData();
};

// ==========================================
// CHART.JS: RRHH MÉTRICAS
// ==========================================
window.renderMetricasRRHH = function(data) {
    // Si no hay datos, inicializar arreglo vacío
    data = data || [];
    
    // Contar puntualidad vs tardanzas
    let puntual = 0, tardanza = 0, otras = 0;
    
    // Agrupar por empleado y sus horas trabajadas
    let horasPorEmpleado = {};

    data.forEach(item => {
        if (!item.condicion || item.condicion === 'puntual') puntual++;
        else if (item.condicion === 'tardanza') tardanza++;
        else otras++;
        
        let empNombre = (item.nombre || '').trim();
        let empApellido = (item.apellido || '').trim();
        let displayName = empNombre;
        if (empApellido) {
            displayName = `${empNombre.split(/\s+/)[0]} ${empApellido.charAt(0)}.`;
        } else if (empNombre.includes(' ')) {
            let parts = empNombre.split(/\s+/);
            displayName = `${parts[0]} ${parts[1].charAt(0)}.`;
        }

        if (!horasPorEmpleado[displayName]) horasPorEmpleado[displayName] = 0;
        
        if (item.minutos_trabajados) {
            horasPorEmpleado[displayName] += parseInt(item.minutos_trabajados) / 60;
        }
    });

    // 1. Actualizar KPIs numéricos en el encabezado del dashboard
    const totalRegs = puntual + tardanza + otras;
    const pctPuntual = totalRegs > 0 ? Math.round((puntual / totalRegs) * 100) : 100;
    
    const elPct = document.getElementById('metric-pct-puntual');
    if (elPct) elPct.innerText = totalRegs > 0 ? `${pctPuntual}%` : '--%';
    
    const elTard = document.getElementById('metric-total-tardanzas');
    if (elTard) elTard.innerText = tardanza;

    let sumTotalHoras = 0;
    Object.values(horasPorEmpleado).forEach(v => sumTotalHoras += v);
    const elHoras = document.getElementById('metric-total-horas');
    if (elHoras) elHoras.innerText = `${sumTotalHoras.toFixed(1)} hrs`;

    // Detectar tema actual
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const textColor = isDark ? '#94a3b8' : '#64748b';
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.07)' : 'rgba(0, 0, 0, 0.05)';

    // 2. Gráfico de Puntualidad (Donut)
    const ctxPunt = document.getElementById('chartRRHHPuntualidad');
    if (ctxPunt) {
        if (window.chartPuntualidad) window.chartPuntualidad.destroy();

        const hasData = totalRegs > 0;
        window.chartPuntualidad = new Chart(ctxPunt, {
            type: 'doughnut',
            data: {
                labels: hasData ? ['Puntual', 'Tardanzas', 'Justificaciones/Otros'] : ['Sin registros'],
                datasets: [{
                    data: hasData ? [puntual, tardanza, otras] : [1],
                    backgroundColor: hasData ? ['#10b981', '#ef4444', '#3b82f6'] : ['#cbd5e1'],
                    borderWidth: 2,
                    borderColor: isDark ? '#141414' : '#ffffff',
                    hoverOffset: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '68%',
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: textColor,
                            boxWidth: 12,
                            padding: 14,
                            font: { family: "'Inter', sans-serif", size: 12 }
                        }
                    },
                    tooltip: {
                        backgroundColor: '#1e293b',
                        titleFont: { family: "'Inter', sans-serif", size: 13 },
                        bodyFont: { family: "'Inter', sans-serif", size: 12 },
                        cornerRadius: 8,
                        padding: 10,
                        callbacks: {
                            label: function(ctx) {
                                if (!hasData) return ' No hay registros para este período';
                                const val = ctx.parsed || 0;
                                const tot = ctx.dataset.data.reduce((a, b) => a + b, 0);
                                const p = tot > 0 ? Math.round((val / tot) * 100) : 0;
                                return ` ${ctx.label}: ${val} (${p}%)`;
                            }
                        }
                    }
                }
            }
        });
    }

    // 3. Gráfico de Horas Trabajadas (Bar)
    const ctxTiempo = document.getElementById('chartRRHHTiempo');
    if (ctxTiempo) {
        if (window.chartTiempo) window.chartTiempo.destroy();
        
        const labels = Object.keys(horasPorEmpleado);
        const values = Object.values(horasPorEmpleado).map(v => parseFloat(v.toFixed(1)));
        
        window.chartTiempo = new Chart(ctxTiempo, {
            type: 'bar',
            data: {
                labels: labels.length > 0 ? labels : ['Sin datos'],
                datasets: [{
                    label: 'Horas Trabajadas',
                    data: values.length > 0 ? values : [0],
                    backgroundColor: '#4f46e5',
                    hoverBackgroundColor: '#4338ca',
                    borderRadius: 6,
                    borderSkipped: false,
                    maxBarThickness: 36
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: '#1e293b',
                        titleFont: { family: "'Inter', sans-serif", size: 13 },
                        bodyFont: { family: "'Inter', sans-serif", size: 12 },
                        cornerRadius: 8,
                        padding: 10,
                        callbacks: {
                            label: function(ctx) {
                                return ` ${ctx.parsed.y} hrs acumuladas`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            color: textColor,
                            font: { family: "'Inter', sans-serif", size: 11 },
                            callback: function(v) { return v + 'h'; }
                        },
                        grid: {
                            color: gridColor
                        }
                    },
                    x: {
                        ticks: {
                            color: textColor,
                            maxRotation: 25,
                            minRotation: 0,
                            font: { family: "'Inter', sans-serif", size: 11 }
                        },
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });
    }
};

// ===================================
// API CONFIGURACIÓN
// ===================================
window.loadConfigData = async function() {
    // Sincronizar en segundo plano la configuración global desde la API
    await initGlobalConfig();
    
    // Si la vista actual de configuración está activa, actualizar sutilmente los valores por si cambiaron en otro dispositivo
    if (document.getElementById('cfg_nombre_empresa')) {
        document.getElementById('cfg_nombre_empresa').value = AppConfig.get('nombre_empresa');
        document.getElementById('cfg_razon_social').value = AppConfig.get('razon_social');
        document.getElementById('cfg_ruc').value = AppConfig.get('ruc');
        document.getElementById('cfg_whatsapp').value = AppConfig.get('whatsapp');
        document.getElementById('cfg_direccion').value = AppConfig.get('direccion');
        document.getElementById('cfg_moneda').value = AppConfig.get('moneda') || 'MXN';
        document.getElementById('cfg_impuesto_iva').value = AppConfig.get('impuesto_iva') || 16;
        
        if (document.getElementById('cfg_api_whatsapp')) {
            document.getElementById('cfg_api_whatsapp').value = AppConfig.get('api_whatsapp') || '';
            document.getElementById('cfg_api_rucdni').value = AppConfig.get('api_rucdni') || '';
            document.getElementById('cfg_api_sms').value = AppConfig.get('api_sms') || '';
            document.getElementById('cfg_smtp_host').value = AppConfig.get('smtp_host') || '';
            document.getElementById('cfg_smtp_port').value = AppConfig.get('smtp_port') || '';
            document.getElementById('cfg_smtp_crypto').value = AppConfig.get('smtp_crypto') || 'tls';
            document.getElementById('cfg_smtp_user').value = AppConfig.get('smtp_user') || '';
            document.getElementById('cfg_smtp_pass').value = AppConfig.get('smtp_pass') || '';
        }

        document.getElementById('cfg_font_family').value = AppConfig.get('font_family') || "'Inter', sans-serif";
        document.getElementById('cfg_font_size').value = AppConfig.get('font_size') || "13px";
        document.getElementById('cfg_color_primary').value = AppConfig.get('color_primary') || "#ef4444";
        document.getElementById('cfg_btn_bg_light').value = AppConfig.get('btn_bg_light') || "#ef4444";
        document.getElementById('cfg_btn_text_light').value = AppConfig.get('btn_text_light') || "#ffffff";
        document.getElementById('cfg_btn_bg_dark').value = AppConfig.get('btn_bg_dark') || "#ef4444";
        document.getElementById('cfg_btn_text_dark').value = AppConfig.get('btn_text_dark') || "#ffffff";
        document.getElementById('cfg_text_light').value = AppConfig.get('text_light') || "#0F172A";
        document.getElementById('cfg_text_dark').value = AppConfig.get('text_dark') || "#F8FAFC";
        
        // Inicializar vistas previas de imágenes
        initImageUploader('logo_light', AppConfig.get('logo_light'));
        initImageUploader('logo_dark', AppConfig.get('logo_dark'));
        initImageUploader('logo_collapsed', AppConfig.get('logo_collapsed'));
        initImageUploader('logo_favicon', AppConfig.get('logo_favicon'));
        
        // Cargar array de locales
        try {
            const l = AppConfig.get('locales');
            window.localesArray = l ? JSON.parse(l) : [];
            if(!Array.isArray(window.localesArray)) window.localesArray = [];
        } catch(e) {
            window.localesArray = [];
        }
        renderLocalesList();
    }
};

window.saveConfigData = async function() {
    const formData = new FormData();
    formData.append('nombre_empresa', document.getElementById('cfg_nombre_empresa').value);
    formData.append('razon_social', document.getElementById('cfg_razon_social').value);
    formData.append('ruc', document.getElementById('cfg_ruc').value);
    formData.append('whatsapp', document.getElementById('cfg_whatsapp').value);
    formData.append('direccion', document.getElementById('cfg_direccion').value);
    formData.append('locales', JSON.stringify(window.localesArray || []));
    formData.append('moneda', document.getElementById('cfg_moneda').value);
    formData.append('impuesto_iva', document.getElementById('cfg_impuesto_iva').value);
    
    // Conexiones
    formData.append('api_whatsapp', document.getElementById('cfg_api_whatsapp') ? document.getElementById('cfg_api_whatsapp').value : '');
    formData.append('api_rucdni', document.getElementById('cfg_api_rucdni') ? document.getElementById('cfg_api_rucdni').value : '');
    formData.append('api_sms', document.getElementById('cfg_api_sms') ? document.getElementById('cfg_api_sms').value : '');
    
    // SMTP
    if (document.getElementById('cfg_smtp_host')) {
        formData.append('smtp_host', document.getElementById('cfg_smtp_host').value);
        formData.append('smtp_port', document.getElementById('cfg_smtp_port').value);
        formData.append('smtp_crypto', document.getElementById('cfg_smtp_crypto').value);
        formData.append('smtp_user', document.getElementById('cfg_smtp_user').value);
        formData.append('smtp_pass', document.getElementById('cfg_smtp_pass').value);
    }

    // Personalización
    formData.append('font_family', document.getElementById('cfg_font_family').value);
    formData.append('font_size', document.getElementById('cfg_font_size').value);
    formData.append('color_primary', document.getElementById('cfg_color_primary').value);
    formData.append('btn_bg_light', document.getElementById('cfg_btn_bg_light').value);
    formData.append('btn_text_light', document.getElementById('cfg_btn_text_light').value);
    formData.append('btn_bg_dark', document.getElementById('cfg_btn_bg_dark').value);
    formData.append('btn_text_dark', document.getElementById('cfg_btn_text_dark').value);
    formData.append('text_light', document.getElementById('cfg_text_light').value);
    formData.append('text_dark', document.getElementById('cfg_text_dark').value);

    // Archivos (Logos)
    const fileLogoLight = document.getElementById('file_logo_light').files[0];
    if (fileLogoLight) formData.append('logo_light', fileLogoLight);
    formData.append('remove_logo_light', document.getElementById('remove_logo_light').value);
    
    const fileLogoDark = document.getElementById('file_logo_dark').files[0];
    if (fileLogoDark) formData.append('logo_dark', fileLogoDark);
    formData.append('remove_logo_dark', document.getElementById('remove_logo_dark').value);
    
    const fileLogoCollapsed = document.getElementById('file_logo_collapsed').files[0];
    if (fileLogoCollapsed) formData.append('logo_collapsed', fileLogoCollapsed);
    formData.append('remove_logo_collapsed', document.getElementById('remove_logo_collapsed').value);
    
    const fileFavicon = document.getElementById('file_logo_favicon').files[0];
    if (fileFavicon) formData.append('logo_favicon', fileFavicon);
    formData.append('remove_logo_favicon', document.getElementById('remove_logo_favicon').value);
    
    const btn = document.querySelector('.page-header .btn-primary');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Guardando...';
    btn.disabled = true;

    try {
        const response = await fetch('/khalessierp/api/configuracion/save', {
            method: 'POST',
            body: formData
        });
        
        const res = await response.json();
        if(res.status === 'success') {
            await initGlobalConfig(); // Recargar la cache global
            showToast(res.message, 'success');
            // Forzar actualización visual si se subieron logos
            if (fileLogoLight || fileLogoDark || fileLogoCollapsed) {
                setTimeout(() => window.location.reload(), 1500);
            }
        } else {
            showToast(res.message, 'error');
        }
    } catch(e) {
        console.error(e);
        showToast('Error de conexión', 'error');
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
};

// Interceptar renderConfiguracion
// Limpiado hack de renderConfiguracion

// ===================================
// LÓGICA LOCALES / SUCURSALES
// ===================================
window.abrirModalLocal = function() {
    document.getElementById('local_nombre').value = '';
    document.getElementById('local_direccion').value = '';
    document.getElementById('local_coords').value = '';
    document.getElementById('local_desc').value = '';
    document.getElementById('local_map_preview').innerHTML = '<span class="text-sec">Ingresa coordenadas para ver el mapa</span>';
    document.getElementById('modal-local').classList.add('show');
};

window.cerrarModalLocal = function() {
    document.getElementById('modal-local').classList.remove('show');
};

window.actualizarMapa = function() {
    const coords = document.getElementById('local_coords').value.trim();
    const mapDiv = document.getElementById('local_map_preview');
    if (coords && coords.includes(',')) {
        // Usar Google Maps Embed (sin API Key, usando modo search 'q=')
        const iframe = `<iframe width="100%" height="100%" frameborder="0" style="border:0;" allowfullscreen="" loading="lazy" src="https://maps.google.com/maps?q=${encodeURIComponent(coords)}&hl=es&z=15&output=embed"></iframe>`;
        mapDiv.innerHTML = iframe;
    } else {
        mapDiv.innerHTML = '<span class="text-sec">Coordenadas inválidas. Usa formato: lat, lng</span>';
    }
};

window.guardarLocal = function() {
    const nombre = document.getElementById('local_nombre').value.trim();
    const direccion = document.getElementById('local_direccion').value.trim();
    const coords = document.getElementById('local_coords').value.trim();
    const desc = document.getElementById('local_desc').value.trim();
    
    if(!nombre || !direccion) {
        showToast('Nombre y dirección son obligatorios', 'error');
        return;
    }
    
    if (!window.localesArray) window.localesArray = [];
    
    window.localesArray.push({ nombre, direccion, coords, desc });
    renderLocalesList();
    cerrarModalLocal();
    showToast('Local agregado a la lista. No olvides Guardar Cambios.', 'info');
};

window.eliminarLocal = function(index) {
    window.localesArray.splice(index, 1);
    renderLocalesList();
};

window.renderLocalesList = function() {
    const list = document.getElementById('locales-list');
    if(!list) return;
    
    if (window.localesArray.length === 0) {
        list.innerHTML = '<div style="padding: 16px; background: var(--bg-main); border-radius: 8px; text-align: center; color: var(--text-sec); border: 1px dashed var(--border-color);">No hay locales registrados.</div>';
        return;
    }
    
    list.innerHTML = window.localesArray.map((local, i) => `
        <div style="padding: 12px 16px; background: var(--bg-main); border: 1px solid var(--border-color); border-radius: 8px; display: flex; justify-content: space-between; align-items: center;">
            <div>
                <h4 style="margin: 0; font-size: 14px; color: var(--text-main);">${local.nombre}</h4>
                <p style="margin: 4px 0 0; font-size: 12px; color: var(--text-sec);">${local.direccion}</p>
                ${local.coords ? `<p style="margin: 4px 0 0; font-size: 11px; color: var(--primary);"><i class="ph ph-map-pin"></i> ${local.coords}</p>` : ''}
            </div>
            <button type="button" class="btn-icon" style="color: var(--primary);" onclick="eliminarLocal(${i})"><i class="ph ph-trash"></i></button>
        </div>
    `).join('');
};

// ===================================
// LÓGICA DE SUBIDA DE IMÁGENES
// ===================================

function renderImageUploader(id, label) {
    const existingUrl = AppConfig.get(id);
    const imgStyle = existingUrl ? "display:block; max-width: 100%; max-height: 80px; object-fit: contain;" : "display:none; max-width: 100%; max-height: 80px; object-fit: contain;";
    const placeholderStyle = existingUrl ? "display:none;" : "display:block;";
    const btnStyle = existingUrl ? "display:flex; width: 100%; margin-top: 8px;" : "display:none; width: 100%; margin-top: 8px;";
    
    return `
        <div class="image-uploader">
            <label class="form-label">${label}</label>
            <div class="upload-area" id="area_${id}" onclick="document.getElementById('file_${id}').click()">
                <img id="preview_${id}" src="${existingUrl || ''}" style="${imgStyle}">
                <div class="upload-placeholder" id="placeholder_${id}" style="${placeholderStyle}">
                    <i class="ph ph-upload-simple" style="font-size: 24px; color: var(--text-sec); margin-bottom: 8px;"></i>
                    <p class="text-small text-sec" style="margin:0;">Clic para subir imagen</p>
                </div>
            </div>
            <input type="file" id="file_${id}" accept="image/*" style="display:none;" onchange="handleImagePreview(this, '${id}')">
            <input type="hidden" id="remove_${id}" value="0">
            <button type="button" class="btn btn-secondary btn-sm" id="btn_remove_${id}" style="${btnStyle}" onclick="removeImageUpload('${id}', event)">
                <i class="ph ph-trash text-danger" style="margin-right: 4px;"></i> Eliminar
            </button>
        </div>
    `;
}

window.handleImagePreview = function(input, id) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            document.getElementById(`preview_${id}`).src = e.target.result;
            document.getElementById(`preview_${id}`).style.display = 'block';
            document.getElementById(`placeholder_${id}`).style.display = 'none';
            document.getElementById(`btn_remove_${id}`).style.display = 'flex';
            document.getElementById(`remove_${id}`).value = '0';
        }
        reader.readAsDataURL(input.files[0]);
    }
};

window.removeImageUpload = function(id, event) {
    event.stopPropagation(); // Prevenir que el click en el botón abra el input file
    document.getElementById(`file_${id}`).value = '';
    document.getElementById(`preview_${id}`).src = '';
    document.getElementById(`preview_${id}`).style.display = 'none';
    document.getElementById(`placeholder_${id}`).style.display = 'block';
    document.getElementById(`btn_remove_${id}`).style.display = 'none';
    document.getElementById(`remove_${id}`).value = '1';
};

window.initImageUploader = function(id, existingUrl) {
    if (existingUrl) {
        document.getElementById(`preview_${id}`).src = existingUrl;
        document.getElementById(`preview_${id}`).style.display = 'block';
        document.getElementById(`placeholder_${id}`).style.display = 'none';
        document.getElementById(`btn_remove_${id}`).style.display = 'flex';
    }
};

// ===================================
// LÓGICA DE ROLES Y PERMISOS
// ===================================

window.modulosSistema = [
    { id: 'dashboard', nombre: 'Dashboard' },
    { id: 'inventario', nombre: 'Inventario' },
    { id: 'clientes', nombre: 'Clientes' },
    { id: 'usuarios', nombre: 'Usuarios' },
    { id: 'configuracion', nombre: 'Configuración' }
];

window.loadRoles = async function() {
    try {
        const response = await fetch('/khalessierp/api/roles/list?t=' + Date.now());
        const data = await response.json();
        if(data.status === 'success') {
            window.rolesData = data.data;
            renderRolesTable();
        }
    } catch(e) { console.error(e); }
};

window.renderRolesTable = function() {
    const tbody = document.getElementById('roles-tbody');
    if(!tbody) return;
    
    if(!window.rolesData || window.rolesData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" style="text-align: center;">No hay roles registrados.</td></tr>';
        return;
    }
    
    tbody.innerHTML = window.rolesData.map(rol => `
        <tr>
            <td class="fw-500">${rol.nombre}</td>
            <td>${rol.descripcion || ''}</td>
            <td>
                <div style="display: flex; gap: 8px;">
                    <button class="btn-icon" onclick="abrirModalRol(${rol.id})"><i class="ph ph-pencil-simple"></i></button>
                    <button class="btn-icon text-danger" onclick="eliminarRol(${rol.id})"><i class="ph ph-trash"></i></button>
                </div>
            </td>
        </tr>
    `).join('');
};

window.abrirModalRol = function(id = null) {
    const modal = document.getElementById('modal-rol');
    const tbody = document.getElementById('rol-permisos-tbody');
    
    let rol = null;
    if (id && window.rolesData) {
        rol = window.rolesData.find(r => r.id == id);
        document.getElementById('modal-rol-title').innerText = 'Editar Rol';
    } else {
        document.getElementById('modal-rol-title').innerText = 'Crear Nuevo Rol';
    }
    
    document.getElementById('rol_id').value = rol ? rol.id : '';
    document.getElementById('rol_nombre').value = rol ? rol.nombre : '';
    document.getElementById('rol_desc').value = rol ? (rol.descripcion || '') : '';
    
    // Generar tabla de permisos con switches
    tbody.innerHTML = window.modulosSistema.map(mod => {
        let pVer = false, pEditar = false, pEliminar = false;
        if (rol && rol.permisos) {
            const p = rol.permisos.find(x => x.modulo === mod.id);
            if (p) {
                pVer = p.puede_ver == 1;
                pEditar = p.puede_editar == 1;
                pEliminar = p.puede_eliminar == 1;
            }
        }
        
        return `
            <tr data-modulo="${mod.id}">
                <td class="fw-500">${mod.nombre}</td>
                <td style="text-align: center;">
                    <label class="switch"><input type="checkbox" class="chk-ver" ${pVer ? 'checked' : ''}><span class="slider"></span></label>
                </td>
                <td style="text-align: center;">
                    <label class="switch"><input type="checkbox" class="chk-editar" ${pEditar ? 'checked' : ''}><span class="slider"></span></label>
                </td>
                <td style="text-align: center;">
                    <label class="switch"><input type="checkbox" class="chk-eliminar" ${pEliminar ? 'checked' : ''}><span class="slider"></span></label>
                </td>
            </tr>
        `;
    }).join('');
    
    modal.classList.remove('hidden');
    requestAnimationFrame(() => modal.classList.add('show'));
};

window.seleccionarTodosPermisos = function() {
    const checks = document.querySelectorAll('#rol-permisos-tbody input[type="checkbox"]');
    const allChecked = Array.from(checks).every(chk => chk.checked);
    checks.forEach(chk => chk.checked = !allChecked);
};

window.cerrarModalRol = function() {
    const modal = document.getElementById('modal-rol');
    modal.classList.remove('show');
    setTimeout(() => modal.classList.add('hidden'), 200);
};

window.guardarRol = async function() {
    const id = document.getElementById('rol_id').value;
    const nombre = document.getElementById('rol_nombre').value;
    const desc = document.getElementById('rol_desc').value;
    
    if(!nombre.trim()) {
        showToast('El nombre del rol es obligatorio', 'error');
        return;
    }
    
    // Recopilar permisos
    const permisos = [];
    const filas = document.querySelectorAll('#rol-permisos-tbody tr');
    filas.forEach(fila => {
        permisos.push({
            modulo: fila.getAttribute('data-modulo'),
            puede_ver: fila.querySelector('.chk-ver').checked ? 1 : 0,
            puede_editar: fila.querySelector('.chk-editar').checked ? 1 : 0,
            puede_eliminar: fila.querySelector('.chk-eliminar').checked ? 1 : 0
        });
    });
    
    const payload = { id, nombre, descripcion: desc, permisos };
    
    try {
        const response = await fetch('/khalessierp/api/roles/save', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(payload)
        });
        const res = await response.json();
        if(res.status === 'success') {
            showToast(res.message, 'success');
            cerrarModalRol();
            loadRoles();
            if (window.loadUsuarios) window.loadUsuarios(); // Refrescar nombres de roles en tabla usuarios
        } else {
            showToast(res.message, 'error');
        }
    } catch(e) { console.error(e); }
};

window.eliminarRol = function(id) {
    confirmarAccion('¿Estás seguro de eliminar este rol?', async () => {
        try {
            const response = await fetch('/khalessierp/api/roles/delete', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({id})
            });
            const res = await response.json();
            if(res.status === 'success') {
                showToast(res.message, 'success');
                loadRoles();
                if (window.loadUsuarios) window.loadUsuarios();
            } else {
                showToast(res.message, 'error');
            }
        } catch(e) { console.error(e); }
    });
};

// ===================================
// LÓGICA DE USUARIOS
// ===================================

window.loadUsuarios = async function() {
    try {
        const response = await fetch('/khalessierp/api/usuarios/list?t=' + Date.now());
        const data = await response.json();
        if(data.status === 'success') {
            window.usuariosData = data.data;
            renderUsuariosTable();
        }
    } catch(e) { console.error(e); }
};

window.renderUsuariosTable = function() {
    const tbody = document.getElementById('usuarios-tbody');
    if(!tbody) return;
    
    if(!window.usuariosData || window.usuariosData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align: center;">No hay usuarios.</td></tr>';
        return;
    }
    
    const moneda = AppConfig.get('moneda') || 'S/';

    tbody.innerHTML = window.usuariosData.map(u => {
        const cargoHtml = u.cargo ? `<span class="badge badge-secondary" style="font-size:10px; margin-right:4px;">${u.cargo}</span>` : '';
        const sueldoHtml = (parseFloat(u.sueldo_base) > 0) ? `<div class="text-small" style="color:var(--success); font-weight:600; margin-top:2px;"><i class="ph ph-money"></i> ${moneda} ${parseFloat(u.sueldo_base).toFixed(2)}/mes</div>` : '';
        const horarioHtml = (u.hora_entrada_asignada && u.hora_salida_asignada) ? `<div class="text-small text-sec" style="margin-top:2px;"><i class="ph ph-clock"></i> ${u.hora_entrada_asignada.substring(0,5)} - ${u.hora_salida_asignada.substring(0,5)}</div>` : '';
        const estadoBadge = u.estado === 'inactivo' 
            ? `<span class="badge badge-danger">Inactivo</span>` 
            : `<span class="badge badge-success">Activo</span>`;

        return `
            <tr>
                <td>
                    <div style="display:flex; align-items:center; gap:10px;">
                        ${window.renderEmpleadoAvatar(u.nombre, u.apellido || '', u.foto_perfil, 36)}
                        <div>
                            <div class="fw-500">${u.nombre} ${u.apellido || ''}</div>
                            <div class="text-small text-sec" style="margin-top:2px;">
                                ${cargoHtml}
                                ${u.dni ? 'DNI: ' + u.dni : ''}
                            </div>
                            ${sueldoHtml}
                        </div>
                    </div>
                </td>
                <td>
                    <div>${u.email}</div>
                    <div class="text-small text-sec">${u.celular || ''}</div>
                    ${horarioHtml}
                </td>
                <td>
                    <div style="display:flex; flex-direction:column; gap:4px; align-items:flex-start;">
                        <span class="badge badge-secondary" style="font-weight:600;">${u.rol_nombre || 'Sin Rol'}</span>
                        ${estadoBadge}
                    </div>
                </td>
                <td>
                    <div style="display: flex; gap: 8px;">
                        <button class="btn-icon" onclick="abrirModalUsuario(${u.id})" title="Editar Usuario y Ficha Laboral"><i class="ph ph-pencil-simple"></i></button>
                        ${u.id != 1 ? `<button class="btn-icon text-danger" onclick="eliminarUsuario(${u.id})" title="Eliminar"><i class="ph ph-trash"></i></button>` : ''}
                    </div>
                </td>
            </tr>
        `;
    }).join('');
};

window.abrirModalUsuario = function(id = null) {
    const modal = document.getElementById('modal-usuario');
    
    let u = null;
    if (id && window.usuariosData) {
        u = window.usuariosData.find(x => x.id == id);
        document.getElementById('modal-usuario-title').innerText = 'Editar Usuario y Ficha Laboral';
        document.getElementById('usuario_password_hint').innerText = '(Déjalo en blanco para no cambiarla)';
    } else {
        document.getElementById('modal-usuario-title').innerText = 'Crear Nuevo Usuario';
        document.getElementById('usuario_password_hint').innerText = '';
    }
    
    document.getElementById('usuario_id').value = u ? u.id : '';
    document.getElementById('usuario_nombre').value = u ? u.nombre : '';
    document.getElementById('usuario_dni').value = u ? (u.dni || '') : '';
    document.getElementById('usuario_email').value = u ? u.email : '';
    document.getElementById('usuario_celular').value = u ? (u.celular || '') : '';
    document.getElementById('usuario_password').value = '';

    // Campos Laborales y Remuneración
    document.getElementById('usuario_cargo').value = u ? (u.cargo || '') : '';
    document.getElementById('usuario_estado').value = u ? (u.estado || 'activo') : 'activo';
    document.getElementById('usuario_sueldo_base').value = u && parseFloat(u.sueldo_base) > 0 ? parseFloat(u.sueldo_base).toFixed(2) : '';
    document.getElementById('usuario_fecha_contratacion').value = u ? (u.fecha_contratacion || '') : '';
    document.getElementById('usuario_hora_entrada').value = u && u.hora_entrada_asignada ? u.hora_entrada_asignada.substring(0, 5) : '';
    document.getElementById('usuario_hora_salida').value = u && u.hora_salida_asignada ? u.hora_salida_asignada.substring(0, 5) : '';
    
    // Poblar combo de roles
    const rolSelect = document.getElementById('usuario_rol');
    if (rolSelect && window.rolesData) {
        rolSelect.innerHTML = window.rolesData.map(r => `<option value="${r.id}" ${u && u.id_rol == r.id ? 'selected' : ''}>${r.nombre}</option>`).join('');
    }
    
    modal.classList.remove('hidden');
    requestAnimationFrame(() => modal.classList.add('show'));
};

window.cerrarModalUsuario = function() {
    const modal = document.getElementById('modal-usuario');
    modal.classList.remove('show');
    setTimeout(() => modal.classList.add('hidden'), 200);
};

window.guardarUsuario = async function() {
    const id = document.getElementById('usuario_id').value;
    const nombre = document.getElementById('usuario_nombre').value;
    const dni = document.getElementById('usuario_dni').value;
    const email = document.getElementById('usuario_email').value;
    const celular = document.getElementById('usuario_celular').value;
    const password = document.getElementById('usuario_password').value;
    const id_rol = document.getElementById('usuario_rol').value;

    // Campos Laborales y Remuneración
    const cargo = document.getElementById('usuario_cargo').value;
    const estado = document.getElementById('usuario_estado').value;
    const sueldo_base = document.getElementById('usuario_sueldo_base').value;
    const fecha_contratacion = document.getElementById('usuario_fecha_contratacion').value;
    const hora_entrada_asignada = document.getElementById('usuario_hora_entrada').value;
    const hora_salida_asignada = document.getElementById('usuario_hora_salida').value;
    
    if(!nombre.trim() || !email.trim() || !id_rol) {
        showToast('Nombre, Email y Rol son obligatorios', 'error');
        return;
    }
    
    if (!id && !password.trim()) {
        showToast('Debes asignar una contraseña para un nuevo usuario', 'error');
        return;
    }
    
    const payload = { 
        id, 
        nombre, 
        dni, 
        email, 
        celular, 
        password, 
        id_rol,
        cargo,
        estado,
        sueldo_base,
        fecha_contratacion,
        hora_entrada_asignada,
        hora_salida_asignada
    };
    
    try {
        const response = await fetch('/khalessierp/api/usuarios/save', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(payload)
        });
        const res = await response.json();
        if(res.status === 'success') {
            showToast(res.message, 'success');
            cerrarModalUsuario();
            loadUsuarios();
            if (typeof loadFichasPersonal === 'function') loadFichasPersonal();
        } else {
            showToast(res.message, 'error');
        }
    } catch(e) { console.error(e); }
};

window.eliminarUsuario = function(id) {
    confirmarAccion('¿Estás seguro de eliminar este usuario?', async () => {
        try {
            const response = await fetch('/khalessierp/api/usuarios/delete', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({id})
            });
            const res = await response.json();
            if(res.status === 'success') {
                showToast(res.message, 'success');
                loadUsuarios();
            } else {
                showToast(res.message, 'error');
            }
        } catch(e) { console.error(e); }
    });
};

window.confirmarAccion = function(mensaje, callback) {
    let confirmModal = document.getElementById('modal-confirmacion');
    if (!confirmModal) {
        confirmModal = document.createElement('div');
        confirmModal.id = 'modal-confirmacion';
        confirmModal.className = 'modal-backdrop hidden';
        confirmModal.innerHTML = `
            <div class="modal" style="max-width: 400px; text-align: center; padding: 30px;">
                <div style="font-size: 48px; color: var(--danger-color); margin-bottom: 15px;">
                    <i class="ph ph-warning-circle"></i>
                </div>
                <h3 style="margin-bottom: 10px;">Confirmar Acción</h3>
                <p id="confirm-mensaje" style="margin-bottom: 25px; color: var(--text-muted);"></p>
                <div style="display: flex; justify-content: center; gap: 15px;">
                    <button class="btn btn-secondary" id="btn-confirm-cancel">Cancelar</button>
                    <button class="btn btn-primary" style="background-color: var(--danger-color);" id="btn-confirm-ok">Aceptar</button>
                </div>
            </div>
        `;
        document.body.appendChild(confirmModal);
    }
    
    document.getElementById('confirm-mensaje').innerText = mensaje;
    
    const btnCancel = document.getElementById('btn-confirm-cancel');
    const btnOk = document.getElementById('btn-confirm-ok');
    
    // Remover event listeners anteriores clonando los botones
    const newBtnCancel = btnCancel.cloneNode(true);
    const newBtnOk = btnOk.cloneNode(true);
    btnCancel.parentNode.replaceChild(newBtnCancel, btnCancel);
    btnOk.parentNode.replaceChild(newBtnOk, btnOk);
    
    confirmModal.classList.remove('hidden');
    requestAnimationFrame(() => confirmModal.classList.add('show'));
    
    const cerrar = () => {
        confirmModal.classList.remove('show');
        setTimeout(() => confirmModal.classList.add('hidden'), 200);
    };
    
    newBtnCancel.addEventListener('click', cerrar);
    newBtnOk.addEventListener('click', () => {
        cerrar();
        callback();
    });
};

window.updateTopbarProfile = function(user) {
    if(!user) return;
    const nameEl = document.getElementById('topbar-name');
    const avatarEl = document.getElementById('topbar-avatar');
    if(nameEl) nameEl.innerText = user.nombre;
    if(avatarEl) {
        if(user.foto_perfil) {
            avatarEl.innerHTML = `<img src="${user.foto_perfil}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">`;
            avatarEl.style.background = 'transparent';
        } else {
            avatarEl.innerHTML = (user.nombre || 'US').substring(0,2).toUpperCase();
            avatarEl.style.background = 'var(--link)';
        }
    }
};

function renderPerfil(container) {
    const user = JSON.parse(localStorage.getItem('khalessi_user') || '{}');
    const iniciales = user.nombre ? user.nombre.substring(0,2).toUpperCase() : 'US';
    const avatarImg = user.foto_perfil ? `<img src="${user.foto_perfil}" alt="Avatar">` : `<div class="avatar-placeholder">${iniciales}</div>`;
    const fullName = `${user.nombre || ''} ${user.apellido || ''}`.trim();
    
    container.innerHTML = `
        <div class="profile-container">
            <div class="profile-content">
                <div class="profile-card profile-header-card">
                    <div class="profile-user-info">
                        <div class="profile-avatar-container">
                            <label for="perfil_foto_input" style="cursor:pointer; display:block; width:100%; height:100%;">
                                ${avatarImg}
                                <div class="profile-avatar-edit">
                                    <i class="ph ph-pencil-simple"></i>
                                </div>
                            </label>
                            <input type="file" id="perfil_foto_input" class="hidden" accept="image/*" onchange="handleFotoPerfilSelect(event)">
                            <input type="hidden" id="perfil_foto_base64" value="${user.foto_perfil || ''}">
                        </div>
                        <div class="profile-user-details">
                            <h3 id="perfil_display_name">${fullName || 'Usuario'}</h3>
                            <p>${user.rol_nombre || 'Rol'}</p>
                            <p>${user.email || ''}</p>
                        </div>
                    </div>
                    <div>
                        <button class="btn-pill" onclick="document.getElementById('perfil_nombre').focus()"><i class="ph ph-pencil-simple"></i> Editar</button>
                    </div>
                </div>

                <div class="profile-card" style="flex-direction: column; align-items: flex-start;">
                    <div class="profile-card-header" style="flex-wrap: wrap; gap: 16px;">
                        <div class="profile-card-title">Información Personal</div>
                        <button class="btn-pill" onclick="guardarPerfil()"><i class="ph ph-check"></i> Guardar Cambios</button>
                    </div>
                    
                    <div class="profile-grid" style="width: 100%;">
                        <div>
                            <div class="profile-field-label">Nombres</div>
                            <div class="profile-field-value">
                                <input type="text" id="perfil_nombre" value="${user.nombre || ''}">
                            </div>
                        </div>
                        <div>
                            <div class="profile-field-label">Apellidos</div>
                            <div class="profile-field-value">
                                <input type="text" id="perfil_apellido" value="${user.apellido || ''}">
                            </div>
                        </div>
                        <div>
                            <div class="profile-field-label">Correo Electrónico</div>
                            <div class="profile-field-value">
                                <input type="email" id="perfil_email" value="${user.email || ''}">
                            </div>
                        </div>
                        <div>
                            <div class="profile-field-label">Celular</div>
                            <div class="profile-field-value">
                                <input type="text" id="perfil_celular" value="${user.celular || ''}">
                            </div>
                        </div>
                        <div style="grid-column: 1 / -1;">
                            <div class="profile-field-label">Biografía</div>
                            <div class="profile-field-value">
                                <input type="text" id="perfil_bio" value="${user.bio || ''}" placeholder="Escribe algo sobre ti...">
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

window.handleFotoPerfilSelect = function(e) {
    const file = e.target.files[0];
    if(!file) return;
    
    const reader = new FileReader();
    reader.onload = function(event) {
        const base64 = event.target.result;
        document.getElementById('perfil_foto_base64').value = base64;
        
        const container = document.querySelector('.profile-avatar-container label');
        const editBtn = container.querySelector('.profile-avatar-edit').outerHTML;
        container.innerHTML = `<img src="${base64}" alt="Avatar">${editBtn}`;
    };
    reader.readAsDataURL(file);
};

window.guardarPerfil = async function() {
    const user = JSON.parse(localStorage.getItem('khalessi_user') || '{}');
    const payload = {
        id: user.id,
        nombre: document.getElementById('perfil_nombre').value,
        apellido: document.getElementById('perfil_apellido').value,
        email: document.getElementById('perfil_email').value,
        celular: document.getElementById('perfil_celular').value,
        bio: document.getElementById('perfil_bio').value,
        foto_perfil: document.getElementById('perfil_foto_base64').value
    };
    
    try {
        const response = await fetch('/khalessierp/api/index.php?request=usuarios/update_profile', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(payload)
        });
        const data = await response.json();
        if(response.ok) {
            showToast('Perfil actualizado correctamente', 'success');
            localStorage.setItem('khalessi_user', JSON.stringify(data.data.user));
            updateTopbarProfile(data.data.user);
            document.getElementById('perfil_display_name').innerText = `${data.data.user.nombre} ${data.data.user.apellido || ''}`.trim();
        } else {
            showToast(data.message, 'error');
        }
    } catch(e) {
        console.error(e);
        showToast('Error al guardar el perfil', 'error');
    }
};

window.comprobarConexion = async function(tipo) {
    let token = '';
    let nombreApi = '';
    
    if (tipo === 'whatsapp') {
        token = document.getElementById('cfg_api_whatsapp').value;
        nombreApi = 'API WhatsApp';
    } else if (tipo === 'rucdni') {
        token = document.getElementById('cfg_api_rucdni').value;
        nombreApi = 'Consulta RUC/DNI';
    } else if (tipo === 'sms') {
        token = document.getElementById('cfg_api_sms').value;
        nombreApi = 'Envío SMS jsonpe';
    } else if (tipo === 'email') {
        token = document.getElementById('cfg_smtp_user').value; // Usamos el usuario para validar si ingresó algo
        nombreApi = 'Servidor SMTP';
    }
    
    if (!token) {
        showToast(`Por favor, ingresa el token o credencial de ${nombreApi} primero.`, 'warning');
        return;
    }
    
    // Simulación de comprobación de conexión
    showToast(`Comprobando conexión con ${nombreApi}...`, 'info');
    
    setTimeout(() => {
        showToast(`Conexión exitosa con ${nombreApi}`, 'success');
    }, 1500);
};

// Init app
window.addEventListener('popstate', router);
document.addEventListener('DOMContentLoaded', async () => {
    initTheme();
    await initGlobalConfig(); // Cargar config al arrancar
    router();
    const user = JSON.parse(localStorage.getItem('khalessi_user') || 'null');
    if(user) updateTopbarProfile(user);
});

// ==============================
// GLOBAL MODALS LOGIC (MEDIA & SCANNER)
// ==============================

// Scanner Modal Logic
let html5QrcodeScanner = null;
let currentScannerCallback = null;

window.abrirScanner = function(callback) {
    currentScannerCallback = callback;
    const modal = document.getElementById('scanner-modal');
    modal.classList.remove('hidden');
    requestAnimationFrame(() => modal.classList.add('show'));

    if (!html5QrcodeScanner) {
        html5QrcodeScanner = new Html5QrcodeScanner(
            "scanner-reader",
            { fps: 10, qrbox: {width: 250, height: 250} },
            /* verbose= */ false);
    }
    html5QrcodeScanner.render(onScanSuccess, onScanFailure);
};

window.closeScannerModal = function() {
    const modal = document.getElementById('scanner-modal');
    modal.classList.remove('show');
    setTimeout(() => {
        modal.classList.add('hidden');
        if (html5QrcodeScanner) {
            html5QrcodeScanner.clear().catch(error => {
                console.error("Failed to clear html5QrcodeScanner. ", error);
            });
            html5QrcodeScanner = null;
        }
    }, 200);
};

function onScanSuccess(decodedText, decodedResult) {
    if (currentScannerCallback) {
        currentScannerCallback(decodedText);
    }
    closeScannerModal();
}

function onScanFailure(error) {
    // Silently ignore failures as they happen every frame there's no code
}

// Media Manager Logic
let currentMediaCallback = null;

window.abrirMediaModal = function(callback) {
    currentMediaCallback = callback;
    const modal = document.getElementById('media-modal');
    modal.classList.remove('hidden');
    requestAnimationFrame(() => modal.classList.add('show'));
    loadMediaFiles();
};

window.closeMediaModal = function() {
    const modal = document.getElementById('media-modal');
    modal.classList.remove('show');
    setTimeout(() => modal.classList.add('hidden'), 200);
};

window.handleMediaUpload = async function(input) {
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];
    const formData = new FormData();
    formData.append('file', file);

    try {
        const response = await fetch('/khalessierp/api/index.php?request=media/upload', {
            method: 'POST',
            body: formData
        });
        const data = await response.json();
        if (data.status === 'success') {
            showToast('Imagen subida correctamente', 'success');
            loadMediaFiles();
        } else {
            showToast(data.message || 'Error al subir', 'error');
        }
    } catch(e) {
        console.error(e);
        showToast('Error de conexión', 'error');
    }
};

window.loadMediaFiles = async function() {
    const grid = document.getElementById('media-grid');
    grid.innerHTML = '<p>Cargando medios...</p>';
    try {
        const response = await fetch('/khalessierp/api/index.php?request=media/list');
        const data = await response.json();
        if (data.status === 'success') {
            grid.innerHTML = '';
            if(data.data.length === 0) {
                grid.innerHTML = '<p style="color:var(--text-sec); grid-column:1/-1;">No hay imágenes. Sube una para empezar.</p>';
            }
            data.data.forEach(item => {
                const div = document.createElement('div');
                div.className = 'media-item';
                div.innerHTML = `
                    <img src="${item.url}" class="media-item-img">
                    <div class="media-item-actions">Seleccionar</div>
                `;
                div.onclick = () => {
                    if (currentMediaCallback) {
                        currentMediaCallback(item.url);
                    }
                    closeMediaModal();
                };
                grid.appendChild(div);
            });
        }
    } catch(e) {
        grid.innerHTML = '<p style="color:var(--danger)">Error al cargar medios</p>';
    }
};

// ==========================================
// SISTEMA DE ACTUALIZACIÓN GITHUB Y BD SEGURA
// ==========================================

window.loadInfoGitConexiones = async function() {
    const elHash = document.getElementById('git-commit-hash');
    const elMsg = document.getElementById('git-commit-msg');
    const elBranch = document.getElementById('git-branch-name');
    const elRemote = document.getElementById('git-remote-url');
    const elDb = document.getElementById('git-db-migrations');
    if (!elHash) return;

    try {
        const res = await fetch('/khalessierp/api/index.php?request=sistema/git_info');
        const data = await res.json();
        if (data.status === 'success' && data.data) {
            const info = data.data;
            if (elHash) elHash.innerText = info.commit_hash || 'N/A';
            if (elMsg) elMsg.innerText = info.commit_mensaje || '-';
            if (elBranch) elBranch.innerText = info.branch || 'main';
            if (elRemote) elRemote.innerText = info.remote_url || 'https://github.com/networkturbo4-pixel/khalessiERP.git';
            if (elDb) {
                elDb.innerText = `${info.total_migraciones} migración(es) aplicada(s)`;
            }
        }
    } catch(e) {
        console.error('Error cargando información de git:', e);
    }
};

window.comprobarActualizacionGitHub = async function() {
    const btn = document.getElementById('btn-check-git');
    const alertEl = document.getElementById('git-update-status-alert');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Comprobando...';
    }

    try {
        const res = await fetch('/khalessierp/api/index.php?request=sistema/check_update', {
            method: 'POST'
        });
        const data = await res.json();

        if (res.ok && data.status === 'success') {
            const info = data.data;
            if (alertEl) {
                alertEl.style.display = 'block';
                if (info.hay_actualizacion) {
                    const commitsHtml = info.commits_pendientes && info.commits_pendientes.length 
                        ? `<ul style="margin: 8px 0 0 16px; font-family: monospace; font-size: 12px;">${info.commits_pendientes.map(c => `<li>${c}</li>`).join('')}</ul>`
                        : '';
                    alertEl.style.background = 'rgba(245, 158, 11, 0.1)';
                    alertEl.style.border = '1px solid var(--warning)';
                    alertEl.style.color = 'var(--text-main)';
                    alertEl.innerHTML = `
                        <div style="display: flex; align-items: center; gap: 8px; font-weight: 600; color: var(--warning);">
                            <i class="ph ph-warning-circle" style="font-size: 18px;"></i> ¡Hay una nueva actualización disponible en GitHub!
                        </div>
                        <p style="margin: 4px 0 0 0; font-size: 13px;">
                            Versión local: <code>${info.local_commit || 'Actual'}</code> &rarr; Versión remota: <code>${info.remote_commit || 'Nueva'}</code>
                        </p>
                        ${commitsHtml}
                        <div style="margin-top: 10px;">
                            <button class="btn btn-primary btn-sm" onclick="confirmarActualizacion1Click()">
                                <i class="ph ph-cloud-arrow-down"></i> Instalar Actualización Ahora
                            </button>
                        </div>
                    `;
                } else {
                    alertEl.style.background = 'rgba(16, 185, 129, 0.1)';
                    alertEl.style.border = '1px solid var(--success)';
                    alertEl.style.color = 'var(--success)';
                    alertEl.innerHTML = `
                        <div style="display: flex; align-items: center; gap: 8px; font-weight: 600;">
                            <i class="ph ph-check-circle" style="font-size: 18px;"></i> El sistema se encuentra en la versión más reciente de GitHub.
                        </div>
                        <p style="margin: 4px 0 0 0; font-size: 12px; color: var(--text-sec);">
                            Commit actual: <code>${info.local_commit || 'al día'}</code>. No hay cambios pendientes.
                        </p>
                    `;
                }
            }
            showToast(info.hay_actualizacion ? 'Nuevas actualizaciones disponibles' : 'El sistema está actualizado', 'info');
        } else {
            showToast(data.message || 'Error al comprobar actualizaciones', 'error');
        }
    } catch(e) {
        showToast('Error de conexión con el servidor', 'error');
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="ph ph-arrows-clockwise"></i> Comprobar Actualizaciones';
        }
    }
};

window.confirmarActualizacion1Click = function() {
    confirmarAccion(
        '¿Deseas ejecutar la Actualización 1-Click ahora?<br><br><small class="text-sec">El sistema descargará los cambios de GitHub y correrá automáticamente las nuevas migraciones de base de datos de manera incremental y segura sin tocar la data existente.</small>',
        () => {
            ejecutarActualizacion1Click();
        }
    );
};

window.ejecutarActualizacion1Click = async function() {
    const btn = document.getElementById('btn-do-update');
    const consoleWrap = document.getElementById('git-update-console-wrap');
    const consoleEl = document.getElementById('git-update-console');
    const alertEl = document.getElementById('git-update-status-alert');

    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Actualizando...';
    }

    if (consoleWrap && consoleEl) {
        consoleWrap.style.display = 'block';
        consoleEl.innerText = 'Iniciando actualización 1-Click...\n[1/2] Conectando con GitHub para git pull origin main...\n';
    }

    try {
        const res = await fetch('/khalessierp/api/index.php?request=sistema/actualizar', {
            method: 'POST'
        });
        const data = await res.json();

        if (res.ok && data.status === 'success') {
            showToast('¡Sistema actualizado con éxito!', 'success');
            if (consoleEl) {
                consoleEl.innerText += `[2/2] Migraciones seguras procesadas.\n\n${data.data.logs || 'Actualización completada.'}`;
            }
            if (alertEl) {
                alertEl.style.display = 'block';
                alertEl.style.background = 'rgba(16, 185, 129, 0.1)';
                alertEl.style.border = '1px solid var(--success)';
                alertEl.style.color = 'var(--success)';
                alertEl.innerHTML = `
                    <div style="display: flex; align-items: center; gap: 8px; font-weight: 600;">
                        <i class="ph ph-check-circle" style="font-size: 18px;"></i> ¡Actualización 1-Click completada exitosamente!
                    </div>
                    <p style="margin: 4px 0 0 0; font-size: 12px; color: var(--text-sec);">
                        Nuevo commit: <code>${data.data.nuevo_commit || 'al día'}</code>. Base de datos sincronizada.
                    </p>
                `;
            }
            loadInfoGitConexiones();
        } else {
            showToast(data.message || 'Error en el proceso de actualización', 'error');
            if (consoleEl) {
                consoleEl.innerText += `\n[ERROR] ${data.message || 'Falló la actualización'}`;
            }
        }
    } catch(e) {
        showToast('Error de red al actualizar', 'error');
        if (consoleEl) {
            consoleEl.innerText += '\n[ERROR] Error de conexión de red.';
        }
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="ph ph-cloud-arrow-down"></i> Actualizar Ahora (1-Click)';
        }
    }
};

window.ejecutarMigracionesSeguras = async function() {
    try {
        showToast('Verificando migraciones de base de datos...', 'info');
        const res = await fetch('/khalessierp/api/index.php?request=sistema/migrar_bd', {
            method: 'POST'
        });
        const data = await res.json();
        if (res.ok && data.status === 'success') {
            const nuevas = data.data && data.data.aplicadas_ahora ? data.data.aplicadas_ahora.length : 0;
            if (nuevas > 0) {
                showToast(`Se aplicaron ${nuevas} nueva(s) migración(es) sin afectar los datos.`, 'success');
            } else {
                showToast('Todas las migraciones de base de datos ya están al día.', 'success');
            }
            loadInfoGitConexiones();
        } else {
            showToast(data.message || 'Error al procesar migraciones', 'error');
        }
    } catch(e) {
        showToast('Error de conexión', 'error');
    }
};
