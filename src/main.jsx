import React, { useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import {
  BarChart3,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  Database,
  ExternalLink,
  FileText,
  GraduationCap,
  Pencil,
  Search,
  SlidersHorizontal,
  Trophy,
  Users,
  Video,
  Vote,
  X as XIcon,
} from 'lucide-react'
import matches from './matches.json'
import trainings from './trainings.json'
import './styles.css'
import './submission-widget.js'

const EMPTY_MATCH_FILTERS = {
  year: 'all',
  tournament: 'all',
  debater: 'all',
  result: 'all',
  side: 'all',
}

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

function compareByDateAsc(a, b) {
  const dateOrder = String(a.date ?? '').localeCompare(String(b.date ?? ''))

  if (dateOrder !== 0) {
    return dateOrder
  }

  return String(a.id ?? '').localeCompare(String(b.id ?? ''))
}

function compareByDateDesc(a, b) {
  return compareByDateAsc(b, a)
}

function getYear(record) {
  return String(record.date ?? '').slice(0, 4)
}

function getLineup(match) {
  return Array.isArray(match.lineup) ? match.lineup.filter(Boolean) : []
}

function splitNames(value) {
  return String(value ?? '')
    .split(/\s*[、,，/／]\s*/)
    .map((name) => name.trim())
    .filter((name) => name && name !== '无')
}

function uniqueSorted(values, descending = false) {
  const sorted = [...new Set(values.filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b), 'zh-Hans-CN'))
  return descending ? sorted.reverse() : sorted
}

function formatWinRate(wins, total) {
  return total ? `${Math.round((wins / total) * 100)}%` : '0%'
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

function filterMatches(records, query, filters) {
  const keywords = String(query ?? '').trim().toLowerCase().split(/\s+/).filter(Boolean)

  return records.filter((match) => {
    const searchText = getMatchSearchText(match)
    const debaters = new Set([...getLineup(match), ...splitNames(match.bestDebater)])

    return (
      keywords.every((keyword) => searchText.includes(keyword)) &&
      (filters.year === 'all' || getYear(match) === filters.year) &&
      (filters.tournament === 'all' || match.tournament === filters.tournament) &&
      (filters.debater === 'all' || debaters.has(filters.debater)) &&
      (filters.result === 'all' || match.result === filters.result) &&
      (filters.side === 'all' || match.side === filters.side)
    )
  })
}

function getTrainingSearchText(training) {
  return [training.date, training.instructor]
    .map((value) => String(value ?? '').toLowerCase())
    .join(' ')
}

function filterTrainings(records, query) {
  const keywords = String(query ?? '').trim().toLowerCase().split(/\s+/).filter(Boolean)

  if (!keywords.length) {
    return records
  }

  return records.filter((training) => {
    const searchText = getTrainingSearchText(training)
    return keywords.every((keyword) => searchText.includes(keyword))
  })
}

function calculateStats(records) {
  const total = records.length
  const wins = records.filter((match) => match.result === '胜').length
  const losses = records.filter((match) => match.result === '负').length
  const winRate = total ? Math.round((wins / total) * 100) : 0
  const tournaments = new Set(records.map((match) => match.tournament).filter(Boolean)).size

  return { total, wins, losses, winRate, tournaments }
}

function calculateTrainingStats(records) {
  const total = records.length
  const instructors = new Set(records.map((training) => training.instructor).filter(Boolean)).size
  const latestDate = records[0]?.date ?? '暂无'
  const linked = records.filter((training) => isValidExternalUrl(training.linkUrl)).length

  return { total, instructors, latestDate, linked }
}

function groupRecordStats(records, keyGetter) {
  const groups = new Map()

  records.forEach((match) => {
    const key = keyGetter(match)
    if (!key) return

    const current = groups.get(key) ?? { label: key, total: 0, wins: 0 }
    current.total += 1
    if (match.result === '胜') current.wins += 1
    groups.set(key, current)
  })

  return [...groups.values()].sort((a, b) => b.total - a.total || b.wins - a.wins || a.label.localeCompare(b.label, 'zh-Hans-CN'))
}

function calculateMatchInsights(records) {
  const debaters = new Map()

  records.forEach((match) => {
    getLineup(match).forEach((name) => {
      const current = debaters.get(name) ?? { label: name, total: 0, wins: 0, best: 0 }
      current.total += 1
      if (match.result === '胜') current.wins += 1
      debaters.set(name, current)
    })

    splitNames(match.bestDebater).forEach((name) => {
      const current = debaters.get(name) ?? { label: name, total: 0, wins: 0, best: 0 }
      current.best += 1
      debaters.set(name, current)
    })
  })

  return {
    years: groupRecordStats(records, getYear),
    tournaments: groupRecordStats(records, (match) => match.tournament),
    sides: groupRecordStats(records, (match) => match.side),
    voteSplits: groupRecordStats(records, (match) => match.voteSplit || 'X：X'),
    debaters: [...debaters.values()].sort((a, b) => b.total - a.total || b.best - a.best || a.label.localeCompare(b.label, 'zh-Hans-CN')),
  }
}

function getMatchFilterOptions(records) {
  return {
    years: uniqueSorted(records.map(getYear), true),
    tournaments: uniqueSorted(records.map((match) => match.tournament)),
    debaters: uniqueSorted(records.flatMap((match) => [...getLineup(match), ...splitNames(match.bestDebater)])),
    results: ['胜', '负', '平'],
    sides: ['正方', '反方'],
  }
}

function hasActiveMatchFilters(filters) {
  return Object.values(filters).some((value) => value !== 'all')
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
      <StatCard label="胜场数" value={stats.wins} subLabel={`负场 ${stats.losses} 场`} icon={Trophy} />
      <StatCard label="赛季总胜率" value={`${stats.winRate}%`} subLabel="胜场数 / 总场数" icon={CalendarDays} />
      <StatCard label="覆盖赛事" value={stats.tournaments} subLabel="当前列表覆盖赛事" icon={FileText} />
    </section>
  )
}

function TrainingStatsBoard({ records, isFiltered }) {
  const stats = calculateTrainingStats(records)
  const scopeLabel = isFiltered ? '当前检索结果' : '全部队训记录'

  return (
    <section className="grid gap-4 md:grid-cols-4">
      <StatCard label="队训次数" value={stats.total} subLabel={scopeLabel} icon={GraduationCap} />
      <StatCard label="授课人数" value={stats.instructors} subLabel="已录入授课人数量" icon={Database} />
      <StatCard label="最新队训" value={stats.latestDate} subLabel="按日期自动排序" icon={CalendarDays} />
      <StatCard label="链接数量" value={stats.linked} subLabel="可跳转的队训资料" icon={FileText} />
    </section>
  )
}

function InsightPanel({ title, icon: Icon, children }) {
  return (
    <section className="rounded-lg border border-line bg-white p-5 shadow-panel">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-ink">{title}</h2>
        <span className="grid h-8 w-8 place-items-center rounded-md bg-field text-slate-600">
          <Icon size={17} strokeWidth={1.8} />
        </span>
      </div>
      {children}
    </section>
  )
}

function EmptyInsight() {
  return <p className="text-sm text-slate-500">暂无匹配数据</p>
}

function StatLine({ item, detail }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-line py-2 last:border-0">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-ink">{item.label}</p>
        <p className="text-xs text-slate-500">{detail ?? `${item.wins}/${item.total} 胜 · ${formatWinRate(item.wins, item.total)}`}</p>
      </div>
      <span className="shrink-0 rounded-md bg-field px-2 py-1 text-xs font-semibold text-slate-600">{item.total}</span>
    </div>
  )
}

function MatchInsights({ records }) {
  const insights = useMemo(() => calculateMatchInsights(records), [records])

  return (
    <section className="grid gap-4 lg:grid-cols-5">
      <InsightPanel title="按年份" icon={CalendarDays}>
        {insights.years.length ? insights.years.slice(0, 5).map((item) => <StatLine key={item.label} item={item} />) : <EmptyInsight />}
      </InsightPanel>
      <InsightPanel title="按赛事" icon={BarChart3}>
        {insights.tournaments.length ? insights.tournaments.slice(0, 5).map((item) => <StatLine key={item.label} item={item} />) : <EmptyInsight />}
      </InsightPanel>
      <InsightPanel title="按持方" icon={Vote}>
        {insights.sides.length ? insights.sides.map((item) => <StatLine key={item.label} item={item} />) : <EmptyInsight />}
      </InsightPanel>
      <InsightPanel title="辩手统计" icon={Users}>
        {insights.debaters.length ? insights.debaters.slice(0, 6).map((item) => (
          <StatLine key={item.label} item={item} detail={`${item.wins}/${item.total} 胜 · 佳辩 ${item.best} 次`} />
        )) : <EmptyInsight />}
      </InsightPanel>
      <InsightPanel title="票型分布" icon={SlidersHorizontal}>
        {insights.voteSplits.length ? insights.voteSplits.map((item) => (
          <StatLine key={item.label} item={item} detail={`${item.total} 场出现`} />
        )) : <EmptyInsight />}
      </InsightPanel>
    </section>
  )
}

function FilterSelect({ label, value, options, onChange }) {
  return (
    <label className="grid gap-1 text-xs font-medium text-slate-500">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 rounded-md border border-line bg-field px-3 text-sm font-medium text-ink outline-none transition focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-200"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </label>
  )
}

function FilterBar({
  activeView,
  onViewChange,
  query,
  onQueryChange,
  visibleCount,
  totalCount,
  matchFilters,
  filterOptions,
  onMatchFilterChange,
  onResetMatchFilters,
  hasActiveFilters,
}) {
  const hasQuery = query.trim().length > 0
  const isTrainingView = activeView === 'trainings'
  const searchConfig = isTrainingView
    ? {
        label: '搜索队训信息',
        placeholder: '搜索日期或授课人',
        description: '输入日期或授课人关键词，队训列表会即时更新。',
        chips: ['日期', '授课人'],
        unit: '条',
      }
    : {
        label: '搜索比赛信息',
        placeholder: '搜索姓名、日期或赛事',
        description: '输入关键词，也可以按年份、队员、胜负、持方、赛事组合筛选。',
        chips: ['姓名', '日期', '赛事', '年份', '队员', '胜负', '持方'],
        unit: '场',
      }

  function switchView(nextView) {
    onViewChange(nextView)
    onQueryChange('')
  }

  const yearOptions = [{ value: 'all', label: '全部年份' }, ...filterOptions.years.map((year) => ({ value: year, label: year }))]
  const tournamentOptions = [{ value: 'all', label: '全部赛事' }, ...filterOptions.tournaments.map((tournament) => ({ value: tournament, label: tournament }))]
  const debaterOptions = [{ value: 'all', label: '全部队员' }, ...filterOptions.debaters.map((debater) => ({ value: debater, label: debater }))]
  const resultOptions = [{ value: 'all', label: '全部赛果' }, ...filterOptions.results.map((result) => ({ value: result, label: result }))]
  const sideOptions = [{ value: 'all', label: '全部持方' }, ...filterOptions.sides.map((side) => ({ value: side, label: side }))]

  return (
    <section className="grid gap-4 rounded-lg border border-dashed border-slate-300 bg-white p-4 lg:grid-cols-[minmax(240px,320px)_1fr]">
      <div className="flex min-w-0 items-start gap-3 text-slate-600">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-field">
          <Search size={18} strokeWidth={1.8} />
        </span>
        <div>
          <h2 className="text-sm font-semibold text-ink">数据检索</h2>
          <p className="text-sm leading-6 text-slate-500">{searchConfig.description}</p>
          <div className="mt-3 inline-flex rounded-md border border-line bg-field p-1">
            <button
              type="button"
              onClick={() => switchView('matches')}
              className={`h-8 rounded px-3 text-sm font-medium transition ${activeView === 'matches' ? 'bg-white text-ink shadow-sm' : 'text-slate-500 hover:text-ink'}`}
            >
              比赛
            </button>
            <button
              type="button"
              onClick={() => switchView('trainings')}
              className={`h-8 rounded px-3 text-sm font-medium transition ${isTrainingView ? 'bg-white text-ink shadow-sm' : 'text-slate-500 hover:text-ink'}`}
            >
              队训
            </button>
          </div>
        </div>
      </div>

      <div className="flex w-full flex-col gap-3">
        <label className="sr-only" htmlFor="repository-search">{searchConfig.label}</label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} strokeWidth={1.8} />
          <input
            id="repository-search"
            type="search"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder={searchConfig.placeholder}
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

        {!isTrainingView ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <FilterSelect label="年份" value={matchFilters.year} options={yearOptions} onChange={(value) => onMatchFilterChange('year', value)} />
            <FilterSelect label="队员" value={matchFilters.debater} options={debaterOptions} onChange={(value) => onMatchFilterChange('debater', value)} />
            <FilterSelect label="胜负" value={matchFilters.result} options={resultOptions} onChange={(value) => onMatchFilterChange('result', value)} />
            <FilterSelect label="持方" value={matchFilters.side} options={sideOptions} onChange={(value) => onMatchFilterChange('side', value)} />
            <FilterSelect label="赛事" value={matchFilters.tournament} options={tournamentOptions} onChange={(value) => onMatchFilterChange('tournament', value)} />
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          {searchConfig.chips.map((chip) => (
            <span key={chip} className="rounded-md border border-line px-3 py-2 text-sm text-slate-500">{chip}</span>
          ))}
          {!isTrainingView && hasActiveFilters ? (
            <button
              type="button"
              onClick={onResetMatchFilters}
              className="inline-flex h-9 items-center rounded-md border border-line bg-white px-3 text-sm font-medium text-slate-600 transition hover:border-slate-400 hover:bg-field"
            >
              清除筛选
            </button>
          ) : null}
          <span className="text-sm text-slate-500 sm:ml-auto">显示 {visibleCount} / {totalCount} {searchConfig.unit}</span>
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

function ResultBadge({ result }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${resultStyles[result] ?? resultStyles.平}`}>
      {result || '待定'}
    </span>
  )
}

function openMatchUpdate(match) {
  window.dispatchEvent(new CustomEvent('open-match-submission', {
    detail: { mode: 'update', match },
  }))
}

function MatchDetailRow({ match }) {
  return (
    <div className="grid gap-4 rounded-md border border-line bg-field p-4 lg:grid-cols-[1.4fr_1fr_1fr]">
      <div>
        <p className="text-xs font-semibold text-slate-500">辩题</p>
        <p className="mt-2 text-sm leading-6 text-ink">{match.motion}</p>
      </div>
      <div className="grid gap-3 text-sm text-slate-700">
        <div>
          <p className="text-xs font-semibold text-slate-500">持方 / 票型</p>
          <p className="mt-2 text-ink">{match.side || '待补充'} · {match.voteSplit || 'X：X'}</p>
        </div>
        <div>
          <p className="text-xs font-semibold text-slate-500">记录 ID</p>
          <p className="mt-2 break-all text-ink">{match.id}</p>
        </div>
      </div>
      <div>
        <p className="text-xs font-semibold text-slate-500">资料入口</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <LinkButton href={match.videoUrl} icon={Video}>录像</LinkButton>
          <LinkButton href={match.docUrl} icon={FileText}>资料</LinkButton>
          <LinkButton href={match.reviewUrl} icon={FileText}>复盘</LinkButton>
          <button
            type="button"
            onClick={() => openMatchUpdate(match)}
            className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-line bg-white px-3 text-sm font-medium text-ink transition hover:border-slate-400 hover:bg-white focus:outline-none focus:ring-2 focus:ring-slate-300"
          >
            <Pencil size={16} strokeWidth={1.9} />
            修改赛果
          </button>
        </div>
      </div>
    </div>
  )
}

function MatchTable({ records, showAll, onToggleShowAll }) {
  const [expandedIds, setExpandedIds] = useState(() => new Set())
  const displayedRecords = showAll ? records : records.slice(0, 5)
  const canToggle = records.length > 5

  function toggleExpanded(id) {
    setExpandedIds((current) => {
      const next = new Set(current)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  return (
    <section className="overflow-hidden rounded-lg border border-line bg-white shadow-panel">
      <div className="flex flex-col gap-3 border-b border-line px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-ink">赛事列表区</h2>
          <p className="mt-1 text-sm text-slate-500">按日期倒序排列，默认优先显示最近五场。</p>
        </div>
        {canToggle ? (
          <button
            type="button"
            onClick={onToggleShowAll}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-line bg-white px-4 text-sm font-medium text-ink transition hover:border-slate-400 hover:bg-field"
          >
            {showAll ? <ChevronUp size={16} strokeWidth={1.9} /> : <ChevronDown size={16} strokeWidth={1.9} />}
            {showAll ? '收起到最近五场' : `展开全部 ${records.length} 场`}
          </button>
        ) : null}
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-[920px] w-full border-collapse text-left">
          <thead className="bg-field text-sm text-slate-600">
            <tr>
              <th className="w-16 px-5 py-3 font-semibold">详情</th>
              <th className="px-5 py-3 font-semibold">日期</th>
              <th className="px-5 py-3 font-semibold">赛事</th>
              <th className="px-5 py-3 font-semibold">赛果</th>
              <th className="px-5 py-3 font-semibold">最佳辩手</th>
              <th className="min-w-[380px] px-5 py-3 font-semibold">出场阵容</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {displayedRecords.length ? displayedRecords.map((match) => {
              const isExpanded = expandedIds.has(match.id)
              const lineup = getLineup(match)

              return (
                <React.Fragment key={match.id}>
                  <tr className="align-top hover:bg-slate-50/70">
                    <td className="px-5 py-4">
                      <button
                        type="button"
                        aria-expanded={isExpanded}
                        aria-label={isExpanded ? '收起比赛详情' : '展开比赛详情'}
                        title={isExpanded ? '收起比赛详情' : '展开比赛详情'}
                        onClick={() => toggleExpanded(match.id)}
                        className="grid h-9 w-9 place-items-center rounded-md border border-line bg-white text-slate-600 transition hover:border-slate-400 hover:bg-field focus:outline-none focus:ring-2 focus:ring-slate-300"
                      >
                        {isExpanded ? <ChevronUp size={17} strokeWidth={1.9} /> : <ChevronDown size={17} strokeWidth={1.9} />}
                      </button>
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-600">{match.date}</td>
                    <td className="px-5 py-4">
                      <p className="font-medium text-ink">{match.tournament}</p>
                    </td>
                    <td className="px-5 py-4">
                      <ResultBadge result={match.result} />
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-sm font-medium text-ink">{match.bestDebater || '无'}</td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-700 md:flex-nowrap md:whitespace-nowrap">
                        {lineup.map((name, index) => (
                          <span key={`${match.id}-${name}-${index}`}>{index + 1}. {name}</span>
                        ))}
                      </div>
                    </td>
                  </tr>
                  {isExpanded ? (
                    <tr className="bg-white">
                      <td colSpan={6} className="px-5 pb-5 pt-0">
                        <MatchDetailRow match={match} />
                      </td>
                    </tr>
                  ) : null}
                </React.Fragment>
              )
            }) : (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-sm text-slate-500">没有匹配的比赛记录</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function TrainingTable({ records }) {
  return (
    <section className="overflow-hidden rounded-lg border border-line bg-white shadow-panel">
      <div className="border-b border-line px-5 py-4">
        <h2 className="text-lg font-semibold text-ink">队训列表区</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-[720px] w-full border-collapse text-left">
          <thead className="bg-field text-sm text-slate-600">
            <tr>
              <th className="px-5 py-3 font-semibold">日期</th>
              <th className="px-5 py-3 font-semibold">授课人</th>
              <th className="px-5 py-3 font-semibold">链接跳转</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {records.length ? records.map((training) => (
              <tr key={training.id} className="align-top hover:bg-slate-50/70">
                <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-600">{training.date}</td>
                <td className="px-5 py-4 text-sm font-medium text-ink">{training.instructor}</td>
                <td className="px-5 py-4">
                  <LinkButton href={training.linkUrl} icon={FileText}>队训链接</LinkButton>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={3} className="px-5 py-10 text-center text-sm text-slate-500">没有匹配的队训记录</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function App() {
  const [activeView, setActiveView] = useState('matches')
  const [query, setQuery] = useState('')
  const [matchFilters, setMatchFilters] = useState(EMPTY_MATCH_FILTERS)
  const [showAllMatches, setShowAllMatches] = useState(false)
  const isTrainingView = activeView === 'trainings'
  const sortedMatches = useMemo(() => [...matches].sort(compareByDateDesc), [])
  const sortedTrainings = useMemo(() => [...trainings].sort(compareByDateDesc), [])
  const matchFilterOptions = useMemo(() => getMatchFilterOptions(sortedMatches), [sortedMatches])
  const activeMatchFilters = hasActiveMatchFilters(matchFilters)
  const isFiltered = isTrainingView ? query.trim().length > 0 : query.trim().length > 0 || activeMatchFilters
  const visibleMatches = useMemo(() => filterMatches(sortedMatches, query, matchFilters), [query, sortedMatches, matchFilters])
  const visibleTrainings = useMemo(() => filterTrainings(sortedTrainings, query), [query, sortedTrainings])
  const visibleRecords = isTrainingView ? visibleTrainings : visibleMatches
  const totalRecords = isTrainingView ? sortedTrainings.length : sortedMatches.length

  function updateMatchFilter(key, value) {
    setMatchFilters((current) => ({ ...current, [key]: value }))
    setShowAllMatches(false)
  }

  function switchView(nextView) {
    setActiveView(nextView)
    setQuery('')
  }

  return (
    <main className="min-h-screen bg-[#eef3f6] text-ink">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-500">Debate Team Match Repository</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-normal text-ink">奔奔水吧起飞记录</h1>
          </div>
          <p className="max-w-2xl text-sm leading-6 text-slate-600">
            录像、资料与复盘笔记通过外部链接表达（飞书/腾讯文档链接），相关问题请找wxjxscftwiv@gmail.com。
          </p>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-5 px-5 py-6">
        {isTrainingView ? (
          <TrainingStatsBoard records={visibleTrainings} isFiltered={isFiltered} />
        ) : (
          <>
            <StatsBoard records={visibleMatches} isFiltered={isFiltered} />
            <MatchInsights records={visibleMatches} />
          </>
        )}
        <FilterBar
          activeView={activeView}
          onViewChange={switchView}
          query={query}
          onQueryChange={(value) => {
            setQuery(value)
            setShowAllMatches(false)
          }}
          visibleCount={visibleRecords.length}
          totalCount={totalRecords}
          matchFilters={matchFilters}
          filterOptions={matchFilterOptions}
          onMatchFilterChange={updateMatchFilter}
          onResetMatchFilters={() => {
            setMatchFilters(EMPTY_MATCH_FILTERS)
            setShowAllMatches(false)
          }}
          hasActiveFilters={activeMatchFilters}
        />
        {isTrainingView ? (
          <TrainingTable records={visibleTrainings} />
        ) : (
          <MatchTable
            records={visibleMatches}
            showAll={showAllMatches}
            onToggleShowAll={() => setShowAllMatches((current) => !current)}
          />
        )}
      </div>
    </main>
  )
}

createRoot(document.getElementById('root')).render(<App />)
