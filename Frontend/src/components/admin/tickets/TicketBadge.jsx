export default function TicketBadge({ children, className }) {
  return (
    <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ${className}`}>
      {children}
    </span>
  )
}
