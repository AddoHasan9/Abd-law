import { getCurrentUserProfile } from '@/lib/auth/require-permission'
import { NextResponse } from 'next/server'
import { logUserAuditAction } from '@/lib/data/audit'

export async function POST(request: Request) {
  try {
    const actor = await getCurrentUserProfile()
    if (!actor) return NextResponse.json({ success: false }, { status: 401 })
    const body = await request.json()
    await logUserAuditAction({
      userId: actor.id,
      userName: actor.name,
      userEmail: actor.email,
      userRole: actor.role,
      action: body.action || 'view',
      category: body.category || 'auth',
      entityType: body.entityType,
      entityId: body.entityId,
      entityName: body.entityName,
      details: body.details || 'عملية في النظام',
    })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ success: false }, { status: 400 })
  }
}
