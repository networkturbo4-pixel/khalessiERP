/**
 * ============================================================================
 * KHALESSI ERP - CONECTOR JAVASCRIPT PARA CATÁLOGOS WEB & TIENDA ROMA
 * ============================================================================
 * Este script permite conectar de forma directa y transparente cualquier
 * catálogo desarrollado en HTML, CSS y JS con la base de datos y API del ERP.
 * 
 * Funcionalidades:
 * 1. Consultar productos y precios en tiempo real.
 * 2. Consultar categorías.
 * 3. Consultar stock disponible por tienda / local.
 * 4. Enviar pedidos completados desde el carrito hacia el ERP.
 * ============================================================================
 */

const KhalessiERP = (function() {
    // Detección inteligente de entorno (Producción en pizzakhalessi.com vs Local XAMPP)
    const isProd = typeof window !== 'undefined' && window.location.hostname.includes('pizzakhalessi.com');
    const defaultUrl = isProd ? 'https://erp.pizzakhalessi.com/api' : 'http://localhost/khalessierp/api';
    const ERP_URL = window.KHALESSI_API_URL || defaultUrl;
    const API_KEY = window.KHALESSI_API_KEY || 'kh_sec_roma_2026_pizzakhalessi';

    /**
     * Obtener lista de productos disponibles en el ERP
     * @param {Object} opciones - { categoria: 1, buscar: 'pizza', estado: 'disponible' }
     * @returns {Promise<Array>} Lista de productos con nombre, precio, imagen y stock
     */
    async function getProductos(opciones = {}) {
        try {
            const params = new URLSearchParams();
            if (opciones.categoria) params.append('id_categoria', opciones.categoria);
            if (opciones.buscar) params.append('q', opciones.buscar);
            params.append('estado', opciones.estado || 'disponible');

            const res = await fetch(`${ERP_URL}/inventario/productos?${params.toString()}`);
            const json = await res.json();
            
            if (json.status === 'success') {
                return json.data;
            } else {
                console.error('[KhalessiERP] Error obteniendo productos:', json.message);
                return [];
            }
        } catch (err) {
            console.error('[KhalessiERP] Error de conexión:', err);
            return [];
        }
    }

    /**
     * Obtener categorías de productos del ERP
     * @returns {Promise<Array>}
     */
    async function getCategorias() {
        try {
            const res = await fetch(`${ERP_URL}/inventario/categorias`);
            const json = await res.json();
            return json.status === 'success' ? json.data : [];
        } catch (err) {
            console.error('[KhalessiERP] Error obteniendo categorías:', err);
            return [];
        }
    }

    /**
     * Obtener stock disponible de los productos en un local específico
     * @param {number} idLocal - ID del local en el ERP (por defecto 1)
     * @returns {Promise<Array>}
     */
    async function getStockLocal(idLocal = 1) {
        try {
            const res = await fetch(`${ERP_URL}/inventario/list_stock?id_local=${idLocal}`);
            const json = await res.json();
            return json.status === 'success' ? json.data : [];
        } catch (err) {
            console.error('[KhalessiERP] Error obteniendo stock:', err);
            return [];
        }
    }

    /**
     * Enviar un pedido confirmado desde el carrito del catálogo hacia el ERP
     * Registra la venta, el cliente y descuenta el stock automáticamente.
     * 
     * @param {Object} pedidoData - Datos completos del pedido
     * @example
     * KhalessiERP.enviarPedido({
     *     cliente_nombre: "Juan Pérez",
     *     cliente_telefono: "999888777",
     *     cliente_direccion: "Calle Los Olivos 456",
     *     tipo_entrega: "delivery", // 'delivery' o 'pickup'
     *     metodo_pago: "Yape",
     *     subtotal: 50.00,
     *     costo_envio: 5.00,
     *     total: 55.00,
     *     notas: "Sin cebolla",
     *     items: [
     *         { id_producto: 1, nombre: "Pizza Familiar", cantidad: 1, precio: 50.00 }
     *     ]
     * });
     * 
     * @returns {Promise<{success: boolean, data?: Object, message?: string}>}
     */
    async function enviarPedido(pedidoData) {
        try {
            const payload = {
                cliente_nombre: pedidoData.cliente_nombre || pedidoData.customer_name,
                cliente_telefono: pedidoData.cliente_telefono || pedidoData.customer_phone,
                cliente_direccion: pedidoData.cliente_direccion || pedidoData.delivery_address,
                tipo_entrega: pedidoData.tipo_entrega || pedidoData.delivery_method || 'pickup',
                metodo_pago: pedidoData.metodo_pago || pedidoData.payment_method || 'Efectivo',
                subtotal: pedidoData.subtotal || 0,
                descuento: pedidoData.descuento || pedidoData.discount || 0,
                costo_envio: pedidoData.costo_envio || pedidoData.delivery_fee || 0,
                total: pedidoData.total || 0,
                notas: pedidoData.notas || pedidoData.notes || '',
                id_local: pedidoData.id_local || pedidoData.store_id || 1,
                origen: pedidoData.origen || 'tienda_roma',
                id_pedido_externo: pedidoData.id_pedido_externo || pedidoData.order_id || null,
                items: pedidoData.items || []
            };

            const res = await fetch(`${ERP_URL}/pedidos/crear`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-KEY': API_KEY
                },
                body: JSON.stringify(payload)
            });

            const json = await res.json();
            if (json.status === 'success') {
                return { success: true, data: json.data, message: json.message };
            } else {
                return { success: false, message: json.message || 'Error al procesar el pedido' };
            }
        } catch (err) {
            console.error('[KhalessiERP] Error enviando pedido:', err);
            return { success: false, message: 'No se pudo conectar con el ERP.' };
        }
    }

    return {
        getProductos,
        getCategorias,
        getStockLocal,
        enviarPedido
    };
})();

// Exportación global para navegadores o módulos
if (typeof window !== 'undefined') {
    window.KhalessiERP = KhalessiERP;
}
