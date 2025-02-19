import { chromium } from "playwright"
import { readFile, writeFile } from "fs/promises"

class Incidents {
  constructor(filename = "incidents.json") {
    this.filename = filename
    this.index = new Map
  }

  has(id) {
    return this.index.has(id)
  }

  add(incident) {
    incident.date = new Date(incident.date)
    this.index.set(incident.id, incident)
  }

  async load() {
    const incidents = JSON.parse(await readFile(this.filename))
    for (const incident of incidents) this.add(incident)
  }

  async save() {
    await writeFile(this.filename, JSON.stringify(this, null, 2) + "\n")
  }

  toJSON() {
    return [...this.index.values()].sort((a, b) => b.id - a.id)
  }

  get size() {
    return this.index.size
  }
}

class Extractor {
  constructor() {
    this.incidents = new Incidents
  }

  async run() {
    try {
      await this.start()
      await this.extract()
    } finally {
      await this.stop()
    }
  }

  async start() {
    await this.incidents.load()
    this.browser = await chromium.launch()
    this.context = await this.browser.newContext()
    this.page = await this.context.newPage()
    this.page.setDefaultTimeout(5000)
  }

  async stop() {
    await this.incidents.save()
    await this.browser.close()
  }

  async extract() {
    let pageNumber = 1
    while (pageNumber) {
      if (await this.extractPage(pageNumber)) {
        pageNumber++
      } else {
        pageNumber = null
      }
    }
  }

  async extractPage(pageNumber) {
    const { size } = this.incidents

    const url = `https://status.heroku.com/incidents?page=${pageNumber}`
    await this.page.goto(url, { waitUntil: "networkidle" })
    console.log(url)

    const ids = await this.page.locator(`a[href^="/incidents/"]`).evaluateAll(elements =>
      elements.map(element => Number(element.href.match(/incidents\/(\d+)$/)?.[1]))
    )

    const newIds = ids.filter(id => !this.incidents.has(id))
    if (!newIds.length) return

    for (const id of newIds) {
      try {
        const incident = await this.extractIncindent(id)
        if (incident) {
          this.incidents.add(incident)
          await this.delay
        }
      } catch (error) {
        console.warn(` - failed to extract ${id}`, error)
      }
    }

    return this.incidents.size > size
  }

  async extractIncindent(id) {
    const url = `https://status.heroku.com/incidents/${id}`
    await this.page.goto(url, { waitUntil: "domcontentloaded" })
    console.log(` - ${url}`)

    const title = (await this.page.locator("h1,h2").first().textContent()).trim()
    const date  = (await this.page.locator(".timestamp").last().textContent()).replaceAll(/\s+/g, " ").trim().replace(/^posted [^,]+,/i, "").trim()

    const downtime = await this.page.locator(".incident__system").evaluateAll(elements => {
      return elements.map(element => {
        const system = element.querySelector(".incident__system__name").textContent.trim()

        const downtimeElement = element.querySelector(".incident__downtime")
        const severity = downtimeElement.className.replace(/incident__downtime(--)?/g, "").trim() || undefined
        const text = downtimeElement.textContent.trim()
        const hours = Number(text.match(/(\d+) hour/)?.[1] || 0)
        const minutes = Number(text.match(/(\d+) minute/)?.[1] || 0) + hours * 60

        return { system, severity, minutes }
      }).filter(downtime => downtime.minutes > 0)
    })

    return { id, url, date, title, downtime }
  }

  get delay() {
    return new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 150))
  }
}

new Extractor().run()
