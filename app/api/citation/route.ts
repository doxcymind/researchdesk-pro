import { getAuthUser } from '@/lib/auth-helper'
import { rateLimit } from '@/lib/rate-limit'
import { geminiChat } from '@/lib/gemini'

const styleGuides: Record<string, string> = {
  Vancouver: `Vancouver format: AuthorLastname Initials. Title. Journal Abbrev. Year;Volume(Issue):Pages.\nExample: Smith JA, Brown BC. Cardiac outcomes in diabetic patients. N Engl J Med. 2021;384(3):210-218.\nRules: list all authors if ≤6, else first 6 + "et al". No full stop after journal abbreviation.`,
  APA:       `APA 7th edition format: AuthorLastname, Initials. (Year). Title of article. Journal Name, Volume(Issue), Pages. https://doi.org/...\nExample: Smith, J. A., & Brown, B. C. (2021). Cardiac outcomes in diabetic patients. New England Journal of Medicine, 384(3), 210–218.`,
  AMA:       `AMA format: AuthorLastname Initials. Title. Journal. Year;Volume(Issue):Pages. doi:...\nExample: Smith JA, Brown BC. Cardiac outcomes in diabetic patients. JAMA. 2021;384(3):210-218.`,
  Harvard:   `Harvard format: AuthorLastname, Initials. (Year) 'Title', Journal Name, Volume(Issue), pp.Pages.\nExample: Smith, J.A. and Brown, B.C. (2021) 'Cardiac outcomes in diabetic patients', New England Journal of Medicine, 384(3), pp. 210–218.`,
  MLA:       `MLA 9th edition format: AuthorLastname, Firstname, and Firstname AuthorLastname. "Title." Journal, vol. Volume, no. Issue, Year, pp. Pages.\nExample: Smith, John A., and Bob C. Brown. "Cardiac outcomes in diabetic patients." New England Journal of Medicine, vol. 384, no. 3, 2021, pp. 210–218.`,
}

export async function POST(req: Request) {
  const user = await getAuthUser(req)
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { allowed } = rateLimit(`${user.id}:${req.url.split('/api/')[1]}`, 20, 60000)
  if (!allowed) return Response.json({ error: 'Rate limit exceeded. Please slow down.' }, { status: 429 })

  try {
    const { input, style = 'Vancouver' } = await req.json()

    if (!input) return Response.json({ error: 'No input provided' }, { status: 400 })

    const guide = styleGuides[style] || styleGuides['Vancouver']

    const citation = await geminiChat(
      `You are a medical citation formatter. Format the given paper information into a perfect ${style} style citation.\n\n${guide}\n\nIf given a DOI, look up and use all available details. Return ONLY the formatted citation string, nothing else.`,
      `Format this into a ${style} citation: ${input}`
    )

    return Response.json({ citation })
  } catch (error) {
    console.error(error)
    return Response.json({ error: 'Citation generation failed' }, { status: 500 })
  }
}
