import { chromium } from "playwright"
import { readFile, writeFile } from "fs/promises"

const browser = await chromium.launch()
const context = await browser.newContext()
const page = await context.newPage()

page.setDefaultTimeout(3000)

let incidents = []
try {
  incidents = JSON.parse(await readFile("incidents.json"))
} catch (error) {
  console.warn(error)
}

const incidentsById = new Map

for (const incident of incidents) {
  incident.date = new Date(incident.date)
  incidentsById.set(incident.id, incident)
}

let pageNumber = 1

while (pageNumber) {
  const url = `https://status.heroku.com/incidents?page=${pageNumber}`
  await page.goto(url, { waitUntil: "networkidle" })
  console.log(url)

  const incidentIds = await page.locator(`a[href^="/incidents/"]`).evaluateAll(elements =>
    elements.map(element => Number(element.href.match(/incidents\/(\d+)$/)?.[1]))
  )

  const newIncidentIds = incidentIds.filter(id => !incidentsById.has(id))

  if (newIncidentIds.length) {
    let incidentExtracted = false
    for (const id of newIncidentIds) {
      const incident = await extractIncident(id)
      if (incident) {
        incidentExtracted = true
        incidentsById.set(id, incident)
        incidents = [...incidentsById.values()].sort((a, b) => b.id - a.id)
        await writeFile("incidents.json", JSON.stringify(incidents, null, 2) + "\n")
      }
      await delay()
    }
    if (incidentExtracted) {
      pageNumber++
    } else {
      pageNumber = null
    }
  } else {
    pageNumber = null
  }
}

await browser.close()

async function extractIncident(id) {
  const url = `https://status.heroku.com/incidents/${id}`
  await page.goto(url, { waitUntil: "domcontentloaded" })
  console.log(` - ${url}`)

  try {
    const title = (await page.locator(".incident-title").textContent()).trim()
    const date  = new Date((await page.locator(".timestamp").last().textContent()).trim().replace(/^posted [^,]+,/i, "").trim())

    const downtime = await page.locator(".incident__system").evaluateAll(elements => {
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
  } catch (error) {
    console.warn(error)
  }
}

function delay(ms = 250) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
