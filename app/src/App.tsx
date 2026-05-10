import { useEffect, useState, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface FeedItem {
  title: string
  description: string
  link: string
  pubDate: string
  encoded?: string
}

interface RawFeedItemRSS {
  title: string
  description: string
  link: string
  pubDate: string
  encoded?: string
}

interface RawFeedItemJsonFeed {
  title: string
  content_html?: string
  content_text?: string
  date_published: string
  url: string
}

interface Feed {
  name: string
  title: string
  description: string
  items: FeedItem[]
}

export function App() {
  const [feeds, setFeeds] = useState<Feed[]>([])
  const [loading, setLoading] = useState(true)

  const sortedFeeds = useMemo(() =>
    feeds.map(feed => ({
      ...feed,
      items: feed.items.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime())
    })), [feeds]
  )



  useEffect(() => {
    async function loadFeeds() {
      try {
        const csvResponse = await fetch('/feeds/feeds.csv')
        const csvText = await csvResponse.text()
        const lines = csvText.trim().split('\n')
        const feedPromises = lines.map(async line => {
          try {
            const [, , file] = line.split(',')
            const jsonResponse = await fetch(`/feeds/${file}.json`)
            if (!jsonResponse.ok) throw new Error(`Fetch failed: ${jsonResponse.status}`)
            const data = await jsonResponse.json()

            let title: string, description: string, rawItems: any[]

            if (data.rss?.channel) {
              // RSS format
              const channel = data.rss.channel
              title = channel.title
              description = channel.description || ''
              rawItems = Array.isArray(channel.item) ? channel.item : []
            } else if (data.version && Array.isArray(data.items)) {
              // JSON Feed format
              title = data.title || file
              description = data.description || ''
              rawItems = data.items
            } else if (data.feed?.entry) {
              // Atom format
              const feed = data.feed
              title = feed.title?.["#text"] || feed.title || file
              description = feed.subtitle?.["#text"] || feed.subtitle || ''
              rawItems = Array.isArray(feed.entry) ? feed.entry : [feed.entry]
            } else {
              // Unknown format, skip
              return null
            }

            const items: FeedItem[] = rawItems.map(item => {
              if (item.title && item.description && item.link && item.pubDate) {
                // RSS item
                return {
                  title: item.title,
                  description: item.description,
                  link: item.link,
                  pubDate: item.pubDate,
                  encoded: item.encoded
                } as FeedItem
              } else if (item.title && (item.content_html || item.content_text) && item.url && item.date_published) {
                // JsonFeed item
                return {
                  title: item.title,
                  description: item.content_text || item.content_html || '',
                  link: item.url,
                  pubDate: item.date_published
                } as FeedItem
              } else if (item.published || item.updated) {
                // Atom entry
                return {
                  title: item.title?.["#text"] || item.title,
                  description: item.summary?.["#text"] || item.content?.["#text"] || '',
                  link: item.link?.["@href"] || item.link,
                  pubDate: item.published || item.updated
                } as FeedItem
              } else {
                // Unknown item format, skip
                return null
              }
            }).filter(Boolean) as FeedItem[]

            const feed: Feed = {
              name: file,
              title,
              description,
              items
            }
            return feed
          } catch (error) {
            console.error(`Error processing feed ${line}:`, error)
            return null
          }
        })
        const loadedFeeds = (await Promise.all(feedPromises)).filter(Boolean) as Feed[]
        setFeeds(loadedFeeds)
      } catch (error) {
        console.error('Error loading feeds:', error)
      } finally {
        setLoading(false)
      }
    }
    loadFeeds()
  }, [])

  if (loading) {
    return <div className="flex min-h-svh p-6">Loading RSS feeds...</div>
  }

  return (
    <div className="flex min-h-svh p-6">
      <div className="max-w-4xl w-full mx-auto gap-4">
        <h1 className="text-2xl font-bold mb-6">RSS Reader</h1>
        <div className="grid gap-6">
          {sortedFeeds.map(feed => (
            <Card key={feed.name}>
              <CardHeader>
                <CardTitle>{feed.title}</CardTitle>
                <CardDescription>{feed.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {feed.items.map((item, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <h3 className="font-semibold mb-1">
                        <a href={item.link} target="_blank" rel="noopener noreferrer" className="hover:underline">
                          {item.title}
                        </a>
                      </h3>
                      <p className="text-sm text-muted-foreground mb-2 line-clamp-3">{item.description}</p>
                      <Badge variant="secondary">{new Date(item.pubDate).toLocaleDateString()}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}

export default App
