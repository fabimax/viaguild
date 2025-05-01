# User Search and Profile Viewing Specification

## User Search Functionality

### Core Search Features
- Search for users across multiple identities:
  - ViaGuild usernames
  - Connected Twitter accounts
  - Connected Bluesky accounts
  - Connected Twitch accounts
- Dropdown filter to narrow search scope:
  - "All" (default) - searches across all platforms
  - "ViaGuild" - searches only ViaGuild usernames
  - "Twitter" - searches only connected Twitter accounts
  - "Bluesky" - searches only connected Bluesky accounts
  - "Twitch" - searches only connected Twitch accounts
- Case-insensitive matching
- Partial string matching (substring search)

### Search Results Display
- Each result should show:
  - Platform icon/logo for the matched platform (ViaGuild/Twitter/Bluesky/Twitch)
  - The matched username with the matching part highlighted in bold
  - Link to the user's profile page
- Results should be grouped by ViaGuild user if multiple accounts from the same user match
- Results should be sorted by relevance (prioritizing matches at the beginning of usernames)

### UI Components
- Search bar with dropdown filter
- Search indicator showing count of results for each platform
- Clear visual distinction between platforms
- Relevance-based result ordering

## User Profile Viewing

### Public Profile Page
- URL format: `/users/:username` for viewing public profiles
- Display:
  - ViaGuild username
  - Profile avatar (if implemented)
  - User bio (to be implemented)
  - Connected social accounts with appropriate icons
  - User's Guilds membership (future feature)
  - User's Badges (future feature)

### Privacy Considerations
- Email addresses should never be displayed publicly
- Option for users to hide certain connected accounts
- Clear distinction between the user's own profile view and public profile view

## Implementation Requirements

### Backend
1. Create API endpoints:
   - `GET /api/users/search?q={query}&platform={platform}` - Search for users
   - `GET /api/users/:username` - Get public user profile
   - `GET /api/users/:username/social-accounts` - Get user's public social accounts

### Frontend
1. Create search components:
   - SearchBar component with filter dropdown
   - SearchResults component for displaying results
   - SearchResultItem component for individual results

2. Create public profile components:
   - PublicUserProfile page
   - UserInfo component
   - UserSocialAccounts component (modified version of existing component)

### Database Updates
- Add fields to User model:
  - `bio` (text field)
  - `isPublic` (boolean, controlling profile visibility)
  - `hiddenAccounts` (array of social account IDs that should be hidden from public view)

## Additional Enhancements
- Search result count indicators next to filter options
- Relevance scoring for better search results
- Result grouping by ViaGuild user

## Future Extensions
- Expand search to include Guild names
- Add more filters (active users, recently joined, etc.)
- Search by tags or interests (if implemented)