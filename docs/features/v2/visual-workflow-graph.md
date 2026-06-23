# Feature: Visual Workflow Graph

Render the workflow state graph as an interactive diagram in the frontend, showing states as nodes, transitions as edges, and highlighting the current state of a live execution.

## Status

- **Iteration:** v2
- **Deferred because:** Pure UX enhancement. The existing list/table views are functional for v1. A graph view requires evaluating a graph rendering library and is non-trivial to implement well.

---

## Motivation

A workflow with many states and transitions is hard to understand from a table. A visual graph makes the definition immediately readable — you can see the flow at a glance, spot dead ends, and understand the relationship between states without reading each row.

For live executions, highlighting the current state on the graph gives operators instant situational awareness.

---

## Key Design Questions

- **Library:** [D3.js](https://d3js.org/) (full control, high effort), [vis-network](https://visjs.github.io/vis-network/), [Cytoscape.js](https://js.cytoscape.org/), or [Mermaid](https://mermaid.js.org/) (render from text — simplest, least interactive)?
- **Where in the UI?** On the workflow detail page (shows the definition), and on the execution detail page (highlights current state).
- **Layout algorithm:** Left-to-right DAG layout is natural for workflow graphs. Most libraries include automatic layout (Dagre, ELK).
- **Interactivity:** Click a node to see its details? Click a transition edge to trigger it directly from the graph? Or read-only in v2?
- **Terminal states:** Visually distinct (e.g., double border, different color) to make it clear where the flow ends.

---

## Rough Implementation Sketch

1. Pick library (recommendation: Cytoscape.js — good Angular integration, auto-layout via Dagre)
2. Create `WorkflowGraphComponent` that maps `WorkflowDetailResponse` states and transitions to graph nodes/edges
3. Add to workflow detail page below the existing states table
4. On execution detail page, pass `currentState.code` as a highlighted node
