#!/usr/bin/env python3
"""
Generate OAuth token for Google Drive API
Run this script locally to generate a token for GitHub Actions

Requirements:
    pip install google-api-python-client google-auth-httplib2 google-auth-oauthlib

Steps:
    1. Create OAuth credentials in Google Cloud Console:
       - Go to: https://console.cloud.google.com/apis/credentials
       - Create OAuth 2.0 Client ID (Desktop app)
       - Download the JSON file and save it as 'credentials.json' in this directory
    
    2. Run this script:
       python scripts/google-drive/generate_oauth_token.py
    
    3. Copy the JSON output and add it as GOOGLE_DRIVE_OAUTH_TOKEN in GitHub Secrets
"""

import os.path
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
import json

# Scopes required for Google Drive
SCOPES = ['https://www.googleapis.com/auth/drive.file']

def main():
    creds = None
    # The file token.json stores the user's access and refresh tokens
    if os.path.exists('token.json'):
        creds = Credentials.from_authorized_user_file('token.json', SCOPES)
    
    # If there are no (valid) credentials available, let the user log in
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            print("Refreshing expired token...")
            creds.refresh(Request())
        else:
            # You need to download credentials.json from Google Cloud Console
            if not os.path.exists('credentials.json'):
                print("ERROR: credentials.json not found!")
                print("\nTo generate credentials.json:")
                print("1. Go to https://console.cloud.google.com/apis/credentials")
                print("2. Click 'Create Credentials' → 'OAuth client ID'")
                print("3. Choose 'Desktop app' as the application type")
                print("4. Name it (e.g., 'GitHub Actions Drive Upload')")
                print("5. Click 'Create' and download the JSON file")
                print("6. Save it as 'credentials.json' in this directory (scripts/google-drive/)")
                return
            
            print("Starting OAuth flow...")
            print("A browser window will open for authentication.")
            try:
                flow = InstalledAppFlow.from_client_secrets_file('credentials.json', SCOPES)
                creds = flow.run_local_server(port=0)
            except Exception as e:
                error_msg = str(e)
                if "access_denied" in error_msg or "403" in error_msg:
                    print("\n" + "="*70)
                    print("❌ ERROR: Access Denied (403)")
                    print("="*70)
                    print("\nThis usually means your email isn't added as a test user.")
                    print("\nTo fix this:")
                    print("1. Go to: https://console.cloud.google.com/apis/credentials/consent")
                    print("2. Make sure you're on the 'OAuth consent screen' tab")
                    print("3. Check the 'User type' - it should be 'External' (or 'Internal' if you have Workspace)")
                    print("4. Scroll down to 'Test users' section")
                    print("5. Click '+ ADD USERS'")
                    print("6. Add your Google account email address")
                    print("7. Click 'SAVE'")
                    print("8. Wait a minute, then run this script again")
                    print("\nAlternatively, if you want to publish the app:")
                    print("- Scroll to the top and click 'PUBLISH APP'")
                    print("- This makes it available to all users (not just test users)")
                    print("="*70)
                else:
                    print(f"\n❌ Error: {error_msg}")
                raise
        
        # Save the credentials for the next run
        token_dict = {
            'token': creds.token,
            'refresh_token': creds.refresh_token,
            'token_uri': creds.token_uri,
            'client_id': creds.client_id,
            'client_secret': creds.client_secret,
            'scopes': creds.scopes
        }
        with open('token.json', 'w') as token:
            json.dump(token_dict, token)
    
    # Convert credentials to dict for GitHub Secrets
    token_dict = {
        'token': creds.token,
        'refresh_token': creds.refresh_token,
        'token_uri': creds.token_uri,
        'client_id': creds.client_id,
        'client_secret': creds.client_secret,
        'scopes': creds.scopes
    }
    
    # Output the token JSON for GitHub Secrets
    print("\n" + "="*70)
    print("Copy this JSON and add it as GOOGLE_DRIVE_OAUTH_TOKEN secret in GitHub:")
    print("="*70)
    print(json.dumps(token_dict, indent=2))
    print("="*70)
    print("\n✅ Token generated successfully!")
    print("\nNext steps:")
    print("1. Go to your GitHub repository")
    print("2. Settings → Secrets and variables → Actions")
    print("3. Create/update secret: GOOGLE_DRIVE_OAUTH_TOKEN")
    print("4. Paste the JSON above")
    print("5. Save the secret")
    print("\n📋 Token Expiration Information:")
    print("   • Access token: Expires after 1 hour")
    print("   • Refresh token: Can last indefinitely if used regularly")
    print("   • Refresh token expiration: 6 months of inactivity")
    print("\n   The workflow automatically refreshes the access token using the")
    print("   refresh_token, so you typically won't need to regenerate unless:")
    print("   - The refresh token expires (6 months of no use)")
    print("   - You revoke access in Google Account settings")
    print("   - The OAuth app is deleted or modified")
    print("\n   If the workflow fails with authentication errors, run this script")
    print("   again to generate a new token and update the secret.")

if __name__ == '__main__':
    main()

