"use client"

import { useState, useMemo } from "react"
import { Input } from "@/components/ui/input"
import { type Champion, DDRAGON_VERSION } from "@/lib/fetch-champions"
import { Search } from "lucide-react"

interface ChampionSearchDisplayProps {
  initialChampions: Champion[]
}

export default function ChampionSearchDisplay({ initialChampions }: ChampionSearchDisplayProps) {
  const [searchTerm, setSearchTerm] = useState("")

  const filteredChampions = useMemo(() => {
    const lowerCaseSearchTerm = searchTerm.toLowerCase()
    if (!lowerCaseSearchTerm) {
      return initialChampions
    }
    return initialChampions.filter((champion) => champion.name.toLowerCase().includes(lowerCaseSearchTerm))
  }, [searchTerm, initialChampions])

  const getChampionImageUrl = (imageFullName: string) => {
    return `https://ddragon.leagueoflegends.com/cdn/${DDRAGON_VERSION}/img/champion/${imageFullName}`
  }

  return (
    <>
      <div className="mb-8 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search champion by name (e.g., Ahri, Darius)"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full text-base pl-10 pr-4 py-3 h-12 rounded-lg shadow-sm focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          aria-label="Search champion by name"
        />
      </div>

      {filteredChampions.length > 0 ? (
        <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredChampions.map((champion) => (
            <li
              key={champion.id}
              className="bg-card border border-border rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 ease-in-out overflow-hidden flex flex-col items-center p-4"
            >
              <img
                src={getChampionImageUrl(champion.image.full) || "/placeholder.svg"}
                alt={champion.name}
                width={120}
                height={120}
                className="rounded-md mb-3 object-cover aspect-square"
                loading="lazy" // Basic browser-level lazy loading
              />
              <div className="text-center">
                <p className="text-lg font-semibold text-card-foreground">{champion.name}</p>
                <p className="text-xs text-muted-foreground italic">{champion.title}</p>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="text-center py-12 col-span-full">
          <p className="text-xl text-muted-foreground">
            {initialChampions.length > 0 ? `No champions found matching "${searchTerm}".` : "No champions available."}
          </p>
          {initialChampions.length > 0 && (
            <p className="mt-2 text-sm text-muted-foreground">Try a different name or clear the search.</p>
          )}
        </div>
      )}
    </>
  )
}
