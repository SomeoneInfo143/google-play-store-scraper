import gplay from 'google-play-scraper';
import * as XLSX from 'xlsx';
import fs from 'fs';

// Target update date
const targetDate = new Date('2025-01-01');

// Configuration options
const CONFIG = {
    throttle: 3, // Requests per second (lower for reliability)
    batchSize: 500, // How many apps to fetch per category/collection
    delayBetweenBatches: 10000, // 10 seconds between batches
    maxRetries: 3, // Retry failed requests
    saveProgressEvery: 50, // Save progress after every N apps
    outputFile: 'google_play_apps_jan_1_2025.xlsx',
    progressFile: 'collected_apps.json',
    countryCodes: ['us'] // 
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

// All available collections
const collections = [
    'TOP_FREE', 'TOP_PAID', 'GROSSING'
];

// Function to check if a date is January 1, 2025
function isDateJan1st2025(timestamp) {
    if (!timestamp) return false;
    
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = date.getMonth(); // 0 for January
    const day = date.getDate();
    
    return year === 2025 && month === 0 && day === 1;
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
            
            // Wait longer between retries
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
    return [];
}

// Save progress to file
function saveProgress(collectedApps) {
    try {
        fs.writeFileSync(CONFIG.progressFile, JSON.stringify(collectedApps, null, 2));
        console.log(`Progress saved: ${collectedApps.length} apps collected so far`);
    } catch (error) {
        console.error('Error saving progress:', error.message);
    }
}

// Main function
async function main() {
    let collectedApps = loadProgress();
    const processedAppIds = new Set(collectedApps.map(app => app.appId));
    let totalAppsProcessed = 0;
    
    console.log(`Starting collection for apps updated on January 1, 2025...`);
    console.log(`Loaded ${collectedApps.length} apps from previous progress`);
    
    // Process each country
    for (const country of CONFIG.countryCodes) {
        console.log(`\n========= Processing country: ${country.toUpperCase()} =========`);
        
        // Process each category
        for (const category of categories) {
            console.log(`\n--- Category: ${category} ---`);
            
            // Process each collection
            for (const collection of collections) {
                console.log(`Collection: ${collection}`);
                
                try {
                    // Fetch apps for this category/collection
                    const apps = await retryOperation(() => gplay.list({
                        category: category,
                        collection: collection,
                        lang: 'en',
                        country: country,
                        num: CONFIG.batchSize,
                        fullDetail: true,
                        throttle: CONFIG.throttle
                    }));
                    
                    console.log(`Retrieved ${apps.length} apps, checking for January 1, 2025 updates...`);
                    
                    let matchCount = 0;
                    
                    // Process apps and filter for January 1, 2025 updates
                    for (const app of apps) {
                        totalAppsProcessed++;
                        
                        // Skip already processed apps
                        if (processedAppIds.has(app.appId)) {
                            continue;
                        }
                        
                        // Check update date
                        if (app.updated && isDateJan1st2025(app.updated)) {
                            matchCount++;
                            processedAppIds.add(app.appId);
                            
                            const updateDate = new Date(app.updated);
                            
                            collectedApps.push({
                                title: app.title || '',
                                appId: app.appId || '',
                                installs: app.installs || '',
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
                            
                            // Save progress periodically
                            if (collectedApps.length % CONFIG.saveProgressEvery === 0) {
                                saveProgress(collectedApps);
                            }
                        }
                    }
                    
                    console.log(`Found ${matchCount} apps updated on January 1, 2025 in this batch`);
                    console.log(`Total matching apps found so far: ${collectedApps.length}`);
                    
                    // Save progress after each batch
                    saveProgress(collectedApps);
                    
                    // Add delay between batches to avoid rate limits
                    await new Promise(resolve => setTimeout(resolve, CONFIG.delayBetweenBatches));
                    
                } catch (error) {
                    console.error(`Error processing ${category}/${collection}/${country}:`, error.message);
                    // Continue with next collection despite errors
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