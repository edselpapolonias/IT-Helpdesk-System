import TicketBadge from '../../admin/tickets/TicketBadge'
import { statusLabels, statusTone } from '../../admin/tickets/constants'

const statusDescriptions = {
  OPEN: 'Your request has been submitted and is awaiting review.',
  ASSIGNED: 'A technician has been assigned to your request.',
  IN_PROGRESS: 'The technician is currently working on your issue.',
  RESOLVED: 'The technician has recorded a solution. Please review the resolution.',
  REOPENED: 'The issue requires additional attention and is back in the support queue.',
  CLOSED: 'The issue has been completed and the ticket is closed.',
}

export default function TicketStatusBadge({ status }) {
  return (
    <span title={statusDescriptions[status] || ''}>
      <TicketBadge className={statusTone(status)}>
        {statusLabels[status] || status}
      </TicketBadge>
    </span>
  )
}
