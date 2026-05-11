import { useEffect, useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { useTheme } from "@/components/theme-provider"
import { Moon, Sun } from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { ScrollArea } from "@/components/ui/scroll-area"

interface FeedItem {
  feedTitle: string
  title: string
  description: string
  link: string
  pubDate: string
  encoded?: string
}



interface Feed {
  name: string
  title: string
  description: string
  items: FeedItem[]
}

interface FeedItemComponentProps {
  item: FeedItem
}

function FeedItemComponent({ item }: FeedItemComponentProps) {
  const cleanedText = item.description.replace(/<[^>]*>/g, '').trim()

  const colorClasses = [
    "bg-blue-100 text-blue-800",
    "bg-green-100 text-green-800",
    "bg-yellow-100 text-yellow-800",
    "bg-red-100 text-red-800",
    "bg-purple-100 text-purple-800",
    "bg-indigo-100 text-indigo-800",
    "bg-pink-100 text-pink-800",
    "bg-gray-100 text-gray-800",
    "bg-orange-100 text-orange-800",
    "bg-teal-100 text-teal-800",
  ]

  const hash = (str: string) => {
    let h = 0;
    for (let i = 0; i < str.length; i++) {
      h = str.charCodeAt(i) + ((h << 5) - h);
    }
    return Math.abs(h);
  }

  const colorIndex = hash(item.feedTitle) % colorClasses.length

  return (
    <div className="border rounded-lg p-4">
      <h3 className="font-semibold mb-1">
        <a href={item.link} target="_blank" rel="noopener noreferrer" className="hover:underline">
          {item.title}
        </a>
        </h3>
      <p className="text-sm text-muted-foreground mb-2">{cleanedText}</p>
      <Badge className={`mr-2 ${colorClasses[colorIndex]}`}>{item.feedTitle}</Badge><Badge variant="secondary">{new Date(item.pubDate).toLocaleDateString()}</Badge>
    </div>
  )
}

export function App() {
  const [feeds, setFeeds] = useState<Feed[]>([])
  const [selectedFeeds, setSelectedFeeds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  const filteredItems = useMemo(() => {
    const selectedFeedNames = selectedFeeds
    const selectedFeedList = feeds.filter(feed => selectedFeedNames.has(feed.name))
    const items = selectedFeedList.flatMap(feed => 
      feed.items.map(item => ({ ...item, feedTitle: feed.title }))
    )
    return items.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime())
  }, [feeds, selectedFeeds])



  const handleFeedToggle = (feedName: string, checked: boolean) => {
    setSelectedFeeds(prev => {
      const newSet = new Set(prev)
      if (checked) {
        newSet.add(feedName)
      } else {
        newSet.delete(feedName)
      }
      return newSet
    })
  }

  const { theme, setTheme } = useTheme()
  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark')

  useEffect(() => {
    async function loadFeeds() {
      try {
        const csvResponse = await fetch('/feeds/feeds.csv')
        const csvText = await csvResponse.text()
        const lines = csvText.trim().split('\n')
        const feedPromises = lines.map(async line => {
          try {
            const [displayName, , file] = line.split(',')
            const jsonResponse = await fetch(`/feeds/${file}.json`)
            if (!jsonResponse.ok) throw new Error(`Fetch failed: ${jsonResponse.status}`)
            const data = await jsonResponse.json()

            let description: string, rawItems: any[]
            const title = displayName

            if (data.rss?.channel) {
              // RSS format
              const channel = data.rss.channel
              description = channel.description || ''
              rawItems = Array.isArray(channel.item) ? channel.item : []
            } else if (data.version && Array.isArray(data.items)) {
              // JSON Feed format
              description = data.description || ''
              rawItems = data.items
            } else if (data.feed?.entry) {
              // Atom format
              const feed = data.feed
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
              } else if (item.title && (item.content_html || item.content_text) && item.url) {
                // JsonFeed item
                return {
                  title: item.title,
                  description: item.content_text || item.content_html || '',
                  link: item.url,
                  pubDate: item.date_published || new Date().toISOString()
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
        setSelectedFeeds(new Set(loadedFeeds.map(f => f.name)))
      } catch (error) {
        console.error('Error loading feeds:', error)
      } finally {
        setLoading(false)
      }
    }
    loadFeeds()
  }, [])

  if (loading) {
    return (
      <SidebarProvider>
        <div className="flex min-h-svh p-6">Loading RSS feeds...</div>
      </SidebarProvider>
    )
  }

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <h2 className="px-4 py-2 font-semibold">Feeds</h2>
        </SidebarHeader>
        <SidebarContent>
          <ScrollArea className="flex-1">
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  {feeds.map((feed) => (
                    <SidebarMenuItem key={feed.name}>
                      <SidebarMenuButton>
                        <Checkbox
                          id={feed.name}
                          checked={selectedFeeds.has(feed.name)}
                          onCheckedChange={(checked) => handleFeedToggle(feed.name, checked as boolean)}
                        />
                        <label htmlFor={feed.name} className="text-sm font-medium cursor-pointer ml-2">
                          {feed.title}
                        </label>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </ScrollArea>
        </SidebarContent>
      </Sidebar>
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <h1 className="text-xl font-bold">RSS Reader ({filteredItems.length} items)</h1>
          <Button variant="outline" size="icon" onClick={toggleTheme} className="ml-auto">
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4">
          <div className="space-y-4">
            {filteredItems.map((item, index) => (
              <FeedItemComponent key={`${item.feedTitle}-${index}`} item={item} />
            ))}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

export default App
