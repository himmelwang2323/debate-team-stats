const REPOSITORY_URL = 'https://github.com/himmelwang2323/debate-team-stats'
const SUBMISSION_MARKER = 'AUTO_MATCH_SUBMISSION'
const UPDATE_MARKER = 'AUTO_MATCH_UPDATE'

let currentMode = 'create'

function todayValue() {
  const now = new Date()
  const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
  return localDate.toISOString().slice(0, 10)
}

function field(id) {
  return document.getElementById(id)
}

function value(id) {
  return field(id)?.value.trim() ?? ''
}

function normalizeExternalUrl(href) {
  const text = String(href ?? '').trim()

  if (!text) return ''
  if (text.startsWith('//')) return `https:${text}`
  if (/^https?:\/\//i.test(text)) return text

  return `https://${text}`
}

function isValidExternalUrl(href) {
  if (!String(href ?? '').trim()) return true

  try {
    const url = new URL(normalizeExternalUrl(href))
    return url.protocol === 'https:' || url.protocol === 'http:'
  } catch {
    return false
  }
}

function normalizeVoteSplit(rawValue) {
  const text = String(rawValue || 'X：X').trim().replace(/\s+/g, '').replace(/:/g, '：')
  return text || 'X：X'
}

function isValidVoteSplit(rawValue) {
  return /^(?:\d+|X|x)：(?:\d+|X|x)$/.test(normalizeVoteSplit(rawValue))
}

function lineupValues() {
  return [1, 2, 3, 4].map((index) => value(`submit-lineup-${index}`))
}

function formData() {
  const lineup = lineupValues()

  return {
    id: value('submit-id'),
    date: value('submit-date'),
    tournament: value('submit-tournament'),
    motion: value('submit-motion'),
    side: value('submit-side') || '正方',
    result: value('submit-result') || '胜',
    voteSplit: normalizeVoteSplit(value('submit-vote')),
    bestDebater: value('submit-best') || '无',
    lineup: lineup.map((name) => name || '待补充'),
    submitter: value('submit-submitter'),
    videoUrl: value('submit-video'),
    docUrl: value('submit-doc'),
    reviewUrl: value('submit-review'),
  }
}

function submissionError(data, mode) {
  if (mode === 'update' && !data.id) return '修改赛果需要原记录 ID'
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data.date)) return '请填写 YYYY-MM-DD 格式的日期'
  if (!data.tournament) return '请填写赛事名称'
  if (!data.motion) return '请填写辩题'
  if (!isValidVoteSplit(data.voteSplit)) return '票型请使用 X：X 或 5：4 这样的格式'
  if (!lineupValues().some(Boolean)) return '请至少填写一位上赛人员'
  if (!isValidExternalUrl(data.videoUrl)) return '录像链接格式不正确'
  if (!isValidExternalUrl(data.docUrl)) return '资料链接格式不正确'
  if (!isValidExternalUrl(data.reviewUrl)) return '复盘链接格式不正确'
  return ''
}

function issueUrl(data, mode) {
  const marker = mode === 'update' ? UPDATE_MARKER : SUBMISSION_MARKER
  const title = mode === 'update'
    ? `赛果修改：${data.id} ${data.date} ${data.tournament}`
    : `赛果提交：${data.date} ${data.tournament}`
  const body = [
    mode === 'update' ? '### 赛果修改' : '### 赛果提交',
    '',
    `记录 ID：${data.id || '自动生成'}`,
    `日期：${data.date}`,
    `赛事：${data.tournament}`,
    `辩题：${data.motion}`,
    `持方：${data.side}`,
    `赛果：${data.result}`,
    `票型：${data.voteSplit}`,
    `最佳辩手：${data.bestDebater}`,
    `阵容：${data.lineup.join(' / ')}`,
    `录入/修改人：${data.submitter || '未填写'}`,
    `录像链接：${data.videoUrl || '未填写'}`,
    `资料链接：${data.docUrl || '未填写'}`,
    `复盘链接：${data.reviewUrl || '未填写'}`,
    '',
    `<!-- ${marker}`,
    JSON.stringify(data, null, 2),
    '-->',
  ].join('\n')
  const params = new URLSearchParams({ title, body })
  return `${REPOSITORY_URL}/issues/new?${params.toString()}`
}

function wrapText(context, text, x, y, maxWidth, lineHeight) {
  let line = ''
  let currentY = y

  for (const character of String(text || '')) {
    const nextLine = line + character
    if (context.measureText(nextLine).width > maxWidth && line) {
      context.fillText(line, x, currentY)
      line = character
      currentY += lineHeight
    } else {
      line = nextLine
    }
  }

  if (line) context.fillText(line, x, currentY)
  return currentY
}

function downloadPoster(data) {
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')
  canvas.width = 1200
  canvas.height = 1600

  context.fillStyle = '#f8fafc'
  context.fillRect(0, 0, 1200, 1600)
  context.fillStyle = '#7f1d1d'
  context.fillRect(0, 0, 1200, 360)
  context.fillStyle = '#facc15'
  context.fillRect(0, 350, 1200, 12)
  context.fillRect(80, 96, 1040, 2)
  context.fillRect(80, 276, 1040, 2)

  context.textAlign = 'center'
  context.fillStyle = '#fef3c7'
  context.font = '700 128px "PingFang SC", "Microsoft YaHei", sans-serif'
  context.fillText('喜报', 600, 230)
  context.font = '500 34px "PingFang SC", "Microsoft YaHei", sans-serif'
  context.fillText('BENBEN DEBATE TEAM', 600, 312)

  context.textAlign = 'left'
  context.fillStyle = '#0f172a'
  context.font = '700 56px "PingFang SC", "Microsoft YaHei", sans-serif'
  context.fillText(data.tournament || '赛事名称', 110, 470)
  context.font = '500 34px "PingFang SC", "Microsoft YaHei", sans-serif'
  context.fillStyle = '#475569'
  context.fillText(`${data.date || 'YYYY-MM-DD'} · 我方${data.side} · ${data.voteSplit}`, 110, 535)
  context.fillStyle = '#7f1d1d'
  context.font = '700 42px "PingFang SC", "Microsoft YaHei", sans-serif'
  context.fillText(`赛果：${data.result}`, 110, 650)
  context.fillStyle = '#0f172a'
  context.font = '600 42px "PingFang SC", "Microsoft YaHei", sans-serif'
  const motionBottom = wrapText(context, data.motion || '辩题内容', 110, 760, 980, 60)
  context.fillStyle = '#334155'
  context.font = '500 34px "PingFang SC", "Microsoft YaHei", sans-serif'
  context.fillText(`最佳辩手：${data.bestDebater}`, 110, motionBottom + 115)
  context.fillText(`出场阵容：${data.lineup.join(' / ')}`, 110, motionBottom + 175)
  context.fillStyle = '#7f1d1d'
  context.fillRect(110, 1320, 980, 4)
  context.fillStyle = '#475569'
  context.font = '500 32px "PingFang SC", "Microsoft YaHei", sans-serif'
  context.fillText('奔奔水吧起飞记录 · 自动生成', 110, 1405)

  const link = document.createElement('a')
  link.download = `喜报-${data.date || '比赛'}-${data.tournament || '赛果'}.png`
  link.href = canvas.toDataURL('image/png')
  link.click()
}

function renderPreview() {
  const data = formData()
  field('poster-tournament').textContent = data.tournament || '赛事名称'
  field('poster-meta').textContent = `${data.date || 'YYYY-MM-DD'} · 我方${data.side} · ${data.voteSplit}`
  field('poster-result').textContent = `赛果：${data.result}`
  field('poster-motion').textContent = data.motion || '辩题内容'
  field('poster-best').textContent = `最佳辩手：${data.bestDebater}`
  field('poster-lineup').textContent = `阵容：${data.lineup.join(' / ')}`
  field('poster-download').disabled = data.result !== '胜'
}

function modalTemplate() {
  return `
    <div id="submit-modal" class="fixed inset-0 z-50 hidden items-start justify-center overflow-y-auto bg-slate-950/45 px-4 py-8">
      <section class="w-full max-w-5xl rounded-lg border border-line bg-white shadow-2xl">
        <div class="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div>
            <p id="submit-mode-label" class="text-xs font-semibold text-slate-500">新增记录</p>
            <h2 id="submit-title" class="mt-1 text-lg font-semibold text-ink">提交赛果</h2>
            <p id="submit-description" class="mt-1 text-sm text-slate-500">新增比赛记录与胜场喜报</p>
          </div>
          <button id="submit-close" type="button" aria-label="关闭提交窗口" class="grid h-9 w-9 shrink-0 place-items-center rounded-md text-slate-500 transition hover:bg-field hover:text-ink">×</button>
        </div>
        <div class="grid gap-5 p-5 lg:grid-cols-[1fr_320px]">
          <div class="grid gap-4">
            <input id="submit-id" type="hidden" />
            <div class="grid gap-3 md:grid-cols-4">
              <label class="grid gap-1 text-sm font-medium text-slate-600">日期<input id="submit-date" type="date" class="h-10 rounded-md border border-line bg-field px-3 text-sm text-ink outline-none focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-200" /></label>
              <label class="grid gap-1 text-sm font-medium text-slate-600 md:col-span-2">赛事<input id="submit-tournament" class="h-10 rounded-md border border-line bg-field px-3 text-sm text-ink outline-none focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-200" /></label>
              <label class="grid gap-1 text-sm font-medium text-slate-600">录入/修改人<input id="submit-submitter" class="h-10 rounded-md border border-line bg-field px-3 text-sm text-ink outline-none focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-200" /></label>
            </div>
            <label class="grid gap-1 text-sm font-medium text-slate-600">辩题<textarea id="submit-motion" rows="3" class="rounded-md border border-line bg-field px-3 py-2 text-sm leading-6 text-ink outline-none focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-200"></textarea></label>
            <div class="grid gap-3 md:grid-cols-4">
              <label class="grid gap-1 text-sm font-medium text-slate-600">持方<select id="submit-side" class="h-10 rounded-md border border-line bg-field px-3 text-sm text-ink outline-none focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-200"><option>正方</option><option>反方</option></select></label>
              <label class="grid gap-1 text-sm font-medium text-slate-600">赛果<select id="submit-result" class="h-10 rounded-md border border-line bg-field px-3 text-sm text-ink outline-none focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-200"><option>胜</option><option>负</option><option>平</option></select></label>
              <label class="grid gap-1 text-sm font-medium text-slate-600">票型<input id="submit-vote" value="X：X" placeholder="5：4" class="h-10 rounded-md border border-line bg-field px-3 text-sm text-ink outline-none focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-200" /></label>
              <label class="grid gap-1 text-sm font-medium text-slate-600">最佳辩手<input id="submit-best" class="h-10 rounded-md border border-line bg-field px-3 text-sm text-ink outline-none focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-200" /></label>
            </div>
            <div class="grid gap-3 md:grid-cols-4">
              <label class="grid gap-1 text-sm font-medium text-slate-600">一辩<input id="submit-lineup-1" class="h-10 rounded-md border border-line bg-field px-3 text-sm text-ink outline-none focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-200" /></label>
              <label class="grid gap-1 text-sm font-medium text-slate-600">二辩<input id="submit-lineup-2" class="h-10 rounded-md border border-line bg-field px-3 text-sm text-ink outline-none focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-200" /></label>
              <label class="grid gap-1 text-sm font-medium text-slate-600">三辩<input id="submit-lineup-3" class="h-10 rounded-md border border-line bg-field px-3 text-sm text-ink outline-none focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-200" /></label>
              <label class="grid gap-1 text-sm font-medium text-slate-600">四辩/结辩<input id="submit-lineup-4" class="h-10 rounded-md border border-line bg-field px-3 text-sm text-ink outline-none focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-200" /></label>
            </div>
            <div class="grid gap-3 md:grid-cols-3">
              <label class="grid gap-1 text-sm font-medium text-slate-600">录像链接<input id="submit-video" class="h-10 rounded-md border border-line bg-field px-3 text-sm text-ink outline-none focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-200" /></label>
              <label class="grid gap-1 text-sm font-medium text-slate-600">资料链接<input id="submit-doc" class="h-10 rounded-md border border-line bg-field px-3 text-sm text-ink outline-none focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-200" /></label>
              <label class="grid gap-1 text-sm font-medium text-slate-600">复盘链接<input id="submit-review" class="h-10 rounded-md border border-line bg-field px-3 text-sm text-ink outline-none focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-200" /></label>
            </div>
          </div>
          <aside class="grid content-start gap-3">
            <div class="overflow-hidden rounded-lg border border-rose-200 bg-white">
              <div class="bg-[#7f1d1d] px-5 py-7 text-center text-amber-100">
                <p class="text-5xl font-semibold tracking-normal">喜报</p>
                <p class="mt-2 text-xs font-semibold text-amber-200">BENBEN DEBATE TEAM</p>
              </div>
              <div class="grid gap-3 px-5 py-5 text-sm text-slate-700">
                <p id="poster-tournament" class="text-lg font-semibold text-ink">赛事名称</p>
                <p id="poster-meta">YYYY-MM-DD · 我方正方 · X：X</p>
                <p id="poster-result" class="font-semibold text-rose-900">赛果：胜</p>
                <p id="poster-motion" class="leading-6 text-ink">辩题内容</p>
                <p id="poster-best">最佳辩手：无</p>
                <p id="poster-lineup">阵容：待补充 / 待补充 / 待补充 / 待补充</p>
              </div>
            </div>
            <button id="poster-download" type="button" class="inline-flex h-10 items-center justify-center rounded-md border border-line bg-white px-4 text-sm font-medium text-ink transition hover:border-slate-400 hover:bg-field disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400">下载喜报</button>
          </aside>
        </div>
        <div class="flex flex-col gap-3 border-t border-line px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p id="submit-error" class="min-h-5 text-sm text-rose-700"></p>
            <p id="submit-status" class="text-sm text-slate-500">校验通过后会打开 GitHub Issue 页面，确认提交后仓库会自动同步。</p>
          </div>
          <div class="flex flex-wrap gap-2 sm:justify-end">
            <button id="submit-reset" type="button" class="inline-flex h-10 items-center justify-center rounded-md border border-line bg-white px-4 text-sm font-medium text-slate-600 transition hover:border-slate-400 hover:bg-field">重置</button>
            <button id="submit-open-issue" type="button" class="inline-flex h-10 items-center justify-center rounded-md bg-ink px-4 text-sm font-medium text-white transition hover:bg-slate-700">提交到仓库</button>
          </div>
        </div>
      </section>
    </div>
  `
}

function fillForm(match = {}, mode = 'create') {
  currentMode = mode === 'update' ? 'update' : 'create'
  field('submit-id').value = currentMode === 'update' ? (match.id || '') : ''
  field('submit-date').value = match.date || todayValue()
  field('submit-tournament').value = match.tournament || ''
  field('submit-motion').value = match.motion || ''
  field('submit-side').value = match.side || '正方'
  field('submit-result').value = match.result || '胜'
  field('submit-vote').value = normalizeVoteSplit(match.voteSplit || 'X：X')
  field('submit-best').value = match.bestDebater === '无' ? '' : (match.bestDebater || '')
  field('submit-submitter').value = match.submitter || ''
  ;[1, 2, 3, 4].forEach((index) => {
    field(`submit-lineup-${index}`).value = Array.isArray(match.lineup) ? (match.lineup[index - 1] || '') : ''
  })
  field('submit-video').value = match.videoUrl || ''
  field('submit-doc').value = match.docUrl || ''
  field('submit-review').value = match.reviewUrl || ''
  field('submit-error').textContent = ''
  field('submit-status').textContent = currentMode === 'update'
    ? '修改会按记录 ID 覆盖原比赛信息，确认提交后仓库会自动同步。'
    : '校验通过后会打开 GitHub Issue 页面，确认提交后仓库会自动同步。'
  field('submit-mode-label').textContent = currentMode === 'update' ? '修改记录' : '新增记录'
  field('submit-title').textContent = currentMode === 'update' ? '修改赛果' : '提交赛果'
  field('submit-description').textContent = currentMode === 'update' ? '修正已有比赛记录' : '新增比赛记录与胜场喜报'
  field('submit-open-issue').textContent = currentMode === 'update' ? '提交修改到仓库' : '提交到仓库'
  renderPreview()
}

function resetForm() {
  fillForm({}, currentMode)
}

function mountSubmissionWidget() {
  const header = document.querySelector('header .mx-auto')
  if (document.getElementById('submit-result-button')) return true
  if (!header) return false

  const button = document.createElement('button')
  button.id = 'submit-result-button'
  button.type = 'button'
  button.className = 'inline-flex h-10 items-center justify-center rounded-md bg-ink px-4 text-sm font-medium text-white transition hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300'
  button.textContent = '提交赛果'
  header.append(button)

  document.body.insertAdjacentHTML('beforeend', modalTemplate())
  const modal = document.getElementById('submit-modal')
  const close = () => {
    modal.classList.add('hidden')
    modal.classList.remove('flex')
  }
  const open = (match = {}, mode = 'create') => {
    fillForm(match, mode)
    modal.classList.remove('hidden')
    modal.classList.add('flex')
  }

  button.addEventListener('click', () => open({}, 'create'))
  window.addEventListener('open-match-submission', (event) => {
    open(event.detail?.match ?? {}, event.detail?.mode ?? 'create')
  })
  document.getElementById('submit-close').addEventListener('click', close)
  document.getElementById('submit-reset').addEventListener('click', resetForm)
  document.getElementById('poster-download').addEventListener('click', () => downloadPoster(formData()))
  document.getElementById('submit-open-issue').addEventListener('click', () => {
    const data = formData()
    const error = submissionError(data, currentMode)
    field('submit-error').textContent = error

    if (!error) {
      field('submit-status').textContent = '已打开 GitHub Issue 页面；请在新页面点提交，随后会自动写入并重新部署。'
      window.open(issueUrl(data, currentMode), '_blank', 'noopener,noreferrer')
    }
  })
  modal.addEventListener('input', renderPreview)
  modal.addEventListener('change', renderPreview)
  fillForm({}, 'create')
  return true
}

function scheduleMountSubmissionWidget() {
  if (mountSubmissionWidget()) return

  const root = document.getElementById('root') || document.body
  const observer = new MutationObserver(() => {
    if (mountSubmissionWidget()) observer.disconnect()
  })

  observer.observe(root, { childList: true, subtree: true })
  window.setTimeout(() => {
    observer.disconnect()
    mountSubmissionWidget()
  }, 5000)
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', scheduleMountSubmissionWidget)
} else {
  scheduleMountSubmissionWidget()
}
