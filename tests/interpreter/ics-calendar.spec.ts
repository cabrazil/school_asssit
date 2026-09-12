import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildIcsCalendar } from '../../src/domain/message/ics-calendar.builder'

test('Gera arquivo .ics válido para evento com horário específico', () => {
  const ics = buildIcsCalendar([
    {
      title: 'Aniversário da Maria Clara',
      dateStr: '2026-09-29T15:30:00',
      description: 'Condomínio Quintas do Tamboré - Salão de Festas (Al. Terras Altas, 433)',
      location: 'Condomínio Quintas do Tamboré',
    },
  ])

  assert.ok(ics.startsWith('BEGIN:VCALENDAR'))
  assert.ok(ics.includes('VERSION:2.0'))
  assert.ok(ics.includes('SUMMARY:🎓 Aniversário da Maria Clara'))
  assert.ok(ics.includes('DTSTART:20260929T153000'))
  assert.ok(ics.includes('DTEND:20260929T163000'))
  assert.ok(ics.includes('LOCATION:Condomínio Quintas do Tamboré'))
  assert.ok(ics.includes('BEGIN:VALARM'))
  assert.ok(ics.includes('TRIGGER:-PT15M'))
  assert.ok(ics.includes('END:VEVENT'))
  assert.ok(ics.trim().endsWith('END:VCALENDAR'))
})

test('Gera arquivo .ics válido para evento de dia inteiro (all-day)', () => {
  const ics = buildIcsCalendar([
    {
      title: 'Prova de Português',
      dateStr: '2026-09-18',
      description: 'Capítulos 3 e 4',
    },
  ])

  assert.ok(ics.includes('DTSTART;VALUE=DATE:20260918'))
  assert.ok(ics.includes('DTEND;VALUE=DATE:20260919'))
  assert.ok(ics.includes('SUMMARY:🎓 Prova de Português'))
})

test('Gera múltiplos eventos em um único arquivo .ics', () => {
  const ics = buildIcsCalendar([
    {
      title: 'Prova 1',
      dateStr: '2026-09-20T08:00:00',
    },
    {
      title: 'Prova 2',
      dateStr: '2026-09-21T09:00:00',
    },
  ])

  const matches = ics.match(/BEGIN:VEVENT/g)
  assert.equal(matches?.length, 2)
})
