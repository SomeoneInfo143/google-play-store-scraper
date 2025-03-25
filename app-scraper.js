import gplay from 'google-play-scraper';
import * as XLSX from 'xlsx';
import fs from 'fs';

// Calculate date range for past three months
const endDate = new Date(); // Current date
const startDate = new Date();
startDate.setMonth(endDate.getMonth() - 3); // 3 months ago

// Configuration options
const CONFIG = {
    throttle: 2, // Reduced to avoid rate limits
    batchSize: 2500, // Batch size for controlled scraping
    delayBetweenBatches: 15000, // Delay between batches
    maxRetries: 3,
    saveProgressEvery: 50,
    outputFile: 'google_play_apps_past_three_months.xlsx',
    progressFile: 'collected_apps_past_three_months.json',
    maxInstalls: 100000, // Optional: limit on number of installs
    countryCodes: ['us'] 
};

// All available categories from constants.js
const categories = [
    'APPLICATION', 'ART_AND_DESIGN', 'AUTO_AND_VEHICLES',
    'BEAUTY', 'BOOKS_AND_REFERENCE', 'BUSINESS', 'COMICS', 
    'COMMUNICATION', 'DATING', 'EDUCATION', 'ENTERTAINMENT',
    'EVENTS', 'FINANCE', 'FOOD_AND_DRINK', 'HEALTH_AND_FITNESS',
    'HOUSE_AND_HOME', 'LIBRARIES_AND_DEMO', 'LIFESTYLE', 
    'MAPS_AND_NAVIGATION', 'MEDICAL', 'MUSIC_AND_AUDIO',
    'NEWS_AND_MAGAZINES', 'PARENTING', 'PERSONALIZATION', 
    'PHOTOGRAPHY', 'PRODUCTIVITY', 'SHOPPING', 'SOCIAL',
    'SPORTS', 'TOOLS', 'TRAVEL_AND_LOCAL', 'VIDEO_PLAYERS',
    'WATCH_FACE', 'WEATHER', 'GAME', 'GAME_ACTION', 'GAME_ADVENTURE',
    'GAME_ARCADE', 'GAME_BOARD', 'GAME_CARD', 'GAME_CASINO',
    'GAME_CASUAL', 'GAME_EDUCATIONAL', 'GAME_MUSIC', 'GAME_PUZZLE',
    'GAME_RACING', 'GAME_ROLE_PLAYING', 'GAME_SIMULATION', 
    'GAME_SPORTS', 'GAME_STRATEGY', 'GAME_TRIVIA', 'GAME_WORD', 'FAMILY'
];

// Function to check if an app's update is within the target date range
function isWithinTargetDateRange(timestamp) {
    if (!timestamp) return false;
    
    const date = new Date(timestamp);
    return date >= startDate && date <= endDate;
}

// Improved function to retry on failure
async function retryOperation(operation, retries = CONFIG.maxRetries) {
    let lastError;
    
    for (let attempt = 0; attempt < retries; attempt++) {
        try {
            return await operation();
        } catch (error) {
            console.log(`Attempt ${attempt + 1} failed. ${retries - attempt - 1} retries left.`);
            lastError = error;
            
            const delayMs = Math.pow(2, attempt) * 1000 + Math.random() * 1000;
            await new Promise(resolve => setTimeout(resolve, delayMs));
        }
    }
    
    throw lastError;
}

// Load existing progress if available
function loadProgress() {
    try {
        if (fs.existsSync(CONFIG.progressFile)) {
            const data = fs.readFileSync(CONFIG.progressFile, 'utf8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.error('Error loading progress file:', error.message);
    }
    return {
        collectedApps: [],
        processedPages: {}
    };
}

// Save progress to file
function saveProgress(collectedApps, processedPages = {}) {
    try {
        fs.writeFileSync(CONFIG.progressFile, JSON.stringify({
            collectedApps,
            processedPages
        }, null, 2));
        console.log(`Progress saved: ${collectedApps.length} apps collected so far`);
    } catch (error) {
        console.error('Error saving progress:', error.message);
    }
}

// Main function
async function main() {
    console.log(`Scraping timeframe: ${startDate.toISOString()} to ${endDate.toISOString()}`);
    
    const progress = loadProgress();
    let collectedApps = progress.collectedApps;
    const processedPages = progress.processedPages || {};
    const processedAppIds = new Set(collectedApps.map(app => app.appId));
    let totalAppsProcessed = 0;
    
    console.log(`Starting collection for apps updated in past three months...`);
    console.log(`Loaded ${collectedApps.length} apps from previous progress`);
    
    // Process each country
    for (const country of CONFIG.countryCodes) {
        console.log(`\n========= Processing country: ${country.toUpperCase()} =========`);
        
        // Process each category
        for (const category of categories) {
            console.log(`\n--- Category: ${category} ---`);
            
            // Initialize page tracking for this specific combination
            const progressKey = `${country}_${category}`;
            let page = processedPages[progressKey] || 0;
            let hasMore = true;
            
            while (hasMore) {
                try {
                    // Fetch apps with search instead of collections
                    const apps = await retryOperation(() => gplay.search({
                        term: '', // Empty term to get all apps
                        category: category,
                        country: country,
                        num: CONFIG.batchSize,
                        start: page * CONFIG.batchSize,
                        fullDetail: true,
                        throttle: CONFIG.throttle
                    }));
                    
                    console.log(`Page ${page + 1}: Retrieved ${apps.length} apps`);
                    
                    let matchCount = 0;
                    let reachedOldApps = false;
                    
                    // Process apps and filter for date range
                    for (const app of apps) {
                        totalAppsProcessed++;
                        
                        // Skip already processed apps
                        if (processedAppIds.has(app.appId)) {
                            continue;
                        }
                        
                        // Check if app is too old
                        if (app.updated && new Date(app.updated) < startDate) {
                            reachedOldApps = true;
                            break;
                        }
                        
                        // Check update date range
                        if (app.updated && isWithinTargetDateRange(app.updated)) {
                            // Parse installs and convert to number
                            const installCount = parseInt(app.installs.replace(/[^0-9]/g, ''), 10) || 0;
                            
                            // Optional: filter by install count
                            if (installCount > 0 && installCount < CONFIG.maxInstalls) {
                                matchCount++;
                                processedAppIds.add(app.appId);
                                
                                const updateDate = new Date(app.updated);
                                
                                collectedApps.push({
                                    title: app.title || '',
                                    appId: app.appId || '',
                                    installs: app.installs || '',
                                    installCount: installCount,
                                    scoreText: app.scoreText || '',
                                    ratings: app.ratings || 0,
                                    price: app.price || 0,
                                    developer: app.developer || '',
                                    developerEmail: app.developerEmail || '',
                                    developerWebsite: app.developerWebsite || '',
                                    developerAddress: app.developerAddress || '',
                                    privacyPolicy: app.privacyPolicy || '',
                                    genre: app.genre || '',
                                    genreId: app.genreId || '',
                                    category: app.categories ? app.categories.map(c => c.name).join(', ') : '',
                                    appUrl: app.url || '',
                                    updated: updateDate.toISOString().split('T')[0],
                                    country: country
                                });
                            }
                        }
                    }
                    
                    console.log(`Page ${page + 1}: Found ${matchCount} matching apps`);
                    console.log(`Total matching apps found so far: ${collectedApps.length}`);
                    
                    // Save progress after each page
                    processedPages[progressKey] = page;
                    saveProgress(collectedApps, processedPages);
                    
                    // Determine if we should continue
                    if (apps.length < CONFIG.batchSize || reachedOldApps) {
                        hasMore = false;
                    }
                    
                    page++;
                    
                    // Add delay between pages to avoid rate limits
                    await new Promise(resolve => setTimeout(resolve, CONFIG.delayBetweenBatches));
                    
                } catch (error) {
                    console.error(`Error processing ${category}/${country}:`, error.message);
                    // Stop processing this category on error
                    break;
                }
            }
        }
    }
    
    console.log(`\n========= Collection complete =========`);
    console.log(`Total apps processed: ${totalAppsProcessed}`);
    console.log(`Total matching apps found: ${collectedApps.length}`);
    
    // Export to Excel
    if (collectedApps.length > 0) {
        const worksheet = XLSX.utils.json_to_sheet(collectedApps);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Apps');
        XLSX.writeFile(workbook, CONFIG.outputFile);
        
        console.log(`Exported data to ${CONFIG.outputFile}`);
    } else {
        console.log('No matching apps found to export.');
    }
}

// Run the main function
main().catch(err => {
    console.error('A critical error occurred:', err);
    process.exit(1);
});
