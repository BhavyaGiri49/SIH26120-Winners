import { useState } from 'react'
import { useFieldStore } from '../../store/fieldStore'
import RankingTable from './RankingTable'
import WellTile from './WellTile'

export default function FieldOverviewGrid() {
  const wellOrder = useFieldStore((s) => s.wellOrder)
  const [view, setView] = useState<'grid' | 'ranking'>('grid')

  return (
    <div className="flex flex-col gap-2 p-2">
      <div className="flex items-center justify-between px-1">
        <span className="font-mono text-[10px] uppercase tracking-wide text-hmi-dim">{wellOrder.length} wells</span>
        <div className="flex gap-1 font-mono text-[10px]">
          <button
            onClick={() => setView('grid')}
            className={`rounded px-1.5 py-0.5 uppercase ${view === 'grid' ? 'bg-hmi-accent/20 text-hmi-accent' : 'text-hmi-dim hover:bg-white/5'}`}
          >
            Grid
          </button>
          <button
            onClick={() => setView('ranking')}
            className={`rounded px-1.5 py-0.5 uppercase ${view === 'ranking' ? 'bg-hmi-accent/20 text-hmi-accent' : 'text-hmi-dim hover:bg-white/5'}`}
          >
            Ranked
          </button>
        </div>
      </div>
      {view === 'grid' ? (
        <div className="grid grid-cols-1 gap-2">
          {wellOrder.map((id) => (
            <WellTile key={id} id={id} />
          ))}
        </div>
      ) : (
        <RankingTable />
      )}
    </div>
  )
}
