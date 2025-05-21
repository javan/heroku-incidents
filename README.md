# Heroku Incidents

A structured JSON representation of [status.heroku.com/incidents](https://status.heroku.com/incidents), updated daily. 

## Visualization

This repository includes an interactive visualization of Heroku incidents data using D3.js. The visualization is automatically updated and published to GitHub Pages whenever the incidents data changes.

You can view the visualization at: https://javan.github.io/heroku-incidents/

The visualization includes:
- Monthly incident count chart
- Incident duration distribution chart

### How it works

A GitHub Action workflow automatically runs whenever `incidents.json` is updated. The workflow:
1. Builds a static site with the visualization
2. Publishes the site to GitHub Pages

The visualization is built using D3.js and displays various metrics from the incidents data.

## Data

The data is available in [`incidents.json`](incidents.json) and is updated daily.
