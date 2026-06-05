# MVP - Workflow Engine (Hexagonal + Spring Boot)

## 1. Objetivo del MVP

Construir un motor simple de workflows configurables que permita:

- Definir estados
- Definir transiciones válidas entre estados
- Crear instancias de un workflow
- Ejecutar transiciones respetando reglas
- Guardar historial de cambios

No incluye todavía:
- UI compleja
- Multi-tenancy
- Versionado avanzado de workflows
- Reglas condicionales complejas (IF/ELSE)
- Motor BPMN tipo Camunda

---

## 2. Caso de uso mínimo

Ejemplo: "Solicitud genérica"

Workflow:

CREATED → IN_REVIEW → APPROVED  
                    ↘ REJECTED

Instancia:

Solicitud #1  
Estado actual: IN_REVIEW

Acción:

transition(APPROVED)

Resultado:
- Si es válido → cambia estado
- Si no → error

---

## 3. Features del MVP

### 3.1 Definir Workflow

- Crear workflow con nombre
- Definir lista de estados
- Definir transiciones válidas

Ejemplo JSON:

{
  "name": "simple-approval",
  "states": ["CREATED", "IN_REVIEW", "APPROVED", "REJECTED"],
  "transitions": [
    { "from": "CREATED", "to": "IN_REVIEW" },
    { "from": "IN_REVIEW", "to": "APPROVED" },
    { "from": "IN_REVIEW", "to": "REJECTED" }
  ]
}

---

### 3.2 Crear instancia de workflow

POST /instances

Body:

{
  "workflowId": "simple-approval",
  "initialState": "CREATED"
}

---

### 3.3 Ejecutar transición

POST /instances/{id}/transition

Body:

{
  "to": "IN_REVIEW"
}

Reglas:
- validar que exista transición válida
- si no existe → error 400
- si existe → actualizar estado

---

### 3.4 Obtener estado actual

GET /instances/{id}

Response:

{
  "id": "123",
  "workflowId": "simple-approval",
  "currentState": "IN_REVIEW"
}

---

### 3.5 Historial de cambios

GET /instances/{id}/history

Response:

[
  {
    "from": "CREATED",
    "to": "IN_REVIEW",
    "timestamp": "2026-06-04T10:00:00"
  }
]

---

## 4. Modelo de dominio (CORE)

- Workflow
- State
- Transition
- WorkflowInstance
- StateChangeEvent

---

## 5. Reglas de negocio

- No se puede ir a un estado no permitido
- No se puede saltar estados sin transición definida
- Toda transición genera evento de historial
- Estado inicial obligatorio

---

## 6. Arquitectura (Hexagonal)

### Domain (core puro)

- Workflow
- WorkflowInstance
- TransitionValidator
- StateMachineService

### Application (use cases)

- CreateWorkflow
- CreateInstance
- ExecuteTransition
- GetInstance
- GetHistory

### Ports (interfaces)

#### Output ports

- WorkflowRepository
- InstanceRepository
- EventPublisher (opcional MVP)

### Infrastructure (adapters)

- PostgreSQL (JPA)
- REST Controllers (Spring Web)
- In-memory repository (tests)

---

## 7. Stack técnico MVP

- Java 21+
- Spring Boot 4.x
- Spring Web
- Spring Data JPA
- PostgreSQL
- Flyway (opcional)

---

## 8. Modelo de datos

### workflow
- id
- name

### state
- id
- workflow_id
- name

### transition
- id
- workflow_id
- from_state
- to_state

### instance
- id
- workflow_id
- current_state

### history
- id
- instance_id
- from_state
- to_state
- timestamp

---

## 9. UI Angular (MVP mínimo)

### Workflows
- lista
- detalle (estados/transiciones)

### Instances
- crear instancia
- ver estado
- ejecutar transición

### History
- timeline simple

---

## 10. Entregable del MVP

- Crear workflows
- Crear instancias
- Ejecutar transiciones válidas
- Persistir estado
- Ver historial

---

## 11. Extensiones futuras

- Reglas condicionales (guards)
- Roles por transición
- Versionado de workflows
- Kafka events
- UI tipo grafo
- BPMN engine

---

## 12. Criterio de éxito

El motor es exitoso si:

- Puede modelar admisiones médicas
- Puede modelar soporte técnico
- El core no cambia
- Solo cambian definiciones de workflow