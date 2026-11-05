import { AlertCircle, ArrowLeft, LoaderCircle, Send } from 'lucide-react'
import { Link } from 'react-router-dom'
import TicketAttachmentUpload from './TicketAttachmentUpload'
import TicketCategorySelect from './TicketCategorySelect'

const inputClass =
  'mt-2 w-full rounded-md border bg-white px-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/10'

const urgencyOptions = [
  ['LOW', 'Low', 'The issue is minor and work can continue.'],
  ['NORMAL', 'Normal', 'The issue affects work but has a workaround.'],
  ['URGENT', 'Urgent', 'The issue is blocking work or affects essential services.'],
]

function FieldError({ message }) {
  return message ? <p className="mt-1.5 text-xs font-medium text-red-600">{message}</p> : null
}

export default function TicketForm({
  user,
  values,
  files,
  categories,
  categoriesLoading,
  errors,
  formError,
  submitting,
  onFieldChange,
  onFilesChange,
  onSubmit,
}) {
  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      {formError && (
        <div
          className="flex gap-2.5 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          role="alert"
        >
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          <p>{formError}</p>
        </div>
      )}

      <section className="rounded-lg border border-slate-200 bg-white p-5 sm:p-6">
        <div className="border-b border-slate-100 pb-4">
          <h3 className="text-base font-semibold text-slate-900">Request details</h3>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Describe the problem clearly so the helpdesk can route it correctly.
          </p>
        </div>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="ticket-title" className="text-sm font-semibold text-slate-700">
              Issue title <span className="text-red-600">*</span>
            </label>
            <input
              id="ticket-title"
              value={values.title}
              onChange={(event) => onFieldChange('title', event.target.value)}
              maxLength={180}
              aria-invalid={Boolean(errors.title)}
              placeholder="Example: Cannot connect to office Wi-Fi"
              className={`${inputClass} h-11 ${errors.title ? 'border-red-400' : 'border-slate-300'}`}
            />
            <div className="flex items-start justify-between gap-3">
              <FieldError message={errors.title} />
              <span className="ml-auto mt-1.5 text-[11px] text-slate-400">
                {values.title.length}/180
              </span>
            </div>
          </div>

          <TicketCategorySelect
            value={values.category}
            onChange={(value) => onFieldChange('category', value)}
            categories={categories}
            loading={categoriesLoading}
            error={errors.category}
          />

          <div>
            <label htmlFor="ticket-location" className="text-sm font-semibold text-slate-700">
              Location <span className="text-red-600">*</span>
            </label>
            <input
              id="ticket-location"
              value={values.location}
              onChange={(event) => onFieldChange('location', event.target.value)}
              maxLength={180}
              aria-invalid={Boolean(errors.location)}
              placeholder="Building, office, or room number"
              className={`${inputClass} h-11 ${errors.location ? 'border-red-400' : 'border-slate-300'}`}
            />
            <FieldError message={errors.location} />
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="ticket-description" className="text-sm font-semibold text-slate-700">
              Description <span className="text-red-600">*</span>
            </label>
            <textarea
              id="ticket-description"
              value={values.description}
              onChange={(event) => onFieldChange('description', event.target.value)}
              maxLength={5000}
              rows={6}
              aria-invalid={Boolean(errors.description)}
              placeholder="What happened? Include any error message, when it started, and what you already tried."
              className={`${inputClass} resize-y py-3 leading-6 ${errors.description ? 'border-red-400' : 'border-slate-300'}`}
            />
            <div className="flex items-start justify-between gap-3">
              <FieldError message={errors.description} />
              <span className="ml-auto mt-1.5 text-[11px] text-slate-400">
                {values.description.length}/5000
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 sm:p-6">
        <h3 className="text-base font-semibold text-slate-900">Impact and evidence</h3>
        <div className="mt-5 space-y-6">
          <fieldset>
            <legend className="text-sm font-semibold text-slate-700">
              Reported urgency <span className="text-red-600">*</span>
            </legend>
            <div className="mt-2 grid gap-3 md:grid-cols-3">
              {urgencyOptions.map(([value, label, description]) => (
                <label
                  key={value}
                  className={`cursor-pointer rounded-md border p-3.5 transition ${
                    values.reported_urgency === value
                      ? 'border-emerald-700 bg-emerald-50 ring-1 ring-emerald-700/20'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="reported_urgency"
                      value={value}
                      checked={values.reported_urgency === value}
                      onChange={() => onFieldChange('reported_urgency', value)}
                      className="accent-emerald-700"
                    />
                    <span className="text-sm font-semibold text-slate-800">{label}</span>
                  </span>
                  <span className="mt-1.5 block pl-5 text-xs leading-5 text-slate-500">
                    {description}
                  </span>
                </label>
              ))}
            </div>
            <FieldError message={errors.reported_urgency} />
            <p className="mt-2 text-[11px] leading-5 text-slate-400">
              The IT team will review the request and set its operational priority.
            </p>
          </fieldset>

          <TicketAttachmentUpload
            files={files}
            onChange={onFilesChange}
            error={errors.attachments}
          />
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 sm:p-6">
        <h3 className="text-base font-semibold text-slate-900">Requester</h3>
        <p className="mt-1 text-xs text-slate-500">
          This ticket will be linked to your signed-in account.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Name</p>
            <p className="mt-1 text-sm font-medium text-slate-700">{user?.name || 'Current user'}</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Email</p>
            <p className="mt-1 break-all text-sm font-medium text-slate-700">{user?.email || 'Not available'}</p>
          </div>
        </div>
      </section>

      <div className="flex flex-col-reverse justify-between gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:items-center">
        <Link
          to="/user/dashboard"
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-4 text-xs font-semibold text-slate-600 hover:bg-slate-50"
        >
          <ArrowLeft size={15} /> Cancel
        </Link>
        <button
          type="submit"
          disabled={submitting || categoriesLoading}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#075b35] px-5 text-xs font-semibold text-white hover:bg-[#06492c] disabled:cursor-wait disabled:opacity-65"
        >
          {submitting ? (
            <LoaderCircle size={16} className="animate-spin" />
          ) : (
            <Send size={15} />
          )}
          {submitting ? 'Submitting ticket...' : 'Submit Ticket'}
        </button>
      </div>
    </form>
  )
}
