import CollapsibleSection from '../common/CollapsibleSection'
import ChartsPanel from '../charts/ChartsPanel'
import EventLogPanel from '../events/EventLogPanel'
import FieldOverviewGrid from '../field/FieldOverviewGrid'
import KPIPanel from '../panel/KPIPanel'
import MLPredictionPanel from '../panel/MLPredictionPanel'
import OptimizerPanel from '../panel/OptimizerPanel'
import WellControls from '../panel/WellControls'
import WhyFlaggedPanel from '../panel/WhyFlaggedPanel'
import WellScene3D from '../scene/WellScene3D'
import TopBar from './TopBar'

export default function AppShell() {
  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-hmi-bg text-hmi-text">
      <TopBar />

      <div className="flex min-h-0 flex-1">
        <CollapsibleSection id="field-overview" title="Field Overview" direction="horizontal" expandedClass="w-72">
          <FieldOverviewGrid />
        </CollapsibleSection>

        <main className="min-w-0 flex-1 bg-black">
          <WellScene3D />
        </main>

        <CollapsibleSection id="well-detail" title="Well Detail" direction="horizontal" expandedClass="w-80">
          <div className="flex h-full flex-col">
            <div className="min-h-0 flex-1 overflow-y-auto">
              <KPIPanel />
              <WhyFlaggedPanel />
              <WellControls />
              <MLPredictionPanel />
            </div>
            {/* Pinned, not part of the scroll region above — always visible without
                scrolling, per the demo feedback. */}
            <OptimizerPanel />
          </div>
        </CollapsibleSection>
      </div>

      <div className="flex flex-none">
        <CollapsibleSection id="charts" title="Charts" direction="vertical" expandedClass="h-64" className="min-w-0 flex-1">
          <ChartsPanel />
        </CollapsibleSection>
        <CollapsibleSection id="event-log" title="Event Log — historian" direction="vertical" expandedClass="h-64" className="w-96 flex-none border-l">
          <EventLogPanel />
        </CollapsibleSection>
      </div>
    </div>
  )
}
