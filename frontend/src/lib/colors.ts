import type { Status } from '../types/domain'

export const STATUS_HEX: Record<Status, string> = {
  GREEN: '#22d17a',
  AMBER: '#f5a524',
  RED: '#ef4444',
}

export const STATUS_TEXT_CLASS: Record<Status, string> = {
  GREEN: 'text-[#22d17a]',
  AMBER: 'text-[#f5a524]',
  RED: 'text-[#ef4444]',
}

export const STATUS_BG_CLASS: Record<Status, string> = {
  GREEN: 'bg-[#22d17a]',
  AMBER: 'bg-[#f5a524]',
  RED: 'bg-[#ef4444]',
}
