# AI Instructions & Guidelines

## Core Principles
1. **Preserve Existing Components**: The following UI components are finalized. **DO NOT** modify their internal logic, layout, functionalities, view, or structure unless explicitly and specifically asked:
   - `ProjectDetailView`
   - `TasksView`
   - `TaskDetailPanel`

2. **Material Design Consistency**: Maintain the existing styling and design system used in the components listed above. Do not introduce conflicting styles.

3. **Additive Development**: Any new features must be built **around** these existing components. Do not refactor the existing finalized code to accommodate new features.

4. **Explicit Authorization**: Do not alter any features, data models, or views already created without a direct confirmation or request from the user.

## File Structure
- `index.tsx`: Contains the core React application. Treat the defined views within as immutable blocks unless instructed otherwise.
