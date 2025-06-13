# Secure SVG Proxy Implementation

## Overview

This document describes the secure backend proxy implemented to fetch SVG content from R2 storage, bypassing CORS restrictions while maintaining security.

## Problem

When displaying badge templates with customizable SVG icons in the BadgeGiveModal, the frontend needs to:
1. Fetch the SVG content from R2 storage URLs
2. Apply color transformations in real-time as users customize colors
3. Show a live preview of the changes

However, R2 bucket URLs don't include CORS headers, causing cross-origin requests from the frontend to fail.

## Solution

A secure backend proxy endpoint that:
- Fetches SVG content on behalf of the frontend
- Validates and restricts URLs to prevent SSRF attacks
- Returns the SVG content with appropriate headers

## Implementation Details

### Endpoint

```
GET /api/fetch-svg?url=<encoded-svg-url>
```

Requires authentication (Bearer token).

### Security Measures

1. **Domain Whitelisting**
   - Only allows fetching from: `pub-2a8c2830ac2d42478acd81b42a86bd95.r2.dev`
   - Rejects all other domains with 403 Forbidden

2. **Protocol Restriction**
   - Only HTTPS URLs are allowed
   - HTTP and other protocols are rejected

3. **URL Validation**
   - Validates URL format before processing
   - Returns 400 Bad Request for malformed URLs

4. **Timeout Protection**
   - 5-second timeout on fetch requests
   - Prevents slow loris attacks

5. **Size Limits**
   - Maximum 1MB file size
   - Returns 413 Payload Too Large for oversized files

6. **Content Type Validation**
   - Checks that content-type includes "svg"
   - Basic validation that content starts with `<svg` or `<?xml`

7. **Response Headers**
   - Sets proper Content-Type: `image/svg+xml`
   - Includes 1-hour cache control for performance

### Error Responses

- `400 Bad Request`: Missing URL, invalid URL format, or invalid SVG content
- `403 Forbidden`: URL not in whitelist or non-HTTPS protocol
- `413 Payload Too Large`: SVG file exceeds 1MB
- `504 Gateway Timeout`: Request took longer than 5 seconds
- `500 Internal Server Error`: Unexpected errors

### Frontend Usage

#### BadgeGiveModal (Live Preview)
```javascript
// Fetch SVG content through secure proxy for live preview
const response = await fetch(`/api/fetch-svg?url=${encodeURIComponent(template.defaultForegroundValue)}`, {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
const svgContent = await response.text();

// Apply color transformations in real-time
const transformedSvg = applySvgColorTransform(svgContent, colorConfig);
```

#### BadgeCard (Badge Inventory Display)
```javascript
// Automatically fetch and transform SVG for badges with custom colors
if (displayProps.foregroundType === 'UPLOADED_ICON' && displayProps.foregroundColorConfig) {
  if (displayProps.foregroundValue.startsWith('http')) {
    const response = await fetch(`/api/fetch-svg?url=${encodeURIComponent(displayProps.foregroundValue)}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const svgContent = await response.text();
    const transformedSvg = applySvgColorTransform(svgContent, displayProps.foregroundColorConfig);
    // Use transformed SVG for display
  }
}
```

#### URL Detection Logic
The frontend uses `foregroundValue.startsWith('http')` to detect URLs that need fetching. This approach:

- ✅ **Safe**: Backend validates domain whitelist and content type
- ✅ **Simple**: Works for all HTTP/HTTPS URLs from R2
- ✅ **Robust**: No reliance on file extensions (R2 URLs don't include .svg)
- ✅ **Contextual**: Only triggers when `foregroundColorConfig` exists

Alternative approaches considered:
- `includes('.svg')` - Failed because R2 URLs don't have extensions
- `includes('r2.dev')` - Too specific, might break if storage changes
- Complex regex patterns - Unnecessary given backend validation

## Security Analysis

### Why It's Secure

1. **No SSRF Risk**: Can only fetch from our own R2 bucket
2. **No Internal Network Access**: Cannot access localhost, internal IPs, or cloud metadata
3. **Resource Protection**: Timeouts and size limits prevent DoS
4. **Content Validation**: Ensures only SVG content is returned

### Remaining Considerations

1. **R2 Content Trust**: Assumes all content in R2 bucket is safe (already validated during upload)
2. **Rate Limiting**: Could add per-user rate limiting if needed
3. **SVG Sanitization**: Could add DOMPurify sanitization before returning (if extra paranoid)

### Security Best Practices

#### Logging Security
- ❌ **Don't log**: Full R2 URLs in client-side console (exposes private URLs)
- ✅ **Do log**: Generic messages like "Fetching SVG through proxy (URL hidden for security)"
- ✅ **Server logs**: Can safely log URLs for debugging (not exposed to users)

#### Frontend URL Handling
- Always use `encodeURIComponent()` when passing URLs to backend
- Never trust or display raw URLs from displayProps in UI
- Backend validation is the primary security layer

## Benefits Over Direct Fetching

1. **Bypasses CORS**: Backend can fetch from any origin
2. **Security Layer**: Adds validation and restrictions
3. **Caching**: Can leverage backend caching strategies
4. **Monitoring**: Can log and monitor SVG access patterns
5. **Future Flexibility**: Can add SVG transformations or optimizations server-side

## Alternative Approaches Considered

1. **Storing SVG in Database**: More secure but requires migration and increases DB size
2. **CORS Headers on R2**: Would require Cloudflare Workers or different storage solution
3. **Direct URL Display**: No color customization in preview (poor UX)

The proxy approach was chosen as it provides the best balance of security, functionality, and implementation simplicity.