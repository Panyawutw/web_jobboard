"use strict";

const https = require('https');
const { findOrCreateOAuthAccount } = require('../models/accountModel');

function getBaseUrl(req) {
  const protocol = req.headers['x-forwarded-proto'] || req.protocol;
  const host = req.get('host');
  return `${protocol}://${host}`;
}

// ส่งผู้ใช้ไปยังหน้าเข้าสู่ระบบของ Google OAuth 2.0 โดยตรง
function googleAuth(req, res) {
  const clientId = process.env.GOOGLE_CLIENT_ID ? process.env.GOOGLE_CLIENT_ID.trim() : '';
  const from = req.query.from === 'register' ? 'register' : 'login';

  if (!clientId) {
    return res.redirect(`/${from}?error=google_missing_client_id`);
  }

  const baseUrl = getBaseUrl(req);
  const redirectUri = `${baseUrl}/auth/google/callback`;
  const scope = encodeURIComponent('openid email profile');
  const state = from;

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?response_type=code&client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}&state=${encodeURIComponent(state)}&access_type=offline&prompt=select_account`;

  return res.redirect(authUrl);
}

// รับ Callback จาก Google OAuth 2.0
async function googleCallback(req, res, next) {
  const { code, error, state } = req.query;
  const from = state === 'register' ? 'register' : 'login';

  if (error || !code) {
    return res.redirect(`/${from}?error=oauth_denied`);
  }

  const clientId = process.env.GOOGLE_CLIENT_ID ? process.env.GOOGLE_CLIENT_ID.trim() : '';
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET ? process.env.GOOGLE_CLIENT_SECRET.trim() : '';
  const baseUrl = getBaseUrl(req);
  const redirectUri = `${baseUrl}/auth/google/callback`;

  try {
    const postData = new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code'
    }).toString();

    const tokenResponse = await makeHttpsRequest('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, postData);

    const tokenData = JSON.parse(tokenResponse);
    if (!tokenData.access_token) {
      console.error('Google token exchange error:', tokenData);
      return res.redirect(`/${from}?error=token_exchange_failed`);
    }

    const userProfileResponse = await makeHttpsRequest('https://www.googleapis.com/oauth2/v3/userinfo', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`
      }
    });

    const profile = JSON.parse(userProfileResponse);

    const account = await findOrCreateOAuthAccount({
      provider: 'google',
      providerId: profile.sub,
      email: profile.email,
      name: profile.name || `${profile.given_name || ''} ${profile.family_name || ''}`.trim(),
      role: 'jobSeeker'
    });

    req.session.regenerate((sessionError) => {
      if (sessionError) return next(sessionError);

      req.session.accountId = account.id;
      req.session.accountRole = account.role;
      req.session.accountName = account.name;
      req.session.email = account.email;

      req.session.save(() => {
        return res.redirect('/');
      });
    });
  } catch (err) {
    console.error('Google OAuth callback error:', err);
    return res.redirect(`/${from}?error=oauth_failed`);
  }
}

// ส่งผู้ใช้ไปยังหน้าเข้าสู่ระบบของ GitHub OAuth โดยตรง
function githubAuth(req, res) {
  const clientId = process.env.GITHUB_CLIENT_ID ? process.env.GITHUB_CLIENT_ID.trim() : '';
  const from = req.query.from === 'register' ? 'register' : 'login';

  if (!clientId) {
    return res.redirect(`/${from}?error=github_missing_client_id`);
  }

  const baseUrl = getBaseUrl(req);
  const redirectUri = `${baseUrl}/auth/github/callback`;
  const scope = encodeURIComponent('user:email');
  const state = from;

  const authUrl = `https://github.com/login/oauth/authorize?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}&state=${encodeURIComponent(state)}`;

  return res.redirect(authUrl);
}

// รับ Callback จาก GitHub OAuth
async function githubCallback(req, res, next) {
  const { code, error, state } = req.query;
  const from = state === 'register' ? 'register' : 'login';

  if (error || !code) {
    return res.redirect(`/${from}?error=oauth_denied`);
  }

  const clientId = process.env.GITHUB_CLIENT_ID ? process.env.GITHUB_CLIENT_ID.trim() : '';
  const clientSecret = process.env.GITHUB_CLIENT_SECRET ? process.env.GITHUB_CLIENT_SECRET.trim() : '';

  try {
    const postData = JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code
    });

    const tokenResponse = await makeHttpsRequest('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'User-Agent': 'Node.js/FreelanceHub'
      }
    }, postData);

    const tokenData = JSON.parse(tokenResponse);
    if (!tokenData.access_token) {
      console.error('GitHub token exchange error:', tokenData);
      return res.redirect(`/${from}?error=token_exchange_failed`);
    }

    const userProfileResponse = await makeHttpsRequest('https://api.github.com/user', {
      method: 'GET',
      headers: {
        Authorization: `token ${tokenData.access_token}`,
        'User-Agent': 'Node.js/FreelanceHub'
      }
    });

    const profile = JSON.parse(userProfileResponse);

    let userEmail = profile.email;
    if (!userEmail) {
      try {
        const emailsResponse = await makeHttpsRequest('https://api.github.com/user/emails', {
          method: 'GET',
          headers: {
            Authorization: `token ${tokenData.access_token}`,
            'User-Agent': 'Node.js/FreelanceHub'
          }
        });
        const emails = JSON.parse(emailsResponse);
        const primaryEmail = emails.find(e => e.primary && e.verified) || emails[0];
        if (primaryEmail) userEmail = primaryEmail.email;
      } catch (emailErr) {
        // ข้ามหากดึงไม่ได้
      }
    }

    const account = await findOrCreateOAuthAccount({
      provider: 'github',
      providerId: profile.id,
      email: userEmail || `github_${profile.login}@users.noreply.github.com`,
      name: profile.name || profile.login,
      role: 'jobSeeker'
    });

    req.session.regenerate((sessionError) => {
      if (sessionError) return next(sessionError);

      req.session.accountId = account.id;
      req.session.accountRole = account.role;
      req.session.accountName = account.name;
      req.session.email = account.email;

      req.session.save(() => {
        return res.redirect('/');
      });
    });
  } catch (err) {
    console.error('GitHub OAuth callback error:', err);
    return res.redirect(`/${from}?error=oauth_failed`);
  }
}

function makeHttpsRequest(urlStr, options, data = null) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(urlStr);
    const reqOptions = {
      hostname: parsedUrl.hostname,
      port: 443,
      path: parsedUrl.pathname + parsedUrl.search,
      method: options.method || 'GET',
      headers: options.headers || {}
    };

    const req = https.request(reqOptions, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve(body));
    });

    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

module.exports = {
  googleAuth,
  googleCallback,
  githubAuth,
  githubCallback
};
