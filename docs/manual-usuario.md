# Manual de Usuario - Cancha Llena Centro de Mando

Bienvenido al Centro de Mando de Cancha Llena. Esta herramienta te permite gestionar las reservas, disponibilidad y comunicaciones de los centros deportivos Mundo 10 desde un solo lugar.

---

## 1. Como ingresar al sistema

1. Abre la direccion web del Centro de Mando en tu navegador (Chrome, Safari, etc.)
2. Ingresa tu **correo electronico** y **contrasena**
3. Haz click en **"Ingresar"**

Si ves un mensaje de error, revisa que el correo y la contrasena esten correctos. Si el problema persiste, contacta al administrador.

---

## 2. Navegacion

### En computador
A la izquierda veras una barra lateral con las secciones del sistema:

- **Dashboard** — Vista general con numeros y graficos
- **Disponibilidad** — Grilla de horarios por cancha
- **Reservas** — Lista de todas las reservas
- **Alertas** — Notificaciones del sistema
- **Conversaciones** — Mensajes con clientes
- **Clientes** — Base de datos de clientes

Haz click en cualquier seccion para ir a ella. La seccion activa se muestra resaltada.

### En celular
Arriba a la derecha veras un icono de menu (tres lineas). Al tocarlo se abre el menu con las mismas secciones.

### Indicador de alertas
Junto a "Alertas" veras un numero en rojo si hay notificaciones pendientes. Este numero se actualiza automaticamente.

---

## 3. Dashboard (Pagina principal)

Es lo primero que ves al entrar. Te da un resumen rapido de como va todo.

### Selector de periodo

Arriba del todo puedes elegir el rango de fechas para los datos:

- **Hoy** — Solo las cifras de hoy
- **7d** — Ultimos 7 dias (opcion por defecto)
- **14d** — Ultimos 14 dias
- **30d** — Ultimos 30 dias
- **Este mes** — Desde el primer dia del mes hasta hoy

### Las 6 tarjetas de resumen

| Tarjeta | Que muestra |
|---------|-------------|
| **Reservas** | Total de reservas en el periodo seleccionado |
| **Ocupacion LP** | Porcentaje de canchas ocupadas en Lo Prado. Verde con flecha arriba = mas de 70% (muy bien). Rojo con flecha abajo = menos de 30% (bajo) |
| **Ocupacion Q** | Porcentaje de canchas ocupadas en Quilicura. Mismos indicadores de color |
| **Mensajes** | Total de mensajes recibidos y enviados en el periodo |
| **Alertas** | Cuantas alertas sin leer hay en este momento |
| **Bot vs EC** | Cuantas reservas vinieron del bot automatico y cuantas de EasyCancha |

### Grafico de reservas

Un grafico de barras que muestra las reservas por dia:
- Barras **verdes** = Lo Prado
- Barras **azules** = Quilicura

Pasa el mouse encima de una barra para ver el numero exacto.

### Horarios con menor ocupacion

Muestra las 5 horas del dia con mas canchas libres. Util para saber que horarios necesitan mas promocion o atencion.

### Proximas reservas

Lista de las reservas de los proximos 7 dias. Cada una muestra:
- La hora y fecha
- El nombre del cliente
- El estado (pendiente o confirmada)
- El centro y cancha

Si el cliente tiene telefono, puedes tocar el icono de **WhatsApp** para abrirle una conversacion directa.

### Ultimas alertas

Las notificaciones mas recientes sin leer. Un punto azul indica que aun no ha sido leida.

---

## 4. Disponibilidad (Grilla de canchas)

Aqui ves el horario completo de un centro, dia por dia, cancha por cancha.

### Filtros

- **Fecha**: Usa las flechas para ir al dia anterior o siguiente. El boton "Hoy" te lleva al dia actual.
- **Centro**: Elige entre Lo Prado o Quilicura
- **Tipo de cancha**: Futbolito o Padel (Padel solo esta disponible en Quilicura)

### Como leer la grilla

La grilla es una tabla donde:
- Cada **fila** es una hora del dia
- Cada **columna** es una cancha

Los colores de cada celda te dicen el estado:

| Color | Significado |
|-------|-------------|
| **Verde** ("Libre") | La cancha esta disponible en ese horario |
| **Rojo** (muestra un nombre) | La cancha esta reservada por ese cliente |
| **Gris** ("Bloqueado") | La cancha no esta disponible (bloqueada manualmente) |

### Resumen de ocupacion

Arriba de la grilla veras un resumen: "X de Y slots ocupados (Z%)".

### Crear una reserva desde la grilla

1. Busca una celda verde (libre) en la hora y cancha que quieras
2. Haz click en la celda
3. Se abrira un formulario con la cancha, fecha y hora ya completados
4. Solo necesitas llenar el **nombre del cliente** y su **telefono**
5. Opcionalmente agrega una nota
6. Haz click en **"Crear Reserva"**
7. La celda cambiara de verde a rojo, mostrando el nombre del cliente

### Ver detalle de una reserva existente

Haz click en una celda roja (reservada) para ver los datos de la reserva: nombre del cliente, telefono, y numero de reserva.

### Hora actual

Si estas viendo el dia de hoy, la fila de la hora actual se resalta con un borde azul para que la ubiques facilmente.

---

## 5. Reservas (Lista de reservas)

Vista de tabla con todas las reservas. Ideal para buscar, confirmar o cancelar reservas.

### Filtros disponibles

- **Fecha**: Filtra las reservas de un dia especifico
- **Centro**: Todos, Lo Prado o Quilicura
- **Estado**: Todos, Pendiente, Confirmada, Cancelada, Completada, No show
- **Canal**: Todos, Bot, EasyCancha, Telefono, Presencial, Dashboard

A la derecha de los filtros veras el total de reservas que coinciden.

### Crear una nueva reserva

1. Haz click en el boton **"Nueva Reserva"** (icono + arriba a la derecha)
2. Selecciona el **centro** y **tipo de cancha**
3. Selecciona la **cancha** especifica
4. Si es **Padel en Quilicura**, selecciona la **duracion** (60, 90 o 120 minutos)
5. Elige la **fecha** (hoy o futura)
6. Elige la **hora** — solo se muestran las horas que tienen suficientes slots consecutivos disponibles para la duracion seleccionada
7. Ingresa el **nombre del cliente** (obligatorio)
8. Ingresa el **telefono** (obligatorio)
9. Opcionalmente agrega notas
10. Haz click en **"Crear Reserva"**

Veras un mensaje de confirmacion y la reserva aparecera en la tabla.

### Columnas de la tabla

| Columna | Que muestra |
|---------|-------------|
| **Hora** | La hora de la reserva (para Padel, muestra la duracion si es mayor a 60 min) |
| **Cliente** | Nombre y telefono del cliente |
| **Centro** | Lo Prado o Quilicura |
| **Cancha** | Tipo y numero de cancha |
| **Estado** | Estado actual con color (ver tabla abajo) |
| **Canal** | Como se hizo la reserva (bot, easycancha, telefono, etc.) |
| **Acciones** | Botones de accion |

### Estados y sus colores

| Estado | Color | Significado |
|--------|-------|-------------|
| Pendiente | Amarillo | La reserva esta registrada pero falta confirmacion |
| Confirmada | Verde | La reserva esta confirmada y activa |
| Cancelada | Rojo | La reserva fue cancelada |
| Completada | Azul | El cliente ya jugo, la reserva se completo |
| No show | Gris | El cliente no se presento |

### Acciones disponibles

En la columna "Acciones" veras estos botones segun el estado de la reserva:

- **Check verde** (Confirmar): Aparece solo para reservas pendientes. Un click la confirma inmediatamente.
- **X roja** (Cancelar): Aparece para reservas pendientes y confirmadas. Al hacer click, te pedira confirmacion. Si confirmas, la reserva se cancela y el horario queda libre.
- **Icono verde** (WhatsApp): Aparece si el cliente tiene telefono. Un click abre WhatsApp con el numero del cliente.

### Paginacion

Las reservas se muestran de 25 en 25. Usa los botones de navegacion en la parte inferior para ir a la pagina siguiente o anterior.

---

## 6. Alertas (Centro de notificaciones)

Aqui llegan las notificaciones del sistema: nuevas reservas, errores de sincronizacion, escalamientos, etc.

### Filtros

- **Tipo**: Filtra por tipo de alerta (Reserva, EasyCancha sync, Error, etc.)
- **Estado de lectura**: No leidas (por defecto), Leidas, o Todas
- **Fecha**: Filtra por dia especifico

### Tipos de alerta y sus colores

| Tipo | Color | Que significa |
|------|-------|---------------|
| Reserva | Verde | Una nueva reserva fue creada |
| EasyCancha sync | Azul | Sincronizacion automatica con EasyCancha |
| EasyCancha manual | Amarillo | Accion manual necesaria en EasyCancha |
| EasyCancha error | Rojo | Error en la sincronizacion con EasyCancha |
| Escalamiento | Naranja | Un cliente fue escalado (necesita atencion humana) |
| Error | Gris | Error del sistema |

### Acciones en alertas

- **Icono check** (Marcar como leida): Marca la alerta como vista. Las alertas leidas se atenuan visualmente.
- **Icono doble check** (Marcar como resuelta): Indica que ya atendiste el asunto. La alerta muestra "Resuelta".
- **"Marcar todas como leidas"**: Boton arriba a la derecha. Marca todas las alertas como leidas de un golpe.

El punto azul junto a una alerta indica que todavia no ha sido leida.

---

## 7. Conversaciones (Mensajes con clientes)

Vista de mensajes organizados por cliente. Se divide en dos paneles:

### Panel izquierdo: Lista de conversaciones

- Muestra todos los clientes que han enviado mensajes
- Usa el **buscador** arriba para filtrar por nombre, telefono o ID
- Cada conversacion muestra el nombre del cliente, su ultimo mensaje, y hace cuanto tiempo fue
- Haz click en una conversacion para ver los mensajes completos

### Panel derecho: Chat del cliente seleccionado

- **Burbujas grises** (izquierda) = mensajes que envio el cliente
- **Burbujas verdes** (derecha) = mensajes enviados al cliente
- Arriba del chat veras el nombre del cliente y su canal (WhatsApp, Messenger, etc.)
- Si tiene telefono, puedes usar el boton de **WhatsApp** para abrirle un chat directo

---

## 8. Clientes (Base de datos)

Lista de todos los clientes registrados en el sistema.

### Buscador y filtros

- **Buscador**: Escribe un nombre, telefono o ID para encontrar un cliente
- **Canal**: Filtra por canal de comunicacion (WhatsApp, Messenger, Instagram)

### Tabla de clientes

Cada fila muestra: Nombre, Telefono, Email, Canal, Fecha de registro, y Ultima actividad.

### Ver detalles de un cliente

Haz click en cualquier fila para expandirla y ver:

- **Ultimos mensajes**: Los 5 mensajes mas recientes del cliente
- **Ultimas reservas**: Las 5 reservas mas recientes, con su estado y detalle

### WhatsApp

Si el cliente tiene telefono, usa el boton de WhatsApp en la fila para contactarlo directamente.

---

## 9. Funciones generales

### Modo oscuro / claro

Arriba a la derecha de cada pagina veras un icono de **sol** o **luna**. Haz click para cambiar entre modo claro y modo oscuro. El sistema recuerda tu preferencia.

### Actualizacion en tiempo real

Los datos del Centro de Mando se actualizan automaticamente. Si alguien crea una reserva desde otro lugar (bot, EasyCancha, etc.), veras el cambio reflejado sin necesidad de recargar la pagina.

### Boton de refrescar

Todas las paginas tienen un boton de refrescar (icono de flechas circulares) en la esquina superior derecha. Usalo si quieres forzar una actualizacion de los datos.

### Cerrar sesion

Al final de la barra lateral (en computador) o del menu (en celular), encontraras el boton **"Cerrar sesion"**. Al hacer click, se cierra tu sesion y vuelves a la pantalla de ingreso.

---

## 10. Referencia rapida

### Colores de estado de reservas

| Color | Estado | Significado |
|-------|--------|-------------|
| Amarillo | Pendiente | Esperando confirmacion |
| Verde | Confirmada | Reserva activa |
| Rojo | Cancelada | Fue cancelada |
| Azul | Completada | Ya se jugo |
| Gris | No show | El cliente no llego |

### Colores de la grilla de disponibilidad

| Color | Significado |
|-------|-------------|
| Verde | Cancha libre — haz click para reservar |
| Rojo | Cancha reservada — haz click para ver detalles |
| Gris | Cancha bloqueada — no disponible |

### Centros y canchas disponibles

| Centro | Tipo | Canchas | Horario |
|--------|------|---------|---------|
| Lo Prado | Futbolito | Cancha 1 a Cancha 6 | 09:00 a 23:00 |
| Quilicura | Futbolito | Cancha 1 a Cancha 4 | 08:00 a 23:00 |
| Quilicura | Padel | Cancha 1 a Cancha 3 | 08:30 a 23:00 (intervalos de 30 min, duraciones de 60/90/120 min) |

### Tips utiles

- Para ver rapidamente si hay canchas libres, ve a **Disponibilidad** y busca las celdas verdes
- Para contactar a un cliente, busca el icono de WhatsApp junto a su nombre
- Si ves muchas alertas pendientes, revisalas en **Alertas** y marcalas como leidas o resueltas
- Si quieres saber que horarios tienen menor demanda, revisa el widget "Horarios con menor ocupacion" en el Dashboard
- Para crear una reserva rapida: ve a **Disponibilidad**, encuentra la celda verde que quieras, haz click, llena nombre y telefono, y listo
