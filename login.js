const puppeteer = require('puppeteer');
require('dotenv').config(); // Load environment variables from .env file

const user_email = process.env.TWITTER_EMAIL || 'default_email';
const user_handle = process.env.TWITTER_HANDLE || 'default_handle'; // either your handle or phone number
const password = process.env.TWITTER_PASSWORD || 'default_password';

if (!user_email || !user_handle || !password) {
  console.error('Environment variables TWITTER_EMAIL, TWITTER_HANDLE, and TWITTER_PASSWORD must be set.');
  process.exit(1);
}

function getRandomDelay(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function waitForSelectorWithRetry(page, selector, options) {
  try {
    await page.waitForSelector(selector, options);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    throw error;
  }
}

async function fkTwitter() {
  const browser = await puppeteer.launch({
    headless: false,
  });
  const page = await browser.newPage();
  await page.setViewport({
    width: 1280,
    height: 800,
    isMobile: false
  });

  await page.goto('https://twitter.com/i/flow/login', { waitUntil: 'networkidle2' });

  // Select the user input
  await waitForSelectorWithRetry(page, '[autocomplete=username]', { timeout: 60000 });
  console.log(`Typing username: ${user_email}`);
  await page.type('input[autocomplete=username]', user_email, { delay: getRandomDelay(30, 100) });

  // Press the Next button
  await page.evaluate(() =>
    document.querySelectorAll('div[role="button"]')[2].click()
  );
  await page.waitForNavigation({ waitUntil: 'networkidle2' });

  // Handle case where Twitter asks for phone number or username
  const extractedText = await page.$eval('*', (el) => el.innerText);
  if (extractedText.includes('Enter your phone number or username')) {
    await waitForSelectorWithRetry(page, '[autocomplete=on]', { timeout: 60000 });
    console.log(`Typing handle: ${user_handle}`);
    await page.type('input[autocomplete=on]', user_handle, { delay: getRandomDelay(30, 100) });
    await page.evaluate(() =>
      document.querySelectorAll('div[role="button"]')[1].click()
    );
    await page.waitForNavigation({ waitUntil: 'networkidle2' });
  }

  // Select the password input
  await waitForSelectorWithRetry(page, '[autocomplete="current-password"]', { timeout: 60000 });
  console.log(`Typing password: ${password}`);
  await page.type('[autocomplete="current-password"]', password, { delay: getRandomDelay(30, 100) });

  // Press the Login button
  await page.evaluate(() =>
    document.querySelectorAll('div[role="button"]')[2].click()
  );
  await page.waitForNavigation({ waitUntil: 'networkidle2' });

  // Handle 2FA if prompted
  try {
    await waitForSelectorWithRetry(page, 'input[name="challenge_response"]', { timeout: 5000 });
    // Replace 'your_2fa_code' with your actual 2FA code or handle retrieving it
    console.log('Typing 2FA code');
    await page.type('input[name="challenge_response"]', 'your_2fa_code', { delay: getRandomDelay(30, 100) });
    await page.evaluate(() =>
      document.querySelectorAll('div[role="button"]')[2].click()
    );
    await page.waitForNavigation({ waitUntil: 'networkidle2' });
  } catch (e) {
    console.log('No 2FA required');
  }

  // Capture a screenshot for verification
  await page.screenshot({ path: 'twitter_logged_in.png' });

  // Close the browser
  await browser.close();
}

fkTwitter();
