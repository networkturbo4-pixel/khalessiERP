# Khalessi ERP - Design System & UI Guidelines

Este documento establece las bases visuales y de interacción para el ERP de la pizzería "Khalessi". Su objetivo es asegurar un diseño moderno, responsivo (Mobile First), tipo App (PWA) y altamente premium.

## 1. Tipografía y Estilos Base
- **Fuente Principal:** `Inter` o `Outfit` (limpias, modernas, excelente legibilidad).
- **Tamaño Base:** El tamaño de fuente general (`body`) será de **13px**.
- **Jerarquía:** 
  - Títulos principales (h1): 24px - 28px
  - Subtítulos (h2, h3): 18px - 20px
  - Texto secundario: 12px
- **Peso (Font-Weight):** Regular (400) para cuerpo, Medium (500) para botones y enlaces, SemiBold (600) para títulos.

## 2. Temas: Claro y Oscuro (CSS Variables)
El sistema soportará nativamente ambos modos mediante `:root` y `[data-theme="dark"]`.

**Modo Claro (Light Mode):**
- Fondo Principal: `#F8FAFC` (Gris muy suave)
- Fondo Paneles/Tarjetas: `#FFFFFF`
- Texto Principal: `#0F172A`
- Texto Secundario: `#64748B`
- Bordes: `#E2E8F0`

**Modo Oscuro (Dark Mode):**
- Fondo Principal: `#0F172A` (Azul profundo/Gris oscuro)
- Fondo Paneles/Tarjetas: `#1E293B`
- Texto Principal: `#F8FAFC`
- Texto Secundario: `#94A3B8`
- Bordes: `#334155`

**Colores de Marca & Acentos:**
- Primario (Brand): `#EF4444` (Rojo pizzería vibrante) / `#DC2626` hover.
- Secundario (Éxito/Acciones positivas): `#10B981` (Verde esmeralda).
- Peligro/Eliminar: `#F43F5E`.
- Enlaces (Links): `#3B82F6` (Azul vibrante, con subrayado suave en hover).

## 3. Reglas de Interfaz y Componentes

### 3.1. Alertas y Notificaciones (¡Cero Nativas!)
- **Regla Estricta:** PROHIBIDO usar `alert()`, `confirm()` o `prompt()` nativos del navegador.
- **Toasts:** Notificaciones no intrusivas en la esquina superior o inferior derecha para mensajes de éxito, error o información. Desaparecen a los 3-5 segundos.
- **Modales de Aviso/Confirmación:** Modales centrados con fondo oscuro desenfocado (backdrop-filter: blur), sombras suaves, y botones de confirmación claros.

### 3.2. Botones
- Bordes ligeramente redondeados (`border-radius: 6px` o `8px`).
- Padding cómodo (ej. `8px 16px`).
- Efectos Hover obligatorios: Cambio sutil de color o brillo, ligera elevación (`transform: translateY(-1px)`).
- Efectos Active: Ligera compresión al hacer clic (`transform: scale(0.97)`).
- Transiciones: `transition: all 0.2s ease-in-out`.

### 3.3. Modales y Tarjetas (Cards)
- **Cards:** Fondos puros (blanco en claro, panel en oscuro), sombra muy suave (`box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05)`). Espaciado interior (padding) de 20px o 24px.
- **Modales:** Deben entrar con una animación suave de *fade in* y ligero *scale* (`0.95` a `1`).

### 3.4. Sidebar Colapsable y Navegación
- **Desktop:** Sidebar lateral izquierdo. Por defecto expandido (icono + texto). Botón para colapsar y dejar solo iconos (Tooltip en hover para guiar al usuario).
- **Mobile (Off-Canvas):** El sidebar estará oculto por defecto y se desplegará desde la izquierda (Drawers) al presionar un menú hamburguesa, cubriendo parcialmente la pantalla con un fondo oscuro (overlay) detrás.
- **Indicador Activo:** El módulo actual debe tener un fondo sutil primario o borde izquierdo marcado para resaltar la posición actual.

### 3.5. Tablas Responsivas
- Contenedor con `overflow-x: auto` para evitar que rompan el diseño en móvil.
- Filas alternas sutiles o hover en fila (`tr:hover`) para facilitar lectura.
- Cabeceras (th) en texto secundario, mayúsculas pequeñas (uppercase, 11px) o bold.
- Espaciado amplio entre celdas para que no se sienta apretado.

### 3.6. Enlaces Cortos (Friendly URLs)
- Cada módulo debe ser accesible mediante rutas limpias (`/pos`, `/inventario`, `/ventas`) en lugar de (`/index.php?modulo=pos`). Esto se gestionará vía `.htaccess` y un enrutador en JS/PHP.

## 4. Responsividad (Mobile First)
- **Breakpoints:**
  - Móvil: `< 768px` (Stacks verticales, menú hamburguesa, cards 100% ancho).
  - Tablet: `768px - 1024px` (Grillas de 2 columnas).
  - Desktop: `> 1024px` (Sidebar fijo, grillas amplias).

## 5. Experiencia App (PWA)
- Soporte para instalación en pantalla de inicio.
- Comportamiento suave, sin recargas completas de página que parpadeen en blanco (idealmente SPA o transiciones suaves usando un layout común).
- Interacciones tipo touch en móvil (deslizamientos, áreas de toque de mínimo `44x44px` para botones críticos).
