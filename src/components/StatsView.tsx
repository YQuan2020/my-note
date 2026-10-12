import { useStore } from '../store'
import { countNew, countDue, DAY_MS } from '../lib/srs'

export default function StatsView() {
  const decks = useStore((s) => s.decks)
  const cards = useStore((s) => s.cards)

  const now = Date.now()
  const total = cards.length
  const fresh = countNew(cards)
  const due = countDue(cards)
  const learning = cards.filter((c) => c.state === 'learning' || c.state === 'relearning').length
  const review = cards.filter((c) => c.state === 'review').length

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const reviewedToday = cards.filter((c) => c.lastReviewed && c.lastReviewed >= todayStart.getTime()).length

  // Due forecast for the next 7 days
  const forecast = Array.from({ length: 7 }, () => 0)
  const dayLabels = ['Today']
  for (let i = 1; i < 7; i++) {
    const d = new Date(todayStart.getTime() + i * DAY_MS)
    dayLabels.push(`${d.getMonth() + 1}/${d.getDate()}`)
  }
  for (const c of cards) {
    if (c.state === 'new') continue
    const daysAway = Math.floor((c.due - todayStart.getTime()) / DAY_MS)
    const bucket = Math.max(0, Math.min(6, daysAway))
    forecast[bucket]++
  }
  const maxForecast = Math.max(1, ...forecast)

  const stat = (label: string, value: number, cls = '') => (
    <div className={`stat-tile ${cls}`}>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  )

  return (
    <div className="page">
      <div className="page-head">
        <h1>Study Statistics</h1>
      </div>

      <div className="stat-grid">
        {stat('Total cards', total)}
        {stat('Total decks', decks.length)}
        {stat('New', fresh, 'c-new')}
        {stat('Due today', due, 'c-due')}
        {stat('Learning', learning, 'c-learning')}
        {stat('Review', review)}
        {stat('Reviewed today', reviewedToday, 'c-good')}
      </div>

      <div className="forecast">
        <h2>Due in the next 7 days</h2>
        <div className="bar-chart">
          {forecast.map((n, i) => (
            <div className="bar-col" key={i}>
              <div className="bar-num">{n}</div>
              <div className="bar" style={{ height: `${Math.round((n / maxForecast) * 100)}%` }} />
              <div className="bar-label">{dayLabels[i]}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
