import React from 'react'
import { createRoot } from 'react-dom/client'
import { CalendarDays, Database, ExternalLink, FileText, Search, Trophy, Video } from 'lucide-react'
import matches from './matches.json'
import './styles.css'

const resultStyles = {
  胜: 'bg-emerald-50 text-win ring-emerald-200',
  负: 'bg-rose-50 text-loss ring-rose-200',
  平: 'bg-slate-50 text-slate-600 ring-slate-200',
}

function calculateStats(records) {
  const total = records.length
  const wins = records.filter((match) => match.result === '胜').length
  const winRate = total ? Math.round((wins / total) * 100) : 0
  const tournaments = new Set(records.map((match) => match.tournament)).size

  return { total, wins, winRate, tournaments }
}

function StatCard({ label, value, subLabel, icon: Icon }) {
  return (
    <section className="rounded-lg border border-line bg-white p-5 shadow-panel">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-semibold text-ink">{value}</p>
        </div>
        <span className="grid h-10 w-10 place-items-center rounded-md bg-field text-slate-700">
          <Icon size={20} strokeWidth={1.8} />
        </span>
      </div>
      <p className="mt-4 text-sm text-slate-500">{subLabel}</p>
    </section>
  )
}

function StatsBoard({ records }) {
  const stats = calculateStats(records)

  return (
    <section className="grid gap-4 md:grid-cols-4">
      <StatCard label="总场次数" value={stats.total} subLabel="已录入单场比赛记录" icon={Database} />
      <StatCard label="胜场数" value={stats.wins} subLabel="赛果为胜的比赛" icon={Trophy} />
      <StatCard label="赛季总胜率" value={`${stats.winRate}%`} subLabel="胜场数 / 总场数" icon={CalendarDays} />
      <StatCard label="覆盖赛事" value={stats.tournaments} subLabel="不同赛事来源数量" icon={FileText} />
    </section>
  )
}

function FilterBar() {
  return (
    <section className="flex flex-col gap-3 rounded-lg border border-dashed border-slate-300 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3 text-slate-600">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-field">
          <Search size={18} strokeWidth={1.8} />
        </span>
        <div>
          <h2 className="text-sm font-semibold text-ink">数据检索</h2>
          <p className="text-sm text-slate-500">目前检索（即将包括）姓名、日期、赛事。</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <span className="rounded-md border border-line px-3 py-2 text-sm text-slate-500">队员</span>
        <span className="rounded-md border border-line px-3 py-2 text-sm text-slate-500">年份</span>
        <span className="rounded-md border border-line px-3 py-2 text-sm text-slate-500">赛事</span>
      </div>
    </section>
  )
}

function LinkButton({ href, children, icon: Icon }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-line bg-white px-3 text-sm font-medium text-ink transition hover:border-slate-400 hover:bg-field focus:outline-none focus:ring-2 focus:ring-slate-300"
    >
      <Icon size={16} strokeWidth={1.9} />
      {children}
      <ExternalLink size={14} strokeWidth={1.8} />
    </a>
  )
}

function MatchTable({ records }) {
  return (
    <section className="overflow-hidden rounded-lg border border-line bg-white shadow-panel">
      <div className="border-b border-line px-5 py-4">
        <h2 className="text-lg font-semibold text-ink">赛事列表区</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-[1080px] w-full border-collapse text-left">
          <thead className="bg-field text-sm text-slate-600">
            <tr>
              <th className="px-5 py-3 font-semibold">日期</th>
              <th className="px-5 py-3 font-semibold">赛事信息</th>
              <th className="px-5 py-3 font-semibold">辩题</th>
              <th className="px-5 py-3 font-semibold">持方</th>
              <th className="px-5 py-3 font-semibold">赛果</th>
              <th className="px-5 py-3 font-semibold">最佳辩手</th>
              <th className="px-5 py-3 font-semibold">出场阵容</th>
              <th className="px-5 py-3 font-semibold">资料入口</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {records.map((match) => (
              <tr key={match.id} className="align-top hover:bg-slate-50/70">
                <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-600">{match.date}</td>
                <td className="px-5 py-4">
                  <p className="font-medium text-ink">{match.tournament}</p>
                  <p className="mt-1 text-xs text-slate-500">ID: {match.id}</p>
                </td>
                <td className="max-w-[320px] px-5 py-4 text-sm leading-6 text-ink">{match.motion}</td>
                <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-700">{match.side}</td>
                <td className="px-5 py-4">
                  <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${resultStyles[match.result]}`}>
                    {match.result}
                  </span>
                </td>
                <td className="whitespace-nowrap px-5 py-4 text-sm font-medium text-ink">{match.bestDebater}</td>
                <td className="px-5 py-4">
                  <div className="grid gap-1 text-sm text-slate-700">
                    {match.lineup.map((name, index) => (
                      <span key={`${match.id}-${name}`}>{index + 1}. {name}</span>
                    ))}
                  </div>
                </td>
                <td className="px-5 py-4">
                  <div className="flex gap-2">
                    <LinkButton href={match.videoUrl} icon={Video}>录像</LinkButton>
                    <LinkButton href={match.docUrl} icon={FileText}>资料</LinkButton>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function App() {
  return (
    <main className="min-h-screen bg-[#eef3f6] text-ink">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-500">Debate Team Match Repository</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-normal text-ink">奔奔水吧起飞记录</h1>
          </div>
          <p className="max-w-2xl text-sm leading-6 text-slate-600">
            录像与资料通过外部链接表达（飞书/腾讯文档链接），相关问题请找wxjxscftwiv@gmail.com。
          </p>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-5 px-5 py-6">
        <StatsBoard records={matches} />
        <FilterBar />
        <MatchTable records={matches} />
      </div>
    </main>
  )
}

createRoot(document.getElementById('root')).render(<App />)
