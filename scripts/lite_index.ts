import * as yaml from 'js-yaml'
import * as fs from 'node:fs/promises'

const GITHUB_URL = 'https://github.com/lhxxh/secbench_exp/tree/main/evaluation'

const index = yaml.load(await fs.readFile('lite_index.yaml', 'utf8')) as Record<string, {
  tabName: string
  displayName: string
}>

interface Result {
  name: string
  oss: boolean
  verified: boolean
  orgIcon?: string
  site: string
  resolvedRate: number
  resolved: number
  resolvedEasy: number
  resolvedMedium: number
  resolvedHard: number
  date: string
  path: string
  logs?: string
  trajs?: string
  hasReadme: boolean
  hasLogs: boolean
  hasTrajs: boolean
}

interface Language {
  tabName: string
  displayName: string
  models: any[]
}

const leaderboard: Language[] = []

for (const [langKey, langValue] of Object.entries(index)) {
  const lang: Language = {
    tabName: langValue.tabName,
    displayName: langValue.displayName,
    models: [],
  }

  leaderboard.push(lang)

  const basePath = `evaluation/${langValue.tabName}`
  console.log(`${basePath}`)
  const dirents = await fs.readdir(basePath, { withFileTypes: true })

  const results = await Promise.allSettled(
    dirents
      .filter((dirent) => dirent.isDirectory() && !dirent.name.startsWith('.'))
      .map<Promise<Result>>(async (dirent) => {
        const path = `${dirent.name}`
        const metadata = yaml.load(await fs.readFile(`${basePath}/${path}/metadata.yaml`, 'utf8')) as Pick<Result, 'oss' | 'verified' | 'name' | 'site' | 'orgIcon' | 'date'>
        const generous_filecontent = await fs.readFile(`${basePath}/${path}/report_generous.jsonl`, 'utf8')
        const generous_report = generous_filecontent.trim().split('\n').map(line => JSON.parse(line))
        const medium_filecontent = await fs.readFile(`${basePath}/${path}/report_medium.jsonl`, 'utf8')
        const medium_report = medium_filecontent.trim().split('\n').map(line => JSON.parse(line))
        const strict_filecontent = await fs.readFile(`${basePath}/${path}/report_strict.jsonl`, 'utf8')
        const strict_report = strict_filecontent.trim().split('\n').map(line => JSON.parse(line))
        const urlLogs = `${GITHUB_URL}/${basePath}/${path}`
        const urlTrajs = `${GITHUB_URL}/${basePath}/${path}`
        const hasLogs = await fs.access(`${basePath}/${path}/logs`).then(() => true, () => false)
        const hasTrajs = await fs.access(`${basePath}/${path}/trajs`).then(() => true, () => false)
        const hasReadme = await fs.access(`${basePath}/${path}/README.md`).then(() => true, () => false)

        return {
          name: metadata.name,
          oss: metadata.oss,
          verified: metadata.verified,
          orgIcon: metadata.orgIcon,
          site: metadata.site,
          date: metadata.date instanceof Date
          ? metadata.date.toISOString().slice(0, 10)
          : String(metadata.date),
          resolvedRate: medium_report.filter(item => item.success).length / medium_report.length,
          resolved: medium_report.filter(item => item.success).length,
          resolvedEasy: generous_report.filter(item => item.success).length,
          resolvedMedium: medium_report.filter(item => item.success).length,
          resolvedHard: strict_report.filter(item => item.success).length,
          path: `${basePath}/${path}`,
          logs: hasLogs ? urlLogs : undefined,
          trajs: hasTrajs ? urlTrajs : undefined,
          hasLogs,
          hasTrajs,
          hasReadme,
        }
      })
  )

  const fulfilledResults = results
    .filter((r) => {
      if (r.status === 'rejected') {
        console.error(r.reason)
      }
      return r.status === 'fulfilled'
    })
    .map((r) => (r as PromiseFulfilledResult<Result>).value)

  fulfilledResults.sort((a, b) => b.resolved - a.resolved)

  lang.models = fulfilledResults
}

await fs.mkdir('dist', { recursive: true })
await fs.writeFile('dist/leaderboard-mini.json', JSON.stringify(leaderboard, null, 2))
