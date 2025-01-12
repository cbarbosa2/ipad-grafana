const express = require("express");
const puppeteer = require("puppeteer");
const path = require("path");
const app = express();
const port = 8080;

const dashboard =
  "http://wyse.local:3000/d/AmvH_Qb4k/display?orgId=1&refresh=5s&kiosk";

let browser;
let page;

(async () => {
  await openBrowser();
})();

app.get("/", function (req, res) {
  res.sendFile(path.join(__dirname, "/index.html"));
});

app.get("/grafana", async function (req, res) {
  try {
    await generateScreenshot();
    res.sendFile(path.join(__dirname, "/grafana.png"));
  } catch {
    res.sendFile(path.join(__dirname, "/error.jpg"));
  }
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});

process.on("SIGTERM", shutDown);
process.on("SIGINT", shutDown);

async function shutDown() {
  await closeBrowser();
}


async function closeBrowser() {
  await browser.close();
}


let isFirstLoad = true;

async function openBrowser() {
  browser = await puppeteer.launch({
    headless: "new",
    defaultViewport: {
      width: 1000,
      height: 700
    },
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  page = await browser.newPage();
  
  // Initial page load
  try {
    await page.goto(dashboard, { 
      waitUntil: "networkidle2",
      timeout: 30000
    });
    isFirstLoad = false;
  } catch (error) {
    console.error('Initial page load failed:', error);
  }
}

async function generateScreenshot() {
  const startTime = Date.now();
  try {
    if (!browser || !page) {
      await openBrowser();
    }
    
    if (!isFirstLoad) {
      // Use reload for subsequent requests - much faster
      await page.reload({ 
        waitUntil: "networkidle2",
        timeout: 30000
      });
    } else {
      // First load after recovery
      await page.goto(dashboard, { 
        waitUntil: "networkidle2",
        timeout: 30000
      });
      isFirstLoad = false;
    }

    await page.screenshot({ path: "grafana.png", omitBackground: true });

    const duration = Date.now() - startTime;
    console.log(`Screenshot generated in ${duration}ms`);
  } catch (error) {
    console.error('Screenshot generation failed:', error);
    // Reset state and attempt to recover
    isFirstLoad = true;
    await closeBrowser();
    await openBrowser();
    throw error;
  }
}