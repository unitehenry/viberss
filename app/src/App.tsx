import { useEffect, useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Badge } from "@/components/ui/badge"

interface FeedItem {
  feedTitle: string
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

interface FeedItemComponentProps {
  item: FeedItem
}

function FeedItemComponent({ item }: FeedItemComponentProps) {
  const [isOpen, setIsOpen] = useState(false)
  const previewLength = 150
  const cleanedText = item.description.replace(/<[^>]*>/g, '').trim()
  const shouldTruncate = cleanedText.length > previewLength
  const previewText = shouldTruncate ? cleanedText.substring(0, previewLength) + '...' : cleanedText
  const displayHtml = item.encoded || item.description

  return (
    <div className="border rounded-lg p-4">
      <h3 className="font-semibold mb-1">
        <a href={item.link} target="_blank" rel="noopener noreferrer" className="hover:underline">
          {item.title}
        </a>
       </h3>
      {!isOpen ? (
        <div>
          <p className="text-sm text-muted-foreground mb-2">{previewText}</p>
          {shouldTruncate && (
            <Button variant="link" onClick={() => setIsOpen(true)} className="block p-0 h-auto text-muted-foreground cursor-pointer mt-2 mb-2">
              Read more
            </Button>
          )}
        </div>
      ) : (
        <div className="text-sm text-muted-foreground mb-2" dangerouslySetInnerHTML={{ __html: displayHtml }} />
      )}
      {isOpen && (
        <Button variant="link" onClick={() => setIsOpen(false)} className="block p-0 h-auto text-muted-foreground mt-2 mb-2 cursor-pointer">
          Read less
        </Button>
      )}
      <Badge className="mr-2">{item.feedTitle}</Badge><Badge variant="secondary">{new Date(item.pubDate).toLocaleDateString()}</Badge>
    </div>
  )
}

export function App() {
  const [allItems, setAllItems] = useState<FeedItem[]>([])
  const [loading, setLoading] = useState(true)

  const sortedItems = useMemo(() =>
    allItems.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime()),
    [allItems]
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
        const allItems: FeedItem[] = []
        loadedFeeds.forEach(feed => {
          feed.items.forEach(item => {
            allItems.push({ feedTitle: feed.title, ...item })
          })
        })
        allItems.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime())
        setAllItems(allItems)
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
        <div className="space-y-4">
          {sortedItems.map((item, index) => (
            <FeedItemComponent key={index} item={item} />
          ))}
        </div>
      </div>
    </div>
  )
}

export default App
