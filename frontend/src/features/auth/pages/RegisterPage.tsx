import { Link, Navigate } from 'react-router-dom'
import { PageShell } from '../../../app/layouts/PageShell'
import { Button } from '../../../components/ui/button'
import { Card, CardContent } from '../../../components/ui/card'
import { Alert } from '../../../shared/components'
import { paths } from '../../../shared/constants/paths'

export function RegisterPage() {
  return (
    <>
      <PageShell title="Create an account">
        <Card className="gap-0 border-border/70 bg-muted/50 py-0 shadow-none ring-0">
          <CardContent className="grid gap-4 px-4 py-4">
            <Alert>
              New companies set up their workspace on the next page. Redirecting
              you to company setup now.
            </Alert>
            <Button asChild size="lg" className="w-full">
              <Link to={paths.startCompany}>Continue to company setup</Link>
            </Button>
          </CardContent>
        </Card>
      </PageShell>
      <Navigate to={paths.startCompany} replace />
    </>
  )
}
