export type Result<T, E> =
  { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: E };
export function mapResult<T, E, U>(result: Result<T, E>, map: (value: T) => U): Result<U, E> {
  return result.ok ? { ok: true, value: map(result.value) } : result;
}
