# Google Play Store App Scraper

## Overview

This is a Node.js script for scraping app information from the Google Play Store, specifically targeting apps updated on January 1, 2025. The scraper collects detailed information about apps across various categories and collections, saving the data to an Excel spreadsheet.

## Features

- Scrapes apps from multiple categories and collections
- Filters apps updated on a specific date (January 1, 2025)
- Supports multiple country codes
- Configurable scraping parameters
- Saves progress to allow resuming interrupted scraping
- Exports data to Excel spreadsheet

## Prerequisites

- Node.js (version 14 or higher)
- npm (Node Package Manager)

## Installation

1. Clone the repository:
```bash
git clone https://github.com/SomeoneInfo143/google-play-store-scraper.git
cd google-play-store-scraper
```

2. Install dependencies:
```bash
npm install
```

## Configuration

Modify the configuration in `app-scraper.js`:

- `CONFIG.throttle`: Control requests per second
- `CONFIG.batchSize`: Number of apps to fetch per category/collection
- `CONFIG.countryCodes`: List of country codes to scrape
- `targetDate`: Update date to filter apps (currently set to January 1, 2025)

## Usage

Run the scraper:
```bash
npm start
```

### Output

- `google_play_apps_jan_1_2025.xlsx`: Excel file with scraped app details
- `collected_apps.json`: Progress file to resume scraping if interrupted

## Collected App Information

The script collects the following app details:
- Title
- App ID
- Installs
- Rating
- Developer information
- Price
- Category
- Update date
- And more...

## Libraries Used

- `google-play-scraper`: Scrape Google Play Store data
- `xlsx`: Generate Excel spreadsheets
- `fs`: File system operations

## Error Handling

- Configurable retry mechanism
- Throttling to prevent IP blocking
- Progress saving to allow resuming

## Limitations

- Requires stable internet connection
- Google Play Store may have rate limiting
- Some app details might not be available

