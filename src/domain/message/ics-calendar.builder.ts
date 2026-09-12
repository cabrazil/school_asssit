export interface IcsEventInput {
  title: string
  dateStr?: string | null
  description?: string | null
  location?: string | null
}

function escapeIcsText(str: string): string {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n')
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

/**
 * Constrói conteúdo de arquivo de calendário universal no padrão RFC 5545 (.ics).
 * Compatível nativamente com Apple Calendar (iOS / macOS), Google Calendar e Outlook.
 */
export function buildIcsCalendar(
  events: IcsEventInput[],
  calendarName = 'School Assist',
): string {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//School Assist//School Calendar//PT',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeIcsText(calendarName)}`,
  ]

  const now = new Date()
  const dtStamp =
    now.getUTCFullYear().toString() +
    pad(now.getUTCMonth() + 1) +
    pad(now.getUTCDate()) +
    'T' +
    pad(now.getUTCHours()) +
    pad(now.getUTCMinutes()) +
    pad(now.getUTCSeconds()) +
    'Z'

  events.forEach((ev, idx) => {
    if (!ev.dateStr) return

    const trimmed = ev.dateStr.trim().replace(' ', 'T')
    let datePart = trimmed
    let hasTime = false
    let startHour = 8
    let startMinute = 0

    if (trimmed.includes('T')) {
      const [d, t] = trimmed.split('T')
      datePart = d
      const timeMatches = t.match(/^(\d{1,2}):(\d{2})/)
      if (timeMatches) {
        hasTime = true
        startHour = parseInt(timeMatches[1], 10)
        startMinute = parseInt(timeMatches[2], 10)
      }
    }

    const cleanDate = datePart.replace(/-/g, '')
    if (cleanDate.length < 8) return

    let dtStartLine = ''
    let dtEndLine = ''

    if (hasTime) {
      let endHour = startHour + 1
      let endMinute = startMinute
      if (endHour >= 24) {
        endHour = 23
        endMinute = 59
      }
      const startTimeCompact = `${pad(startHour)}${pad(startMinute)}00`
      const endTimeCompact = `${pad(endHour)}${pad(endMinute)}00`
      dtStartLine = `DTSTART:${cleanDate}T${startTimeCompact}`
      dtEndLine = `DTEND:${cleanDate}T${endTimeCompact}`
    } else {
      // Evento de dia inteiro (all-day): DTEND deve ser o dia seguinte de acordo com RFC 5545
      dtStartLine = `DTSTART;VALUE=DATE:${cleanDate}`
      const year = parseInt(cleanDate.substring(0, 4), 10)
      const month = parseInt(cleanDate.substring(4, 6), 10) - 1
      const day = parseInt(cleanDate.substring(6, 8), 10)
      const nextDay = new Date(Date.UTC(year, month, day + 1))
      const nextDateStr =
        nextDay.getUTCFullYear().toString() +
        pad(nextDay.getUTCMonth() + 1) +
        pad(nextDay.getUTCDate())
      dtEndLine = `DTEND;VALUE=DATE:${nextDateStr}`
    }

    const uid = `${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 9)}@schoolassist`
    const titleWithEmoji = `🎓 ${ev.title}`

    lines.push('BEGIN:VEVENT')
    lines.push(`UID:${uid}`)
    lines.push(`DTSTAMP:${dtStamp}`)
    lines.push(dtStartLine)
    lines.push(dtEndLine)
    lines.push(`SUMMARY:${escapeIcsText(titleWithEmoji)}`)

    if (ev.description) {
      lines.push(`DESCRIPTION:${escapeIcsText(ev.description)}`)
    }
    if (ev.location) {
      lines.push(`LOCATION:${escapeIcsText(ev.location)}`)
    }

    lines.push('STATUS:CONFIRMED')
    lines.push('BEGIN:VALARM')
    lines.push('TRIGGER:-PT15M')
    lines.push('ACTION:DISPLAY')
    lines.push('DESCRIPTION:Lembrete de compromisso escolar')
    lines.push('END:VALARM')
    lines.push('END:VEVENT')
  })

  lines.push('END:VCALENDAR')

  return lines.join('\r\n') + '\r\n'
}
