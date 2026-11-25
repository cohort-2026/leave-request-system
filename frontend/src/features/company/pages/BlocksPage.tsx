import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { format } from 'date-fns'
import type { DateRange } from 'react-day-picker'
import { CalendarDays, Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { PageShell } from '../../../app/layouts/PageShell'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Alert } from '../../../shared/components'
import { ApiError } from '../../../services/api'
import { listDepartments, type Department } from '../../people/departmentsApi'
import {
  createDateBlock,
  deleteDateBlock,
  listDateBlocks,
  updateDateBlock,
  type DateBlock,
  type DateBlockMode,
} from '../dateBlocksApi'

type DateBlockForm = {
  startDate: string
  endDate: string
  departmentId: string
  mode: DateBlockMode
  reason: string
}

const EMPTY_FORM: DateBlockForm = {
  startDate: '',
  endDate: '',
  departmentId: '',
  mode: 'block',
  reason: '',
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof ApiError ? error.message : fallback
}

function dateToString(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function stringToDate(value: string): Date {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function blockYears(blocks: DateBlock[]): number[] {
  const currentYear = new Date().getFullYear()
  const years = new Set(
    Array.from({ length: 8 }, (_, index) => currentYear - 2 + index),
  )

  for (const block of blocks) {
    years.add(Number(block.startDate.slice(0, 4)))
    years.add(Number(block.endDate.slice(0, 4)))
  }

  return [...years].sort((a, b) => a - b)
}

export function BlocksPage() {
  const [blocks, setBlocks] = useState<DateBlock[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [year, setYear] = useState(String(new Date().getFullYear()))
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingBlock, setEditingBlock] = useState<DateBlock | null>(null)
  const [form, setForm] = useState<DateBlockForm>(EMPTY_FORM)
  const [selectedRange, setSelectedRange] = useState<DateRange | undefined>()
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [blockToDelete, setBlockToDelete] = useState<DateBlock | null>(null)

  const visibleBlocks = useMemo(() => {
    const firstDay = `${year}-01-01`
    const lastDay = `${year}-12-31`
    return blocks.filter(
      (block) => block.startDate <= lastDay && block.endDate >= firstDay,
    )
  }, [blocks, year])

  async function reload() {
    setLoading(true)
    setLoadError(null)
    try {
      const [nextBlocks, nextDepartments] = await Promise.all([
        listDateBlocks(),
        listDepartments(),
      ])
      setBlocks(nextBlocks)
      setDepartments(nextDepartments)
    } catch (error: unknown) {
      setLoadError(getErrorMessage(error, 'Could not load blocked dates.'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let cancelled = false

    Promise.all([listDateBlocks(), listDepartments()])
      .then(([nextBlocks, nextDepartments]) => {
        if (cancelled) return
        setBlocks(nextBlocks)
        setDepartments(nextDepartments)
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setLoadError(getErrorMessage(error, 'Could not load blocked dates.'))
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  function openCreateSheet() {
    setEditingBlock(null)
    setForm(EMPTY_FORM)
    setSelectedRange(undefined)
    setFormError(null)
    setSheetOpen(true)
  }

  function openEditSheet(block: DateBlock) {
    setEditingBlock(block)
    setForm({
      startDate: block.startDate,
      endDate: block.endDate,
      departmentId: block.departmentId === null ? '' : String(block.departmentId),
      mode: block.mode,
      reason: block.reason,
    })
    setSelectedRange({
      from: stringToDate(block.startDate),
      to: stringToDate(block.endDate),
    })
    setFormError(null)
    setSheetOpen(true)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!form.startDate || !form.endDate) {
      setFormError('Choose both a start and end date.')
      return
    }
    if (!form.reason.trim()) {
      setFormError('Enter a reason for this date block.')
      return
    }

    setSaving(true)
    setFormError(null)
    const values = {
      startDate: form.startDate,
      endDate: form.endDate,
      departmentId: form.departmentId ? Number(form.departmentId) : null,
      mode: form.mode,
      reason: form.reason.trim(),
    }

    try {
      const saved = editingBlock
        ? await updateDateBlock(editingBlock.id, values)
        : await createDateBlock(values)
      setBlocks((current) =>
        editingBlock
          ? current.map((block) => (block.id === saved.id ? saved : block))
          : [...current, saved].sort((a, b) =>
              a.startDate.localeCompare(b.startDate),
            ),
      )
      setSheetOpen(false)
      toast.success(editingBlock ? 'Blocked dates updated.' : 'Blocked dates added.')
    } catch (error: unknown) {
      setFormError(
        getErrorMessage(error, 'Could not save these blocked dates.'),
      )
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!blockToDelete) return
    const block = blockToDelete
    setDeletingId(block.id)
    try {
      await deleteDateBlock(block.id)
      setBlocks((current) => current.filter((item) => item.id !== block.id))
      setBlockToDelete(null)
      toast.success('Blocked dates removed.')
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Could not remove these blocked dates.'))
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <PageShell
      title="Blocked dates"
      eyebrow="Company admin"
      action={
        <Button type="button" onClick={openCreateSheet}>
          <Plus aria-hidden="true" />
          Add blocked dates
        </Button>
      }
    >
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold">Company date blocks</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Prevent or warn about leave requests during important periods.
          </p>
        </div>
        <div className="grid gap-1 text-sm font-medium">
          <span>Year</span>
          <Select value={year} onValueChange={setYear}>
            <SelectTrigger aria-label="Filter blocked dates by year" className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {blockYears(blocks).map((optionYear) => (
                <SelectItem key={optionYear} value={String(optionYear)}>
                  {optionYear}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {loadError ? (
        <div className="flex flex-wrap items-center gap-3">
          <Alert tone="error">{loadError}</Alert>
          <Button type="button" variant="outline" onClick={() => void reload()}>
            Try again
          </Button>
        </div>
      ) : null}

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading blocked dates…</p>
      ) : !loadError && visibleBlocks.length === 0 ? (
        <div className="rounded-xl border border-dashed p-8 text-center">
          <CalendarDays className="mx-auto size-8 text-muted-foreground" aria-hidden="true" />
          <h3 className="mt-3 text-base font-semibold">
            No blocked dates for {year}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Add a period when leave should be blocked or flagged for review.
          </p>
          <Button type="button" className="mt-4" onClick={openCreateSheet}>
            Add blocked dates
          </Button>
        </div>
      ) : !loadError ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Period</TableHead>
              <TableHead>Applies to</TableHead>
              <TableHead>Mode</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead className="w-36 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleBlocks.map((block) => (
              <TableRow key={block.id}>
                <TableCell className="font-medium tabular-nums">
                  {format(stringToDate(block.startDate), 'd MMM yyyy')}
                  {block.endDate !== block.startDate
                    ? ` – ${format(stringToDate(block.endDate), 'd MMM yyyy')}`
                    : ''}
                </TableCell>
                <TableCell>{block.departmentName ?? 'Whole company'}</TableCell>
                <TableCell>
                  <Badge variant={block.mode === 'block' ? 'destructive' : 'secondary'}>
                    {block.mode === 'block' ? 'Block' : 'Warn'}
                  </Badge>
                </TableCell>
                <TableCell className="max-w-sm whitespace-normal">
                  {block.reason}
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => openEditSheet(block)}
                      aria-label={`Edit ${block.reason}`}
                      disabled={deletingId !== null}
                    >
                      <Pencil aria-hidden="true" />
                      Edit
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setBlockToDelete(block)}
                      aria-label={`Remove ${block.reason}`}
                      disabled={deletingId !== null}
                    >
                      <Trash2 aria-hidden="true" />
                      {deletingId === block.id ? 'Removing…' : 'Remove'}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : null}

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>
              {editingBlock ? 'Edit blocked dates' : 'Add blocked dates'}
            </SheetTitle>
            <SheetDescription>
              Choose a period, who it applies to, and whether requests are
              blocked or only flagged.
            </SheetDescription>
          </SheetHeader>
          <form className="flex min-h-0 flex-1 flex-col" onSubmit={(event) => void handleSubmit(event)}>
            <div className="space-y-5 overflow-y-auto px-4 pb-4">
              <div className="grid gap-1.5">
                <span className="text-sm font-medium">Period</span>
                <Calendar
                  mode="range"
                  selected={selectedRange}
                  onSelect={(range) => {
                    setSelectedRange(range)
                    setForm((current) => ({
                      ...current,
                      startDate: range?.from ? dateToString(range.from) : '',
                      endDate: range?.to ? dateToString(range.to) : '',
                    }))
                  }}
                  defaultMonth={
                    selectedRange?.from ??
                    (form.startDate ? stringToDate(form.startDate) : new Date())
                  }
                  disabled={saving}
                  className="mx-auto rounded-lg border"
                />
                <p className="text-xs text-muted-foreground" aria-live="polite">
                  {form.startDate
                    ? form.endDate
                      ? `${format(stringToDate(form.startDate), 'd MMM yyyy')} – ${format(stringToDate(form.endDate), 'd MMM yyyy')}`
                      : `${format(stringToDate(form.startDate), 'd MMM yyyy')} – choose an end date`
                    : 'Select a start date, then an end date.'}
                </p>
              </div>

              <div className="grid gap-1.5 text-sm font-medium">
                <span>Applies to</span>
                <Select
                  value={form.departmentId || 'company'}
                  onValueChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      departmentId: value === 'company' ? '' : value,
                    }))
                  }
                  disabled={saving}
                >
                  <SelectTrigger aria-label="Applies to">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="company">Whole company</SelectItem>
                    {departments.map((department) => (
                      <SelectItem key={department.id} value={String(department.id)}>
                        {department.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-1.5 text-sm font-medium">
                <span>Mode</span>
                <Select
                  value={form.mode}
                  onValueChange={(value) => {
                    if (value !== 'block' && value !== 'warn') return
                    setForm((current) => ({ ...current, mode: value }))
                  }}
                  disabled={saving}
                >
                  <SelectTrigger aria-label="Block mode">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="block">Block requests</SelectItem>
                    <SelectItem value="warn">Warn for review</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <label className="grid gap-1.5 text-sm font-medium">
                Reason
                <Input
                  name="reason"
                  value={form.reason}
                  maxLength={500}
                  required
                  placeholder="e.g. Annual stocktake"
                  disabled={saving}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      reason: event.target.value,
                    }))
                  }
                />
              </label>

              {formError ? <Alert tone="error">{formError}</Alert> : null}
            </div>
            <SheetFooter className="border-t">
              <Button type="submit" disabled={saving || !form.startDate || !form.endDate}>
                {saving ? 'Saving…' : editingBlock ? 'Save changes' : 'Add blocked dates'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setSheetOpen(false)}
                disabled={saving}
              >
                Cancel
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      <AlertDialog
        open={blockToDelete !== null}
        onOpenChange={(open) => {
          if (!open && deletingId === null) setBlockToDelete(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove blocked dates?</AlertDialogTitle>
            <AlertDialogDescription>
              {blockToDelete
                ? `Remove the blocked period for “${blockToDelete.reason}”?`
                : 'Remove this blocked period?'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingId !== null}>Keep dates</AlertDialogCancel>
            <AlertDialogAction
              disabled={deletingId !== null}
              onClick={(event) => {
                event.preventDefault()
                void handleDelete()
              }}
            >
              {deletingId !== null ? 'Removing…' : 'Remove'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageShell>
  )
}
