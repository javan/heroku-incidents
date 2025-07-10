import { readFile, writeFile } from 'fs/promises';

// Read current README
const readme = await readFile('README.md', 'utf-8');

// Read incidents data to compute year range
const incidentsData = JSON.parse(await readFile('incidents.json', 'utf-8'));
const years = incidentsData.map(incident => new Date(incident.date).getFullYear());
const minYear = Math.min(...years);
const maxYear = Math.max(...years);

// Check if the SVG is already embedded
const svgEmbedRegex = /!\[Heroku Incidents Timeline\]\(incidents\.svg\)/;
const graphSectionRegex = /## Incident Timeline[\s\S]*?(?=\n##|$)/;

let updatedReadme = readme;

// If the graph section doesn't exist, add it
if (!svgEmbedRegex.test(readme)) {
  // Add the graph section after the main description
  const graphSection = `

## Incident Timeline

![Heroku Incidents Timeline](incidents.svg)

*This graph shows Heroku incidents from ${minYear}-${maxYear}, with downtime duration on the Y-axis and time on the X-axis. Circle size represents downtime duration, and colors indicate severity: red (critical), yellow (warning), gray (other/no impact).*
`;

  // Insert after the first paragraph
  const lines = readme.split('\n');
  const insertIndex = lines.findIndex(line => line.trim() === '') + 1;
  lines.splice(insertIndex, 0, graphSection);
  updatedReadme = lines.join('\n');
} else {
  // Update existing graph section if needed
  console.log('SVG already embedded in README.md');
  
  // Update the description text with dynamic years
  const descriptionRegex = /\*This graph shows Heroku incidents from \d{4}-\d{4}, with downtime duration on the Y-axis and time on the X-axis\. Circle size represents downtime duration, and colors indicate severity: red \(critical\), yellow \(warning\), gray \(other\/no impact\)\.\*/g;
  const newDescription = `*This graph shows Heroku incidents from ${minYear}-${maxYear}, with downtime duration on the Y-axis and time on the X-axis. Circle size represents downtime duration, and colors indicate severity: red (critical), yellow (warning), gray (other/no impact).*`;
  
  updatedReadme = readme.replace(descriptionRegex, newDescription);
}

// Write updated README
await writeFile('README.md', updatedReadme);

console.log('README.md updated with incident graph');