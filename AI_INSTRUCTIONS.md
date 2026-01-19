# AI Instructions & Guidelines

## 1. IMMUTABLE COMPONENTS (STRICT)
The following UI components and modules are considered **FINALIZED**. 
**DO NOT** modify their internal logic, layout, styling, functionalities, view structure, or data handling unless explicitly and specifically instructed by the user.

- **`ProjectDetailView`**
- **`TasksView`** (including Kanban, Table, Calendar modes)
- **`TaskDetailPanel`**
- **`LeadsView`** (Leads & CRM module)
- **`PlaybooksView`** (including `PlaybookEditor`, `PlaybookGeneratorModal`, `PlaybookStepCard`)

**Rule:** Treat the code for these components as read-only. New features must be implemented as separate components or wrappers that do not touch the existing codebase of these finalized views.

## 2. Design Consistency
- Maintain the existing **Material Design** system and Tailwind styling used in the finalized components.
- Do not introduce conflicting design patterns.
- Any new UI must look visually consistent with the `ProjectDetailView` and `TasksView`.

## 3. Additive Development Strategy
- **New Features**: Must be built **around** the existing components.
- **No Refactoring**: Do not refactor, simplify, or "clean up" the finalized code to accommodate new features.
- **Extensions**: If a finalized component needs to support a new capability, prefer creating a higher-order component or a parallel component unless direct modification is unavoidable and authorized.

## 4. File Structure
- `index.tsx`: This file contains the core React application and the finalized views. Handle this file with extreme care. When adding new code to `index.tsx`, ensure you are appending or inserting without disrupting the existing component definitions.

## 5. Explicit Authorization
- Do not alter any features, data models, or views already created (Projects, Tasks, Leads, Playbooks) without a direct confirmation or request from the user.
