# Project Rules & Directives

## Core Engineering & Design Rules (Permanent Reference)
- **No Obsolete Backward Compatibility**: Do not preserve backward compatibility — remove obsolete paths instead of adding compatibility layers, fallbacks, or migrations.
- **Simplicity First**: Choose the simplest implementation that fully meets the current requirements. Avoid speculative abstractions, configuration, or indirection you don't actually need right now.
- **Layered Growth**: Grow the system in layers: start from the smallest version that works end to end, and add each new capability on top of a product that already works. Never trade a working product for unfinished complexity.
- **Modular Components**: Keep components modular with clearly separated concerns.
- **Established Libraries**: Prefer established, well-maintained libraries when they reduce overall complexity or improve reliability. Do not reimplement common functionality without a clear reason.
- **Leverage Existing Dependencies**: Lean on the dependencies already in the project before writing your own implementation or adding a new package. Do not assume a library lacks a capability without checking its documentation and types.
- **Long-Term Architectural Quality**: Make architectural decisions for the long term. Do not accept a stopgap that will need to be redone later — invest the time now to get the design right.

## Company Authorized Manager Handling Rule
- **FORBIDDEN**: Reading or writing data directly to `companies.manager`.
- **REQUIRED**: All company creation, editing, and display components (Company Forms, Company Details, Company 360) must interact independently with the `company_managers` table to record, display, and renew authorized manager (المدير المفوض) details.
