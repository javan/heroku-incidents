import { readFile, writeFile } from 'fs/promises';

// Read the template HTML file
const templateHTML = await readFile('index.html', 'utf-8');

// Read and process incidents data
const incidentsData = JSON.parse(await readFile('incidents.json', 'utf-8'));

// Process data for statistics
const processedData = incidentsData
  .map(incident => ({
    ...incident,
    date: new Date(incident.date),
    totalDowntime: incident.downtime.reduce((sum, d) => sum + d.minutes, 0),
    maxSeverity: incident.downtime.length > 0 ? incident.downtime.reduce((max, d) => {
      const severityScore = d.severity === 'red' ? 3 : d.severity === 'yellow' ? 2 : 1;
      return Math.max(max, severityScore);
    }, 0) : 0
  }));

// Calculate statistics
const totalIncidents = processedData.length;
const criticalIncidents = processedData.filter(i => i.maxSeverity === 3).length;
const warningIncidents = processedData.filter(i => i.maxSeverity === 2).length;
const avgDowntime = totalIncidents > 0 ? 
  Math.round(processedData.reduce((sum, i) => sum + i.totalDowntime, 0) / totalIncidents) : 0;

// Helper function to format downtime
const formatDowntime = (minutes) => {
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }
  return `${minutes}m`;
};

// Update the HTML with current statistics in the title
// First, remove any existing "Last updated" paragraphs
let updatedHTML = templateHTML.replace(
  /<p class="subtitle" style="font-size: 0\.9rem; color: #a0aec0; margin-top: 5px;">\s*Last updated: [^<]*\s*<\/p>/g,
  ''
);

// Then add a single new "Last updated" paragraph
updatedHTML = updatedHTML.replace(
  '<p class="subtitle">Comprehensive view of Heroku service incidents and downtime</p>',
  `<p class="subtitle">Comprehensive view of Heroku service incidents and downtime</p>
  <p class="subtitle" style="font-size: 0.9rem; color: #a0aec0; margin-top: 5px;">
    Last updated: ${new Date().toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })}
  </p>`
);

// Write the updated HTML
await writeFile('index.html', updatedHTML);

console.log(`Updated index.html with ${totalIncidents} incidents`);
console.log(`Critical: ${criticalIncidents}, Warning: ${warningIncidents}`);
console.log(`Average downtime: ${formatDowntime(avgDowntime)}`);