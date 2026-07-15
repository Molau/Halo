# HALOassist API

> **📋 Documentation Type**: API Reference  
> **Status**: Living documentation — update when endpoints change  
> **Audience**: HALOassist integration and other authenticated consumers  
> **See also**: [MCP_INTEGRATION.md](MCP_INTEGRATION.md) for the public, unauthenticated statistics/chart endpoints, and [HALO_DATA_FORMAT.md](HALO_DATA_FORMAT.md) for the HALO key record format

---

## Overview

These endpoints supply HALOassist with observation data and photo metadata for
generating monthly reports and extracting further photo details. Unlike the
MCP-ready statistics endpoints described in
[MCP_INTEGRATION.md](MCP_INTEGRATION.md), they are **not** part of the MCP server
example and are **not** stateless public endpoints.

### Key differences vs. the MCP statistics endpoints

| Aspect            | Statistics endpoints (`/api/monthly-stats`, `/api/annual-stats`) | HALOassist endpoints (this document) |
| ----------------- | --------------------------------------------------------------- | ------------------------------------ |
| Authentication    | None (public, stateless)                                        | Session cookie required              |
| Authorization     | None                                                            | Admin only                           |
| Runtime mode      | Any                                                             | Cloud mode only                      |
| MCP wrapper       | Yes (example in MCP_INTEGRATION.md)                             | No                                    |

Because these endpoints require an authenticated admin session (cookie-based),
the simple `requests.get()` MCP wrapper pattern shown in
[MCP_INTEGRATION.md](MCP_INTEGRATION.md) does **not** apply — calls without a
valid admin session return `401` / `403`.

---

## Authentication & Authorization

All endpoints below enforce, in order:

1. **Cloud mode** — otherwise `403 {"error": "cloud_mode_only"}`
2. **Authenticated session** — otherwise `401 {"error": "not_authenticated"}`
3. **Admin session** — otherwise `403 {"error": "admin_required"}`

Requests must carry the authenticated session cookie established at login.

---

## Endpoints

### 1. Monthly photo captions

Lists photo folders that have a non-empty `caption.txt` for a given year/month,
enriched with observer metadata and the observation area (`GG`). Intended for
HALOassist monthly report generation.

**Endpoint:**
```
GET /api/observations/photos/monthly-captions?jj={year}&mm={month}
```

**Parameters:**
- `jj` (required): 4-digit year (e.g. `2026`)
- `mm` (required): month (1–12)

**Behavior:**
- Only folders that contain a non-empty `caption.txt` are returned.
- `gg` is resolved from the day's observation records and is only set when **all**
  observations of that observer/day agree on a single `GG`; otherwise `null`.
- `photos` lists the original photos (thumbnails excluded).

**Response** (`200`, `application/json`):
```json
{
  "jj": 2026,
  "mm": 3,
  "count": 2,
  "entries": [
    {
      "jj": 2026,
      "mm": 3,
      "tt": 13,
      "kk": 44,
      "observer_name": "Max Mustermann",
      "observer_hbort": "Seysdorf",
      "gg": 5,
      "caption": "Großer 22°-Ring ...",
      "photo_count": 3,
      "photos": [
        {
          "key": "2026/03/13/kk44/img1.jpg",
          "name": "img1.jpg",
          "url": "/api/observations/photos/file?key=..."
        }
      ]
    }
  ]
}
```

**Example:**
```bash
# Requires an authenticated admin session cookie
curl -b cookies.txt \
  "https://<host>/api/observations/photos/monthly-captions?jj=2026&mm=3"
```

---

### 2. Raw observations for one observer/day

Returns all observations of a single observer for a single day in the **original
HALO key format**. Companion to the monthly-captions endpoint: it lets HALOassist
extract further details for a specific observation day directly from the raw
HALO key records.

**Endpoint:**
```
GET /api/observations/raw?kk={observer}&jj={year}&mm={month}&tt={day}
```

**Parameters:**
- `kk` (required): observer code
- `jj` (required): 4-digit year (e.g. `2026`)
- `mm` (required): month (1–12)
- `tt` (required): day (1–31)

**Behavior:**
- Observations are loaded from the database and returned in canonical sort order
  (year → month → day → hour → minute → observer → type → area).
- Each record is serialized to its original HALO key line (including the `8HHHH`
  light-pillar segment, sector list, and remarks), per
  [HALO_DATA_FORMAT.md](HALO_DATA_FORMAT.md).

**Response** (`200`, `application/json`):
```json
{
  "kk": 4,
  "jj": 2026,
  "mm": 3,
  "tt": 13,
  "count": 2,
  "records": [
    "04...",
    "04..."
  ]
}
```

Each entry in `records` is a raw HALO key line as defined in
[HALO_DATA_FORMAT.md](HALO_DATA_FORMAT.md).

**Example:**
```bash
# Requires an authenticated admin session cookie
curl -b cookies.txt \
  "https://<host>/api/observations/raw?kk=04&jj=2026&mm=3&tt=13"
```

---

## Error responses

| Status | Body                              | Cause                                             |
| ------ | --------------------------------- | ------------------------------------------------- |
| `400`  | `{"error": "missing_parameters"}` | Required parameter missing or out of range        |
| `401`  | `{"error": "not_authenticated"}`  | No authenticated session                          |
| `403`  | `{"error": "cloud_mode_only"}`    | Server not running in cloud mode                  |
| `403`  | `{"error": "admin_required"}`     | Session is authenticated but not an admin         |
| `500`  | `{"error": "<message>"}`          | Unexpected server error                           |

---

## Typical HALOassist flow

1. Call `GET /api/observations/photos/monthly-captions?jj=YYYY&mm=M` to discover
   captioned photo days for the month, including `kk`, `tt`, and `gg`.
2. For any day of interest, call
   `GET /api/observations/raw?kk=KK&jj=YYYY&mm=M&tt=D` to obtain the raw HALO key
   records and extract additional observation details for the photos.

> **Note:** Both endpoints use a 4-digit `jj` year.
