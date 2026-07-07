import { canPerformAction, invalidateAccessControlCache } from '@/lib/access-control-server'
import { getSession } from '@/lib/auth'
import { getDataSourceSnapshot } from '@/lib/data-source'
import { getReviewDbErrorDetail } from '@/lib/review-db'
import { getRolePermissionCodes, listDbRoles, setRolePermissionCodes } from '@/lib/services/access-permission-service'

function normalizeRoleId(value: string) {
  const id = Number(value)
  if (!Number.isInteger(id) || id <= 0) {
    return null
  }
  return id
}

export async function GET(_: Request, context: { params: Promise<{ roleId: string }> }) {
  const session = await getSession()
  if (!session) {
    return Response.json({ message: 'Unauthorized' }, { status: 401 })
  }
  if (!canPerformAction(session.role, 'access_settings', 'view')) {
    return Response.json({ message: 'Forbidden' }, { status: 403 })
  }

  const source = getDataSourceSnapshot()
  if (source.effectiveMode !== 'review-db' || source.isFallback) {
    return Response.json({ message: 'Role permission belum tersedia di mode ini.' }, { status: 503 })
  }

  const { roleId } = await context.params
  const id = normalizeRoleId(roleId)
  if (!id) {
    return Response.json({ message: 'Role ID tidak valid.' }, { status: 400 })
  }

  try {
    const roles = await listDbRoles()
    const role = roles.find((item) => item.id === id)
    if (!role) {
      return Response.json({ message: 'Role tidak ditemukan.' }, { status: 404 })
    }
    const permissionCodes = await getRolePermissionCodes(id)
    return Response.json({ role, permissionCodes })
  } catch (error) {
    return Response.json({ message: getReviewDbErrorDetail(error) }, { status: 500 })
  }
}

export async function PUT(request: Request, context: { params: Promise<{ roleId: string }> }) {
  const session = await getSession()
  if (!session) {
    return Response.json({ message: 'Unauthorized' }, { status: 401 })
  }
  if (!canPerformAction(session.role, 'access_settings', 'manage')) {
    return Response.json({ message: 'Forbidden' }, { status: 403 })
  }

  const source = getDataSourceSnapshot()
  if (source.effectiveMode !== 'review-db' || source.isFallback) {
    return Response.json(
      { message: 'Kelola role permission hanya aktif saat review DB benar-benar tersedia.' },
      { status: 503 }
    )
  }

  const { roleId } = await context.params
  const id = normalizeRoleId(roleId)
  if (!id) {
    return Response.json({ message: 'Role ID tidak valid.' }, { status: 400 })
  }

  try {
    const payload = (await request.json()) as { permissionCodes?: unknown }
    const permissionCodes = Array.isArray(payload.permissionCodes) ? payload.permissionCodes : []

    const roles = await listDbRoles()
    const role = roles.find((item) => item.id === id)
    if (!role) {
      return Response.json({ message: 'Role tidak ditemukan.' }, { status: 404 })
    }

    const result = await setRolePermissionCodes({
      roleId: id,
      roleCode: role.code,
      permissionCodes: permissionCodes.map((item) => String(item ?? '')),
      actor: session.displayName,
    })

    invalidateAccessControlCache()
    return Response.json({
      message: `Role permission ${role.code} berhasil diperbarui.`,
      result,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : getReviewDbErrorDetail(error)
    return Response.json({ message }, { status: 400 })
  }
}
