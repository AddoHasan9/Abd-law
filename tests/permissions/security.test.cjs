const { test } = require('node:test')
const assert = require('node:assert/strict')
const { load } = require('./load.cjs')
const perms = load('lib/permissions.ts')
const policy = load('lib/auth/account-policy.ts', { '@/lib/permissions': perms })
const owner = { id: policy.PRIMARY_ADMIN_ID, name: 'Owner', role: 'super_admin', active: true }
const other = { id: '11111111-1111-4111-8111-111111111111', name: 'Other', role: 'staff', active: true }

function session(row, options = {}) {
  return load('lib/auth/session.ts', {
    react: { cache: fn => fn }, '@/lib/permissions': perms,
    '@/lib/supabase/server': {
      createClient: async () => ({ auth: { getUser: async () => ({ data: { user: options.noUser ? null : { id: row?.id || 'missing', user_metadata: { role: 'super_admin' } } }, error: options.authError }) } }),
      createAdminClient: () => ({ from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: row, error: options.dbError }) }) }) }) }),
    },
  })
}
test('inactive account stays denied even with super_admin metadata', async () => {
  assert.equal(await session({ ...other, active: false }).getAuthenticatedProfile(), null)
})
test('missing profile and failed lookups never create a role', async () => {
  assert.equal(await session(null).getAuthenticatedProfile(), null)
  assert.equal(await session(owner, { dbError: { code: 'failure' } }).getAuthenticatedProfile(), null)
  assert.equal(await session(owner, { noUser: true }).getAuthenticatedProfile(), null)
})
test('existing active owner retains super_admin identity', async () => {
  assert.deepEqual(await session(owner).getAuthenticatedProfile(), { ...owner, email: undefined })
})
test('unknown role is not trusted', async () => {
  assert.equal(await session({ ...other, role: 'unexpected' }).getAuthenticatedProfile(), null)
})
test('editable metadata cannot grant fallback authority', () => {
  const fallback = load('lib/profile-fallback.ts').buildFallbackProfile({ id: 'x', user_metadata: { role: 'super_admin' } })
  assert.equal(fallback.role, 'staff'); assert.equal(fallback.active, false)
})
test('owner and all existing super admins are immutable through user administration', () => {
  for (const target of [owner, { ...other, role: 'super_admin' }, { ...other, id: owner.id }]) {
    assert.throws(() => policy.assertManageableAccount(owner, target, 'staff'), /محمي/)
  }
})
test('delegation cannot modify peers, self, or grant permissions the actor lacks', () => {
  const actor = { ...other, role: 'manager' }
  const matrix = structuredClone(perms.DEFAULT_ROLE_PERMISSIONS)
  assert.throws(() => policy.assertManageableAccount(actor, { id: 'peer', role: 'manager' }, 'staff', matrix))
  assert.throws(() => policy.assertManageableAccount(actor, null, 'super_admin', matrix))
  matrix.staff.companies.delete = true
  assert.throws(() => policy.assertManageableAccount(actor, null, 'staff', matrix))
})
test('stored permissions change checks; super admin stays unrestricted', () => {
  const matrix = structuredClone(perms.DEFAULT_ROLE_PERMISSIONS)
  matrix.admin.companies.delete = false
  assert.equal(perms.hasPermission('admin', 'companies', 'delete', matrix), false)
  assert.equal(perms.hasPermission('super_admin', 'companies', 'delete', matrix), true)
  assert.equal(perms.hasPermission('super_admin', 'users', 'typo', matrix), false)
})
test('invalid permission payloads fail rather than falling back to default grants', () => {
  assert.throws(() => perms.parsePermissionsMatrix({}))
  const matrix = structuredClone(perms.DEFAULT_ROLE_PERMISSIONS)
  matrix.staff.companies.create = 'true'
  assert.throws(() => perms.parsePermissionsMatrix(matrix))
})
test('attempted super-admin permission revocation is normalized to full access', () => {
  const matrix = structuredClone(perms.DEFAULT_ROLE_PERMISSIONS)
  matrix.super_admin.users.manage_permissions = false
  assert.equal(perms.parsePermissionsMatrix(matrix).super_admin.users.manage_permissions, true)
})
test('permission-store outage denies ordinary users, but never removes owner authority', async () => {
  for (const actor of [owner, other]) {
    const guard = load('lib/auth/require-permission.ts', {
      '@/lib/auth/session': { getAuthenticatedProfile: async () => actor },
      '@/lib/auth/permission-store': { readPermissions: async () => { throw Error('offline') } }, '@/lib/permissions': perms,
    })
    const result = await guard.requirePermission('companies', 'view')
    assert.equal(result === null, actor.role === 'super_admin')
  }
})

function service(options = {}) {
  const calls = []
  const target = options.target || other
  const result = { ...target, name: 'New User', role: 'lawyer', active: true }
  const client = {
    from: table => {
      let operation = 'read'
      const chain = {
        select: () => chain, eq: () => chain,
        update: fields => { calls.push(['update', table, fields]); operation = 'update'; return chain },
        single: async () => options.dbFailure && operation === 'update' ? { data: null, error: { message: 'db failure' } } : { data: operation === 'read' ? target : result, error: null },
      }
      return chain
    },
    auth: { admin: {
      createUser: async input => { calls.push(['createUser', input]); return options.authFailure ? { data: {}, error: Error('Auth failed') } : { data: { user: { id: other.id, email: input.email } }, error: null } },
      deleteUser: async id => { calls.push(['deleteUser', id]); return { error: options.deleteFailure ? Error('Delete failed') : null } },
      updateUserById: async (id, values) => { calls.push(['updatePassword', id, values]); return { error: options.authFailure ? Error('failure') : null } },
      getUserById: async () => ({ data: { user: { email: 'test@example.invalid' } }, error: null }),
    } },
  }
  const api = load('lib/data/profiles.ts', {
    '@/lib/supabase/server': { createAdminClient: () => client },
    '@/lib/auth/require-permission': { getCurrentUserProfile: async () => options.actor || owner, requirePermission: async () => options.denied ? { success: false, error: 'Denied' } : null },
    '@/lib/auth/permission-store': { readPermissions: async () => ({ matrix: perms.DEFAULT_ROLE_PERMISSIONS }) },
    '@/lib/auth/account-policy': policy, '@/lib/permissions': perms,
  })
  return { api, calls }
}
const newUser = { name: 'New User', role: 'lawyer', email: 'test@example.invalid', password: 'long-safe-password-123', active: true }
test('new user creates Auth identity and a database profile with the same ID', async () => {
  const { api, calls } = service(); const user = await api.saveProfile(newUser)
  assert.equal(user.id, other.id)
  assert.equal(calls[0][0], 'createUser')
  assert.equal(calls[0][1].user_metadata.role, undefined)
  assert.equal(calls[1][2].role, 'lawyer')
})
test('profile creation failure rolls back Auth account instead of reporting success', async () => {
  const { api, calls } = service({ dbFailure: true })
  await assert.rejects(api.saveProfile(newUser), /التراجع/)
  assert.equal(calls.at(-1)[0], 'deleteUser')
})
test('Auth failure never creates a local/fake user', async () => {
  const { api, calls } = service({ authFailure: true })
  await assert.rejects(api.saveProfile(newUser))
  assert.equal(calls.length, 1)
})
test('unauthorized creation has no side effects', async () => {
  const { api, calls } = service({ denied: true })
  await assert.rejects(api.saveProfile(newUser), /Denied/); assert.equal(calls.length, 0)
})
test('owner cannot be edited, disabled, deleted, or have password reset through admin actions', async () => {
  const { api, calls } = service({ target: owner })
  await assert.rejects(api.saveProfile({ ...newUser, id: owner.id, role: 'staff' }), /محمي/)
  await assert.rejects(api.toggleProfileActive(owner.id), /محمي/)
  await assert.rejects(api.deleteProfile(owner.id), /محمي/)
  await assert.rejects(api.permanentDeleteProfile(owner.id), /محمي/)
  await assert.rejects(api.resetProfilePassword(owner.id, 'long-new-password-123'), /محمي/)
  assert.equal(calls.length, 0)
})
test('failed Auth deletion is reported and does not pre-delete the profile', async () => {
  const { api, calls } = service({ deleteFailure: true })
  await assert.rejects(api.permanentDeleteProfile(other.id)); assert.deepEqual(calls, [['deleteUser', other.id]])
})
test('password action calls Auth with the supplied password, never merely logs a success', async () => {
  const { api, calls } = service(); await api.resetProfilePassword(other.id, 'new-long-password-123')
  assert.equal(calls[0][0], 'updatePassword'); assert.equal(calls[0][2].password, 'new-long-password-123')
})
