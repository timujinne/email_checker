#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Email Records API - CRUD operations for individual email management
Provides endpoints for paginated listing, filtering, bulk operations, and export
"""

import json
import logging
import time
from typing import Dict, List, Tuple, Optional, Any
from urllib.parse import parse_qs, urlparse
from datetime import datetime
import csv
import io

from metadata_database import MetadataDatabase, EmailMetadata

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger('email_records_api')

# Initialize database connection
db = MetadataDatabase()


def parse_request_body(handler) -> Dict:
    """Parse JSON request body from handler"""
    try:
        content_length = int(handler.headers['Content-Length'])
        post_data = handler.rfile.read(content_length)
        return json.loads(post_data.decode('utf-8'))
    except Exception as e:
        logger.error(f"Error parsing request body: {e}")
        return {}


def send_json_response(handler, data: Any, status_code: int = 200):
    """Send JSON response with proper headers"""
    handler.send_response(status_code)
    handler.send_header('Content-Type', 'application/json')
    handler.end_headers()
    handler.wfile.write(json.dumps(data, ensure_ascii=False).encode('utf-8'))


def handle_get_emails(handler):
    """
    GET /api/emails - Get paginated email list with filters

    Query Parameters:
    - page: Page number (default: 1)
    - page_size: Results per page (default: 100, max: 10000)
    - sort_by: Sort column (email, domain, company_name, country, category, etc.)
    - sort_order: asc or desc
    - filters: JSON encoded filter object
    """
    start_time = time.time()

    try:
        # Parse query parameters
        query_params = parse_qs(urlparse(handler.path).query)

        # Get pagination parameters
        page = int(query_params.get('page', ['1'])[0])
        page_size = min(int(query_params.get('page_size', ['100'])[0]), 10000)
        sort_by = query_params.get('sort_by', ['email'])[0]
        sort_order = query_params.get('sort_order', ['asc'])[0]

        # Parse filters if provided
        filters = {}
        if 'filters' in query_params:
            try:
                filters = json.loads(query_params['filters'][0])
            except json.JSONDecodeError:
                logger.warning("Invalid filters JSON, ignoring filters")

        # Get paginated emails from database
        emails, total_count = db.get_emails_paginated(
            page=page,
            page_size=page_size,
            sort_by=sort_by,
            sort_order=sort_order,
            filters=filters
        )

        # Convert EmailMetadata objects to dictionaries
        email_dicts = []
        for email in emails:
            email_dict = {
                'email': email.email,
                'domain': email.domain,
                'company_name': email.company_name,
                'source_file': email.source_file,
                'country': email.country,
                'category': email.category,
                'phone': email.phone,
                'validation_status': email.validation_status,
                'city': email.city,
                'address': email.address,
                'page_title': email.page_title,
                'source_url': email.source_url,
                'meta_description': email.meta_description,
                'meta_keywords': email.meta_keywords,
                'created_at': email.created_at,
                'updated_at': email.updated_at,
                'country_mismatch': email.country_mismatch
            }
            email_dicts.append(email_dict)

        # Calculate pagination info
        total_pages = (total_count + page_size - 1) // page_size
        has_next = page < total_pages
        has_prev = page > 1

        response = {
            'success': True,
            'data': {
                'emails': email_dicts,
                'pagination': {
                    'page': page,
                    'page_size': page_size,
                    'total_records': total_count,
                    'total_pages': total_pages,
                    'has_next': has_next,
                    'has_prev': has_prev
                },
                'filters_applied': filters
            }
        }

        duration = time.time() - start_time
        logger.info(f"GET /api/emails - {duration:.2f}s - {len(emails)} results (page {page}/{total_pages})")

        send_json_response(handler, response)

    except Exception as e:
        logger.error(f"Error in handle_get_emails: {e}", exc_info=True)
        send_json_response(handler, {
            'success': False,
            'error': str(e)
        }, 500)


def handle_get_email_count(handler):
    """
    GET /api/emails/count - Get total count with filters
    """
    try:
        # Parse query parameters
        query_params = parse_qs(urlparse(handler.path).query)

        # Parse filters
        filters = {}
        if 'filters' in query_params:
            try:
                filters = json.loads(query_params['filters'][0])
            except json.JSONDecodeError:
                logger.warning("Invalid filters JSON, ignoring filters")

        # Get count from database
        _, total_count = db.get_emails_paginated(
            page=1,
            page_size=1,
            filters=filters
        )

        response = {
            'success': True,
            'count': total_count,
            'filters_applied': filters
        }

        send_json_response(handler, response)

    except Exception as e:
        logger.error(f"Error in handle_get_email_count: {e}")
        send_json_response(handler, {
            'success': False,
            'error': str(e)
        }, 500)


def handle_get_single_email(handler, email: str):
    """
    GET /api/emails/:email - Get single email details
    """
    try:
        # Decode email from URL
        import urllib.parse
        email = urllib.parse.unquote(email)

        # Get email metadata from database
        metadata = db.get_email_metadata(email)

        if metadata:
            email_dict = {
                'email': metadata.email,
                'domain': metadata.domain,
                'company_name': metadata.company_name,
                'source_file': metadata.source_file,
                'country': metadata.country,
                'category': metadata.category,
                'phone': metadata.phone,
                'validation_status': metadata.validation_status,
                'validation_date': metadata.validation_date,
                'validation_log': metadata.validation_log,
                'city': metadata.city,
                'address': metadata.address,
                'page_title': metadata.page_title,
                'source_url': metadata.source_url,
                'meta_description': metadata.meta_description,
                'meta_keywords': metadata.meta_keywords,
                'keywords': metadata.keywords,
                'list_country': metadata.list_country,
                'country_mismatch': metadata.country_mismatch,
                'created_at': metadata.created_at,
                'updated_at': metadata.updated_at
            }

            response = {
                'success': True,
                'data': email_dict
            }
        else:
            response = {
                'success': False,
                'error': 'Email not found'
            }

        send_json_response(handler, response, 200 if metadata else 404)

    except Exception as e:
        logger.error(f"Error in handle_get_single_email: {e}")
        send_json_response(handler, {
            'success': False,
            'error': str(e)
        }, 500)


def handle_bulk_update_emails(handler):
    """
    POST /api/emails/bulk-update - Update multiple emails

    Request Body:
    {
        "emails": ["email1@example.com", "email2@example.com"],
        "updates": {
            "validation_status": "Invalid",
            "category": "Excluded",
            "country": "Italy"
        }
    }
    """
    try:
        data = parse_request_body(handler)

        if 'emails' not in data or 'updates' not in data:
            send_json_response(handler, {
                'success': False,
                'error': 'Missing required fields: emails, updates'
            }, 400)
            return

        emails = data['emails']
        updates = data['updates']

        if not emails or not updates:
            send_json_response(handler, {
                'success': False,
                'error': 'emails and updates cannot be empty'
            }, 400)
            return

        # Track results
        updated_count = 0
        failed_count = 0
        errors = []

        # Update each field
        for field_name, new_value in updates.items():
            # Validate field name
            allowed_fields = [
                'validation_status', 'country', 'category', 'city',
                'company_name', 'phone', 'address', 'list_country'
            ]

            if field_name not in allowed_fields:
                errors.append(f"Field '{field_name}' is not allowed for bulk update")
                continue

            # Perform batch update
            success, count = db.batch_update_field(
                emails=emails,
                field_name=field_name,
                new_value=new_value
            )

            if success:
                updated_count = max(updated_count, count)  # Use max as same emails updated
            else:
                failed_count += len(emails)
                errors.append(f"Failed to update field '{field_name}'")

        response = {
            'success': failed_count == 0,
            'updated': updated_count,
            'failed': failed_count,
            'errors': errors
        }

        logger.info(f"Bulk update: {updated_count} emails updated, {failed_count} failed")

        send_json_response(handler, response)

    except Exception as e:
        logger.error(f"Error in handle_bulk_update_emails: {e}")
        send_json_response(handler, {
            'success': False,
            'error': str(e)
        }, 500)


def handle_bulk_delete_emails(handler):
    """
    POST /api/emails/bulk-delete - Delete multiple emails

    Request Body:
    {
        "emails": ["email1@example.com", "email2@example.com"]
    }
    """
    try:
        data = parse_request_body(handler)

        if 'emails' not in data:
            send_json_response(handler, {
                'success': False,
                'error': 'Missing required field: emails'
            }, 400)
            return

        emails = data['emails']

        if not emails:
            send_json_response(handler, {
                'success': False,
                'error': 'emails cannot be empty'
            }, 400)
            return

        # Limit bulk delete to prevent accidents
        if len(emails) > 10000:
            send_json_response(handler, {
                'success': False,
                'error': 'Cannot delete more than 10000 emails at once'
            }, 400)
            return

        # Perform bulk delete
        success, deleted_count = db.bulk_delete_emails(emails)

        response = {
            'success': success,
            'deleted': deleted_count,
            'requested': len(emails),
            'errors': [] if success else ['Database operation failed']
        }

        logger.info(f"Bulk delete: {deleted_count}/{len(emails)} emails deleted")

        send_json_response(handler, response)

    except Exception as e:
        logger.error(f"Error in handle_bulk_delete_emails: {e}")
        send_json_response(handler, {
            'success': False,
            'error': str(e)
        }, 500)


def handle_export_emails(handler):
    """
    POST /api/emails/export - Export selected emails

    Request Body:
    {
        "emails": ["email1@example.com", "email2@example.com"],
        "format": "csv",  // csv, json, txt, lvp
        "include_metadata": true,
        "columns": ["email", "domain", "company_name", "phone", "country"]
    }
    """
    try:
        data = parse_request_body(handler)

        if 'emails' not in data:
            send_json_response(handler, {
                'success': False,
                'error': 'Missing required field: emails'
            }, 400)
            return

        emails = data['emails']
        export_format = data.get('format', 'csv').lower()
        include_metadata = data.get('include_metadata', True)
        columns = data.get('columns', [
            'email', 'domain', 'company_name', 'source_file',
            'country', 'category', 'phone', 'validation_status'
        ])

        # Validate format
        if export_format not in ['csv', 'json', 'txt', 'lvp']:
            send_json_response(handler, {
                'success': False,
                'error': f'Invalid format: {export_format}'
            }, 400)
            return

        # Get metadata for all emails
        email_data = []
        for email in emails:
            metadata = db.get_email_metadata(email)
            if metadata:
                email_data.append(metadata)

        # Generate export content based on format
        if export_format == 'txt':
            # Simple text format - one email per line
            content = '\n'.join([e.email for e in email_data])
            content_type = 'text/plain'

        elif export_format == 'json':
            # JSON format with all metadata
            json_data = []
            for metadata in email_data:
                item = {}
                for col in columns:
                    item[col] = getattr(metadata, col, None)
                json_data.append(item)
            content = json.dumps(json_data, indent=2, ensure_ascii=False)
            content_type = 'application/json'

        elif export_format == 'csv':
            # CSV format
            output = io.StringIO()
            writer = csv.DictWriter(output, fieldnames=columns)
            writer.writeheader()

            for metadata in email_data:
                row = {}
                for col in columns:
                    value = getattr(metadata, col, None)
                    row[col] = value if value is not None else ''
                writer.writerow(row)

            content = output.getvalue()
            content_type = 'text/csv'

        elif export_format == 'lvp':
            # LVP XML format
            from lvp_exporter import LVPExporter
            exporter = LVPExporter()

            # Convert EmailMetadata to the format expected by LVP exporter
            emails_with_metadata = []
            for metadata in email_data:
                emails_with_metadata.append({
                    'email': metadata.email,
                    'metadata': {
                        'source_url': metadata.source_url,
                        'domain': metadata.domain,
                        'page_title': metadata.page_title,
                        'meta_description': metadata.meta_description,
                        'meta_keywords': metadata.meta_keywords,
                        'company_name': metadata.company_name,
                        'phone': metadata.phone,
                        'country': metadata.country,
                        'city': metadata.city,
                        'address': metadata.address,
                        'category': metadata.category,
                        'keywords': metadata.keywords,
                        'validation_status': metadata.validation_status,
                        'validation_date': metadata.validation_date
                    }
                })

            # Generate LVP XML
            content = exporter.generate_lvp_content(emails_with_metadata)
            content_type = 'text/xml'

        # Send file response
        filename = f"export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.{export_format}"

        handler.send_response(200)
        handler.send_header('Content-Type', content_type)
        handler.send_header('Content-Disposition', f'attachment; filename="{filename}"')
        handler.end_headers()
        handler.wfile.write(content.encode('utf-8'))

        logger.info(f"Exported {len(email_data)} emails as {export_format}")

    except Exception as e:
        logger.error(f"Error in handle_export_emails: {e}")
        send_json_response(handler, {
            'success': False,
            'error': str(e)
        }, 500)


def handle_delete_email(handler, email: str):
    """
    DELETE /api/emails/:email - Delete single email
    """
    try:
        # Decode email from URL
        import urllib.parse
        email = urllib.parse.unquote(email)

        # Delete from database
        success, deleted_count = db.bulk_delete_emails([email])

        response = {
            'success': success and deleted_count > 0,
            'deleted': deleted_count > 0,
            'email': email
        }

        status_code = 200 if success and deleted_count > 0 else 404

        logger.info(f"Delete email: {email} - {'success' if deleted_count > 0 else 'not found'}")

        send_json_response(handler, response, status_code)

    except Exception as e:
        logger.error(f"Error in handle_delete_email: {e}")
        send_json_response(handler, {
            'success': False,
            'error': str(e)
        }, 500)


def handle_bulk_status_update(handler):
    """
    POST /api/emails/bulk-status - Update validation status for multiple emails

    Request Body:
    {
        "emails": ["email1@example.com", "email2@example.com"],
        "validation_status": "Invalid"
    }
    """
    try:
        data = parse_request_body(handler)

        if 'emails' not in data or 'validation_status' not in data:
            send_json_response(handler, {
                'success': False,
                'error': 'Missing required fields: emails, validation_status'
            }, 400)
            return

        emails = data['emails']
        validation_status = data['validation_status']

        # Validate status
        valid_statuses = ['Valid', 'Invalid', 'NotSure', 'Temp', 'Unknown']
        if validation_status not in valid_statuses:
            send_json_response(handler, {
                'success': False,
                'error': f'Invalid validation_status. Must be one of: {", ".join(valid_statuses)}'
            }, 400)
            return

        # Update validation status
        success, updated_count = db.batch_update_validation_status(emails, validation_status)

        response = {
            'success': success,
            'updated': updated_count,
            'requested': len(emails),
            'validation_status': validation_status
        }

        logger.info(f"Bulk status update: {updated_count}/{len(emails)} emails updated to {validation_status}")

        send_json_response(handler, response)

    except Exception as e:
        logger.error(f"Error in handle_bulk_status_update: {e}")
        send_json_response(handler, {
            'success': False,
            'error': str(e)
        }, 500)


# Export handler functions
__all__ = [
    'handle_get_emails',
    'handle_get_email_count',
    'handle_get_single_email',
    'handle_bulk_update_emails',
    'handle_bulk_delete_emails',
    'handle_export_emails',
    'handle_delete_email',
    'handle_bulk_status_update'
]