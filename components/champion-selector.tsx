"use client"

import { useState, useMemo } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import type { Champion } from "@/lib/fetch-champions"
import { DDRAGON_VERSION } from "@/lib/fetch-champions" // Assuming DDRAGON_VERSION is exported
import { Search, CheckCircle } from "lucide-react"

interface ChampionSelectorProps {
  champions: Champion[]
  onSelectChampion: (champion: Champion) => void
  disabled?: boolean
  selectedChampionId?: string | null
  actionText?: string
}

export default function ChampionSelector({
  champions,
  onSelectChampion,
  disabled = false,
  selectedChampionId,
  actionText = "Select",
}: ChampionSelectorProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [locallySelected, setLocallySelected] = useState<Champion | null>(null)

  const filteredChampions = useMemo(() => {
    const lowerCaseSearchTerm = searchTerm.toLowerCase()
    if (!lowerCaseSearchTerm) {
      return champions
    }
    return champions.filter((champion) => champion.name.toLowerCase().includes(lowerCaseSearchTerm))
  }, [searchTerm, champions])

  const getChampionImageUrl = (imageFullName: string) => {
    return `https://ddragon.leagueoflegends.com/cdn/${DDRAGON_VERSION}/img/champion/${imageFullName}`
  }

  const handleSelect = (champion: Champion) => {
    setLocallySelected(champion) // For immediate UI feedback
    onSelectChampion(champion)
  }

  return (
    <div className="p-4 border rounded-lg bg-card">
      <div className="mb-4 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search champion..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full text-base pl-10 pr-4 py-3 h-12"
          disabled={disabled}
        />
      </div>

      {filteredChampions.length > 0 ? (
        <div className="max-h-96 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {filteredChampions.map((champion) => (
            <Button
              key={champion.id}
              variant="outline"
              className={`h-auto p-2 flex flex-col items-center relative ${locallySelected?.id === champion.id || selectedChampionId === champion.id ? "ring-2 ring-primary" : ""}`}
              onClick={() => handleSelect(champion)}
              disabled={disabled || selectedChampionId === champion.id} // Disable if globally selected
            >
              <img
                src={getChampionImageUrl(champion.image.full) || "/placeholder.svg"}
                alt={champion.name}
                width={60}
                height={60}
                className="rounded-sm mb-1 aspect-square object-cover"
                loading="lazy"
              />
              <span className="text-xs text-center block truncate w-full">{champion.name}</span>
              {(locallySelected?.id === champion.id || selectedChampionId === champion.id) && (
                <CheckCircle className="absolute top-1 right-1 h-4 w-4 text-primary-foreground fill-primary" />
              )}
            </Button>
          ))}
        </div>
      ) : (
        <p className="text-center text-muted-foreground py-4">No champions found.</p>
      )}
    </div>
  )
}
