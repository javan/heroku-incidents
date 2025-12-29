import { readFile, writeFile } from 'fs/promises';

const html = await readFile('index.html', 'utf-8');

const formattedDate = new Date().toLocaleDateString('en-US', {
  weekday: 'long',
  year: 'numeric',
  month: 'long',
  day: 'numeric'
});

const updatedHTML = html.replace(
  /<span id="last-updated">[^<]*<\/span>/,
  `<span id="last-updated">${formattedDate}</span>`
);

await writeFile('index.html', updatedHTML);

console.log(`Updated index.html: Last updated: ${formattedDate}`);
