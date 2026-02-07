/**
 * Generates deterministic, namespaced IDs for C4 model elements.
 * Convention: "prefix:slug" (e.g., "container:api-gateway", "component:user-controller")
 */

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function landscapeId(name: string): string {
  return `landscape:${slugify(name)}`;
}

export function systemId(name: string): string {
  return `system:${slugify(name)}`;
}

export function containerId(name: string): string {
  return `container:${slugify(name)}`;
}

export function dataStoreId(name: string): string {
  return `datastore:${slugify(name)}`;
}

export function componentId(name: string): string {
  return `component:${slugify(name)}`;
}

export function codeUnitId(name: string): string {
  return `code:${slugify(name)}`;
}

export function personId(name: string): string {
  return `person:${slugify(name)}`;
}

export function externalId(name: string): string {
  return `external:${slugify(name)}`;
}

export function edgeId(source: string, target: string): string {
  return `edge:${slugify(source)}-to-${slugify(target)}`;
}
