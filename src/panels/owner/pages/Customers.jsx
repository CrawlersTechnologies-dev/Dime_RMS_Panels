import { Contact } from 'lucide-react'
import PageHeader from '../../../components/layout/PageHeader'
import Panel from '../../../components/ui/Panel'

/**
 * Scope not decided yet. The two options below are what we discussed; pick one and this
 * page gets built. Both read from orders (phone number at billing) and the customer app.
 */
export default function Customers() {
  const options = [
    ['Customer records', 'Bookings and enquiries from the customer app, with each customer’s contact details and visit history.'],
    ['Customer list with loyalty', 'Everyone who gave a number at billing or ordered in the app: visits, spend, favourite items, and points or offers for regulars.'],
  ]
  return (
    <>
      <PageHeader title="Customers" />
      <Panel>
        <div className="flex flex-col items-center text-center py-8 px-4">
          <span className="grid place-items-center size-14 rounded-full bg-brand-50 text-brand-600 mb-4"><Contact className="size-6" aria-hidden /></span>
          <h2 className="font-display text-xl font-semibold">What this page covers is still being decided</h2>
          <p className="text-ink-500 mt-1.5 max-w-lg">Access and routing are ready. Once the scope is chosen, this page will show one of these:</p>
        </div>
        <ul className="grid gap-4 sm:grid-cols-2 max-w-3xl mx-auto pb-4">
          {options.map(([t, desc]) => (
            <li key={t} className="rounded-xl border border-line p-4">
              <h3 className="font-semibold">{t}</h3>
              <p className="text-sm text-ink-500 mt-1">{desc}</p>
            </li>
          ))}
        </ul>
      </Panel>
    </>
  )
}
