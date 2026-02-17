# Google Drive Upload Setup Guide

This guide explains how to set up OAuth authentication for the Google Drive upload workflow.

## Why OAuth instead of Service Account?

Service accounts **cannot upload to personal Google Drive folders** ("My Drive"). They don't have storage quota and can only work with:
- Google Workspace Shared Drives, or
- OAuth delegation

Since we're using a personal Google Drive folder, we need to use **OAuth tokens** (user authentication) instead.

## Setup Steps

### Step 1: Configure OAuth Consent Screen

**IMPORTANT:** Do this step first before creating credentials!

1. Go to [Google Cloud Console - OAuth Consent Screen](https://console.cloud.google.com/apis/credentials/consent)
2. Select your project (or create a new one)
3. Configure the OAuth consent screen:
   - **User Type:** Choose **"External"** (unless you have a Google Workspace account)
   - Click **"Create"**
   - **App name:** Enter a name (e.g., "GitHub Actions Drive Upload")
   - **User support email:** Select your email
   - **Developer contact information:** Enter your email
   - Click **"Save and Continue"**
4. **Scopes:** Click **"Save and Continue"** (default scopes are fine)
5. **Test users** (CRITICAL STEP):
   - Click **"+ ADD USERS"**
   - Add your Google account email address (the one you'll use to authenticate)
   - Click **"Add"**
   - Click **"Save and Continue"**
6. Review and click **"Back to Dashboard"**

**Note:** If you get a 403 error later, make sure your email is in the test users list!

### Step 2: Create OAuth Credentials

1. Go to [Google Cloud Console - Credentials](https://console.cloud.google.com/apis/credentials)
2. Click **"Create Credentials"** → **"OAuth client ID"**
3. For the OAuth client:
   - **Application type:** **"Desktop app"**
   - **Name:** `GitHub Actions Drive Upload` (or any name you prefer)
   - Click **"Create"**
4. Download the JSON file
5. Save it as `credentials.json` in this directory (`scripts/google-drive/`)

### Step 3: Enable Google Drive API

1. Go to [Google Cloud Console - APIs & Services - Library](https://console.cloud.google.com/apis/library)
2. Search for "Google Drive API"
3. Click on it and click **"Enable"**

### Step 4: Generate OAuth Token

1. Install Python dependencies:
   ```bash
   pip install google-api-python-client google-auth-httplib2 google-auth-oauthlib
   ```

2. Run the token generation script:
   ```bash
   python scripts/google-drive/generate_oauth_token.py
   ```

3. A browser window will open:
   - Sign in with your Google account
   - Grant permission to access Google Drive
   - The script will complete and display a JSON token

4. Copy the entire JSON output (it will be displayed between `=====` lines)

### Step 5: Add GitHub Secrets

1. Go to your GitHub repository
2. Navigate to: **Settings** → **Secrets and variables** → **Actions**
3. Create/update the following secrets:

   **`GOOGLE_DRIVE_OAUTH_TOKEN`**
   - Paste the JSON token you copied from Step 4
   - This is the OAuth token that allows the workflow to access your Google Drive

   **`GOOGLE_DRIVE_FOLDER_ID`**
   - Your Google Drive folder ID (e.g., `17qbAweS7p1Gkz44Hwj-XvdUNRukVqZnJ`)
   - To find it: Open the folder in Google Drive and copy the ID from the URL:
     `https://drive.google.com/drive/folders/FOLDER_ID_HERE`

### Step 6: Test the Workflow

1. Go to the **Actions** tab in your GitHub repository
2. Run the workflow manually (or it will run on schedule/PR)
3. Check the logs to verify the upload succeeded

## ⚠️ CRITICAL: Publish Your OAuth App to Prevent Token Expiration

**If your tokens expire every 2 weeks, your OAuth app is in "Testing" mode!**

### The Problem
When an OAuth app is in "Testing" mode (unpublished), Google has strict expiration policies:
- **Refresh tokens expire after 7 days of inactivity** (or sometimes 2 weeks)
- This causes frequent token regeneration

### The Solution: Publish Your OAuth App

**Publishing your app makes refresh tokens last much longer (6+ months of inactivity).**

1. Go to [OAuth Consent Screen](https://console.cloud.google.com/apis/credentials/consent)
2. Scroll to the top of the page
3. Click **"PUBLISH APP"** button
4. Confirm the publication
5. Your app is now published (no verification needed for basic scopes like Drive)

**Benefits:**
- ✅ Refresh tokens last 6+ months instead of 2 weeks
- ✅ No more frequent token regeneration
- ✅ More reliable automation

**Note:** Publishing doesn't make your app public - it just removes the strict testing restrictions. Only you (and test users if you add them) can use it.

## Token Expiration

### How OAuth Tokens Work

The OAuth token contains two parts:
- **Access Token**: Short-lived (expires after **1 hour**)
- **Refresh Token**: Long-lived (can last indefinitely if used regularly)

### Automatic Token Refresh

The workflow automatically refreshes the access token using the refresh token, so you typically **won't need to regenerate** the token frequently. The refresh happens automatically when the access token expires.

### When You Need to Regenerate

You'll need to run `generate_oauth_token.py` again and update the secret if:

1. **Refresh token expires**: 
   - **Published app**: After **6 months of inactivity** (no workflow runs)
   - **Testing app**: After **7 days to 2 weeks** of inactivity ⚠️
2. **Access revoked**: You revoke access in [Google Account Security](https://myaccount.google.com/security)
3. **OAuth app deleted**: The OAuth client is deleted or modified in Google Cloud Console
4. **Password changed**: In some cases, changing your Google account password can invalidate tokens

### How to Regenerate

If the workflow fails with authentication errors:

1. Run `python scripts/google-drive/generate_oauth_token.py` again
2. Copy the new JSON token
3. Update the `GOOGLE_DRIVE_OAUTH_TOKEN` secret in GitHub

## Troubleshooting

### Error 403: access_denied

**This is the most common error!** It means your email isn't added as a test user.

**To fix:**
1. Go to [OAuth Consent Screen](https://console.cloud.google.com/apis/credentials/consent)
2. Scroll down to **"Test users"** section
3. Click **"+ ADD USERS"**
4. Add your Google account email (the exact email you're using to sign in)
5. Click **"Add"** and **"Save"**
6. Wait a minute for changes to propagate
7. Run `generate_oauth_token.py` again

**Alternative:** If you want to make the app available to all users:
- Scroll to the top of the OAuth consent screen
- Click **"PUBLISH APP"**
- Confirm the publication
- This removes the test user restriction

### "GOOGLE_DRIVE_OAUTH_TOKEN secret is not set"
- Make sure you've added the secret in GitHub repository settings
- Check the secret name is exactly `GOOGLE_DRIVE_OAUTH_TOKEN`

### "Invalid token" or "Token expired"
- Regenerate the token using `generate_oauth_token.py`
- Update the secret in GitHub

### "Folder not found"
- Verify the `GOOGLE_DRIVE_FOLDER_ID` secret contains the correct folder ID
- Make sure the folder exists and is accessible with your Google account

### "Permission denied"
- Ensure the OAuth token was generated with the same Google account that owns the folder
- Check that the Google Drive API is enabled in your Google Cloud project

## Security Notes

- **Never commit** `credentials.json` or `token.json` to the repository
- Keep your OAuth tokens secure
- The token grants access to your Google Drive, so treat it as sensitive information
- If a token is compromised, revoke it in [Google Account Security](https://myaccount.google.com/security)

## Automated Token Monitoring

A GitHub workflow automatically checks token health weekly and sends Slack alerts if the token expires:

- **Workflow**: `.github/workflows/google-drive-token-check.yml`
- **Schedule**: Runs every Monday at 9 AM UTC
- **Alerts**: Sends Slack notification if token is expired or needs attention

You can also manually validate tokens:
```bash
python google-drive/validate_token.py
```

## Files in this Directory

- `upload_to_drive.py` - Script used by GitHub Actions to upload files to Google Drive
- `generate_oauth_token.py` - Script to generate OAuth tokens locally
- `validate_token.py` - Script to validate token health (used by monitoring workflow)
- `README.md` - This file (setup and troubleshooting guide)

