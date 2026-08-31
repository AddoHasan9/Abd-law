import { NextResponse } from 'next/server'
import { logUserAuditAction } from '@/lib/data/audit'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    await logUserAuditAction({
      userId: body.userId,
      userName: body.userName,
      userEmail: body.userEmail,
      userRole: body.userRole,
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
