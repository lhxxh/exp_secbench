import * as yaml from 'js-yaml'
import * as fs from 'node:fs/promises'

const GITHUB_URL = 'https://github.com/lhxxh/secbench_exp/tree/main/evaluation'

const index = yaml.load(await fs.readFile('lite_index.yaml', 'utf8')) as Record<string, {
  name: string
  data?: Record<string, {
    name: string
  }>
}>

interface Result {
  name: string
  oss: boolean
  verified: boolean
  orgIcon: string
  site: string
  resolvedGenerous: number
  resolvedMedium: number
  resolvedStrict: number
  resolvedGenerousRate: number
  resolvedMediumRate: number
  resolvedStrictRate: number
  path: string
  logs: string
  trajs: string
}

interface Dataset {
  name: string
  results: Result[]
}

interface Language {
  name: string
  data?: Dataset[]
}

const leaderboard: Language[] = []

for (const [langKey, langValue] of Object.entries(index)) {
  const lang: Language = {
    name: langValue.name,
    data: [],
  }

  leaderboard.push(lang)

  if (!langValue.data) continue

  for (const [datasetKey, datasetValue] of Object.entries(langValue.data)) {
    const basePath = `evaluation`
    const dirents = await fs.readdir(basePath, { withFileTypes: true })

    const results = await Promise.allSettled(
      dirents
        .filter((dirent) => dirent.isDirectory() && !dirent.name.startsWith('.'))
        .map<Promise<Result>>(async (dirent) => {
          const path = `${dirent.name}`
          const metadata = yaml.load(await fs.readFile(`${basePath}/${path}/metadata.yaml`, 'utf8')) as Pick<Result, 'oss' | 'verified' | 'name' | 'site' | 'orgIcon'>
          const generous_filecontent = await fs.readFile(`${basePath}/${path}/report_generous.jsonl`, 'utf8')
          const generous_report = generous_filecontent.trim().split('\n').map(line => JSON.parse(line))
          const medium_filecontent = await fs.readFile(`${basePath}/${path}/report_medium.jsonl`, 'utf8')
          const medium_report = medium_filecontent.trim().split('\n').map(line => JSON.parse(line))
          const strict_filecontent = await fs.readFile(`${basePath}/${path}/report_strict.jsonl`, 'utf8')
          const strict_report = strict_filecontent.trim().split('\n').map(line => JSON.parse(line))
          const urlLogs = `${GITHUB_URL}/${basePath}/${path}`
          const urlTrajs = `${GITHUB_URL}/${basePath}/${path}`

          return {
            name: metadata.name,
            oss: metadata.oss,
            verified: metadata.verified,
            orgIcon: metadata.orgIcon,
            site: metadata.site,
            date: metadata.date,
            resolvedGenerous: generous_report.filter(item => item.success).length,
            resolvedGenerousRate:  generous_report.filter(item => item.success).length / generous_report.length,
            resolvedMedium: medium_report.filter(item => item.success).length,
            resolvedMediumRate: medium_report.filter(item => item.success).length / medium_report.length,
            resolvedStrict: strict_report.filter(item => item.success).length,
            resolvedStrictRate: strict_report.filter(item => item.success).length / strict_report.length,
            path: `${basePath}/${path}`,
            logs: urlLogs,
            trajs: urlTrajs,
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

    lang.data!.push({
      name: datasetValue.name,
      results: fulfilledResults,
    })
  }
}

await fs.mkdir('dist', { recursive: true })
await fs.writeFile('dist/leaderboard-mini.json', JSON.stringify(leaderboard, null, 2))
