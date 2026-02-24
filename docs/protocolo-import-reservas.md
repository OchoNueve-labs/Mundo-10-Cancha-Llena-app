# Protocolo de Importacion de Reservas - Cancha Llena

Guia paso a paso para cargar reservas existentes (EasyCancha + manuales) en Supabase antes del go-live.

**Tiempo estimado**: ~15 minutos (sin contar preparacion del spreadsheet)

---

## Paso 0: Preparar los datos en Google Sheet / Excel

### Columnas requeridas

| Columna | Formato | Ejemplo | Obligatoria |
|---------|---------|---------|-------------|
| `centro` | Texto exacto | `Lo Prado` o `Quilicura` | Si |
| `tipo_cancha` | Texto exacto | `Futbolito` o `Padel` | Si |
| `cancha` | Texto exacto | `Cancha 1` | Si |
| `fecha` | YYYY-MM-DD | `2026-03-01` | Si |
| `hora` | HH:MM:SS | `14:00:00` | Si |
| `nombre_cliente` | Texto libre | `Juan Perez` | No |
| `telefono_cliente` | Telefono | `+56912345678` | No |
| `estado` | Texto exacto | `confirmada` | Si |
| `canal_origen` | Texto exacto | `easycancha` | Si |
| `origen` | Texto exacto | `import_inicial` | Si |
| `codigo_easycancha` | Texto | `EC-001` | No |
| `notas` | Texto libre | | No |

### Valores validos por columna

- **centro**: `Lo Prado`, `Quilicura`
- **tipo_cancha**: `Futbolito`, `Padel` (Padel solo en Quilicura)
- **cancha**:
  - Lo Prado Futbolito: `Cancha 1` a `Cancha 6`
  - Quilicura Futbolito: `Cancha 1` a `Cancha 4`
  - Quilicura Padel: `Cancha 1` a `Cancha 3`
- **hora** (horas validas por tipo):
  - Lo Prado Futbolito: `09:00:00`, `10:00:00`, ... `22:00:00`
  - Quilicura Futbolito: `08:00:00`, `09:00:00`, ... `22:00:00`
  - Quilicura Padel: `08:30:00`, `09:30:00`, ... `22:30:00` (siempre en :30)
- **estado**: `confirmada` (default para reservas existentes), `pendiente`
- **canal_origen**: `easycancha`, `presencial`, `telefono`, `dashboard`, `bot`

### Valores pre-llenados (no cambiar)

Para todas las filas, usar:
- `estado` = `confirmada`
- `canal_origen` = `easycancha` (o `presencial` para manuales)
- `origen` = `import_inicial` (permite identificar y revertir la importacion)

### Exportar como CSV

1. En Google Sheets: Archivo > Descargar > Valores separados por comas (.csv)
2. En Excel: Guardar como > CSV UTF-8

> **IMPORTANTE**: Las horas de Padel en Quilicura siempre terminan en `:30` (ej: `08:30:00`, `09:30:00`). Las demas canchas usan horas completas (ej: `09:00:00`, `10:00:00`).

---

## Paso 1: Generar slots vacios en Supabase

Este script crea todos los slots de disponibilidad para el rango de fechas indicado.

1. Ir a **Supabase Dashboard > SQL Editor > New query**
2. Pegar el siguiente SQL
3. **Cambiar las fechas** `start_date` y `end_date` segun necesidad
4. Ejecutar

```sql
-- ============================================================
-- GENERAR SLOTS VACIOS PARA RANGO DE FECHAS
-- ============================================================
-- Cambiar estas dos fechas:
DO $$
DECLARE
  start_date DATE := '2026-03-01';   -- Primera fecha
  end_date   DATE := '2026-03-31';   -- Ultima fecha
  d DATE;
  h INTEGER;
  cancha_num INTEGER;
BEGIN

  FOR d IN SELECT generate_series(start_date, end_date, '1 day'::interval)::date
  LOOP

    -- LO PRADO - Futbolito (6 canchas, 09:00-22:00)
    FOR cancha_num IN 1..6 LOOP
      FOR h IN 9..22 LOOP
        INSERT INTO slots (centro, tipo_cancha, cancha, fecha, hora, duracion, estado)
        VALUES ('Lo Prado', 'Futbolito', 'Cancha ' || cancha_num, d, make_time(h, 0, 0), 60, 'disponible')
        ON CONFLICT (centro, tipo_cancha, cancha, fecha, hora) DO NOTHING;
      END LOOP;
    END LOOP;

    -- QUILICURA - Futbolito (4 canchas, 08:00-22:00)
    FOR cancha_num IN 1..4 LOOP
      FOR h IN 8..22 LOOP
        INSERT INTO slots (centro, tipo_cancha, cancha, fecha, hora, duracion, estado)
        VALUES ('Quilicura', 'Futbolito', 'Cancha ' || cancha_num, d, make_time(h, 0, 0), 60, 'disponible')
        ON CONFLICT (centro, tipo_cancha, cancha, fecha, hora) DO NOTHING;
      END LOOP;
    END LOOP;

    -- QUILICURA - Padel (3 canchas, 08:30-22:30)
    FOR cancha_num IN 1..3 LOOP
      FOR h IN 8..22 LOOP
        INSERT INTO slots (centro, tipo_cancha, cancha, fecha, hora, duracion, estado)
        VALUES ('Quilicura', 'Padel', 'Cancha ' || cancha_num, d, make_time(h, 30, 0), 60, 'disponible')
        ON CONFLICT (centro, tipo_cancha, cancha, fecha, hora) DO NOTHING;
      END LOOP;
    END LOOP;

  END LOOP;

  RAISE NOTICE 'Slots generados desde % hasta %', start_date, end_date;
END $$;
```

### Verificar generacion de slots

```sql
SELECT centro, tipo_cancha, COUNT(*) as total_slots,
  COUNT(DISTINCT fecha) as dias,
  MIN(fecha) as desde, MAX(fecha) as hasta
FROM slots
GROUP BY centro, tipo_cancha
ORDER BY centro, tipo_cancha;
```

**Slots esperados por dia:**
| Centro | Tipo | Canchas | Slots/cancha | Total/dia |
|--------|------|---------|-------------|-----------|
| Lo Prado | Futbolito | 6 | 14 | 84 |
| Quilicura | Futbolito | 4 | 15 | 60 |
| Quilicura | Padel | 3 | 15 | 45 |
| **Total** | | **13** | | **189** |

---

## Paso 2: Importar reservas desde CSV

1. Ir a **Supabase Dashboard > Table Editor**
2. Seleccionar la tabla **`reservas`**
3. Click en **Insert** > **Import data from CSV**
4. Subir el archivo CSV
5. Verificar el mapeo de columnas:
   - `id` → **auto-generate** (NO incluir en el CSV)
   - `created_at` → **auto-generate**
   - Las demas columnas deben coincidir por nombre
6. Click **Import**

### Verificar importacion

```sql
SELECT
  COUNT(*) as total_importadas,
  COUNT(DISTINCT centro) as centros,
  COUNT(DISTINCT fecha) as dias_distintos,
  MIN(fecha) as primera_fecha,
  MAX(fecha) as ultima_fecha
FROM reservas
WHERE origen = 'import_inicial';
```

---

## Paso 3: Vincular reservas con slots

### 3a. Dry-run (solo ver, no cambia nada)

Ejecutar primero para verificar que todo matchea correctamente:

```sql
SELECT
  r.id as reserva_id,
  r.centro, r.tipo_cancha, r.cancha, r.fecha, r.hora,
  r.nombre_cliente,
  s.id as slot_id,
  s.estado as slot_estado_actual
FROM reservas r
LEFT JOIN slots s
  ON r.centro = s.centro
  AND r.tipo_cancha = s.tipo_cancha
  AND r.cancha = s.cancha
  AND r.fecha = s.fecha
  AND r.hora = s.hora
WHERE r.origen = 'import_inicial'
  AND r.estado IN ('pendiente', 'confirmada')
ORDER BY r.fecha, r.hora, r.centro, r.cancha;
```

**Revisar**:
- Filas con `slot_id = NULL` → no existe slot para esa reserva (error en datos, fecha fuera de rango, o hora incorrecta)
- Filas con `slot_estado_actual = 'reservado'` → posible duplicado

### 3b. Ejecutar vinculacion

Solo si el dry-run se ve correcto:

```sql
-- Primero verificar el tipo de dato de reserva_id
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'slots' AND column_name = 'reserva_id';
```

Si `data_type` es `uuid` o `text`:

```sql
UPDATE slots s
SET
  estado = 'reservado',
  reserva_id = r.id::text,
  origen = r.canal_origen,
  cliente_nombre = r.nombre_cliente,
  cliente_telefono = r.telefono_cliente,
  notas = COALESCE(r.notas, 'Import inicial'),
  updated_at = NOW()
FROM reservas r
WHERE r.centro = s.centro
  AND r.tipo_cancha = s.tipo_cancha
  AND r.cancha = s.cancha
  AND r.fecha = s.fecha
  AND r.hora = s.hora
  AND r.origen = 'import_inicial'
  AND r.estado IN ('pendiente', 'confirmada');
```

Si `data_type` es `integer`:

```sql
UPDATE slots s
SET
  estado = 'reservado',
  reserva_id = r.id::text,
  origen = r.canal_origen,
  cliente_nombre = r.nombre_cliente,
  cliente_telefono = r.telefono_cliente,
  notas = COALESCE(r.notas, 'Import inicial'),
  updated_at = NOW()
FROM reservas r
WHERE r.centro = s.centro
  AND r.tipo_cancha = s.tipo_cancha
  AND r.cancha = s.cancha
  AND r.fecha = s.fecha
  AND r.hora = s.hora
  AND r.origen = 'import_inicial'
  AND r.estado IN ('pendiente', 'confirmada');
```

---

## Paso 4: Verificacion

Ejecutar estas 5 queries. Todas deben pasar sin errores.

### 4a. Resumen general

```sql
SELECT 'Reservas importadas' as metrica, COUNT(*)::text as valor
FROM reservas WHERE origen = 'import_inicial'
UNION ALL
SELECT 'Slots reservados', COUNT(*)::text
FROM slots WHERE estado = 'reservado'
UNION ALL
SELECT 'Slots disponibles', COUNT(*)::text
FROM slots WHERE estado = 'disponible';
```

### 4b. Reservas sin slot (DEBE dar 0 filas)

```sql
SELECT r.id, r.centro, r.tipo_cancha, r.cancha, r.fecha, r.hora,
  r.nombre_cliente, 'SIN SLOT CORRESPONDIENTE' as problema
FROM reservas r
LEFT JOIN slots s
  ON r.centro = s.centro AND r.tipo_cancha = s.tipo_cancha
  AND r.cancha = s.cancha AND r.fecha = s.fecha AND r.hora = s.hora
WHERE r.origen = 'import_inicial'
  AND r.estado IN ('pendiente', 'confirmada')
  AND s.id IS NULL;
```

### 4c. Slots no actualizados (DEBE dar 0 filas)

```sql
SELECT r.id as reserva_id, r.nombre_cliente, r.centro, r.cancha, r.fecha, r.hora,
  s.estado as slot_estado
FROM reservas r
JOIN slots s
  ON r.centro = s.centro AND r.tipo_cancha = s.tipo_cancha
  AND r.cancha = s.cancha AND r.fecha = s.fecha AND r.hora = s.hora
WHERE r.origen = 'import_inicial'
  AND r.estado IN ('pendiente', 'confirmada')
  AND s.estado = 'disponible';
```

### 4d. Ocupacion por dia (sanity check)

```sql
SELECT s.fecha, s.centro,
  COUNT(*) as total_slots,
  COUNT(*) FILTER (WHERE s.estado = 'reservado') as reservados,
  COUNT(*) FILTER (WHERE s.estado = 'disponible') as disponibles,
  ROUND(COUNT(*) FILTER (WHERE s.estado = 'reservado') * 100.0 / NULLIF(COUNT(*), 0), 1) as pct_ocupacion
FROM slots s
WHERE s.fecha >= CURRENT_DATE
GROUP BY s.fecha, s.centro
ORDER BY s.fecha, s.centro
LIMIT 30;
```

### 4e. Duplicados (DEBE dar 0 filas)

```sql
SELECT centro, tipo_cancha, cancha, fecha, hora, COUNT(*) as duplicados
FROM reservas
WHERE origen = 'import_inicial' AND estado IN ('pendiente', 'confirmada')
GROUP BY centro, tipo_cancha, cancha, fecha, hora
HAVING COUNT(*) > 1;
```

---

## Paso 5: Verificacion visual en el dashboard

1. Abrir `/disponibilidad` → la grilla debe mostrar slots verdes (libres) y rojos (reservados)
2. Abrir `/reservas` → la tabla debe mostrar las reservas importadas
3. Abrir `/` (dashboard) → los KPIs deben reflejar los datos correctos

---

## Rollback (si algo sale mal)

Si necesitas borrar todo y empezar de nuevo:

```sql
-- 1. Borrar reservas importadas
DELETE FROM reservas WHERE origen = 'import_inicial';

-- 2. Resetear slots a disponible
UPDATE slots SET
  estado = 'disponible',
  reserva_id = NULL,
  origen = NULL,
  cliente_nombre = NULL,
  cliente_telefono = NULL,
  notas = NULL,
  updated_at = NOW()
WHERE notas = 'Import inicial' OR origen IN ('easycancha', 'presencial', 'telefono');

-- 3. Verificar que todo quedo limpio
SELECT COUNT(*) FROM reservas WHERE origen = 'import_inicial';  -- Debe ser 0
SELECT COUNT(*) FROM slots WHERE estado = 'reservado';          -- Debe ser 0
```

Despues de hacer rollback, puedes corregir el CSV y repetir desde el Paso 2.

---

## Resumen rapido

| Paso | Que hacer | Donde |
|------|-----------|-------|
| 0 | Llenar spreadsheet con reservas | Google Sheets / Excel |
| 1 | Generar slots vacios | Supabase SQL Editor |
| 2 | Importar CSV de reservas | Supabase Table Editor |
| 3 | Vincular reservas con slots | Supabase SQL Editor |
| 4 | Ejecutar queries de verificacion | Supabase SQL Editor |
| 5 | Verificar en el dashboard | Browser |
