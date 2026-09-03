/**
 * Usage: <Modal open={open} title="Reject reason" onClose={onClose}>...</Modal>
 */
import { useEffect, useRef, type ReactNode } from 'react'
import { Button } from './Button'

type ModalProps = {
  open: boolean
  title: string
  onClose: () => void
  className?: string
  children: ReactNode
}

export function Modal({
  open,
  title,
  onClose,
  className = '',
  children,
}: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const classes = ['modal', className].filter(Boolean).join(' ')

  useEffect(() => {
    const node = dialogRef.current
    if (!node) {
      return
    }

    if (open) {
      if (!node.open) {
        node.showModal()
      }
      return
    }

    if (node.open) {
      node.close()
    }
  }, [open])

  return (
    <dialog
      ref={dialogRef}
      className={classes}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose()
        }
      }}
    >
      <div className="modal-panel">
        <header className="modal-header">
          <h2>{title}</h2>
          <Button variant="secondary" type="button" onClick={onClose}>
            Close
          </Button>
        </header>
        <div className="modal-body">{children}</div>
      </div>
    </dialog>
  )
}
