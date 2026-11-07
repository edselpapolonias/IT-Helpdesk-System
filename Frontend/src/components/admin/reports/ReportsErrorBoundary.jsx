import { Component } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

export default class ReportsErrorBoundary extends Component {
  state = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <section className="mx-auto flex min-h-72 max-w-[1600px] flex-col items-center justify-center rounded-lg border border-red-200 bg-white p-6 text-center">
        <AlertTriangle size={24} className="text-red-500" />
        <h1 className="mt-3 text-base font-semibold text-slate-900">Reports could not be displayed</h1>
        <p className="mt-1 max-w-md text-xs leading-5 text-slate-500">
          An unexpected display error occurred. Reload the page to try again.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-4 inline-flex items-center gap-2 rounded-md bg-[#075b35] px-4 py-2 text-xs font-semibold text-white hover:bg-[#06492c]"
        >
          <RefreshCw size={14} /> Reload reports
        </button>
      </section>
    )
  }
}
