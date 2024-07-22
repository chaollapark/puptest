const puppeteer = require('puppeteer');
require('dotenv').config();

async function loginToTwitter(page, username, password) {
  try {
    console.log("Navigating to Twitter login page...");
    await page.goto('https://twitter.com/login', { waitUntil: 'networkidle2' });
    await page.screenshot({ path: 'screenshots/before_login.png' });

    console.log("Waiting for username input...");
    await page.waitForSelector('input[name="session[username_or_email]"]', { timeout: 60000 });

    console.log("Typing username and password...");
    await page.type('input[name="session[username_or_email]"]', username);
    await page.type('input[name="session[password]"]', password);

    await page.screenshot({ path: 'screenshots/after_typing_credentials.png' });

    console.log("Clicking login button...");
    await page.click('div[data-testid="LoginForm_Login_Button"]');
    await page.waitForNavigation({ waitUntil: 'networkidle2' });

    await page.screenshot({ path: 'screenshots/after_login.png' });
  } catch (error) {
    console.error("Error logging into Twitter:", error);
    await page.screenshot({ path: 'screenshots/error_login.png' });
  }
}

async function retweetTweets(page, accountHandle, numberOfTweets) {
  try {
    console.log(`Navigating to Twitter account page for @${accountHandle}...`);
    await page.goto(`https://twitter.com/${accountHandle}`, { waitUntil: 'networkidle2' });
    await page.screenshot({ path: 'screenshots/account_page.png' });

    console.log("Waiting for tweets to appear...");
    await page.waitForSelector('div[data-testid="tweet"]', { timeout: 60000 });

    const tweets = await page.$$('div[data-testid="tweet"]');
    console.log(`Found ${tweets.length} tweets.`);

    for (let i = 0; i < Math.min(numberOfTweets, tweets.length); i++) {
      const tweet = tweets[i];
      const retweetButton = await tweet.$('div[data-testid="retweet"]');

      if (retweetButton) {
        console.log(`Retweeting tweet ${i + 1}...`);
        await retweetButton.click();
        await page.waitForSelector('div[data-testid="retweetConfirm"]', { timeout: 60000 });
        await page.click('div[data-testid="retweetConfirm"]');
        await page.waitForTimeout(1000); // wait a bit to ensure the action is processed
      } else {
        console.log(`No retweet button found for tweet ${i + 1}`);
      }
    }
  } catch (error) {
    console.error("Error retweeting tweets:", error);
    await page.screenshot({ path: 'screenshots/error_retweet.png' });
  }
}

(async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  const twitterUsername = process.env.TWITTER_USERNAME;
  const twitterPassword = process.env.TWITTER_PASSWORD;
  const accountToRetweet = 'madanchaolla';
  const numberOfTweetsToRetweet = 3;

  await loginToTwitter(page, twitterUsername, twitterPassword);
  await retweetTweets(page, accountToRetweet, numberOfTweetsToRetweet);

  await browser.close();
})();
