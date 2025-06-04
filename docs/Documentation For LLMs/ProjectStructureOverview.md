# Project Structure Overview

This document provides an overview of the project's file structure and a summary of each relevant file. 

## File Tree

```
.
├── client/
│   ├── vite.config.js
│   ├── package.json
│   ├── index.html
│   └── src/
│       ├── App.jsx
│       ├── index.css
│       ├── main.jsx
│       ├── pages/
│       │   ├── GuildOverviewPage.jsx
│       │   ├── Profile.jsx
│       │   ├── GuildOverviewPage.temp.jsx
│       │   ├── Home.jsx
│       │   ├── HomePage.jsx
│       │   ├── CreateGuildPage.jsx
│       │   ├── PublicUserProfile.jsx
│       │   ├── EditProfile.jsx
│       │   ├── Search.jsx
│       │   ├── Register.jsx
│       │   └── Login.jsx
│       ├── components/
│       │   ├── ProtectedRoute.jsx
│       │   ├── Header.jsx
│       │   ├── BadgeShapes.jsx
│       │   ├── ProfileSettings.jsx
│       │   ├── SocialAccountsList.jsx
│       │   ├── BadgeSection.jsx
│       │   ├── NotificationsPanel.jsx
│       │   ├── TrophyCase.jsx
│       │   ├── GuildCard.jsx
│       │   ├── GuildCarousel.jsx
│       │   ├── ProfileLinks.jsx
│       │   ├── SearchBar.jsx
│       │   ├── SearchResultItem.jsx
│       │   ├── AvatarUpload.jsx
│       │   ├── SearchResults.jsx
│       │   ├── ErrorBoundary.jsx
│       │   ├── BlueskyConnectForm.jsx
│       │   └── guilds/
│       │       ├── GuildCarousel.jsx
│       │       ├── GuildCard.jsx
│       │       └── CreateGuildForm.jsx
│       ├── styles/
│       │   ├── social.css
│       │   ├── home.css
│       │   ├── profile.css
│       │   ├── header.css
│       │   ├── debug.css
│       │   ├── error.css
│       │   └── search.css
│       ├── services/
│       │   ├── guild.service.js
│       │   ├── userService.js
│       │   └── socialAccountService.js
│       ├── contexts/
│       │   └── AuthContext.jsx
│       └── data/
│           ├── mockGuilds.js
│           └── mockData.js
├── server/
│   ├── package.json
│   ├── .ts-node-esm-config.json
│   ├── tsconfig.json
│   └── src/
│       ├── app.js
│       ├── server.js
│       ├── config.js
│       ├── services/
│       │   ├── guild.service.js
│       │   ├── discord.service.js
│       │   ├── userService.js
│       │   ├── twitch.service.js
│       │   ├── twitter.service.js
│       │   └── bluesky.service.js
│       ├── controllers/
│       │   ├── guild.controller.js
│       │   ├── user.controller.js
│       │   ├── discord.controller.js
│       │   ├── auth.controller.js
│       │   ├── twitch.controller.js
│       │   ├── socialAccount.controller.js
│       │   ├── twitter.controller.js
│       │   └── bluesky.controller.js
│       ├── routes/
│       │   ├── guild.routes.js
│       │   ├── auth.routes.js
│       │   ├── user.routes.js
│       │   └── socialAccount.routes.js
│       ├── middleware/
│       │   ├── role.middleware.js
│       │   ├── validation.middleware.js
│       │   └── auth.middleware.js
│       ├── utils/
│       │   └── encryption.utils.js
│       └── config/
│           └── config.js
│   └── prisma/
│       ├── seed.ts
│       ├── schema.prisma
│       ├── migrations/  (Contains database migration files)
│       └── seeds/
│           ├── users.ts
│           ├── memberships.ts
│           └── guilds.ts
└── Documentation For LLMs/
    └── ProjectStructureOverview.md (This file)