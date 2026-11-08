/**
 * Frontend Core I screens may call APIs that are not on the server yet.
 * Express then returns an HTML 404, which used to become a generic
 * "Something went wrong" and looked like a bug.
 */

type UnimplementedApiFeature = {
  methods: readonly string[]
  match: (pathname: string) => boolean
  issue: number
}

const UNIMPLEMENTED_API_FEATURES: readonly UnimplementedApiFeature[] = [
  {
    methods: ['GET'],
    match: (pathname) => pathname === '/api/home',
    issue: 173,
  },
]

function pathnameOf(path: string): string {
  const withoutQuery = path.split('?')[0] ?? path
  try {
    return new URL(withoutQuery, 'http://localhost').pathname
  } catch {
    return withoutQuery
  }
}

export function undevelopedFeatureMessage(
  path: string,
  method = 'GET',
): string | null {
  const pathname = pathnameOf(path)
  const verb = method.toUpperCase()
  const feature = UNIMPLEMENTED_API_FEATURES.find(
    (entry) => entry.methods.includes(verb) && entry.match(pathname),
  )
  if (!feature) {
    return null
  }
  return `Feature #${feature.issue} is still being developed.`
}
