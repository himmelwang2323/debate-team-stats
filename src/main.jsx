import React, { useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { CalendarDays, Database, ExternalLink, FileText, Search, Trophy, Video, X as XIcon } from 'lucide-react'
import matches from './matches.json'
import './styles.css'

const resultStyles = {
  胜: 'bg-emerald-50 text-win ring-emerald-200',
  负: 'bg-rose-50 text-loss ring-rose-200',
  平: 'bg-slate-50 text-slate-600 ring-slate-200',
}

function normalizeExternalUrl(href) {
  const value = String(href ?? '').trim()

  if (!value) {
    return ''
  }

  if (value.startsWith('//')) {
    return `https:${value}`
  }

  if (/^https?:\/\//i.test(value)) {
    return value
  }

  return `https://${value}`
}

function isValidExternalUrl(href) {
  try {
    const url = new URL(normalizeExternalUrl(href))
    return url.protocol === 'https:' || url.protocol === 'http:'
  } catch {
    return false
  }
}

function compareMatchDate(a, b) {
  const dateOrder = String(a.date ?? '').localeCompare(String(b.date ?? ''))

  if (dateOrder !== 0) {
    return dateOrder
  }

  return String(a.id ?? '').localeCompare(String(b.id ?? ''))
}

function getMatchSearchText(match) {
  return [
    match.date,
    match.tournament,
    match.bestDebater,
    ...(Array.isArray(match.lineup) ? match.lineup : []),
  ]
    .map((value) => String(value ?? '').toLowerCase())
    .join(' ')
}

function filterMatches(records, query) {
  const keywords = String(query ?? '').trim().toLowerCase().split(/\s+/).filter(Boolean)

  if (!keywords.length) {
    return records
  }

  return records.filter((match) => {
    const searchText = getMatchSearchText(match)
    return keywords.every((keyword) => searchText.includes(keyword))
  })
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

function StatsBoard({ records, isFiltered }) {
  const stats = calculateStats(records)
  const scopeLabel = isFiltered ? '当前检索结果' : '全部比赛记录'

  return (
    <section className="grid gap-4 md:grid-cols-4">
      <StatCard label="总场次数" value={stats.total} subLabel={scopeLabel} icon={Database} />
      <StatCard label="胜场数" value={stats.wins} subLabel="赛果为胜的比赛" icon={Trophy} />
      <StatCard label="赛季总胜率" value={`${stats.winRate}%`} subLabel="胜场数 / 总场数" icon={CalendarDays} />
      <StatCard label="覆盖赛事" value={stats.tournaments} subLabel="当前列表覆盖赛事" icon={FileText} />
    </section>
  )
}

function FilterBar({ query, onQueryChange, visibleCount, totalCount }) {
  const hasQuery = query.trim().length > 0

  return (
    <section className="flex flex-col gap-4 rounded-lg border border-dashed border-slate-300 bg-white p-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex min-w-0 items-center gap-3 text-slate-600">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-field">
          <Search size={18} strokeWidth={1.8} />
        </span>
        <div>
          <h2 className="text-sm font-semibold text-ink">数据检索</h2>
          <p className="text-sm text-slate-500">输入姓名、日期或赛事关键词，列表会即时更新。</p>
        </div>
      </div>

      <div className="flex w-full flex-col gap-3 lg:max-w-xl">
        <label className="sr-only" htmlFor="match-search">搜索比赛信息</label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} strokeWidth={1.8} />
          <input
            id="match-search"
            type="search"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="搜索姓名、日期或赛事"
            className="h-10 w-full rounded-md border border-line bg-field pl-9 pr-10 text-sm text-ink outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-200"
          />
          {hasQuery ? (
            <button
              type="button"
              onClick={() => onQueryChange('')}
              aria-label="清除搜索"
              className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-md text-slate-500 transition hover:bg-slate-200 hover:text-ink focus:outline-none focus:ring-2 focus:ring-slate-300"
            >
              <XIcon size={16} strokeWidth={1.9} />
            </button>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-md border border-line px-3 py-2 text-sm text-slate-500">姓名</span>
          <span className="rounded-md border border-line px-3 py-2 text-sm text-slate-500">日期</span>
          <span className="rounded-md border border-line px-3 py-2 text-sm text-slate-500">赛事</span>
          <span className="text-sm text-slate-500 sm:ml-auto">显示 {visibleCount} / {totalCount} 场</span>
        </div>
      </div>
    </section>
  )
}

function LinkButton({ href, children, icon: Icon }) {
  const resolvedHref = normalizeExternalUrl(href)
  const isValidHref = isValidExternalUrl(href)

  if (!isValidHref) {
    return (
      <button
        type="button"
        disabled
        title="链接未填写或格式不正确"
        className="inline-flex h-9 cursor-not-allowed items-center justify-center gap-2 rounded-md border border-line bg-slate-100 px-3 text-sm font-medium text-slate-400"
      >
        <Icon size={16} strokeWidth={1.9} />
        {children}
      </button>
    )
  }

  function openExternalLink(event) {
    event.preventDefault()
    window.open(resolvedHref, '_blank', 'noopener,noreferrer')
  }

  return (
    <a
      href={resolvedHref}
      target="_blank"
      rel="noreferrer"
      title={resolvedHref}
      aria-label={`${children}: ${resolvedHref}`}
      onClick={openExternalLink}
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
        <table className="min-w-[1160px] w-full border-collapse text-left">
          <thead className="bg-field text-sm text-slate-600">
            <tr>
              <th className="px-5 py-3 font-semibold">日期</th>
              <th className="px-5 py-3 font-semibold">赛事信息</th>
              <th className="px-5 py-3 font-semibold">辩题</th>
              <th className="px-5 py-3 font-semibold">持方</th>
              <th className="px-5 py-3 font-semibold">赛果</th>
              <th className="px-5 py-3 font-semibold">票型</th>
              <th className="px-5 py-3 font-semibold">最佳辩手</th>
              <th className="px-5 py-3 font-semibold">出场阵容</th>
              <th className="px-5 py-3 font-semibold">资料入口</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {records.length ? records.map((match) => (
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
                <td className="whitespace-nowrap px-5 py-4">
                  <span className="inline-flex rounded-md bg-field px-2.5 py-1 text-xs font-semibold text-slate-700 ring-1 ring-line">
                    {match.voteSplit || 'X：X'}
                  </span>
                </td>
                <td className="whitespace-nowrap px-5 py-4 text-sm font-medium text-ink">{match.bestDebater}</td>
                <td className="px-5 py-4">
                  <div className="grid gap-1 text-sm text-slate-700">
                    {match.lineup.map((name, index) => (
                      <span key={`${match.id}-${name}-${index}`}>{index + 1}. {name}</span>
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
            )) : (
              <tr>
                <td colSpan={9} className="px-5 py-10 text-center text-sm text-slate-500">没有匹配的比赛记录</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function App() {
  const [query, setQuery] = useState('')
  const isFiltered = query.trim().length > 0
  const sortedMatches = useMemo(() => [...matches].sort(compareMatchDate), [])
  const visibleMatches = useMemo(() => filterMatches(sortedMatches, query), [query, sortedMatches])

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
        <StatsBoard records={visibleMatches} isFiltered={isFiltered} />
        <FilterBar query={query} onQueryChange={setQuery} visibleCount={visibleMatches.length} totalCount={sortedMatches.length} />
        <MatchTable records={visibleMatches} />
      </div>
    </main>
  )
}

createRoot(document.getElementById('root')).render(<App />)
