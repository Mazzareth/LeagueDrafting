import { unstable_cache } from "next/cache" // Import unstable_cache

export interface Champion {
  id: string // e.g., "Aatrox"
  key: string // e.g., "266" (numerical ID)
  name: string // e.g., "Aatrox" (display name)
  title: string // e.g., "the Darkin Blade"
  image: {
    full: string // e.g., "Aatrox.png"
    // sprite, group, x, y, w, h are also available if needed
  }
}

interface RawChampionData {
  version: string
  id: string
  key: string
  name: string
  title: string
  blurb: string
  info: any
  image: {
    full: string
    sprite: string
    group: string
    x: number
    y: number
    w: number
    h: number
  }
  tags: string[]
  partype: string
  stats: any
}

interface ChampionApiResponse {
  type: string
  format: string
  version: string
  data: {
    [championId: string]: RawChampionData
  }
}

// It's good practice to fetch the latest version dynamically,
// but for simplicity, we'll use a recent one.
// You can find versions here: https://ddragon.leagueoflegends.com/api/versions.json
export const DDRAGON_VERSION = "14.11.1" // Example version, update as needed

// This internal function contains the actual fetching and processing logic
async function getChampionsFromApi(): Promise<Champion[]> {
  const response = await fetch(`https://ddragon.leagueoflegends.com/cdn/${DDRAGON_VERSION}/data/en_US/champion.json`)
  if (!response.ok) {
    // In a real app, you might want to log this error to a monitoring service
    console.error(`Failed to fetch champions: ${response.status} ${response.statusText}`)
    throw new Error(`Failed to fetch champions. Status: ${response.status}`)
  }
  const apiResponse: ChampionApiResponse = await response.json()

  const championsArray = Object.values(apiResponse.data).map((rawChampion: RawChampionData) => ({
    id: rawChampion.id,
    key: rawChampion.key,
    name: rawChampion.name,
    title: rawChampion.title,
    image: {
      full: rawChampion.image.full, // Extract the full image filename
    },
  }))

  return championsArray.sort((a, b) => a.name.localeCompare(b.name))
}

// Wrap the fetching function with unstable_cache
// This function will now be cached on the server.
export const fetchChampions = unstable_cache(
  async () => getChampionsFromApi(),
  ["champions-data", DDRAGON_VERSION], // Cache key parts: unique key for this data + version
  {
    revalidate: 60 * 60 * 24, // Revalidate data once every 24 hours (in seconds)
    tags: ["champions", `champions-version-${DDRAGON_VERSION}`], // Tags for potential on-demand revalidation
  },
)
