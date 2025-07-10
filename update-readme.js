import { readFile, writeFile } from 'fs/promises';

// Read current README
const readme = await readFile('README.md', 'utf-8');

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

*This graph shows Heroku incidents from 2020-2025, with downtime duration on the Y-axis and time on the X-axis. Circle size represents downtime duration, and colors indicate severity: red (critical), yellow (warning), gray (other/no impact).*
`;

  // Insert after the first paragraph
  const lines = readme.split('\n');
  const insertIndex = lines.findIndex(line => line.trim() === '') + 1;
  lines.splice(insertIndex, 0, graphSection);
  updatedReadme = lines.join('\n');
} else {
  // Update existing graph section if needed
  console.log('SVG already embedded in README.md');
}

// Write updated README
await writeFile('README.md', updatedReadme);

console.log('README.md updated with incident graph');