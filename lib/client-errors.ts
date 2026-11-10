// Errors in the browser. The common one: a tab opened before a deploy asks for a piece of the
// old app that no longer exists. That isn't a bug, so we quietly reload once.

type Err = { name?: string; message?: string } | null | undefined

export function isStaleBuildError(err: Err): boolean {
  if (!err) return false
  const text = `${err.name ?? ''} ${err.message ?? ''}`
  return /ChunkLoadError|Loading (CSS )?chunk [\w-]+ failed|Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module/i.test(text)
}

export const RELOAD_KEY = 'dd.autoReloadAt'

/** One automatic reload per minute at most, so a real bug can never cause a reload loop. */
export function shouldAutoReload(lastReloadAt: number | null, now: number): boolean {
  return lastReloadAt === null || now - lastReloadAt > 60_000
}
