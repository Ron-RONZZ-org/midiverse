/**
 * Interface for markmap data
 */
interface MarkmapData {
  title: string
  text: string
  author?: {
    username?: string
  }
}

/**
 * Generate meta tags for a markmap page
 */
export function generateMarkmapMeta(markmap: MarkmapData | null) {
  if (!markmap) {
    return {
      title: 'Loading Markmap - Midiverse',
      meta: [
        {
          name: 'description',
          content: 'Loading markmap visualization...'
        }
      ]
    }
  }

  const title = `${markmap.title} - Midiverse`
  const author = markmap.author?.username || 'Anonymous'

  // Create description from markdown text (first 150 chars including ellipsis)
  // Remove common markdown symbols: #, *, _, `, [, ], (, ), ~, -
  let description = markmap.text
    .replace(/[#*_`\[\]()~\-]/g, '') // Remove markdown symbols
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim()

  const maxLength = 150
  if (description.length > maxLength) {
    description = description.slice(0, maxLength - 3) + '...'
  }

  return {
    title,
    meta: [
      {
        name: 'description',
        content: `${description} - Created by ${author} on Midiverse`
      },
      {
        property: 'og:title',
        content: title
      },
      {
        property: 'og:description',
        content: description
      }
    ]
  }
}
