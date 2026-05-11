
![screenshot](https://github.com/user-attachments/assets/fbc4bea6-65aa-496f-bdb0-7f19e7f967d3)

RSS feed aggregator with a vibecoded reader app.

# Aggregate Feeds

You can list the feeds you want to aggregate in the `configs/feeds.csv` file. It follow this following format:

```csv
title,path,filename
```

- `title` - Name of the feed that appears in the reader.
- `path` - Relative [RSSHub](https://docs.rsshub.app) path, or fully qualified remote URL.
- `filename` - The JSON file name that the feed will be saved to (extension not required).

To aggregate the feeds, run the following script:

```bash
1. Export twitter auth token
export TWITTER_AUTH_TOKEN=""

2. Run the script
scripts/feeds
```

## Feed Artifacts

Each feed defined in the the `configs/feeds.csv` file will be exported to:

```
app/public/{filename}.json
```

## RSSHub Backend

The `feeds` script checks if the `path` defined in `feeds.csv` is relative. If so, it generates the feed via [RSSHub](https://docs.rsshub.app). You can see alist of all [RSSHub sources here](https://docs.rsshub.app/routes).

## Twitter Auth Token

If you're using the [RSSHub backend for generating X RSS feeds](https://docs.rsshub.app/routes/twitter), you'll need to manually retrieve your web auth token. To do this, do the following:

1. Login the [X](https://x.com)
2. Right-click > Inspect
3. Storage > Cookies > `https://x.com`
4. Copy `auth_token` value

If you're not using any X RSS Feed generation, just comment out the `TWITTER_AUTH_TOKEN` check in `scripts/feeds`.

# Vibecoding

> [!CAUTION]
> The reader app was vibecoded for prototyping purposes only!

## Skills

```bash
scripts/skills
```

To begin vibecoding additional features, be sure to install the necessary skills related to this project. This is optional, but will make development easier for the agent.
