const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const log = require('../logging-middleware');

const app = express();
const PORT = 5000;
const DATA_FILE = path.join(__dirname, 'db.json');

app.use(cors());
app.use(express.json());

if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, JSON.stringify({ urls: [] }, null, 2));
}

function readData() {
  try {
    const data = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    log('backend', 'error', 'express', `Error reading data file: ${error.message}`);
    return { urls: [] };
  }
}

function writeData(data) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
  } catch (error) {
    log('backend', 'error', 'express', `Error writing data file: ${error.message}`);
  }
}

function generateShortcode() {
  return crypto.randomBytes(3).toString('hex');
}

function isValidUrl(string) {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
}

function isShortcodeUnique(shortcode, data) {
  return !data.urls.find(url => url.shortcode === shortcode);
}

function isUrlExpired(expiry) {
  return new Date() > new Date(expiry);
}

app.post('/shorturls', async (req, res) => {
  try {
    const { url, validity = 30, shortcode } = req.body;

    await log('backend', 'info', 'express', `Creating short URL for: ${url}`);

    if (!url) {
      await log('backend', 'warn', 'express', 'URL is required');
      return res.status(400).json({ error: 'URL is required' });
    }

    if (!isValidUrl(url)) {
      await log('backend', 'warn', 'express', `Invalid URL format: ${url}`);
      return res.status(400).json({ error: 'Invalid URL format' });
    }

    if (validity && (!Number.isInteger(validity) || validity <= 0)) {
      await log('backend', 'warn', 'express', `Invalid validity: ${validity}`);
      return res.status(400).json({ error: 'Validity must be a positive integer' });
    }

    const data = readData();
    let finalShortcode = shortcode;

    if (!finalShortcode) {
      do {
        finalShortcode = generateShortcode();
      } while (!isShortcodeUnique(finalShortcode, data));
    } else {
      if (!/^[a-zA-Z0-9]+$/.test(finalShortcode)) {
        await log('backend', 'warn', 'express', `Invalid shortcode format: ${finalShortcode}`);
        return res.status(400).json({ error: 'Shortcode must be alphanumeric' });
      }

      if (!isShortcodeUnique(finalShortcode, data)) {
        await log('backend', 'warn', 'express', `Shortcode already exists: ${finalShortcode}`);
        return res.status(409).json({ error: 'Shortcode already exists' });
      }
    }

    const expiry = new Date(Date.now() + validity * 60 * 1000).toISOString();

    const urlEntry = {
      id: Date.now().toString(),
      url,
      shortcode: finalShortcode,
      createdAt: new Date().toISOString(),
      expiry,
      clicks: []
    };

    data.urls.push(urlEntry);
    writeData(data);

    const shortLink = `http://localhost:${PORT}/${finalShortcode}`;
    
    await log('backend', 'info', 'express', `Short URL created: ${shortLink}`);

    res.status(201).json({
      shortLink,
      expiry
    });

  } catch (error) {
    await log('backend', 'error', 'express', `Error creating short URL: ${error.message}`);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/:shortcode', async (req, res) => {
  try {
    const { shortcode } = req.params;
    const data = readData();
    
    await log('backend', 'info', 'express', `Accessing shortcode: ${shortcode}`);

    const urlEntry = data.urls.find(url => url.shortcode === shortcode);

    if (!urlEntry) {
      await log('backend', 'warn', 'express', `Shortcode not found: ${shortcode}`);
      return res.status(404).json({ error: 'Short URL not found' });
    }

    if (isUrlExpired(urlEntry.expiry)) {
      await log('backend', 'warn', 'express', `Shortcode expired: ${shortcode}`);
      return res.status(410).json({ error: 'Short URL has expired' });
    }

    // Record click
    const clickData = {
      timestamp: new Date().toISOString(),
      referrer: req.get('Referer') || 'Direct',
      userAgent: req.get('User-Agent') || 'Unknown',
      ip: req.ip || req.connection.remoteAddress
    };

    urlEntry.clicks.push(clickData);
    writeData(data);

    await log('backend', 'info', 'express', `Redirecting ${shortcode} to ${urlEntry.url}`);

    res.redirect(302, urlEntry.url);

  } catch (error) {
    await log('backend', 'error', 'express', `Error redirecting: ${error.message}`);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/shorturls/:shortcode/stats', async (req, res) => {
  try {
    const { shortcode } = req.params;
    const data = readData();

    await log('backend', 'info', 'express', `Getting stats for: ${shortcode}`);

    const urlEntry = data.urls.find(url => url.shortcode === shortcode);

    if (!urlEntry) {
      await log('backend', 'warn', 'express', `Shortcode not found for stats: ${shortcode}`);
      return res.status(404).json({ error: 'Short URL not found' });
    }

    const stats = {
      shortcode: urlEntry.shortcode,
      originalUrl: urlEntry.url,
      createdAt: urlEntry.createdAt,
      expiry: urlEntry.expiry,
      totalClicks: urlEntry.clicks.length,
      clicks: urlEntry.clicks.map(click => ({
        timestamp: click.timestamp,
        referrer: click.referrer,
        userAgent: click.userAgent
      }))
    };

    await log('backend', 'info', 'express', `Stats retrieved for ${shortcode}: ${stats.totalClicks} clicks`);

    res.json(stats);

  } catch (error) {
    await log('backend', 'error', 'express', `Error getting stats: ${error.message}`);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/shorturls', async (req, res) => {
  try {
    const data = readData();
    
    await log('backend', 'info', 'express', 'Getting all URLs');

    const urlsWithStats = data.urls.map(urlEntry => ({
      shortcode: urlEntry.shortcode,
      originalUrl: urlEntry.url,
      shortLink: `http://localhost:${PORT}/${urlEntry.shortcode}`,
      createdAt: urlEntry.createdAt,
      expiry: urlEntry.expiry,
      totalClicks: urlEntry.clicks.length,
      isExpired: isUrlExpired(urlEntry.expiry)
    }));

    res.json(urlsWithStats);

  } catch (error) {
    await log('backend', 'error', 'express', `Error getting all URLs: ${error.message}`);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(PORT, () => {
  log('backend', 'info', 'express', `Server running on http://localhost:${PORT}`);
  console.log(`Server running on http://localhost:${PORT}`);
});