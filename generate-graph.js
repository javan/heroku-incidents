import { readFile, writeFile } from 'fs/promises';

// Read and parse incidents data
const incidentsData = JSON.parse(await readFile('incidents.json', 'utf-8'));

// Process data for visualization
const processedData = incidentsData
  .map(incident => ({
    id: incident.id,
    date: new Date(incident.date),
    title: incident.title,
    downtime: incident.downtime,
    totalDowntime: incident.downtime.reduce((sum, d) => sum + d.minutes, 0),
    maxSeverity: incident.downtime.length > 0 ? incident.downtime.reduce((max, d) => {
      const severityScore = d.severity === 'red' ? 3 : d.severity === 'yellow' ? 2 : 1;
      return Math.max(max, severityScore);
    }, 0) : 0
  }))

  .sort((a, b) => a.date - b.date);

// Generate SVG
const width = 800;
const height = 400;
const padding = 60;
const graphWidth = width - 2 * padding;
const graphHeight = height - 2 * padding;

// Calculate scales
const minDate = new Date(Math.min(...processedData.map(d => d.date)));
const maxDate = new Date(Math.max(...processedData.map(d => d.date)));
const allDowntimes = processedData.map(d => d.totalDowntime).filter(d => d > 0).sort((a, b) => a - b);
const maxDowntime = Math.max(...allDowntimes);

// Cap the scale at 99th percentile to handle outliers better
const percentile99Index = Math.floor(allDowntimes.length * 0.99);
const maxDisplayDowntime = allDowntimes[percentile99Index] || maxDowntime;

const xScale = (date) => padding + ((date - minDate) / (maxDate - minDate)) * graphWidth;
const yScale = (downtime) => {
  // Cap the display value but show actual value in tooltip
  const cappedDowntime = Math.min(downtime, maxDisplayDowntime);
  return height - padding - (cappedDowntime / maxDisplayDowntime) * graphHeight;
};

// Color mapping
const getSeverityColor = (severity) => {
  switch (severity) {
    case 3: return '#dc2626'; // red
    case 2: return '#f59e0b'; // yellow
    case 1: return '#6b7280'; // gray
    default: return '#e5e7eb'; // light gray
  }
};

// Helper function to format downtime
const formatDowntime = (minutes) => {
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h${mins}m` : `${hours}h`;
  }
  return `${minutes}m`;
};

// Generate SVG content
let svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <style>
      .axis-line { stroke: #374151; stroke-width: 1; }
      .axis-text { font-family: Arial, sans-serif; font-size: 12px; fill: #6b7280; }
      .title { font-family: Arial, sans-serif; font-size: 16px; font-weight: bold; fill: #1f2937; }
      .incident-point { opacity: 0.7; }
      .incident-point:hover { opacity: 1; }
      .grid-line { stroke: #e5e7eb; stroke-width: 0.5; }
    </style>
  </defs>
  
  <!-- Background -->
  <rect width="${width}" height="${height}" fill="#ffffff"/>
  
  <!-- Grid lines -->`;

// Add horizontal grid lines
for (let i = 0; i <= 5; i++) {
  const y = height - padding - (i / 5) * graphHeight;
  const value = Math.round((i / 5) * maxDisplayDowntime);
  svg += `
  <line x1="${padding}" y1="${y}" x2="${width - padding}" y2="${y}" class="grid-line"/>
  <text x="${padding - 10}" y="${y + 4}" class="axis-text" text-anchor="end">${formatDowntime(value)}</text>`;
}

// Add vertical grid lines (years)
const years = [];
for (let year = minDate.getFullYear(); year <= maxDate.getFullYear(); year++) {
  years.push(year);
}

years.forEach(year => {
  const x = xScale(new Date(year, 0, 1));
  svg += `
  <line x1="${x}" y1="${padding}" x2="${x}" y2="${height - padding}" class="grid-line"/>
  <text x="${x}" y="${height - padding + 20}" class="axis-text" text-anchor="middle">${year}</text>`;
});

// Add axes
svg += `
  <!-- X-axis -->
  <line x1="${padding}" y1="${height - padding}" x2="${width - padding}" y2="${height - padding}" class="axis-line"/>
  <!-- Y-axis -->
  <line x1="${padding}" y1="${padding}" x2="${padding}" y2="${height - padding}" class="axis-line"/>`;

// Add incident points
const outliersCount = processedData.filter(i => i.totalDowntime > maxDisplayDowntime).length;
processedData.forEach(incident => {
  const x = xScale(incident.date);
  const y = yScale(incident.totalDowntime);
  const color = getSeverityColor(incident.maxSeverity);
  const radius = Math.max(3, Math.min(8, Math.sqrt(incident.totalDowntime / 10)));
  const isOutlier = incident.totalDowntime > maxDisplayDowntime;
  
  // Escape HTML entities in title for SVG
  const escapedTitle = incident.title.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  
  svg += `
  <circle cx="${x}" cy="${y}" r="${radius}" fill="${color}" class="incident-point" ${isOutlier ? 'stroke="#000" stroke-width="2"' : ''}>
    <title>${incident.date.toLocaleDateString()}: ${escapedTitle} (${formatDowntime(incident.totalDowntime)} downtime)${isOutlier ? ' - OUTLIER' : ''}</title>
  </circle>`;
  
  // Add outlier indicator
  if (isOutlier) {
    svg += `
    <text x="${x}" y="${y - radius - 5}" class="axis-text" text-anchor="middle" font-size="10" fill="#000">⚠</text>`;
  }
});

// Add legend
svg += `
  <!-- Legend -->
  <g transform="translate(${width - 150}, 60)">
    <rect x="-10" y="-10" width="140" height="100" fill="#f9fafb" stroke="#e5e7eb" stroke-width="1"/>
    <text x="0" y="0" class="axis-text" font-weight="bold">Severity</text>
    <circle cx="10" cy="15" r="4" fill="#dc2626"/>
    <text x="20" y="19" class="axis-text">Critical (Red)</text>
    <circle cx="10" cy="35" r="4" fill="#f59e0b"/>
    <text x="20" y="39" class="axis-text">Warning (Yellow)</text>
    <circle cx="10" cy="55" r="4" fill="#6b7280"/>
    <text x="20" y="59" class="axis-text">Other/No Impact</text>
    ${outliersCount > 0 ? `<text x="0" y="75" class="axis-text" font-size="10">⚠ ${outliersCount} outliers capped</text>` : ''}
  </g>
  
</svg>`;

// Write SVG file
await writeFile('incidents.svg', svg);

// Calculate some statistics
const totalIncidents = processedData.length;
const incidentsWithDowntime = processedData.filter(i => i.totalDowntime > 0).length;
const avgDowntime = processedData.reduce((sum, i) => sum + i.totalDowntime, 0) / totalIncidents;
const criticalIncidents = processedData.filter(i => i.maxSeverity === 3).length;
const warningIncidents = processedData.filter(i => i.maxSeverity === 2).length;

console.log(`Generated incidents.svg with ${totalIncidents} incidents`);
console.log(`Date range: ${minDate.toLocaleDateString()} to ${maxDate.toLocaleDateString()}`);
console.log(`Max downtime: ${maxDowntime} minutes (${formatDowntime(maxDowntime)})`);
console.log(`Display capped at: ${maxDisplayDowntime} minutes (${formatDowntime(maxDisplayDowntime)}) - 99th percentile`);
console.log(`Outliers (>99th percentile): ${outliersCount} incidents`);
console.log(`Incidents with downtime: ${incidentsWithDowntime}/${totalIncidents}`);
console.log(`Average downtime: ${Math.round(avgDowntime)} minutes`);
console.log(`Critical incidents: ${criticalIncidents}, Warning incidents: ${warningIncidents}`);