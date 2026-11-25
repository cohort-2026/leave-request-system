import { apiRequest } from '../../services/api'

export type DateBlockMode = 'block' | 'warn'

export type DateBlock = {
  id: number
  startDate: string
  endDate: string
  departmentId: number | null
  departmentName: string | null
  mode: DateBlockMode
  reason: string
}

export type SaveDateBlock = Pick<
  DateBlock,
  'startDate' | 'endDate' | 'departmentId' | 'mode' | 'reason'
>

type DateBlocksResponse = {
  dateBlocks: DateBlock[]
}

export function listDateBlocks() {
  return apiRequest<DateBlocksResponse>(
    '/api/companies/current/date-blocks',
  ).then((body) => body.dateBlocks)
}

export function createDateBlock(values: SaveDateBlock) {
  return apiRequest<DateBlock>('/api/companies/current/date-blocks', {
    method: 'POST',
    body: JSON.stringify(values),
  })
}

export function updateDateBlock(id: number, values: SaveDateBlock) {
  return apiRequest<DateBlock>(`/api/companies/current/date-blocks/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(values),
  })
}

export function deleteDateBlock(id: number) {
  return apiRequest<{ ok: true }>(`/api/companies/current/date-blocks/${id}`, {
    method: 'DELETE',
  })
}
