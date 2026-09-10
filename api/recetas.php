<?php
// api/recetas.php

if ($method === 'GET' && $accion === 'list') {
    $query = "SELECT r.*, p.nombre as producto_nombre 
              FROM recetas r 
              LEFT JOIN productos p ON p.id_receta = r.id 
              ORDER BY r.tipo, r.nombre";
    $stmt = $db->prepare($query);
    $stmt->execute();
    $recetas = $stmt->fetchAll(PDO::FETCH_ASSOC);
    respondSuccess($recetas);
}
else if ($method === 'GET' && $accion === 'get') {
    $id = isset($_GET['id']) ? $_GET['id'] : null;
    if (!$id) respondError("ID de receta requerido");

    $query = "SELECT * FROM recetas WHERE id = :id";
    $stmt = $db->prepare($query);
    $stmt->execute([':id' => $id]);
    $receta = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($receta) {
        $qDetalle = "SELECT rd.*, i.nombre as ingrediente_nombre, i.unidad_medida 
                     FROM receta_detalle rd 
                     JOIN ingredientes i ON rd.id_ingrediente = i.id 
                     WHERE rd.id_receta = :id ORDER BY rd.orden_preparacion";
        $stmtD = $db->prepare($qDetalle);
        $stmtD->execute([':id' => $id]);
        $receta['detalles'] = $stmtD->fetchAll(PDO::FETCH_ASSOC);

        $qLocal = "SELECT rl.*, l.nombre as local_nombre 
                   FROM receta_local rl 
                   JOIN locales l ON rl.id_local = l.id 
                   WHERE rl.id_receta = :id";
        $stmtL = $db->prepare($qLocal);
        $stmtL->execute([':id' => $id]);
        $receta['locales'] = $stmtL->fetchAll(PDO::FETCH_ASSOC);
    }
    respondSuccess($receta);
}
else if ($method === 'POST' && $accion === 'save') {
    $input = json_decode(file_get_contents("php://input"), true);
    $id = isset($input['id']) ? $input['id'] : null;
    $nombre = isset($input['nombre']) ? trim($input['nombre']) : '';
    $tipo = isset($input['tipo']) ? trim($input['tipo']) : 'base';
    $descripcion = isset($input['descripcion']) ? trim($input['descripcion']) : '';
    $rendimiento = isset($input['rendimiento_esperado']) ? trim($input['rendimiento_esperado']) : null;
    $horas_fer = isset($input['horas_fermentacion_base']) && $input['horas_fermentacion_base'] !== '' ? (float)$input['horas_fermentacion_base'] : null;
    $temp_agua = isset($input['temp_agua_c_base']) && $input['temp_agua_c_base'] !== '' ? (float)$input['temp_agua_c_base'] : null;
    
    if (empty($nombre)) respondError("Nombre de receta obligatorio");

    $db->beginTransaction();
    try {
        if ($id) {
            $q = "UPDATE recetas SET nombre = :nombre, tipo = :tipo, descripcion = :descripcion, rendimiento_esperado = :rend, horas_fermentacion_base = :horas, temp_agua_c_base = :temp WHERE id = :id";
            $s = $db->prepare($q);
            $s->execute([':nombre' => $nombre, ':tipo' => $tipo, ':descripcion' => $descripcion, ':rend' => $rendimiento, ':horas' => $horas_fer, ':temp' => $temp_agua, ':id' => $id]);
        } else {
            $q = "INSERT INTO recetas (nombre, tipo, descripcion, rendimiento_esperado, horas_fermentacion_base, temp_agua_c_base) VALUES (:nombre, :tipo, :descripcion, :rend, :horas, :temp)";
            $s = $db->prepare($q);
            $s->execute([':nombre' => $nombre, ':tipo' => $tipo, ':descripcion' => $descripcion, ':rend' => $rendimiento, ':horas' => $horas_fer, ':temp' => $temp_agua]);
            $id = $db->lastInsertId();
        }

        // Detalles
        if (isset($input['detalles']) && is_array($input['detalles'])) {
            $qDel = "DELETE FROM receta_detalle WHERE id_receta = :id";
            $sDel = $db->prepare($qDel);
            $sDel->execute([':id' => $id]);

            $qIns = "INSERT INTO receta_detalle (id_receta, id_ingrediente, cantidad_base, peso_porcion, orden_preparacion, notas) 
                     VALUES (:id_r, :id_i, :cant, :peso, :orden, :notas)";
            $sIns = $db->prepare($qIns);
            
            foreach ($input['detalles'] as $idx => $d) {
                $sIns->execute([
                    ':id_r' => $id,
                    ':id_i' => $d['id_ingrediente'],
                    ':cant' => $d['cantidad_base'],
                    ':peso' => isset($d['peso_porcion']) ? $d['peso_porcion'] : null,
                    ':orden' => isset($d['orden_preparacion']) ? $d['orden_preparacion'] : ($idx + 1),
                    ':notas' => isset($d['notas']) ? $d['notas'] : null
                ]);
            }
        }

        // Asignación automática a todos los locales activos con factor 1.0
        $qLocales = "SELECT id FROM locales WHERE estado = 'activo'";
        $sLocales = $db->query($qLocales);
        $locales = $sLocales->fetchAll(PDO::FETCH_ASSOC);

        $qInsLocal = "INSERT IGNORE INTO receta_local (id_receta, id_local, factor_ajuste) VALUES (:id_r, :id_l, 1.0)";
        $sInsLocal = $db->prepare($qInsLocal);
        foreach ($locales as $l) {
            $sInsLocal->execute([':id_r' => $id, ':id_l' => $l['id']]);
        }

        $db->commit();
        respondSuccess(["id" => $id], "Receta guardada exitosamente");
    } catch (Exception $e) {
        $db->rollBack();
        respondError("Error guardando receta: " . $e->getMessage());
    }
}
else if ($method === 'POST' && $accion === 'save_local') {
    $input = json_decode(file_get_contents("php://input"), true);
    $id_receta = isset($input['id_receta']) ? $input['id_receta'] : null;
    $id_local = isset($input['id_local']) ? $input['id_local'] : null;
    $factor = isset($input['factor_ajuste']) ? (float)$input['factor_ajuste'] : 1.0;
    $temp = isset($input['temp_agua_c']) ? (float)$input['temp_agua_c'] : null;
    $horas = isset($input['horas_fermentacion']) ? (float)$input['horas_fermentacion'] : null;
    $costo_mo = isset($input['costo_mano_obra_extra']) ? (float)$input['costo_mano_obra_extra'] : 0;
    $rendimiento = isset($input['rendimiento_real']) ? (float)$input['rendimiento_real'] : null;

    if (!$id_receta || !$id_local) respondError("Receta y Local son obligatorios");

    $query = "INSERT INTO receta_local (id_receta, id_local, factor_ajuste, temp_agua_c, horas_fermentacion, costo_mano_obra_extra, rendimiento_real) 
              VALUES (:id_r, :id_l, :factor, :temp, :horas, :costo, :rendimiento) 
              ON DUPLICATE KEY UPDATE factor_ajuste = :factor, temp_agua_c = :temp, horas_fermentacion = :horas, 
              costo_mano_obra_extra = :costo, rendimiento_real = :rendimiento";
    $stmt = $db->prepare($query);
    $stmt->execute([
        ':id_r' => $id_receta, ':id_l' => $id_local, ':factor' => $factor, 
        ':temp' => $temp, ':horas' => $horas, ':costo' => $costo_mo, ':rendimiento' => $rendimiento
    ]);
    respondSuccess(null, "Configuración local guardada");
}
else if ($method === 'POST' && $accion === 'calcular_produccion') {
    $input = json_decode(file_get_contents("php://input"), true);
    $id_receta = isset($input['id_receta']) ? $input['id_receta'] : null;
    $id_local = isset($input['id_local']) ? $input['id_local'] : null;
    $porciones = isset($input['porciones']) ? (float)$input['porciones'] : 1;

    if (!$id_receta || !$id_local || $porciones <= 0) respondError("Receta, Local y cantidad de porciones son obligatorios y mayores a 0");

    // 1. Obtener detalles matriz
    $qD = "SELECT rd.*, i.nombre, i.unidad_medida 
           FROM receta_detalle rd 
           JOIN ingredientes i ON rd.id_ingrediente = i.id 
           WHERE rd.id_receta = :id";
    $sD = $db->prepare($qD);
    $sD->execute([':id' => $id_receta]);
    $detalles = $sD->fetchAll(PDO::FETCH_ASSOC);

    // 2. Obtener factor local y precios locales
    $qL = "SELECT * FROM receta_local WHERE id_receta = :id_r AND id_local = :id_l";
    $sL = $db->prepare($qL);
    $sL->execute([':id_r' => $id_receta, ':id_l' => $id_local]);
    $local = $sL->fetch(PDO::FETCH_ASSOC);

    $factor = $local ? (float)$local['factor_ajuste'] : 1.0;
    
    // 3. Precios locales
    $qP = "SELECT id_ingrediente, precio_compra FROM precios_insumos_local WHERE id_local = :id_l";
    $sP = $db->prepare($qP);
    $sP->execute([':id_l' => $id_local]);
    $precios_raw = $sP->fetchAll(PDO::FETCH_ASSOC);
    $precios = [];
    foreach ($precios_raw as $p) $precios[$p['id_ingrediente']] = (float)$p['precio_compra'];

    // 4. Calcular
    $resultado = [];
    $costo_total_insumos = 0;
    
    foreach ($detalles as $d) {
        $cant_base = (float)$d['cantidad_base'];
        $cant_requerida = $cant_base * $factor * $porciones;
        
        $precio_unitario = isset($precios[$d['id_ingrediente']]) ? $precios[$d['id_ingrediente']] : 0;
        $costo_ingrediente = $cant_requerida * $precio_unitario;
        
        $costo_total_insumos += $costo_ingrediente;

        $resultado[] = [
            'ingrediente' => $d['nombre'],
            'unidad' => $d['unidad_medida'],
            'cantidad_calcular' => round($cant_requerida, 4),
            'costo_estimado' => round($costo_ingrediente, 2),
            'orden' => $d['orden_preparacion']
        ];
    }

    $costo_mo = $local ? (float)$local['costo_mano_obra_extra'] : 0;
    // Asumiendo que el costo_mo_extra es por toda la tanda, o por porción. Si es por porción:
    $costo_mo_total = $costo_mo * $porciones;
    
    $costo_total = $costo_total_insumos + $costo_mo_total;
    $costo_unitario = $porciones > 0 ? ($costo_total / $porciones) : 0;

    respondSuccess([
        "insumos" => $resultado,
        "costo_total_insumos" => round($costo_total_insumos, 2),
        "costo_mano_obra_extra" => round($costo_mo_total, 2),
        "costo_total" => round($costo_total, 2),
        "costo_unitario_real" => round($costo_unitario, 2),
        "parametros_local" => $local
    ]);
}
else if ($method === 'POST' && $accion === 'registrar_merma') {
    $input = json_decode(file_get_contents("php://input"), true);
    $id_local = isset($input['id_local']) ? $input['id_local'] : null;
    $id_receta = isset($input['id_receta']) ? $input['id_receta'] : null;
    $id_usuario = isset($input['id_usuario']) ? $input['id_usuario'] : null; // Podría sacarse del token en un sist real
    $fecha = isset($input['fecha']) ? $input['fecha'] : date('Y-m-d');
    $teorica = isset($input['cantidad_teorica']) ? (float)$input['cantidad_teorica'] : 0;
    $real = isset($input['cantidad_real']) ? (float)$input['cantidad_real'] : 0;
    $observaciones = isset($input['observaciones']) ? $input['observaciones'] : '';

    if (!$id_local || !$id_receta || !$id_usuario || $teorica <= 0) {
        respondError("Datos incompletos para registro de merma");
    }

    $q = "INSERT INTO registro_mermas (id_local, id_receta, id_usuario, fecha, cantidad_teorica, cantidad_real, observaciones) 
          VALUES (:l, :r, :u, :f, :t, :re, :o)";
    $s = $db->prepare($q);
    $s->execute([':l'=>$id_local, ':r'=>$id_receta, ':u'=>$id_usuario, ':f'=>$fecha, ':t'=>$teorica, ':re'=>$real, ':o'=>$observaciones]);
    
    // Verificar si supera 5% para lanzar alerta (aquí solo retornamos un flag)
    $porcentaje = (($teorica - $real) / $teorica) * 100;
    $alerta = $porcentaje > 5;

    respondSuccess([
        "porcentaje_merma" => round($porcentaje, 2),
        "alerta" => $alerta
    ], "Registro de merma guardado");
}
else if ($method === 'POST' && $accion === 'sugerencia_compras') {
    $input = json_decode(file_get_contents("php://input"), true);
    $id_local = isset($input['id_local']) ? $input['id_local'] : null;
    $proyecciones = isset($input['proyecciones']) ? $input['proyecciones'] : []; // array de {id_receta, cantidad}

    if (!$id_local || empty($proyecciones)) {
        respondError("Local y proyecciones son obligatorios");
    }

    // Precios locales
    $qP = "SELECT id_ingrediente, precio_compra FROM precios_insumos_local WHERE id_local = :id_l";
    $sP = $db->prepare($qP);
    $sP->execute([':id_l' => $id_local]);
    $precios_raw = $sP->fetchAll(PDO::FETCH_ASSOC);
    $precios = [];
    foreach ($precios_raw as $p) $precios[$p['id_ingrediente']] = (float)$p['precio_compra'];

    // Agrupar ingredientes
    $ingredientes_totales = []; // id_ingrediente => [nombre, cant_base_acumulada, unidad_medida, unidad_compra, equivalencia]

    foreach ($proyecciones as $proy) {
        $id_receta = $proy['id_receta'];
        $cantidad = (float)$proy['cantidad'];
        
        if ($cantidad <= 0) continue;

        // Factor local
        $qL = "SELECT factor_ajuste FROM receta_local WHERE id_receta = :id_r AND id_local = :id_l";
        $sL = $db->prepare($qL);
        $sL->execute([':id_r' => $id_receta, ':id_l' => $id_local]);
        $local = $sL->fetch(PDO::FETCH_ASSOC);
        $factor = $local ? (float)$local['factor_ajuste'] : 1.0;

        // Detalles
        $qD = "SELECT rd.id_ingrediente, rd.cantidad_base, i.nombre, i.unidad_medida, i.unidad_compra, i.equivalencia_compra 
               FROM receta_detalle rd 
               JOIN ingredientes i ON rd.id_ingrediente = i.id 
               WHERE rd.id_receta = :id_r";
        $sD = $db->prepare($qD);
        $sD->execute([':id_r' => $id_receta]);
        $detalles = $sD->fetchAll(PDO::FETCH_ASSOC);

        foreach ($detalles as $d) {
            $id_ing = $d['id_ingrediente'];
            $cant_requerida = (float)$d['cantidad_base'] * $factor * $cantidad;

            if (!isset($ingredientes_totales[$id_ing])) {
                $ingredientes_totales[$id_ing] = [
                    'id' => $id_ing,
                    'nombre' => $d['nombre'],
                    'unidad_medida' => $d['unidad_medida'],
                    'unidad_compra' => $d['unidad_compra'],
                    'equivalencia_compra' => (float)$d['equivalencia_compra'] > 0 ? (float)$d['equivalencia_compra'] : 1,
                    'cantidad_total_base' => 0
                ];
            }
            $ingredientes_totales[$id_ing]['cantidad_total_base'] += $cant_requerida;
        }
    }

    $resultado = [];
    $costo_total_compras = 0;

    foreach ($ingredientes_totales as $id_ing => $data) {
        $cant_base = $data['cantidad_total_base'];
        $equiv = $data['equivalencia_compra'];
        
        $cant_compra = ceil($cant_base / $equiv); // Redondear siempre hacia arriba para asegurar que alcance
        if ($data['unidad_compra'] == null || $data['unidad_compra'] == '') {
            $cant_compra = $cant_base; // Si no hay unidad de compra, se compra por unidad base
            $equiv = 1;
        }

        $precio_unitario_compra = isset($precios[$id_ing]) ? $precios[$id_ing] : 0;
        
        // Asumiendo que el precio local guardado es por la "Unidad de Compra" 
        // Si el precio estuviera por unidad base, habría que multiplicarlo por la cantidad base,
        // pero lo estándar es poner precio_compra = precio del Saco.
        $costo_estimado = $cant_compra * $precio_unitario_compra;
        $costo_total_compras += $costo_estimado;

        $resultado[] = [
            'ingrediente' => $data['nombre'],
            'cantidad_base' => round($cant_base, 2) . ' ' . $data['unidad_medida'],
            'cantidad_comprar' => $cant_compra,
            'unidad_compra' => $data['unidad_compra'] ? $data['unidad_compra'] : $data['unidad_medida'],
            'costo_estimado' => round($costo_estimado, 2)
        ];
    }

    respondSuccess([
        "sugerencia" => $resultado,
        "costo_total" => round($costo_total_compras, 2)
    ]);
}
else {
    respondError("Acción de recetas no válida", 404);
}
?>
