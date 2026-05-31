import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-helper'

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { action, userId, apiKey, query, collectionKey } = await req.json()

    if (!userId || !apiKey) {
      return NextResponse.json({ error: 'Missing Zotero credentials' }, { status: 400 })
    }

    const base = `https://api.zotero.org/users/${userId}`
    const headers = {
      'Zotero-API-Key': apiKey,
      'Zotero-API-Version': '3',
    }

    if (action === 'verify') {
      const res = await fetch(`${base}/items?limit=1`, { headers })
      if (!res.ok) return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
      return NextResponse.json({ ok: true })
    }

    if (action === 'collections') {
      const res = await fetch(`${base}/collections?limit=100`, { headers })
      if (!res.ok) return NextResponse.json({ error: 'Failed to fetch collections' }, { status: 502 })
      return NextResponse.json({ collections: await res.json() })
    }

    if (action === 'items') {
      const url = collectionKey
        ? `${base}/collections/${collectionKey}/items?limit=100&itemType=-attachment`
        : query
        ? `${base}/items?q=${encodeURIComponent(query)}&limit=50&itemType=-attachment`
        : `${base}/items?limit=100&itemType=-attachment`
      const res = await fetch(url, { headers })
      if (!res.ok) return NextResponse.json({ error: 'Failed to fetch items' }, { status: 502 })
      return NextResponse.json({ items: await res.json() })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
