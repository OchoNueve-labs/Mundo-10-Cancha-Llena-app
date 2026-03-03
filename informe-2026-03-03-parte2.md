# Informe de Trabajo — 3 de Marzo 2026 (Parte 2)

## Centro de Mando Mundo 10

---

## 1. Corrección: Bot sobreescribía reservas de EasyCancha

### Problema reportado

El equipo de Mundo 10 reportó dos incidencias:

1. **Bot sobreescribió una reserva de EasyCancha**: Un cliente (Guillermo Acuña) reservó vía bot la misma cancha y horario que ya tenía Cristopher Alexander vía EasyCancha. El slot fue sobreescrito.
2. **Bot confirma sin validar pago**: El bot daba por confirmada la reserva sin que el cliente hubiese pagado.

### Causa raíz

El sub-workflow `Cancha Llena - Crear Reserva` no verificaba si ya existía una reserva activa antes de insertar una nueva. Tampoco existía un flujo de validación de pago.

### Correcciones implementadas

#### 1.1 Validación de disponibilidad antes de reservar

Se agregaron 3 nodos al sub-workflow:

- **Verificar Disponibilidad** (Postgres): query que busca reservas activas en la misma cancha/fecha/hora
- **Disponible?** (IF): evalúa si hay conflicto
- **Return Conflicto** (Code): responde al bot con mensaje de error si el horario ya está ocupado

```
Datos Válidos? → Verificar Disponibilidad → Disponible? → Insert Reserva
                                                        → Return Conflicto
```

#### 1.2 Sistema de pre-reserva

Las reservas creadas por el bot ahora se insertan como `pre_reserva` en vez de `pendiente`. Esto indica que el cliente aún no ha pagado.

**Workflow afectado**: `Cancha Llena - Crear Reserva` (ID: `SN9DtbsitEtVfSSp`)

---

## 2. Bloqueo temporal de slots para pre-reservas

### Problema

Si una pre-reserva no bloqueaba el slot, EasyCancha podía asignar el mismo horario a otro cliente (ya que busca slots con `estado = 'disponible'`).

### Solución

Se reconectó el nodo `Marcar Slot Reservado` en el sub-workflow. Ahora el flujo completo es:

```
Insert Reserva (estado: pre_reserva)
    → Marcar Slot Reservado (slot: disponible → reservado)
    → Alert Nueva Reserva
    → Return Success
```

**Resultado**: El slot queda bloqueado inmediatamente al crear la pre-reserva. EasyCancha no puede tomarlo porque sus queries filtran por `estado = 'disponible'`.

### Mensaje actualizado al cliente

> "Tienes 30 minutos para confirmar con el comprobante de pago (abono 50% por transferencia). Si no se recibe el pago en ese plazo, la pre-reserva se cancelará automáticamente y el horario quedará disponible para otros clientes."

---

## 3. Workflow de expiración automática: WF-Expirar-PreReservas

### Objetivo

Cancelar automáticamente las pre-reservas que no reciban pago en 30 minutos y liberar los slots para otros clientes.

### Workflow creado

- **Nombre**: `WF-Expirar-PreReservas`
- **ID**: `ERV4JKXWamewKX9l`
- **Estado**: Activo
- **Frecuencia**: Cada 5 minutos

### Flujo

```
Schedule Trigger (cada 5 min)
    → Buscar Expiradas (pre_reservas con >30 min)
    → Hay Expiradas?
        → Sí: Cancelar Reserva → Liberar Slots → Alert Expirada
        → No: Sin Expiradas (no-op)
```

### Detalle de nodos

| Nodo | Acción |
|------|--------|
| **Buscar Expiradas** | `SELECT` reservas con `estado = 'pre_reserva'` y `created_at < NOW() - 30 min` |
| **Cancelar Reserva** | `UPDATE` estado a `cancelada`, agrega nota de expiración |
| **Liberar Slots** | `UPDATE` slots a `disponible`, limpia `reserva_id` y datos del cliente |
| **Alert Expirada** | `INSERT` alerta informativa (se envía automáticamente a Telegram) |

### Seguridad

- La query de cancelación incluye `AND estado = 'pre_reserva'` para evitar race conditions
- Si la reserva ya fue confirmada (por pago) antes de los 30 min, no se cancela
- Solo aplica a reservas del bot. Reservas de EasyCancha llegan como `confirmada` y no pasan por este flujo

---

## 4. Soporte de pre-reserva en el Dashboard

### Cambios en el código

| Archivo | Cambio |
|---------|--------|
| `src/lib/types.ts` | Agregado `pre_reserva` al tipo `estado` de `Reserva` |
| `src/lib/constants.ts` | Color purple para badge de `pre_reserva` |
| `src/app/reservas/page.tsx` | Filtro por `pre_reserva`, botones confirmar/cancelar habilitados |
| `src/app/disponibilidad/page.tsx` | Incluir pre-reservas en cálculo de disponibilidad |
| `src/app/page.tsx` | Incluir pre-reservas en el dashboard principal |

---

## 5. Validación y testing

### Verificación de conexiones del sub-workflow

Se validaron las 8 conexiones del sub-workflow programáticamente. Todas correctas:

```
Trigger Reserva → Validar Datos → Datos Válidos? → Verificar Disponibilidad
→ Disponible? → Insert Reserva → Marcar Slot Reservado → Alert Nueva Reserva
→ Return Success
```

### Compatibilidad con EasyCancha (WF3 v2)

Se verificaron las 6 queries de WF3 que interactúan con la tabla `slots`:

| Query | Filtra por `estado = 'disponible'` | Compatible |
|-------|-------------------------------------|------------|
| Buscar Cancha Disponible | Sí | Sí |
| Retry Buscar Cancha | Sí | Sí |
| Marcar Slot Reservado | Sí | Sí |
| Buscar Cancha Nueva (Mod) | Sí | Sí |
| Marcar Slots Nuevos (Mod) | Sí | Sí |
| Insert Reserva EasyCancha | estado = `confirmada` | Sí |

**Conclusión**: EasyCancha nunca puede tomar un slot bloqueado por pre-reserva.

### Test end-to-end real

| Paso | Acción | Resultado |
|------|--------|-----------|
| 1 | Verificar slot disponible (Lo Prado, Cancha 6, 2026-03-15 10:00) | `disponible` |
| 2 | Crear pre-reserva de prueba | `estado: pre_reserva` |
| 3 | Marcar slot como reservado | `estado: reservado`, `reserva_id` asignado |
| 4 | Buscar slot como EasyCancha (`estado = 'disponible'`) | Array vacío — no lo encuentra |
| 5 | Verificar detección de duplicados | Query encuentra la pre-reserva existente |
| 6 | Backdatear `created_at` a >30 min | Simulado |
| 7 | Esperar ejecución del workflow de expiración | Ejecutado automáticamente |
| 8 | Verificar cancelación | `estado: cancelada`, nota de expiración |
| 9 | Verificar liberación de slot | `estado: disponible`, datos limpiados |
| 10 | Verificar alerta generada | Alerta insertada + enviada a Telegram |
| 11 | Limpiar datos de prueba | Eliminados |

### Bug encontrado y corregido durante testing

**Problema**: La query de `Cancelar Reserva` usaba `WHERE id = {{ $json.id }}` sin comillas. Como los IDs de reserva son UUID, PostgreSQL fallaba al parsear el valor.

**Fix**: Cambiado a `WHERE id = '{{ $json.id }}'` con comillas simples. Mismo fix aplicado a `Alert Expirada`.

---

## Resumen de componentes

| Componente | Estado |
|------------|--------|
| **Sub-workflow Crear Reserva** — Validación de disponibilidad | Activo |
| **Sub-workflow Crear Reserva** — Estado pre_reserva | Activo |
| **Sub-workflow Crear Reserva** — Bloqueo de slot reconectado | Activo |
| **Sub-workflow Crear Reserva** — Mensaje 30 min actualizado | Activo |
| **WF-Expirar-PreReservas** — Expiración automática cada 5 min | Activo |
| **WF-Expirar-PreReservas** — Fix UUID en queries | Activo |
| **Dashboard** — Soporte visual pre_reserva | Desplegado |
| **Dashboard** — Push a GitHub/Vercel** | Desplegado |

## 6. Actualización del Manual de Usuario

Se actualizó el manual de usuario (`docs/manual-usuario.md`) que se muestra en la ruta `/manual` del dashboard. El manual se lee directamente desde el archivo markdown, por lo que se actualiza automáticamente con cada deploy.

### Cambios realizados

| Sección | Cambio |
|---------|--------|
| **Sec. 3 — Dashboard** | Próximas reservas ahora menciona pre-reserva como estado posible |
| **Sec. 4 — Disponibilidad** | Agregado color morado en tabla de colores de la grilla |
| **Sec. 5 — Reservas** | Nuevo estado pre-reserva en filtros, tabla de estados y acciones (confirmar/cancelar) |
| **Sec. 6 — Alertas** | Agregada subsección sobre alertas por Telegram |
| **Sec. 7 — Pre-reservas (NUEVA)** | Sección completa explicando el flujo de pre-reserva, los 30 minutos, qué hacer cuando llega el comprobante, y que EasyCancha no se ve afectado |
| **Sec. 11 — Referencia rápida** | Tablas de colores actualizadas con morado/pre-reserva. Tips nuevos sobre pre-reservas y Telegram |

La numeración de secciones fue ajustada (7→8 Conversaciones, 8→9 Clientes, 9→10 Funciones generales, 10→11 Referencia rápida) para acomodar la nueva sección 7.

---

## Flujo completo del sistema

```
RESERVA VÍA BOT:
  Cliente → Bot → Verificar Disponibilidad → Insert pre_reserva → Bloquear slot
      ↓ (30 min para pagar)
      ├── Paga → WF-Validar-Pagos confirma (pendiente activación)
      └── No paga → WF-Expirar-PreReservas cancela + libera slot → Telegram

RESERVA VÍA EASYCANCHA:
  EasyCancha → WF3 v2 → Busca slot disponible → Insert confirmada → Bloquear slot
      (ya pagada, no pasa por pre_reserva)

PROTECCIÓN CRUZADA:
  - Pre-reserva bloquea slot → EasyCancha no lo ve
  - EasyCancha bloquea slot → Bot detecta conflicto y rechaza
```
