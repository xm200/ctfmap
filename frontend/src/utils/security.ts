export function safeExternalUrl(value: string): string | null {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' ? url.href : null;
  } catch {
    return null;
  }
}

export function isApiError(reason: unknown): reason is { status: number; message: string } {
  return typeof reason === 'object'
    && reason !== null
    && 'status' in reason
    && typeof reason.status === 'number'
    && 'message' in reason
    && typeof reason.message === 'string';
}
