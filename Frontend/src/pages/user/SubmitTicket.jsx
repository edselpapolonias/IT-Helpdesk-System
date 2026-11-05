import { useEffect, useState } from 'react'
import TicketForm from '../../components/user/tickets/TicketForm'
import TicketSubmissionSuccess from '../../components/user/tickets/TicketSubmissionSuccess'
import { useAuth } from '../../context/useAuth'
import { getApiError } from '../../services/api'
import { userTicketService } from '../../services/userTicketService'

const emptyValues = {
  title: '',
  category: '',
  description: '',
  location: '',
  reported_urgency: 'NORMAL',
}

function createSubmissionKey() {
  return globalThis.crypto.randomUUID()
}

function validate(values) {
  const errors = {}
  const title = values.title.trim()
  const description = values.description.trim()
  const location = values.location.trim()
  if (title.length < 5) errors.title = 'Enter a clear title with at least 5 characters.'
  if (!values.category) errors.category = 'Select the category that best matches the issue.'
  if (description.length < 20) {
    errors.description = 'Describe the issue using at least 20 characters.'
  }
  if (location.length < 2) {
    errors.location = 'Enter the building, office, or room where the issue occurred.'
  }
  if (!['LOW', 'NORMAL', 'URGENT'].includes(values.reported_urgency)) {
    errors.reported_urgency = 'Select an urgency level.'
  }
  return errors
}

function responseFieldErrors(error) {
  const data = error.response?.data
  if (!data || typeof data !== 'object') return {}
  return Object.fromEntries(
    Object.entries(data).map(([key, value]) => [
      key,
      Array.isArray(value) ? value[0] : String(value),
    ]),
  )
}

export default function SubmitTicket() {
  const { user } = useAuth()
  const [values, setValues] = useState(emptyValues)
  const [files, setFiles] = useState([])
  const [submissionKey, setSubmissionKey] = useState(createSubmissionKey)
  const [categories, setCategories] = useState([])
  const [categoriesLoading, setCategoriesLoading] = useState(true)
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submittedTicket, setSubmittedTicket] = useState(null)

  useEffect(() => {
    const controller = new AbortController()
    userTicketService
      .categories({ signal: controller.signal })
      .then(setCategories)
      .catch((error) => {
        if (error.code !== 'ERR_CANCELED') {
          setFormError(getApiError(error, 'Unable to load ticket categories.'))
        }
      })
      .finally(() => setCategoriesLoading(false))
    return () => controller.abort()
  }, [])

  function changeField(name, value) {
    setValues((current) => ({ ...current, [name]: value }))
    setErrors((current) => ({ ...current, [name]: '' }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    const validationErrors = validate(values)
    setErrors(validationErrors)
    setFormError('')
    if (Object.keys(validationErrors).length) return

    setSubmitting(true)
    try {
      const ticket = await userTicketService.create(
        { ...values, submission_key: submissionKey },
        files,
      )
      setSubmittedTicket(ticket)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (error) {
      setErrors(responseFieldErrors(error))
      setFormError(
        getApiError(
          error,
          'The ticket could not be submitted. Review the form and try again.',
        ),
      )
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } finally {
      setSubmitting(false)
    }
  }

  function submitAnother() {
    setValues(emptyValues)
    setFiles([])
    setErrors({})
    setFormError('')
    setSubmissionKey(createSubmissionKey())
    setSubmittedTicket(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (submittedTicket) {
    return <TicketSubmissionSuccess ticket={submittedTicket} onSubmitAnother={submitAnother} />
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-emerald-700">
          Support request
        </p>
        <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">Submit a Ticket</h2>
        <p className="mt-1.5 max-w-2xl text-sm leading-6 text-slate-600">
          Report an IT issue to the technical support team. Fields marked with an asterisk are required.
        </p>
      </header>
      <TicketForm
        user={user}
        values={values}
        files={files}
        categories={categories}
        categoriesLoading={categoriesLoading}
        errors={errors}
        formError={formError}
        submitting={submitting}
        onFieldChange={changeField}
        onFilesChange={(nextFiles) => {
          setFiles(nextFiles)
          setErrors((current) => ({ ...current, attachments: '' }))
        }}
        onSubmit={handleSubmit}
      />
    </div>
  )
}
