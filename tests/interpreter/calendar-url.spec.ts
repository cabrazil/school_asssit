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
  assert.ok(result.url.includes('https://outlook.office.com/calendar/0/action/compose'))
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
