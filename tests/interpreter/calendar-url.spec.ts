import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildCalendarUrl } from '../../src/domain/message/calendar-url.builder'

test('Gera URL para MS Outlook Pessoal por padrão ou para OUTLOOK_PERSONAL', () => {
  const result = buildCalendarUrl('OUTLOOK_PERSONAL', 'Prova de História', '2026-09-15', 'Estudar cap 5')
  assert.ok(result)
  assert.equal(result.providerLabel, 'MS Outlook Pessoal')
  assert.ok(result.url.includes('https://outlook.live.com/calendar/0/action/compose'))
  assert.ok(result.url.includes('Prova+de+Hist%C3%B3ria'))
})

test('Gera URL para MS Outlook Work / Corporativo', () => {
  const result = buildCalendarUrl('OUTLOOK_WORK', 'Reunião de Pais', '2026-09-20', 'Auditório principal')
  assert.ok(result)
  assert.equal(result.providerLabel, 'MS Outlook Work')
  assert.ok(result.url.includes('https://outlook.office.com/calendar/deeplink/compose'))
  assert.ok(result.url.includes('path=%2Fcalendar%2Faction%2Fcompose'))
  assert.ok(result.url.includes('Reuni%C3%A3o+de+Pais'))
})

test('Gera URL para Google Agenda', () => {
  const result = buildCalendarUrl('GOOGLE_PERSONAL', 'Feira de Ciências', '2026-10-05', 'Trazer maquete')
  assert.ok(result)
  assert.equal(result.providerLabel, 'Google Agenda')
  assert.ok(result.url.includes('https://calendar.google.com/calendar/render'))
  assert.ok(result.url.includes('20261005T080000%2F20261005T090000'))
})

test('Retorna null se o provedor for NONE', () => {
  const result = buildCalendarUrl('NONE', 'Tarefa de Inglês', '2026-09-12')
  assert.equal(result, null)
})

test('Retorna null se a data for inválida ou vazia', () => {
  assert.equal(buildCalendarUrl('OUTLOOK_PERSONAL', 'Teste', ''), null)
  assert.equal(buildCalendarUrl('OUTLOOK_PERSONAL', 'Teste', null), null)
})

test('Gera URL respeitando horário específico informado (ex: 15:00)', () => {
  // Google Agenda com horário 15h
  const googleRes = buildCalendarUrl('GOOGLE_PERSONAL', 'Reunião de Pais', '2026-09-08T15:00:00')
  assert.ok(googleRes)
  assert.ok(googleRes.url.includes('20260908T150000%2F20260908T160000'))

  // Outlook Corporativo com horário 15h
  const outlookWorkRes = buildCalendarUrl('OUTLOOK_WORK', 'Reunião de Pais', '2026-09-08T15:00:00')
  assert.ok(outlookWorkRes)
  assert.ok(outlookWorkRes.url.includes('startdt=2026-09-08T15%3A00%3A00'))
  assert.ok(outlookWorkRes.url.includes('enddt=2026-09-08T16%3A00%3A00'))

  // Outlook Pessoal com horário 14:30
  const outlookPersRes = buildCalendarUrl('OUTLOOK_PERSONAL', 'Plantão Pedagógico', '2026-09-08T14:30:00')
  assert.ok(outlookPersRes)
  assert.ok(outlookPersRes.url.includes('startdt=2026-09-08T14%3A30%3A00'))
  assert.ok(outlookPersRes.url.includes('enddt=2026-09-08T15%3A30%3A00'))
})
