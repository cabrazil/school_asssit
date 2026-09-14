export type CalendarProviderType = 'OUTLOOK_PERSONAL' | 'OUTLOOK_WORK' | 'GOOGLE_PERSONAL' | 'APPLE_CALENDAR' | 'NONE'

export interface CalendarLinkInfo {
  providerLabel: string
  url: string
}

/**
 * Constrói deep-links para adição de eventos no calendário conforme o provedor preferido da família.
 */
export function buildCalendarUrl(
  provider: CalendarProviderType | string = 'OUTLOOK_PERSONAL',
  title: string,
  dateStr?: string | null,
  details?: string | null,
  endDateStr?: string | null,
  location?: string | null,
): CalendarLinkInfo | null {
  if (!dateStr || provider === 'NONE') return null

  try {
    const trimmed = dateStr.trim().replace(' ', 'T')
    let datePart = trimmed
    let startHour = 8
    let startMinute = 0

    if (trimmed.includes('T')) {
      const [d, t] = trimmed.split('T')
      datePart = d
      const timeMatches = t.match(/^(\d{1,2}):(\d{2})/)
      if (timeMatches) {
        startHour = parseInt(timeMatches[1], 10)
        startMinute = parseInt(timeMatches[2], 10)
      }
    }

    const cleanDigits = datePart.replace(/-/g, '')
    if (cleanDigits.length < 8) return null

    let endDatePart = datePart
    let endHour = startHour + 1
    let endMinute = startMinute

    if (endDateStr) {
      const endTrimmed = endDateStr.trim().replace(' ', 'T')
      if (endTrimmed.includes('T')) {
        const [ed, et] = endTrimmed.split('T')
        endDatePart = ed
        const timeMatches = et.match(/^(\d{1,2}):(\d{2})/)
        if (timeMatches) {
          endHour = parseInt(timeMatches[1], 10)
          endMinute = parseInt(timeMatches[2], 10)
        }
      } else {
        endDatePart = endTrimmed
      }
    } else {
      if (endHour >= 24) {
        endHour = 23
        endMinute = 59
      }
    }

    const cleanEndDigits = endDatePart.replace(/-/g, '')
    const pad = (n: number) => String(n).padStart(2, '0')
    const startTimeIso = `${pad(startHour)}:${pad(startMinute)}:00`
    const endTimeIso = `${pad(endHour)}:${pad(endMinute)}:00`
    const startTimeCompact = `${pad(startHour)}${pad(startMinute)}00`
    const endTimeCompact = `${pad(endHour)}${pad(endMinute)}00`

    const titleWithEmoji = `🎓 ${title}`
    const bodyContent = details ? `Detalhes / Estudo: ${details}` : 'Compromisso registrado via School Assist'

    switch (provider) {
      case 'OUTLOOK_WORK': {
        const startIso = `${datePart}T${startTimeIso}`
        const endIso = `${endDatePart}T${endTimeIso}`
        const params = new URLSearchParams({
          path: '/calendar/action/compose',
          rru: 'addevent',
          subject: titleWithEmoji,
          startdt: startIso,
          enddt: endIso,
          body: bodyContent,
        })
        if (location) {
          params.set('location', location)
        }
        return {
          providerLabel: 'MS Outlook Work',
          url: `https://outlook.office.com/calendar/deeplink/compose?${params.toString()}`,
        }
      }

      case 'GOOGLE_PERSONAL': {
        const startIso = `${cleanDigits}T${startTimeCompact}`
        const endIso = `${cleanEndDigits}T${endTimeCompact}`
        const params = new URLSearchParams({
          action: 'TEMPLATE',
          text: titleWithEmoji,
          dates: `${startIso}/${endIso}`,
          details: bodyContent,
        })
        if (location) {
          params.set('location', location)
        }
        return {
          providerLabel: 'Google Agenda',
          url: `https://calendar.google.com/calendar/render?${params.toString()}`,
        }
      }

      case 'APPLE_CALENDAR': {
        return {
          providerLabel: 'Apple Calendar',
          url: '📎 Arquivo .ics anexado abaixo para adicionar com 1 toque no iPhone/Mac',
        }
      }

      case 'OUTLOOK_PERSONAL':
      default: {
        const startIso = `${datePart}T${startTimeIso}`
        const endIso = `${endDatePart}T${endTimeIso}`
        const params = new URLSearchParams({
          rru: 'addevent',
          subject: titleWithEmoji,
          startdt: startIso,
          enddt: endIso,
          body: bodyContent,
        })
        if (location) {
          params.set('location', location)
        }
        return {
          providerLabel: 'MS Outlook Pessoal',
          url: `https://outlook.live.com/calendar/0/action/compose?${params.toString()}`,
        }
      }
    }
  } catch {
    return null
  }
}
