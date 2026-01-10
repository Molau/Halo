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
- `format` (required): Output format
  - `json`: Structured JSON data (default)
  - `text`: Plain text with pseudographic tables
  - `markdown`: Markdown-formatted tables
  - `linegraph`: PNG line chart with spline smoothing (red=real activity, green=relative activity)
  - `bargraph`: PNG bar chart with side-by-side bars (red=real, green=relative)

**Response:**
- `json`: Content-Type: `application/json`
- `text`: Content-Type: `text/plain; charset=utf-8`
- `markdown`: Content-Type: `text/markdown; charset=utf-8`
- `linegraph`/`bargraph`: Content-Type: `image/png` (typically 1200x600px, 150 DPI)

**Examples:**
```bash
# JSON data for January 1988
curl "http://localhost:5000/api/monthly-stats?mm=1&jj=88&format=json" -o jan88.json

# Plain text with pseudographic tables
curl "http://localhost:5000/api/monthly-stats?mm=1&jj=88&format=text" -o jan88.txt

# Markdown format for documentation
curl "http://localhost:5000/api/monthly-stats?mm=1&jj=88&format=markdown" -o jan88.md

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
- `format` (required): Output format
  - `json`: Structured JSON data (default)
  - `text`: Plain text with pseudographic tables
  - `markdown`: Markdown-formatted tables
  - `linegraph`: PNG line chart showing monthly trends
  - `bargraph`: PNG bar chart showing monthly comparison

**Response:**
- `json`: Content-Type: `application/json`
- `text`: Content-Type: `text/plain; charset=utf-8`
- `markdown`: Content-Type: `text/markdown; charset=utf-8`
- `linegraph`/`bargraph`: Content-Type: `image/png` (typically 1200x600px, 150 DPI)

**Examples:**
```bash
# JSON data for year 1988
curl "http://localhost:5000/api/annual-stats?jj=88&format=json" -o year88.json

# Plain text with pseudographic tables
curl "http://localhost:5000/api/annual-stats?jj=88&format=text" -o year88.txt

# Markdown format for documentation
curl "http://localhost:5000/api/annual-stats?jj=88&format=markdown" -o year88.md

# Line chart for year 1988
curl "http://localhost:5000/api/annual-stats?jj=88&format=linegraph" -o year88_line.png

# Bar chart for year 2024
curl "http://localhost:5000/api/annual-stats?jj=24&format=bargraph" -o year24_bar.png
```

## Data Formats

### JSON Format

Returns structured data with complete statistics:

**Monthly Stats JSON Structure:**
```json
{
  "mm": 1,
  "jj": 88,
  "observer_overview": [...],
  "ee_overview": [...],
  "rare_halos": [...],
  "daily_totals": {...},
  "grand_total": 123,
  "activity_real": {"1": 5.2, "2": 3.1, ...},
  "activity_relative": {"1": 4.8, "2": 2.9, ...},
  "activity_observation_count": 234,
  "count": 500
}
```

**Annual Stats JSON Structure:**
```json
{
  "jj": 88,
  "monthly_stats": {
    "1": {"real": 45.2, "relative": 42.1, "observation_count": 123},
    ...
  },
  "totals": {
    "total_ee": 1234,
    "total_days_sun": 180,
    "total_days_moon": 150,
    "total_days": 200
  },
  "phenomena": [...]
}
```

### Text Format

Plain text with pseudographic box-drawing characters (CP437/DOS style):

```
╔══════════════════════════════════════════════════════════════════════════════════════╗
║                          Monatsstatistik Januar 1988                                 ║
╠════╦══════════╦══════════╦══════════╦══════════╦══════════╦════════════╦═════════════╣
║KKGG║ 1   3   5║   7   9  ║11  13  15║  17  19  ║21  23  25║  27  29  31║ 1) 2) 3) 4) ║
╚════╩══════════╩══════════╩══════════╩══════════╩══════════╩════════════╩═════════════╝
```

**Use cases:**
- Console output
- Legacy system integration
- ASCII art lovers
- Terminal-based tools

### Markdown Format

Clean markdown tables for documentation:

```markdown
## Monthly Statistics: January 1988

### Observer Overview

| KK/GG | Days Observed | ... |
|-------|---------------|-----|
| 44/04 | 15            | ... |
```

**Use cases:**
- README files
- Documentation generation
- GitHub/GitLab integration
- Wiki pages

## Chart Features

### Line Charts (format=linegraph)
- **Spline smoothing**: Natural boundary conditions with cubic interpolation (k=3)
- **Dual datasets**: Red line (real activity), Green line (relative activity)
- **Data points**: Visible markers on actual observation points
- **Subtitle**: Shows total observation count (e.g., "berechnet aus 1234 Einzelbeobachtungen")
- **Axes**: Labeled with day/month (x-axis) and activity value (y-axis)

### Bar Charts (format=bargraph)
- **Side-by-side bars**: Red (real activity) and Green (relative activity)
- **Normalized data**: Relative activity normalized to 30-day months
- **Subtitle**: Shows total observation count
- **Clean layout**: No overlapping bars, clear separation

### Text Tables (format=text)
- **Pseudographic**: Box-drawing characters (DOS/CP437 style: ╔═╗║╠╣╚╝)
- **Fixed-width**: Designed for 80+ character terminals
- **Multi-section**: Observer overview, EE overview, rare halos, daily totals
- **Footnotes**: Numbered explanations for column abbreviations

### Markdown Tables (format=markdown)
- **GitHub-compatible**: Standard markdown table syntax
- **Clean formatting**: Aligned columns with headers
- **Readable**: No special characters, pure markdown
- **Portable**: Works in any markdown renderer

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
            description="Generate halo activity statistics for a specific month in various formats (JSON, text, markdown, charts)",
            inputSchema={
                "type": "object",
                "properties": {
                    "month": {"type": "integer", "minimum": 1, "maximum": 12},
                    "year": {"type": "integer", "minimum": 50, "maximum": 99},
                    "format": {
                        "type": "string", 
                        "enum": ["json", "text", "markdown", "linegraph", "bargraph"],
                        "default": "json"
                    }
                },
                "required": ["month", "year"]
            }
        ),
        Tool(
            name="generate_annual_stats",
            description="Generate halo activity statistics for an entire year in various formats (JSON, text, markdown, charts)",
            inputSchema={
                "type": "object",
                "properties": {
                    "year": {"type": "integer", "minimum": 50, "maximum": 99},
                    "format": {
                        "type": "string",
                        "enum": ["json", "text", "markdown", "linegraph", "bargraph"],
                        "default": "json"
                    }
                },
                "required": ["year"]
            }
        )
    ]

@server.call_tool()
async def call_tool(name: str, arguments: dict):
    format_type = arguments.get('format', 'json')
    
    if name == "generate_monthly_stats":
        url = f"http://localhost:5000/api/monthly-stats?mm={arguments['month']}&jj={arguments['year']}&format={format_type}"
        response = requests.get(url)
        
        # Return appropriate content type based on format
        if format_type in ['linegraph', 'bargraph']:
            return [ImageContent(type="image", data=response.content, mimeType="image/png")]
        else:
            content_type = response.headers.get('content-type', '')
            if 'application/json' in content_type:
                return [TextContent(type="text", text=response.json())]
            else:
                return [TextContent(type="text", text=response.text)]
    
    elif name == "generate_annual_stats":
        url = f"http://localhost:5000/api/annual-stats?jj={arguments['year']}&format={format_type}"
        response = requests.get(url)
        
        # Return appropriate content type based on format
        if format_type in ['linegraph', 'bargraph']:
            return [ImageContent(type="image", data=response.content, mimeType="image/png")]
        else:
            content_type = response.headers.get('content-type', '')
            if 'application/json' in content_type:
                return [TextContent(type="text", text=response.json())]
            else:
                return [TextContent(type="text", text=response.text)]

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

Show me the monthly statistics for January 1988 in markdown format.

Give me the JSON data for annual statistics of year 1988.
```

Claude will call the appropriate MCP tool with the correct format parameter and display the result.

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
  "error": "Invalid format: xyz. Use json, text, markdown, linegraph, or bargraph."
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
