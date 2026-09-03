export type CalendarProviderType = 'OUTLOOK_PERSONAL' | 'OUTLOOK_WORK' | 'GOOGLE_PERSONAL' | 'NONE'

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
): CalendarLinkInfo | null {
  if (!dateStr || provider === 'NONE') return null

  try {
    const formattedDate = dateStr.trim()
    const cleanDigits = formattedDate.replace(/-/g, '')

    if (cleanDigits.length < 8) return null

    const titleWithEmoji = `🎓 ${title}`
    const bodyContent = details ? `Detalhes / Estudo: ${details}` : 'Compromisso registrado via School Assist'

    switch (provider) {
      case 'OUTLOOK_WORK': {
        const startIso = `${formattedDate}T08:00:00`
        const endIso = `${formattedDate}T09:00:00`
        const params = new URLSearchParams({
          rru: 'addevent',
          subject: titleWithEmoji,
          startdt: startIso,
          enddt: endIso,
          body: bodyContent,
        })
        return {
          providerLabel: 'MS Outlook Work',
          url: `https://outlook.office.com/calendar/0/action/compose?${params.toString()}`,
        }
      }

      case 'GOOGLE_PERSONAL': {
        const startIso = `${cleanDigits}T080000`
        const endIso = `${cleanDigits}T090000`
        const params = new URLSearchParams({
          action: 'TEMPLATE',
          text: titleWithEmoji,
          dates: `${startIso}/${endIso}`,
          details: bodyContent,
        })
        return {
          providerLabel: 'Google Agenda',
          url: `https://calendar.google.com/calendar/render?${params.toString()}`,
        }
      }

      case 'OUTLOOK_PERSONAL':
      default: {
        const startIso = `${formattedDate}T08:00:00`
        const endIso = `${formattedDate}T09:00:00`
        const params = new URLSearchParams({
          rru: 'addevent',
          subject: titleWithEmoji,
          startdt: startIso,
          enddt: endIso,
          body: bodyContent,
        })
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
