import express, { json } from 'express';
import mongoose, { connect } from 'mongoose';
import cors from 'cors';
import { Builder, By, until } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome.js';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

const app = express();

// CORS configuration
app.use(
  cors({
    origin: 'http://localhost:3000', // Your React app's URL
    methods: ['GET', 'POST'],
    credentials: true,
  })
);

app.use(json());

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message,
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// MongoDB connection
connect(process.env.MONGO_URI, {})
  .then(() => {
    console.log('Connected to MongoDB');
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err);
  });

// Define MongoDB Schema
const TrendSchema = new mongoose.Schema({
  nameoftrend1: String,
  nameoftrend2: String,
  nameoftrend3: String,
  nameoftrend4: String,
  nameoftrend5: String,
  timestamp: Date,
  ipAddress: String, // Add IP address if needed
});

const Trend = mongoose.model('Trend', TrendSchema);

// Selenium scraping function
async function scrapeTrends() {
  const options = new chrome.Options();
  options.addArguments('--disable-gpu'); // Disable GPU for stability

  const driver = await new Builder().forBrowser('chrome').setChromeOptions(options).build();

  try {
    console.log('Navigating to Twitter login...');
    await driver.get('https://x.com/i/flow/login');

    // Step 1: Enter Email
    await driver.wait(until.elementLocated(By.css('[autocomplete="username"]')), 15000);
    const emailField = await driver.findElement(By.css('[autocomplete="username"]'));
    await emailField.sendKeys('pawar.manav2304@gmail.com'); // Replace with your email
    await driver.findElement(By.xpath("//span[text()='Next']")).click();

    // Step 2: Enter Username (Intermediate Step)
    await driver.wait(until.elementLocated(By.css('[name="text"]')), 15000); // Adjust selector if necessary
    const usernameField = await driver.findElement(By.css('[name="text"]'));
    await usernameField.sendKeys('ManavPa47597105'); // Replace with your username
    await driver.findElement(By.xpath("//span[text()='Next']")).click();

    // Step 3: Enter Password
    await driver.wait(until.elementLocated(By.css('[autocomplete="current-password"]')), 15000);
    const passwordField = await driver.findElement(By.css('[autocomplete="current-password"]'));
    await passwordField.sendKeys('Manav2304@'); // Replace with your password
    await driver.findElement(By.xpath("//span[text()='Log in']")).click();

    // Wait for confirmation that login was successful
    await driver.wait(until.elementLocated(By.css('[aria-label="Home"]')), 15000);

    console.log(`Logged in successfully as @ManavPa47597105`);

    // Wait for trends to load
    await driver.wait(until.elementLocated(By.css('[data-testid="trend"]')), 15000);

    // Get trending topics
    const trends = await driver.findElements(By.css('[data-testid="trend"]'));
    const trendTexts = [];
    for (let i = 0; i < 6 && i < trends.length; i++) {
      trendTexts.push(await trends[i].getText());
    }

    console.log('Trends fetched successfully.');
    return { trends: trendTexts };
  } catch (error) {
    console.error('Scrape operation failed:', error);

    // Capture the page source for debugging
    const pageSource = await driver.getPageSource();
    console.error('Page Source:', pageSource);
    
    throw error;
  } finally {
    await driver.quit();
  }
}

// Scrape endpoint
app.post('/api/scrape', async (req, res) => {
  try {
    console.log('Starting scrape operation...');
    const { trends } = await scrapeTrends();

    const trendRecord = new Trend({
      nameoftrend1: trends[0] || '',
      nameoftrend2: trends[1] || '',
      nameoftrend3: trends[2] || '',
      nameoftrend4: trends[3] || '',
      nameoftrend5: trends[4] || '',
      timestamp: new Date(),
    });

    await trendRecord.save();
    res.json(trendRecord);
  } catch (error) {
    console.error('Scrape operation failed:', error);
    res.status(500).json({
      error: 'Scrape operation failed',
      message: error.message,
    });
  }
});

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
