#!/usr/bin/env python3
"""
Upload a file to Google Drive using OAuth credentials.

This script is used by GitHub Actions to upload storefront zip files to Google Drive.
"""

import json
import os
import sys
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload
from googleapiclient.errors import HttpError


def get_credentials():
    """
    Get OAuth credentials from environment variable and refresh if needed.
    
    The credentials object automatically handles token refresh using the
    refresh_token when the access token expires (after 1 hour).
    """
    token_json = os.environ.get('GOOGLE_DRIVE_OAUTH_TOKEN')
    if not token_json:
        raise ValueError("GOOGLE_DRIVE_OAUTH_TOKEN environment variable is not set")
    
    try:
        token_info = json.loads(token_json)
        credentials = Credentials.from_authorized_user_info(token_info)
        
        # Refresh the token if it's expired and we have a refresh token
        if credentials.expired and credentials.refresh_token:
            print("🔄 Access token expired, refreshing...")
            credentials.refresh(Request())
            print("✅ Token refreshed successfully")
        
        return credentials
    except json.JSONDecodeError as e:
        raise ValueError(f"Invalid JSON in GOOGLE_DRIVE_OAUTH_TOKEN: {e}")
    except Exception as e:
        if "invalid_grant" in str(e).lower() or "token has been expired or revoked" in str(e).lower():
            raise ValueError(
                "Refresh token has expired or been revoked. "
                "Please regenerate the OAuth token using generate_oauth_token.py"
            ) from e
        raise


def find_existing_file(service, file_name: str, folder_id: str) -> str:
    """
    Find an existing file with the same name in the specified folder.
    
    Args:
        service: Google Drive API service object
        file_name: Name of the file to search for
        folder_id: Google Drive folder ID to search in
    
    Returns:
        File ID if found, None otherwise
    """
    try:
        # Search for files with the same name in the folder
        query = f"name='{file_name}' and '{folder_id}' in parents and trashed=false"
        results = service.files().list(
            q=query,
            fields='files(id, name)',
            pageSize=1
        ).execute()
        
        files = results.get('files', [])
        if files:
            return files[0]['id']
        return None
    except HttpError as error:
        print(f"⚠️  Warning: Could not search for existing file: {error}")
        return None


def delete_old_files_by_pattern(service, pattern_prefix: str, folder_id: str, exclude_name: str = None) -> int:
    """
    Delete all files matching a pattern prefix in the specified folder.
    
    Args:
        service: Google Drive API service object
        pattern_prefix: Prefix to match file names (e.g., "[CLEAN-THEME]")
        folder_id: Google Drive folder ID to search in
        exclude_name: Optional file name to exclude from deletion
    
    Returns:
        Number of files deleted
    """
    try:
        # Search for files starting with the prefix
        query = f"name contains '{pattern_prefix}' and '{folder_id}' in parents and trashed=false"
        
        results = service.files().list(
            q=query,
            fields='files(id, name)'
        ).execute()
        
        files = results.get('files', [])
        deleted_count = 0
        
        for file in files:
            # Skip the file we're about to upload
            if exclude_name and file['name'] == exclude_name:
                continue
                
            try:
                service.files().delete(fileId=file['id']).execute()
                print(f"🗑️  Deleted old file: {file['name']}")
                deleted_count += 1
            except HttpError as error:
                print(f"⚠️  Warning: Could not delete file '{file['name']}': {error}")
        
        return deleted_count
    except HttpError as error:
        print(f"⚠️  Warning: Could not search for old files: {error}")
        return 0


def upload_file_to_drive(file_path: str, folder_id: str, overwrite: bool = True) -> dict:
    """
    Upload a file to Google Drive, optionally overwriting an existing file with the same name.
    
    Args:
        file_path: Path to the file to upload
        folder_id: Google Drive folder ID where the file should be uploaded
        overwrite: If True, overwrite existing file with the same name. If False, create a new file.
    
    Returns:
        Dictionary containing file information (id, name, webViewLink)
    
    Raises:
        ValueError: If required parameters are missing
        HttpError: If the upload fails
    """
    if not file_path:
        raise ValueError("File path is required")
    
    if not folder_id:
        raise ValueError("Folder ID is required")
    
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"File not found: {file_path}")
    
    # Get credentials and build service
    credentials = get_credentials()
    service = build('drive', 'v3', credentials=credentials)
    
    # Prepare file metadata
    file_name = os.path.basename(file_path)
    
    # Delete old files matching the pattern before uploading
    # This ensures only the latest file remains on Google Drive
    if overwrite and '[CLEAN-THEME]' in file_name:
        print(f"🧹 Cleaning up old files matching pattern '[CLEAN-THEME]'...")
        deleted_count = delete_old_files_by_pattern(service, '[CLEAN-THEME]', folder_id, exclude_name=file_name)
        if deleted_count > 0:
            print(f"✅ Deleted {deleted_count} old file(s)")
        else:
            print(f"ℹ️  No old files to clean up")
    
    # Check if file exists and should be overwritten
    existing_file_id = None
    if overwrite:
        existing_file_id = find_existing_file(service, file_name, folder_id)
        if existing_file_id:
            print(f"📋 Found existing file '{file_name}' (ID: {existing_file_id})")
            print(f"🔄 Will overwrite existing file...")
        else:
            print(f"📝 No existing file found, will create new file...")
    
    # Prepare file metadata
    # Note: When updating, we cannot include 'parents' field - it's read-only
    file_metadata = {
        'name': file_name,
        'mimeType': 'application/zip'
    }
    
    # Only include parents when creating a new file
    if not existing_file_id:
        file_metadata['parents'] = [folder_id]
    
    print(f"📤 Uploading {file_name} to Google Drive folder: {folder_id}")
    
    # Upload file
    media = MediaFileUpload(file_path, mimetype='application/zip', resumable=True)
    
    try:
        if existing_file_id:
            # Update existing file (without parents field)
            file = service.files().update(
                fileId=existing_file_id,
                body=file_metadata,
                media_body=media,
                fields='id, name, webViewLink, size'
            ).execute()
            action = "updated"
        else:
            # Create new file (with parents field)
            file = service.files().create(
                body=file_metadata,
                media_body=media,
                fields='id, name, webViewLink, size'
            ).execute()
            action = "uploaded"
        
        file_size = file.get('size', 'unknown')
        print(f"✅ Successfully {action} {file.get('name')} to Google Drive")
        print(f"   File ID: {file.get('id')}")
        print(f"   File size: {file_size} bytes")
        print(f"   View link: {file.get('webViewLink')}")
        
        return file
        
    except HttpError as error:
        print(f"❌ Upload error occurred:")
        print(f"   Status: {error.resp.status}")
        print(f"   Error: {error}")
        
        # Provide helpful error messages
        if error.resp.status == 403:
            print("\n   Troubleshooting:")
            print("   - Check that the OAuth token is valid and not expired")
            print("   - Verify the folder ID is correct")
            print("   - Ensure the Google account has access to the folder")
        elif error.resp.status == 404:
            print("\n   Troubleshooting:")
            print("   - Verify the folder ID exists and is accessible")
            print("   - Check that the folder is shared with the OAuth account")
        
        raise


def main():
    """Main entry point for the script."""
    try:
        # Get parameters from environment variables
        zip_file = os.environ.get('ZIP_FILE')
        folder_id = os.environ.get('GOOGLE_DRIVE_FOLDER_ID')
        
        if not zip_file:
            raise ValueError("ZIP_FILE environment variable is not set")
        
        if not folder_id:
            raise ValueError("GOOGLE_DRIVE_FOLDER_ID environment variable is not set")
        
        # Upload the file (overwrite if exists)
        upload_file_to_drive(zip_file, folder_id, overwrite=True)
        
        sys.exit(0)
        
    except (ValueError, FileNotFoundError) as e:
        print(f"❌ Error: {e}", file=sys.stderr)
        sys.exit(1)
    except HttpError as e:
        print(f"❌ Google Drive API error: {e}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"❌ Unexpected error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()

