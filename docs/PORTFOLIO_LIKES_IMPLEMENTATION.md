# Portfolio Image Likes Feature - Implementation Plan

## Overview

Add a heart/like button to all portfolio images that allows users to like images. The system will track unique users and display like counts globally.

## Architecture: KV + D1 Hybrid Approach

### Why This Approach?

- **KV for Speed**: Sub-10ms read latency globally for displaying like counts
- **D1 for Truth**: Strong consistency and source of truth for all data
- **Best of Both**: Fast reads (KV) + reliable writes (D1)
- **Read-Heavy Optimized**: Portfolio viewing >> liking actions

## Technical Design

### 1. Cloudflare KV (Fast Reads)

**KV Namespace**: `PORTFOLIO_LIKES`

**Key Structure**:
```
likes:count:{image_id} → "42" (total likes count, cached globally)
likes:user:{user_hash}:{image_id} → "1" (user liked this image)
```

**Characteristics**:
- Eventually consistent (suitable for like counts)
- High read volumes with low latency (500µs - 10ms for hot keys)
- Global edge caching
- 1 write/sec per key limit (not an issue with our key structure)

### 2. D1 Database (Source of Truth)

**Tables**:

```sql
-- Table: image_likes
-- Stores total like count per image
CREATE TABLE image_likes (
  image_id TEXT PRIMARY KEY,
  total_likes INTEGER DEFAULT 0,
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch())
);

-- Table: user_likes
-- Tracks which users liked which images
CREATE TABLE user_likes (
  user_hash TEXT NOT NULL,
  image_id TEXT NOT NULL,
  liked_at INTEGER DEFAULT (unixepoch()),
  PRIMARY KEY (user_hash, image_id),
  FOREIGN KEY (image_id) REFERENCES image_likes(image_id) ON DELETE CASCADE
);

-- Index for efficient queries
CREATE INDEX idx_user_likes_user_hash ON user_likes(user_hash);
CREATE INDEX idx_user_likes_image_id ON user_likes(image_id);
```

### 3. User Identification Strategy

**Fingerprint Algorithm**:
```typescript
function generateUserHash(clientAddress: string, userAgent: string): string {
  const fingerprint = `${clientAddress}:${userAgent}`;
  return crypto.subtle.digest('SHA-256', fingerprint)
    .then(hash => btoa(String.fromCharCode(...new Uint8Array(hash))));
}
```

**Components**:
- `Astro.clientAddress` - IP address (available in SSR mode)
- `User-Agent` header - Browser/device identifier
- SHA-256 hash for privacy

**Benefits**:
- No cookies required
- Works across sessions
- Privacy-friendly (hashed)
- Detects same user returning

**Limitations**:
- VPN/network changes = new user
- Different browsers = different users
- Acceptable for like counts (not auth)

## Implementation Components

### 4. Wrangler Configuration

**Add KV Namespace Binding**:

```jsonc
// wrangler.jsonc
{
  "kv_namespaces": [
    {
      "binding": "PORTFOLIO_LIKES",
      "id": "YOUR_KV_NAMESPACE_ID",
      "preview_id": "YOUR_PREVIEW_KV_NAMESPACE_ID"
    }
  ]
}
```

**Create KV Namespace**:
```bash
# Production
wrangler kv:namespace create "PORTFOLIO_LIKES"

# Preview (for development)
wrangler kv:namespace create "PORTFOLIO_LIKES" --preview
```

### 5. TypeScript Types

**Update `src/env.d.ts`**:

```typescript
/// <reference types="astro/client" />

type Runtime = import('@astrojs/cloudflare').Runtime<Env>;

declare namespace App {
  interface Locals extends Runtime {
    runtime: {
      env: {
        DB: D1Database;
        PORTFOLIO_LIKES: KVNamespace;
        EMAIL: any;
        ASSETS: any;
      };
    };
  }
}
```

### 6. API Endpoint

**File**: `src/pages/api/portfolio/like.ts`

**Endpoints**:
- `POST /api/portfolio/like` - Toggle like for an image
- `GET /api/portfolio/like?imageId={id}` - Get like count + user status

**POST Logic**:
```typescript
1. Generate user hash from clientAddress + User-Agent
2. Check if user already liked this image (D1)
3. If liked: DELETE from user_likes, DECREMENT total
4. If not liked: INSERT into user_likes, INCREMENT total
5. Update KV cache with new count
6. Return: { liked: boolean, totalLikes: number }
```

**GET Logic**:
```typescript
1. Generate user hash
2. Try to get count from KV (fast path)
3. If KV miss: Query D1 and populate KV
4. Check user's like status from D1
5. Return: { totalLikes: number, userLiked: boolean }
```

### 7. React Component

**File**: `src/components/ui/LikeButton.tsx`

**Props**:
```typescript
interface LikeButtonProps {
  imageId: string;
  initialLikes?: number;
  initialUserLiked?: boolean;
}
```

**Features**:
- Heart icon (filled/unfilled based on state)
- Like count display
- Optimistic UI updates
- Loading state during API calls
- Error handling

**State Management**:
```typescript
const [liked, setLiked] = useState(initialUserLiked);
const [likes, setLikes] = useState(initialLikes);
const [isLoading, setIsLoading] = useState(false);
```

### 8. Portfolio Integration

**Update Portfolio Component**:
- Add `<LikeButton>` to each image overlay
- Position: Bottom-right corner
- Server-side render initial state (SSR)
- Hydrate with `client:load` or `client:visible`

**Example**:
```astro
---
// Fetch initial like counts from D1 or KV
const images = await getPortfolioImages();
const likeCounts = await getLikeCounts(images.map(i => i.id));
---

{images.map((image, index) => (
  <div class="relative">
    <img src={image.src} alt={image.alt} />
    <LikeButton
      client:visible
      imageId={image.id}
      initialLikes={likeCounts[image.id]}
      initialUserLiked={userLikes[image.id]}
    />
  </div>
))}
```

## Data Flow

### Like Flow (Write Path)

```
User clicks heart
    ↓
React Component (optimistic update)
    ↓
POST /api/portfolio/like
    ↓
Generate user hash (IP + UA)
    ↓
Check D1: user_likes table
    ↓
Toggle like in D1 (transaction)
    ↓
Update KV cache
    ↓
Return new state
    ↓
Component updates (or rollback if error)
```

### Display Flow (Read Path)

```
Page loads
    ↓
SSR: Fetch initial counts
    ↓
Try KV first (cached, fast)
    ↓
KV miss? Query D1
    ↓
Populate KV for next request
    ↓
Render with initial data
    ↓
Hydrate React component
```

## Database Migration

**File**: `migrations/0002_add_portfolio_likes.sql`

```sql
-- Create image_likes table
CREATE TABLE IF NOT EXISTS image_likes (
  image_id TEXT PRIMARY KEY,
  total_likes INTEGER DEFAULT 0,
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch())
);

-- Create user_likes table
CREATE TABLE IF NOT EXISTS user_likes (
  user_hash TEXT NOT NULL,
  image_id TEXT NOT NULL,
  liked_at INTEGER DEFAULT (unixepoch()),
  PRIMARY KEY (user_hash, image_id),
  FOREIGN KEY (image_id) REFERENCES image_likes(image_id) ON DELETE CASCADE
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_likes_user_hash ON user_likes(user_hash);
CREATE INDEX IF NOT EXISTS idx_user_likes_image_id ON user_likes(image_id);

-- Trigger to update updated_at on image_likes
CREATE TRIGGER IF NOT EXISTS update_image_likes_timestamp
AFTER UPDATE ON image_likes
FOR EACH ROW
BEGIN
  UPDATE image_likes SET updated_at = unixepoch() WHERE image_id = NEW.image_id;
END;
```

**Run Migration**:
```bash
wrangler d1 execute wrp-contact-forms --file=./migrations/0002_add_portfolio_likes.sql
```

## Performance Considerations

### KV Cache Strategy

**Cache Duration**:
- Like counts: No expiration (manually invalidated on write)
- User like status: 5 minutes TTL (or no expiration)

**Cache Invalidation**:
- On like toggle: Update KV immediately
- Eventual consistency is acceptable for like counts

### D1 Query Optimization

**Batch Reads**:
```sql
-- Get all like counts for portfolio page
SELECT image_id, total_likes FROM image_likes
WHERE image_id IN (?, ?, ?, ...);

-- Get all user likes for portfolio page
SELECT image_id FROM user_likes
WHERE user_hash = ? AND image_id IN (?, ?, ?, ...);
```

**Transaction for Writes**:
```typescript
await env.DB.batch([
  env.DB.prepare('UPDATE image_likes SET total_likes = total_likes + 1 WHERE image_id = ?')
    .bind(imageId),
  env.DB.prepare('INSERT INTO user_likes (user_hash, image_id) VALUES (?, ?)')
    .bind(userHash, imageId)
]);
```

## Error Handling

### API Endpoint
- Invalid imageId → 400 Bad Request
- Database error → 500 Internal Server Error
- Return error details in JSON

### React Component
- Network error → Show error toast, rollback optimistic update
- Retry logic with exponential backoff
- Graceful degradation (hide button if API fails)

## Security Considerations

### Rate Limiting
- Implement per-user rate limiting (using user hash)
- Max 10 likes per minute per user
- Use KV to track rate limits

### Validation
- Validate imageId exists in portfolio
- Sanitize inputs
- Use prepared statements (D1 handles this)

### Privacy
- User hash is one-way (can't reverse to IP)
- No PII stored
- GDPR compliant (anonymous tracking)

## Testing Plan

### Unit Tests
- User hash generation
- Like toggle logic
- KV/D1 read/write functions

### Integration Tests
- API endpoint responses
- D1 transactions
- KV cache invalidation

### Manual Testing
1. Click heart → like count increases
2. Click again → like count decreases
3. Refresh page → state persists
4. Different browser → different user
5. Same browser → same user

## Future Enhancements

### Analytics
- Track most liked images
- Like trends over time
- Geographic distribution of likes

### Features
- Show recent likers (if we add user profiles)
- Leaderboard of most liked images
- Share like count on social media

### Optimizations
- Preload like counts with intersection observer
- Debounce rapid clicks
- Background sync for offline likes

## Deployment Checklist

- [ ] Create KV namespace (production + preview)
- [ ] Add KV binding to wrangler.jsonc
- [ ] Update TypeScript types (env.d.ts)
- [ ] Run D1 migration
- [ ] Implement API endpoint
- [ ] Create React component
- [ ] Integrate into portfolio page
- [ ] Test in preview environment
- [ ] Deploy to production
- [ ] Monitor CloudFlare analytics
- [ ] Verify KV cache hit rates

## Resources

- [Cloudflare KV Documentation](https://developers.cloudflare.com/kv/)
- [D1 Database Documentation](https://developers.cloudflare.com/d1/)
- [Astro Server Endpoints](https://docs.astro.build/en/guides/endpoints/)
- [React in Astro](https://docs.astro.build/en/guides/framework-components/)

## Notes

- This is a read-heavy workload perfect for KV caching
- D1 provides strong consistency for the source of truth
- User fingerprinting is simple and privacy-friendly
- System scales horizontally with Cloudflare's edge network
- No cookies or authentication required
