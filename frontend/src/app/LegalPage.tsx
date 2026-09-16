import { Link, useLocation } from 'react-router-dom'
import { paths } from '../shared/constants/paths'

type LegalDocument = {
  title: string
  eyebrow: string
  intro: string
  sections: Array<{ heading: string; body: string }>
}

const documents: Record<string, LegalDocument> = {
  [paths.terms]: {
    title: 'Terms of service',
    eyebrow: 'Legal',
    intro: 'These terms describe the basis on which organisations and their users access the Leave request platform.',
    sections: [
      { heading: 'Service use', body: 'Organisations are responsible for their account configuration, authorised users and the accuracy of information entered into the service.' },
      { heading: 'Customer data', body: 'Customers retain ownership of their employee and organisation data. We process that data to provide, secure and support the service.' },
      { heading: 'Availability and changes', body: 'The platform may evolve as we improve security, reliability and product capabilities. Material changes will be communicated to customers.' },
    ],
  },
  [paths.privacy]: {
    title: 'Privacy policy',
    eyebrow: 'Data protection',
    intro: 'We handle personal information with purpose limitation, access control and appropriate security safeguards.',
    sections: [
      { heading: 'What we process', body: 'Depending on how the service is used, this may include account details, employee records, leave requests, audit events and support communications.' },
      { heading: 'How we use it', body: 'We use information to operate the platform, authenticate users, protect customer environments, provide support and meet legal obligations.' },
      { heading: 'Your responsibilities', body: 'Each organisation remains responsible for its lawful collection and use of employee data, including providing required notices and instructions.' },
    ],
  },
  [paths.security]: {
    title: 'Security',
    eyebrow: 'Trust centre',
    intro: 'Security is built into the platform through layered controls and clear operational accountability.',
    sections: [
      { heading: 'Access control', body: 'Role-based permissions and organisation boundaries restrict access to company data. Administrative activity should be reviewable through audit records.' },
      { heading: 'Protection', body: 'Data is protected in transit and at rest using appropriate technical safeguards. Credentials are handled using secure password hashing and session controls.' },
      { heading: 'Assurance', body: 'We aim to make security practices measurable and evidence-based. We do not make certification or “bank-grade” claims unless they are supported by current controls.' },
    ],
  },
  [paths.dpa]: {
    title: 'Data processing agreement',
    eyebrow: 'Data protection',
    intro: 'Our DPA sets out the processing relationship between an organisation using the platform and the service provider.',
    sections: [
      { heading: 'Controller and processor', body: 'The customer determines the purposes and means of processing employee data. We process it on the customer\'s documented instructions to deliver the service.' },
      { heading: 'Subprocessors', body: 'Service providers that support hosting, infrastructure or communications are documented in a maintained subprocessor list and are required to protect customer data.' },
      { heading: 'Incidents and deletion', body: 'We maintain an incident response process and provide notifications in line with our contractual commitments. Customer data is handled according to retention and deletion instructions.' },
    ],
  },
}

export function LegalPage() {
  const { pathname } = useLocation()
  const document = documents[pathname] ?? documents[paths.terms]

  return (
    <article className="legal-page">
      <p className="eyebrow">{document.eyebrow}</p>
      <h1>{document.title}</h1>
      <p className="legal-intro">{document.intro}</p>
      <div className="legal-sections">
        {document.sections.map((section) => (
          <section key={section.heading}>
            <h2>{section.heading}</h2>
            <p>{section.body}</p>
          </section>
        ))}
      </div>
      <p className="legal-back">
        <Link to={paths.login}>Back to sign in</Link>
      </p>
    </article>
  )
}
