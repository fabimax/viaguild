# SVG Proxy Security - Production Checklist

## What This Is
The SVG proxy is a backend endpoint (`/api/fetch-svg`) that fetches SVG content from R2 storage and returns it to the frontend. This was implemented because:

1. **CORS Problem**: Frontend can't directly fetch SVGs from R2 due to CORS restrictions
2. **Color Customization**: Badge templates with uploaded SVG icons need real-time color transformations
3. **Live Preview**: BadgeGiveModal needs to show color changes as users customize badges

## How It Works
1. Frontend detects badge needs color transformation (`foregroundType: UPLOADED_ICON` + `foregroundColorConfig` exists)
2. Frontend calls `/api/fetch-svg?url=<R2-URL>` with auth token
3. Backend validates URL is from our R2 bucket only
4. Backend fetches SVG content and returns it
5. Frontend applies color transformations and displays badge

## Files Involved
- **Backend**: `server/src/controllers/badge.controller.js` (fetchSvgContent method)
- **Backend**: `server/src/routes/badge.routes.js` (route definition)
- **Frontend**: `client/src/components/BadgeCard.jsx` (badge inventory display)
- **Frontend**: `client/src/components/BadgeGiveModal.jsx` (live preview)
- **Utils**: `client/src/utils/svgColorTransform.js` (color transformation logic)

## Summary

This checklist ensures the SVG proxy is secure and functional before production deployment. The main security risks are **SSRF attacks** (if domain whitelist fails) and **URL exposure** (if R2 URLs leak in logs). The main functionality risk is **broken color customization** (if proxy doesn't work or colors don't persist).

**Critical path**: Verify domain whitelist → Remove URL logs → Test end-to-end color flow → Deploy

**Most common issues**:
1. CORS errors (proxy not working)
2. Colors not persisting (filtering logic bug)
3. Live preview not updating (frontend not calling proxy)

**Time estimate**: ~2-3 hours for high priority items, ~1 day for medium priority

## 🔴 HIGH PRIORITY (Must Do Before Production)

### Critical Security

#### [ ] **Verify R2 bucket domain whitelist** 
**Location**: `server/src/controllers/badge.controller.js`, line ~659  
**Check**: The `allowedHosts` array should contain your production R2 domain:
```javascript
const allowedHosts = [
  'pub-2a8c2830ac2d42478acd81b42a86bd95.r2.dev'  // Your actual domain
];
```
**Why**: Prevents SSRF attacks by blocking requests to internal/external services

#### [ ] **Remove debug console logs that expose R2 URLs**
**Locations to check**:
- `client/src/components/BadgeCard.jsx` - Remove any logs that show `displayProps` or URLs
- `client/src/components/BadgeGiveModal.jsx` - Remove logs that show `template.defaultForegroundValue`

**Find with**: `grep -r "console.log.*https://" client/src/`
**Why**: R2 URLs in browser console could be copied by malicious users

#### [ ] **Test domain blocking**
**How to test**:
```bash
# This should return 403 Forbidden
curl -H "Authorization: Bearer $YOUR_TOKEN" \
  "http://localhost:3000/api/fetch-svg?url=https://evil.com/test.svg"
```
**Expected result**: `{"error":"URL not allowed"}`

#### [ ] **Verify authentication requirement**
**How to test**:
```bash
# This should return 401 Unauthorized  
curl "http://localhost:3000/api/fetch-svg?url=https://pub-2a8c2830ac2d42478acd81b42a86bd95.r2.dev/test.svg"
```
**Expected result**: Authentication error (exact format depends on your auth middleware)

#### [ ] **Test HTTPS enforcement**
**How to test**:
```bash
# This should return 403 Forbidden
curl -H "Authorization: Bearer $YOUR_TOKEN" \
  "http://localhost:3000/api/fetch-svg?url=http://pub-2a8c2830ac2d42478acd81b42a86bd95.r2.dev/test.svg"
```
**Expected result**: `{"error":"Only HTTPS URLs are allowed"}`

### Critical Functionality

#### [ ] **End-to-end color customization test**
**How to test**:
1. **Create badge template** with uploaded SVG icon in `/users/[username]/badges/templates/create`
2. **Customize colors** during upload - verify live preview changes
3. **Create template** and confirm it saves successfully
4. **Give badge** to someone using the template in `/users/[username]/badges/templates`
5. **Customize colors** when giving - verify live preview updates
6. **Send badge** and verify it's created
7. **Check inventory** - recipient should see custom colors in `/users/[username]/badges/received`

**What to verify**:
- Live preview updates in BadgeGiveModal when colors change
- Custom colors persist and display correctly in badge inventory
- Original template colors remain unchanged

#### [ ] **Test live preview specifically**
**How to test**:
1. Open BadgeGiveModal with a template that has uploaded SVG icon
2. Go to "Advanced Customization" 
3. Change colors in the "Icon Colors" section
4. **Expected**: Preview badge should update immediately with new colors
5. **Check console**: Should see "Fetching SVG through proxy (URL hidden for security)"

**If it doesn't work**: 
- Check browser console for CORS errors (bad - means proxy not working)
- Check for "BadgeCard: Applied color transformation" logs (good)
- Verify `foregroundColorConfig` exists in badge data

## 🟡 MEDIUM PRIORITY (Should Do)

### Security Hardening

#### [ ] **Test timeout limits**
**Current setting**: 5 seconds (in `badge.controller.js`)
**How to test**: Try fetching from a very slow server (if you have access to one)
**Expected**: Should timeout and return `{"error":"Request timeout"}`
**Why important**: Prevents slow loris attacks that could tie up server resources

#### [ ] **Test size limits** 
**Current setting**: 1MB max file size
**How to test**: Try fetching a large SVG (>1MB) from your R2 bucket
**Expected**: Should return `{"error":"SVG file too large"}`
**Location to check**: Look for `contentLength` validation in `fetchSvgContent`

#### [ ] **Test content-type validation**
**How to test**: Upload a PNG file to R2 and try fetching it through proxy
**Expected**: Should return `{"error":"Content is not SVG"}`
**What it checks**: Response `content-type` header must include "svg"

#### [ ] **Test SVG content validation**
**How to test**: Create a text file with non-SVG content, upload to R2, try fetching
**Expected**: Should return `{"error":"Invalid SVG content"}`
**What it checks**: Content must start with `<svg` or `<?xml`

### Performance & Monitoring

#### [ ] **Verify cache headers work**
**How to test**: 
1. Fetch an SVG through proxy
2. Check response headers include: `Cache-Control: public, max-age=3600`
3. Make same request again - should be faster due to caching
**Why**: Reduces load on proxy and improves performance

#### [ ] **Set up response time monitoring**
**What to monitor**: 
- Average response time for `/api/fetch-svg` endpoint
- 95th percentile response times
- Requests that take >3 seconds (could indicate problems)
**Tools**: Your monitoring system (DataDog, New Relic, etc.)

#### [ ] **Set up error rate alerts**
**What to alert on**:
- High number of 403 errors (potential attack)
- High number of 504 timeouts (upstream problems)
- Any 500 errors (server issues)
**Suggested threshold**: >10 failed requests per minute

## 🟢 LOW PRIORITY (Nice to Have)

### Enhanced Security

#### [ ] **Implement per-user rate limiting**
**Suggested limit**: 100 requests per hour per user
**How to implement**: Use Redis or in-memory store to track requests per user ID
**Why**: Prevents abuse where users spam the proxy endpoint
**Libraries**: `express-rate-limit` with Redis store

#### [ ] **Add server-side SVG sanitization**
**How**: Use DOMPurify server-side to clean SVG content before returning
**Why**: Extra protection against malicious SVG content (XSS, etc.)
**Note**: May not be needed since SVGs are pre-validated during upload

#### [ ] **Advanced monitoring**
**What to monitor**:
- Unusual traffic patterns (same user making many requests)
- Geographic anomalies (requests from unexpected countries)
- User agents that might indicate bots
**Tools**: Your logging/analytics platform

### Performance Optimization

#### [ ] **CDN caching for SVGs**
**How**: Configure CloudFlare/AWS CloudFront to cache `/api/fetch-svg` responses
**Benefits**: Faster response times, reduced server load
**Cache key**: Include the `url` parameter so different SVGs cache separately
**TTL**: Should match the current 1-hour cache setting

#### [ ] **Monitor cache effectiveness**
**Metrics to track**:
- Cache hit rate percentage
- Average response time for cached vs uncached requests
- Most frequently requested SVGs
**Goal**: >80% cache hit rate for common badge templates

#### [ ] **Database query optimization**
**Check**: Ensure badge template queries are efficient
**Why**: If fetching badge data is slow, proxy becomes a bottleneck
**Monitor**: Database query times for badge-related endpoints

### Operational Excellence

#### [ ] **Emergency procedures documentation**
**Document these scenarios**:
- What to do if proxy is being abused (rate limiting, blocking)
- How to temporarily disable proxy if needed
- Steps to investigate security incidents
- Contact information for security team

#### [ ] **Log retention and analysis**
**Set up**:
- Retain proxy logs for at least 30 days
- Daily log analysis for suspicious patterns
- Weekly security review of proxy usage
- Monthly performance review and optimization

#### [ ] **Create operational runbook**
**Include**:
- Common error codes and their meaning
- Troubleshooting steps for performance issues
- How to add new domains to whitelist (if needed)
- Escalation procedures for security incidents

## Quick Security Test Script

```bash
# Test 1: Domain blocking (should fail)
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/fetch-svg?url=https://evil.com/malicious.svg"

# Test 2: HTTPS enforcement (should fail)  
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/fetch-svg?url=http://pub-2a8c2830ac2d42478acd81b42a86bd95.r2.dev/test.svg"

# Test 3: Authentication (should fail)
curl "http://localhost:3000/api/fetch-svg?url=https://pub-2a8c2830ac2d42478acd81b42a86bd95.r2.dev/test.svg"

# Test 4: Valid request (should succeed)
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/fetch-svg?url=https://pub-2a8c2830ac2d42478acd81b42a86bd95.r2.dev/valid.svg"
```

## Logging Security

### ❌ NEVER LOG (Client-side)
- Full R2 URLs in browser console
- Authorization tokens
- Internal error details

### ✅ SAFE TO LOG (Client-side)
- "Fetching SVG through proxy (URL hidden for security)"
- "Applied color transformation"
- Generic success/failure messages

### ✅ OK TO LOG (Server-side only)
- Full request URLs (for debugging)
- Response status codes
- Performance metrics