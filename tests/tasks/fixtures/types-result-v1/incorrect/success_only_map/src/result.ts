export type Result<T, E> =
  { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: E };
export function mapResult<T, E, U>(result: Result<T, E>, map: (value: T) => U): Result<U, E> {
  return "value" in result
    ? { ok: true, value: map(result.value) }
    : { ok: true, value: map(undefined as T) };
}
