import { useEffect, useState } from 'react'
import { fetchModelsMetrics } from '../../lib/api'
import type { ModelsMetrics } from '../../types/domain'

export default function AboutPanel({ onClose }: { onClose: () => void }) {
  const [metrics, setMetrics] = useState<ModelsMetrics | null>(null)
  const [available, setAvailable] = useState(true)

  useEffect(() => {
    void fetchModelsMetrics().then((r) => {
      setAvailable(r.available)
      setMetrics(r.metrics)
    })
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 pt-20" onClick={onClose}>
      <div
        className="hmi-panel w-[420px] rounded p-4 font-mono text-xs text-hmi-text"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <span className="text-sm font-semibold uppercase tracking-wide">About — Model Metrics</span>
          <button onClick={onClose} className="text-hmi-dim hover:text-hmi-text">✕</button>
        </div>

        {!available && <div className="text-hmi-dim">Models not trained yet — run `backend/train.py`.</div>}

        {metrics && (
          <div className="flex flex-col gap-3">
            <div className="text-[10px] text-hmi-dim">
              Trained {new Date(metrics.trained_at).toLocaleString()} · {metrics.n_rows.toLocaleString()} rows ·{' '}
              {metrics.n_wells_train} train / {metrics.n_wells_test} test wells (held out, TR-M3)
            </div>

            <div>
              <div className="mb-1 uppercase tracking-wide text-hmi-dim">Production regressor</div>
              <div className={metrics.regressor.passed ? 'text-hmi-green' : 'text-hmi-red'}>
                R² = {metrics.regressor.r2} (bar ≥ {metrics.regressor.pass_bar}) {metrics.regressor.passed ? '✓' : '✗'}
              </div>
              <div className="text-[10px] text-hmi-dim">
                Top features:{' '}
                {Object.entries(metrics.regressor.feature_importances)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 3)
                  .map(([k]) => k)
                  .join(', ')}
              </div>
            </div>

            <div>
              <div className="mb-1 uppercase tracking-wide text-hmi-dim">Rod-float classifier</div>
              <div className={metrics.classifier.passed ? 'text-hmi-green' : 'text-hmi-red'}>
                Recall = {metrics.classifier.recall} (bar ≥ {metrics.classifier.pass_bar}) {metrics.classifier.passed ? '✓' : '✗'}
              </div>
              <div className="text-hmi-dim">ROC-AUC = {metrics.classifier.roc_auc}</div>
              <div className="text-[10px] text-hmi-dim">
                Top features:{' '}
                {Object.entries(metrics.classifier.feature_importances)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 3)
                  .map(([k]) => k)
                  .join(', ')}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
