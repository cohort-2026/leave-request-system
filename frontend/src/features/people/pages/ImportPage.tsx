import { PageShell } from '../../../app/layouts/PageShell'

export function ImportPage() {
  return (
    <PageShell title="Import staff list" eyebrow="Company admin">
      <p className="muted">
        Creates person rows from a file. Does not sign them in.
      </p>
      <form
        className="stack"
        onSubmit={(event) => {
          event.preventDefault()
        }}
      >
        <label>
          Staff file
          <input type="file" name="roster" disabled />
        </label>
        <button type="submit" disabled>
          Import (wired later)
        </button>
      </form>
    </PageShell>
  )
}
