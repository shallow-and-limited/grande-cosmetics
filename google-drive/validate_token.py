#!/usr/bin/env python3
"""
Validate Google Drive OAuth token and check if it's still valid.
This script can be used by GitHub Actions to check token health.
"""

import json
import os
import sys
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError


def validate_token(token_json_str: str) -> dict:
    """
    Validate a Google OAuth token.
    
    Args:
        token_json_str: JSON string containing the OAuth token
        
    Returns:
        Dictionary with validation results:
        {
            'valid': bool,
            'error': str or None,
            'can_refresh': bool,
            'message': str
        }
    """
    try:
        token_info = json.loads(token_json_str)
        credentials = Credentials.from_authorized_user_info(token_info)
        
        # Check if we have a refresh token
        has_refresh_token = bool(credentials.refresh_token)
        
        # Try to refresh if expired
        if credentials.expired:
            if has_refresh_token:
                try:
                    credentials.refresh(Request())
                    # If refresh succeeds, token is valid
                    return {
                        'valid': True,
                        'error': None,
                        'can_refresh': True,
                        'message': 'Token expired but successfully refreshed'
                    }
                except Exception as e:
                    error_msg = str(e).lower()
                    if "invalid_grant" in error_msg or "expired" in error_msg or "revoked" in error_msg:
                        return {
                            'valid': False,
                            'error': 'refresh_failed',
                            'can_refresh': False,
                            'message': 'Refresh token has expired or been revoked. Token needs regeneration.'
                        }
                    else:
                        return {
                            'valid': False,
                            'error': 'refresh_error',
                            'can_refresh': True,
                            'message': f'Failed to refresh token: {e}'
                        }
            else:
                return {
                    'valid': False,
                    'error': 'no_refresh_token',
                    'can_refresh': False,
                    'message': 'Token expired and no refresh token available'
                }
        
        # If not expired, test by making a simple API call
        try:
            service = build('drive', 'v3', credentials=credentials)
            # Make a lightweight API call to verify token works
            service.about().get(fields='user').execute()
            
            return {
                'valid': True,
                'error': None,
                'can_refresh': has_refresh_token,
                'message': 'Token is valid and working'
            }
        except HttpError as e:
            if e.resp.status == 401:
                return {
                    'valid': False,
                    'error': 'unauthorized',
                    'can_refresh': has_refresh_token,
                    'message': 'Token is invalid or unauthorized'
                }
            else:
                return {
                    'valid': False,
                    'error': 'api_error',
                    'can_refresh': has_refresh_token,
                    'message': f'API error: {e}'
                }
        except Exception as e:
            return {
                'valid': False,
                'error': 'unknown_error',
                'can_refresh': has_refresh_token,
                'message': f'Unexpected error: {e}'
            }
            
    except json.JSONDecodeError as e:
        return {
            'valid': False,
            'error': 'invalid_json',
            'can_refresh': False,
            'message': f'Invalid JSON in token: {e}'
        }
    except Exception as e:
        return {
            'valid': False,
            'error': 'parse_error',
            'can_refresh': False,
            'message': f'Failed to parse token: {e}'
        }


def main():
    """Main entry point for the script."""
    token_json = os.environ.get('GOOGLE_DRIVE_OAUTH_TOKEN')
    
    if not token_json:
        print("❌ Error: GOOGLE_DRIVE_OAUTH_TOKEN environment variable is not set", file=sys.stderr)
        sys.exit(1)
    
    result = validate_token(token_json)
    
    # Print result as JSON for easy parsing
    print(json.dumps(result, indent=2))
    
    # Exit with appropriate code
    if result['valid']:
        print(f"\n✅ {result['message']}", file=sys.stderr)
        sys.exit(0)
    else:
        print(f"\n❌ {result['message']}", file=sys.stderr)
        if result['error'] == 'refresh_failed':
            print("\n⚠️  ACTION REQUIRED: Regenerate OAuth token", file=sys.stderr)
            print("   Run: python google-drive/generate_oauth_token.py", file=sys.stderr)
            print("   Then update GOOGLE_DRIVE_OAUTH_TOKEN secret in GitHub", file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()

