export function buildRequestUrl(request: Request, pathname: string) {
  const currentUrl = new URL(request.url)
  const forwardedHost = request.headers.get('x-forwarded-host')?.trim()
  const host = forwardedHost || request.headers.get('host')?.trim() || currentUrl.host
  const forwardedProto = request.headers.get('x-forwarded-proto')?.trim()
  const protocol = forwardedProto || currentUrl.protocol.replace(/:$/, '') || 'http'

  return new URL(pathname, `${protocol}://${host}`)
}
