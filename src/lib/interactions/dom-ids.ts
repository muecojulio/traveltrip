/**
 * Stable DOM id helpers shared by labels, panels and tabs. They live in their
 * own module so component files keep exporting components only (fast refresh).
 */

export function fieldHintId(htmlFor: string): string {
  return `${htmlFor}-hint`;
}

export function fieldErrorId(htmlFor: string): string {
  return `${htmlFor}-error`;
}

export function sectionTabId(prefix: string, id: string): string {
  return `${prefix}-tab-${id}`;
}

export function sectionPanelId(prefix: string, id: string): string {
  return `${prefix}-panel-${id}`;
}
