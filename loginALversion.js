require('dotenv').config();
const PCR = require('puppeteer-chromium-resolver');
const path = require('path');

class TwitterLogin {
  constructor(maxRetry = 3) {
    this.credentials = {
      username: process.env.TWITTER_USERNAME,
      password: process.env.TWITTER_PASSWORD,
      phone: process.env.TWITTER_PHONE
    };
    this.maxRetry = maxRetry;
    this.browser = null;
    this.page = null;
    this.sessionValid = false;
  }

  randomDelay = async (max) => {
    return Math.floor(Math.random() * max);
  };

  negotiateSession = async () => {
    try {
      if (this.browser) {
        await this.browser.close();
        console.log('Old browser closed');
      }
      const options = {};
      const userDataDir = path.join(__dirname, 'puppeteer_cache_twitter');
      const stats = await PCR(options);
      
      this.browser = await stats.puppeteer.launch({
        executablePath: stats.executablePath,
        userDataDir: userDataDir,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-gpu',
        ],
      });
      console.log('Step: Open new page');
      this.page = await this.browser.newPage();
      await this.page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      );
      await this.page.setViewport({ width: 1920, height: 1080 });
      await this.twitterLogin();
      return true;
    } catch (e) {
      console.log('Error negotiating session', e);
      return false;
    }
  };

  twitterLogin = async () => {
    let currentAttempt = 0;
    while (currentAttempt < this.maxRetry && !this.sessionValid) {
      try {
        console.log('Step: Go to login page');
        await this.page.goto('https://x.com/i/flow/login', {
          timeout: await this.randomDelay(60000),
          waitUntil: 'networkidle0',
        });

        await this.page.waitForSelector('input[name="text"]', {
          timeout: await this.randomDelay(60000),
        });

        console.log('Step: Fill in username');
        await this.page.type('input[name="text"]', this.credentials.username);
        await this.page.keyboard.press('Enter');
        await new Promise(resolve => setTimeout(resolve, 10000));

        const twitter_verify = await this.page
          .waitForSelector('input[data-testid="ocfEnterTextTextInput"]', {
            timeout: await this.randomDelay(5000),
            visible: true,
          })
          .then(() => true)
          .catch(() => false);

        if (twitter_verify) {
          console.log('Twitter verify needed, trying phone number');
          await this.page.type(
            'input[data-testid="ocfEnterTextTextInput"]',
            this.credentials.phone,
          );
          await this.page.keyboard.press('Enter');
          await new Promise(resolve => setTimeout(resolve, 3000));
        }

        await this.page.waitForSelector('input[name="password"]');
        console.log('Step: Fill in password');
        await this.page.type(
          'input[name="password"]',
          this.credentials.password,
        );
        console.log('Step: Click login button');
        await this.page.keyboard.press('Enter');
        await this.page.waitForTimeout(await this.randomDelay(3000));

        if (await this.checkLogin()) {
          console.log('Login successful');
          this.sessionValid = true;
        } else {
          console.log('Login failed. Retrying...');
          currentAttempt++;
        }
      } catch (e) {
        console.log(`Error logging in, retrying ${currentAttempt + 1} of ${this.maxRetry}`, e);
        currentAttempt++;
      }
    }

    if (!this.sessionValid) {
      console.log('Max retry reached, login failed');
    }

    return this.sessionValid;
  };

  checkLogin = async () => {
    const newPage = await this.browser.newPage();
    await newPage.goto('https://x.com/home');
    await newPage.waitForTimeout(await this.randomDelay(5000));
    const isLoggedIn = (await newPage.url()) !== 'https://x.com/i/flow/login?redirect_after_login=%2Fhome';
    await newPage.close();
    return isLoggedIn;
  };
}

// Usage example
const credentials = {
  username: 'your_username',
  password: 'your_password',
  phone: 'your_phone_number'
};

const twitterLogin = new TwitterLogin(credentials);
twitterLogin.negotiateSession().then(() => {
  if (twitterLogin.sessionValid) {
    console.log('Successfully logged in to Twitter');
  } else {
    console.log('Failed to log in to Twitter');
  }
});
