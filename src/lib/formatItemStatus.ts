export function formatItemStatus(status: string): string {
  const normalizedStatus = status.trim().toLowerCase()

  switch (normalizedStatus) {
    case 'available':
      return 'Available'
    case 'borrowed':
      return 'Borrowed'
    case 'maintenance':
      return 'Maintenance'
    default:
      return status || 'Unknown'
  }
}
