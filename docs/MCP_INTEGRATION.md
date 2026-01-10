# MCP Integration Guide

HALOpy provides **Model Context Protocol (MCP) ready** API endpoints for generating statistics charts programmatically. These endpoints are designed for easy integration with AI assistants, automation tools, and external reporting systems.

## Overview

The statistics API endpoints return ready-to-use PNG graphics without requiring authentication or complex setup. They are stateless, RESTful, and work perfectly for:
- MCP servers for AI assistants (Claude, GPT, etc.)
- Automated reporting pipelines
- External data visualization tools
- Third-party integrations

## API Endpoints

### Monthly Statistics Chart

Generate activity charts for a specific month.

**Endpoint:**
```
GET /api/monthly-stats?mm={month}&jj={year}&format={format}
```

**Parameters:**
- `mm` (required): Month number (1-12)
- `jj` (required): Year (2-digit: 50-99 = 1950-1999, 00-49 = 2000-2049)
- `format` (required): Chart format
  - `linegraph`: Line chart with spline smoothing (red=real activity, green=relative activity)
  - `bargraph`: Bar chart with side-by-side bars (red=real, green=relative)

**Response:**
- Content-Type: `image/png`
- Returns: PNG image (typically 1200x600px, 150 DPI)

**Examples:**
```bash
# Line chart for January 1988
curl "http://localhost:5000/api/monthly-stats?mm=1&jj=88&format=linegraph" -o jan88_line.png

# Bar chart for December 2024
curl "http://localhost:5000/api/monthly-stats?mm=12&jj=24&format=bargraph" -o dec24_bar.png
```

### Annual Statistics Chart

Generate activity charts for an entire year (all 12 months).

**Endpoint:**
```
GET /api/annual-stats?jj={year}&format={format}
```

**Parameters:**
- `jj` (required): Year (2-digit: 50-99 = 1950-1999, 00-49 = 2000-2049)
- `format` (required): Chart format
  - `linegraph`: Line chart showing monthly trends
  - `bargraph`: Bar chart showing monthly comparison

**Response:**
- Content-Type: `image/png`
- Returns: PNG image (typically 1200x600px, 150 DPI)

**Examples:**
```bash
# Line chart for year 1988
curl "http://localhost:5000/api/annual-stats?jj=88&format=linegraph" -o year88_line.png

# Bar chart for year 2024
curl "http://localhost:5000/api/annual-stats?jj=24&format=bargraph" -o year24_bar.png
```

## Chart Features

### Line Charts
- **Spline smoothing**: Natural boundary conditions with cubic interpolation (k=3)
- **Dual datasets**: Red line (real activity), Green line (relative activity)
- **Data points**: Visible markers on actual observation points
- **Subtitle**: Shows total observation count (e.g., "berechnet aus 1234 Einzelbeobachtungen")
- **Axes**: Labeled with day/month (x-axis) and activity value (y-axis)

### Bar Charts
- **Side-by-side bars**: Red (real activity) and Green (relative activity)
- **Normalized data**: Relative activity normalized to 30-day months
- **Subtitle**: Shows total observation count
- **Clean layout**: No overlapping bars, clear separation

## MCP Server Implementation

### Python Example (using `mcp` library)

```python
import requests
from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.types import Tool, TextContent, ImageContent

server = Server("halo-stats")

@server.list_tools()
async def list_tools() -> list[Tool]:
    return [
        Tool(
            name="generate_monthly_stats",
            description="Generate halo activity chart for a specific month",
            inputSchema={
                "type": "object",
                "properties": {
                    "month": {"type": "integer", "minimum": 1, "maximum": 12},
                    "year": {"type": "integer", "minimum": 50, "maximum": 99},
                    "format": {"type": "string", "enum": ["linegraph", "bargraph"]}
                },
                "required": ["month", "year", "format"]
            }
        ),
        Tool(
            name="generate_annual_stats",
            description="Generate halo activity chart for an entire year",
            inputSchema={
                "type": "object",
                "properties": {
                    "year": {"type": "integer", "minimum": 50, "maximum": 99},
                    "format": {"type": "string", "enum": ["linegraph", "bargraph"]}
                },
                "required": ["year", "format"]
            }
        )
    ]

@server.call_tool()
async def call_tool(name: str, arguments: dict):
    if name == "generate_monthly_stats":
        url = f"http://localhost:5000/api/monthly-stats?mm={arguments['month']}&jj={arguments['year']}&format={arguments['format']}"
        response = requests.get(url)
        return [ImageContent(type="image", data=response.content, mimeType="image/png")]
    
    elif name == "generate_annual_stats":
        url = f"http://localhost:5000/api/annual-stats?jj={arguments['year']}&format={arguments['format']}"
        response = requests.get(url)
        return [ImageContent(type="image", data=response.content, mimeType="image/png")]

if __name__ == "__main__":
    stdio_server(server)
```

### Usage with Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "halo-stats": {
      "command": "python",
      "args": ["path/to/halo_mcp_server.py"]
    }
  }
}
```

Then in Claude:
```
Generate a line chart showing halo activity for January 1988.
```

Claude will call the MCP tool and display the chart inline.

## Data Requirements

For the API endpoints to return meaningful data:
1. HALOpy server must be running (`python halo.py`)
2. A CSV observation file must be loaded
3. The requested month/year must have observation data

**Empty Results**: If no data exists for the requested period, the chart will still be generated but show zero activity (flat lines or empty bars).

## Error Handling

**HTTP Status Codes:**
- `200 OK`: Chart generated successfully
- `400 Bad Request`: Invalid parameters (missing mm/jj/format, or out of range)
- `500 Internal Server Error`: Server-side error during chart generation

**Error Response Format:**
```json
{
  "error": "Error message describing the problem"
}
```

## Performance Notes

- **Generation time**: Typically 200-500ms per chart
- **Caching**: Not implemented - each request generates fresh chart
- **Concurrent requests**: Supported (Flask handles multiple requests)
- **File size**: PNG images typically 50-150 KB

## Security Considerations

**Current Status**: No authentication required (localhost deployment)

**For Production Deployment:**
- Add API key authentication
- Implement rate limiting
- Use HTTPS for encrypted transport
- Consider adding CORS headers for web integrations

## Future Enhancements

Planned for future versions:
- JSON data endpoints (raw statistics without charts)
- SVG output format (scalable vector graphics)
- Customizable chart dimensions and DPI
- Date range filtering for multi-month analysis
- Observer-specific statistics

## Related Documentation

- [HALO_DATA_FORMAT.md](HALO_DATA_FORMAT.md) - Observation data structure
- [AUTO_UPDATE.md](AUTO_UPDATE.md) - Observer metadata updates
- [README.md](../README.md) - Main project documentation

---

**Last Updated**: January 11, 2026  
**API Version**: 1.0  
**HALOpy Version**: 2025-2026 Migration
