import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { reminderDueFor, cleanChecklist, remindLabel } from '../lib/tasks/model'

describe('tasks model', () => {
  it('reminder at the task time', () => assert.deepEqual(reminderDueFor('2026-10-15', '10:30:00', 0), { date: '2026-10-15', time: '10:30' }))
  it('one hour before', () => assert.deepEqual(reminderDueFor('2026-10-15', '10:30', 60), { date: '2026-10-15', time: '09:30' }))
  it('one day before crosses date', () => assert.deepEqual(reminderDueFor('2026-11-01', '08:00', 1440), { date: '2026-10-31', time: '08:00' }))
  it('15 min before, crossing midnight', () => assert.deepEqual(reminderDueFor('2026-10-15', '00:10', 15), { date: '2026-10-14', time: '23:55' }))
  it('no time => 09:00 default', () => assert.deepEqual(reminderDueFor('2026-10-15', null, 60), { date: '2026-10-15', time: '08:00' }))
  it('no reminder / no date => null', () => { assert.equal(reminderDueFor('2026-10-15', '10:00', null), null); assert.equal(reminderDueFor(null, '10:00', 0), null) })
  it('checklist cleaned', () => assert.deepEqual(cleanChecklist([{ text: ' هوية ', done: 1 }, { text: '' }, 'x']), [{ text: 'هوية', done: true }]))
  it('labels', () => { assert.equal(remindLabel(60), 'قبل ساعة'); assert.equal(remindLabel(2880), 'قبل 2 يوم'); assert.equal(remindLabel(null), '') })
})
