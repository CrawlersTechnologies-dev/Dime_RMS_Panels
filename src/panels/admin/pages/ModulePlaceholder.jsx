import { Construction } from 'lucide-react'
import PageHeader from '../../../components/layout/PageHeader'
import Panel from '../../../components/ui/Panel'
import EmptyState from '../../../components/ui/EmptyState'

/** Stand-in for modules not built yet. Routing and permission checks already work. */
export default function ModulePlaceholder({ title }) {
  return (
    <>
      <PageHeader title={title} />
      <Panel>
        <EmptyState icon={Construction} title={`${title} is next on the build list`}>
          The route and access check for this module are in place. Share the screens and fields for it and we'll build it out.
        </EmptyState>
      </Panel>
    </>
  )
}
