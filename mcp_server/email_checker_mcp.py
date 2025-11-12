#!/usr/bin/env python3
"""
Email Checker MCP Server
MCP server for email validation and processing functionality
"""

import asyncio
import json
import sys
from typing import Any, Dict, List, Optional, Sequence
from mcp.server import Server
from mcp.server.models import InitializationOptions
from mcp.server.stdio import stdio_server
from mcp.types import (
    Resource,
    Tool,
    TextContent,
    ImageContent,
    EmbeddedResource,
    LoggingLevel
)
from pathlib import Path

# Add the project root to the path
sys.path.append(str(Path(__file__).parent.parent))

# Import email checker modules
try:
    from email_checker import EmailChecker
    from metadata_database import MetadataDatabase
    from smart_filter_processor_v2 import SmartFilterProcessor
except ImportError as e:
    print(f"Warning: Could not import email checker modules: {e}", file=sys.stderr)

server = Server("email-checker-mcp")

@server.list_tools()
async def handle_list_tools() -> List[Tool]:
    """List available tools"""
    return [
        Tool(
            name="check_emails",
            description="Validate email addresses against blocklists",
            inputSchema={
                "type": "object",
                "properties": {
                    "emails": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "List of email addresses to validate"
                    },
                    "exclude_duplicates": {
                        "type": "boolean",
                        "description": "Exclude duplicate emails",
                        "default": True
                    }
                },
                "required": ["emails"]
            }
        ),
        Tool(
            name="get_email_metadata",
            description="Get metadata for specific email from database",
            inputSchema={
                "type": "object",
                "properties": {
                    "email": {
                        "type": "string",
                        "description": "Email address to lookup"
                    }
                },
                "required": ["email"]
            }
        ),
        Tool(
            name="apply_smart_filter",
            description="Apply smart filter to email list with industry-specific scoring",
            inputSchema={
                "type": "object",
                "properties": {
                    "input_file": {
                        "type": "string",
                        "description": "Path to input email list file"
                    },
                    "filter_config": {
                        "type": "string",
                        "description": "Filter configuration name",
                        "default": "italy_hydraulics"
                    },
                    "output_format": {
                        "type": "string",
                        "enum": ["txt", "csv", "json"],
                        "description": "Output format",
                        "default": "txt"
                    }
                },
                "required": ["input_file"]
            }
        ),
        Tool(
            name="get_processing_status",
            description="Get status of email processing operations",
            inputSchema={
                "type": "object",
                "properties": {
                    "pattern": {
                        "type": "string",
                        "description": "File pattern to filter results"
                    }
                }
            }
        ),
        Tool(
            name="start_web_server",
            description="Start the web interface server",
            inputSchema={
                "type": "object",
                "properties": {
                    "port": {
                        "type": "integer",
                        "description": "Port number for the server",
                        "default": 8080
                    }
                }
            }
        )
    ]

@server.call_tool()
async def handle_call_tool(name: str, arguments: Optional[Dict[str, Any]]) -> List[TextContent | ImageContent | EmbeddedResource]:
    """Handle tool calls"""

    if name == "check_emails":
        emails = arguments.get("emails", [])
        exclude_duplicates = arguments.get("exclude_duplicates", True)

        try:
            checker = EmailChecker()
            results = checker.check_email_list(emails, exclude_duplicates)

            return [TextContent(
                type="text",
                text=json.dumps(results, indent=2)
            )]
        except Exception as e:
            return [TextContent(
                type="text",
                text=f"Error checking emails: {str(e)}"
            )]

    elif name == "get_email_metadata":
        email = arguments.get("email")

        try:
            db = MetadataDatabase()
            metadata = db.get_email_metadata(email)

            return [TextContent(
                type="text",
                text=json.dumps(metadata, indent=2, default=str)
            )]
        except Exception as e:
            return [TextContent(
                type="text",
                text=f"Error getting metadata: {str(e)}"
            )]

    elif name == "apply_smart_filter":
        input_file = arguments.get("input_file")
        filter_config = arguments.get("filter_config", "italy_hydraulics")
        output_format = arguments.get("output_format", "txt")

        try:
            processor = SmartFilterProcessor()
            results = processor.process_file(
                input_file,
                filter_config=filter_config,
                output_format=output_format
            )

            return [TextContent(
                type="text",
                text=f"Smart filter applied successfully:\n{json.dumps(results, indent=2, default=str)}"
            )]
        except Exception as e:
            return [TextContent(
                type="text",
                text=f"Error applying smart filter: {str(e)}"
            )]

    elif name == "get_processing_status":
        pattern = arguments.get("pattern", "*")

        try:
            checker = EmailChecker()
            status = checker.get_status(pattern)

            return [TextContent(
                type="text",
                text=json.dumps(status, indent=2, default=str)
            )]
        except Exception as e:
            return [TextContent(
                type="text",
                text=f"Error getting status: {str(e)}"
            )]

    elif name == "start_web_server":
        port = arguments.get("port", 8080)

        try:
            import subprocess
            result = subprocess.run([
                "python3", "web_server.py", "--port", str(port)
            ], capture_output=True, text=True, timeout=5)

            return [TextContent(
                type="text",
                text=f"Web server started on port {port}\nOutput: {result.stdout}"
            )]
        except subprocess.TimeoutExpired:
            return [TextContent(
                type="text",
                text=f"Web server starting on port {port}..."
            )]
        except Exception as e:
            return [TextContent(
                type="text",
                text=f"Error starting web server: {str(e)}"
            )]

    else:
        return [TextContent(
            type="text",
            text=f"Unknown tool: {name}"
        )]

async def main():
    """Main server entry point"""
    # Use stdio server
    async with stdio_server() as (read_stream, write_stream):
        await server.run(
            read_stream,
            write_stream,
            InitializationOptions(
                server_name="email-checker-mcp",
                server_version="1.0.0",
                capabilities=server.get_capabilities(
                    notification_options=None,
                    experimental_capabilities=None,
                ),
            ),
        )

if __name__ == "__main__":
    asyncio.run(main())