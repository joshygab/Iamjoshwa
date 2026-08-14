export type LabelMap = Record<string, string>;

export function createLabelGetter(labels: LabelMap = {}) {
  return (key: string, fallback: string) => labels[key] || fallback;
}

export function systemEnabled(settings: Record<string, unknown> = {}, key: string) {
  const value = settings[key] as { enabled?: boolean } | undefined;
  return Boolean(value?.enabled);
}

export function systemMessage(settings: Record<string, unknown> = {}, key: string, fallback: string) {
  const value = settings[key] as { message?: string } | undefined;
  return value?.message || fallback;
}
