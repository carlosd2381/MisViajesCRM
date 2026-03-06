# Leads/Clients Demo Rápido

Objetivo: mostrar en vivo un flujo completo de valor en 3-5 minutos (lead → cliente).

## Flujo que demuestra

1. API responde salud (`GET /health`).
2. Se crea lead (`POST /leads`).
3. Se consulta lead (`GET /leads/:id`).
4. Se convierte lead a cliente (`POST /leads/:id/convert`).
5. Se consulta cliente (`GET /clients/:id`).

## Requisitos

- API local ejecutándose (`npm run dev:api`).
- Modo recomendado para demo rápida: `AUTH_MODE=header`.

## Comando de demo

```bash
npm run leads:demo
```

Salida esperada (resumen):

- `✅ Demo flow completed`
- IDs de entidades creadas (`leadId`, `clientId`).
- Línea de resumen estructurado:

```text
LEADS_CLIENTS_DEMO_SUMMARY {...}
```

## Variables opcionales

- `LEADS_DEMO_BASE_URL` (default `http://127.0.0.1:3000`)
- `LEADS_DEMO_LOCALE` (default `es-MX`)
- `LEADS_DEMO_USER_ID` (default `demo_agent`)
- `LEADS_DEMO_USER_ROLE` (default `agent`)

Ejemplo:

```bash
LEADS_DEMO_LOCALE=en-US npm run leads:demo
```

## Mensaje de apoyo para owner

"Este demo valida que el flujo comercial base ya está operativo: capturamos un lead, lo convertimos a cliente y consultamos ambos registros con trazabilidad de IDs en tiempo real."
