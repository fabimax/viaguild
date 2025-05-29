// Mock data for ViaGuild authenticated homepage
// This structure matches expected API responses for seamless backend integration later

export const mockUser = {
  id: "user123",
  username: "jane_smith",
  email: "jane@example.com",
  displayName: "Jane Smith",
  avatar: null, // URL would go here
  avatarInitial: "J",
};

// Guild data following the structure in MVP database V3
export const mockGuilds = [
  {
    id: "guild001",
    name: "Design Masters",
    description: "A community of designers helping each other grow",
    avatar: null,
    avatarInitial: "D",
    isPublic: true,
    bannerColor: "#818cf8", // primary-light
    memberCount: 125,
    userRole: "OWNER", // From GuildMembership.role
    isPrimary: true,
  },
  {
    id: "guild002",
    name: "Gamers United",
    description: "For gaming enthusiasts of all levels",
    avatar: null,
    avatarInitial: "G",
    isPublic: true,
    bannerColor: "#8b5cf6", // purple
    memberCount: 237,
    userRole: "MEMBER",
    isPrimary: false,
  },
  {
    id: "guild003",
    name: "Art Enthusiasts",
    description: "Sharing and appreciating all forms of art",
    avatar: null,
    avatarInitial: "A",
    isPublic: true,
    bannerColor: "#ec4899", // pink
    memberCount: 89,
    userRole: "ADMIN",
    isPrimary: false,
  },
  {
    id: "guild004",
    name: "Tech Innovators",
    description: "Discussing the latest in technology and innovation",
    avatar: null, 
    avatarInitial: "T",
    isPublic: true,
    bannerColor: "#0ea5e9", // blue
    memberCount: 156,
    userRole: "MEMBER",
    isPrimary: false,
  },
];

// Badge templates for the available badge types
export const mockBadgeTemplates = [
  {
    id: "badge001",
    name: "Gold Star",
    imageUrl: "/placeholder-badges/gold-star.png",
    shapeId: "shape001",
    shape: "star",
    borderColor: "#f59e0b", // gold
    description: "Highest recognition for exceptional contributions",
    tier: "GOLD",
    isDefault: true,
  },
  {
    id: "badge002",
    name: "Silver Star", 
    imageUrl: "/placeholder-badges/silver-star.png",
    shapeId: "shape001",
    shape: "star",
    borderColor: "#94a3b8", // silver
    description: "Recognition for valuable contributions",
    tier: "SILVER",
    isDefault: true,
  },
  {
    id: "badge003",
    name: "Bronze Star",
    imageUrl: "/placeholder-badges/bronze-star.png",
    shapeId: "shape001",
    shape: "star",
    borderColor: "#b45309", // bronze
    description: "Recognition for helpful contributions",
    tier: "BRONZE",
    isDefault: true,
  },
  // Additional shapes for trophy case examples
  {
    id: "badge004",
    name: "Supreme Coder",
    imageUrl: "/placeholder-badges/supreme-coder.png",
    shapeId: "shape002",
    shape: "circle",
    borderColor: "#f59e0b", // gold
    description: "For outstanding code contributions",
    tier: "GOLD",
    isDefault: false,
  },
  {
    id: "badge005",
    name: "Gem Finder",
    imageUrl: "/placeholder-badges/gem-finder.png",
    shapeId: "shape001",
    shape: "star",
    borderColor: "#94a3b8", // silver
    description: "For discovering valuable resources",
    tier: "SILVER",
    isDefault: false,
  },
  {
    id: "badge006",
    name: "Community Heart",
    imageUrl: "/placeholder-badges/community-heart.png", 
    shapeId: "shape003",
    shape: "heart",
    borderColor: "#b45309", // bronze
    description: "For fostering community spirit",
    tier: "BRONZE",
    isDefault: false,
  },
  {
    id: "badge007",
    name: "Rapid Response",
    imageUrl: "/placeholder-badges/rapid-response.png",
    shapeId: "shape004",
    shape: "hexagon",
    borderColor: "#14b8a6", // teal
    description: "For quickly responding to community needs",
    tier: "SILVER",
    isDefault: false,
  },
];

// Badge instances received by the user
export const mockReceivedBadges = [
  {
    id: "instance001",
    templateId: "badge001", // Gold Star
    receiverId: "user123", // Current user
    giverId: "user456",
    giverName: "Tech Innovators",
    giverInitial: "T",
    givenAt: "2023-06-15T10:30:00Z",
    template: mockBadgeTemplates.find(b => b.id === "badge001"),
  },
  {
    id: "instance002",
    templateId: "badge002", // Silver Star
    receiverId: "user123", // Current user
    giverId: "user789",
    giverName: "Gamers United",
    giverInitial: "G",
    givenAt: "2023-06-10T14:20:00Z",
    template: mockBadgeTemplates.find(b => b.id === "badge002"),
  },
  {
    id: "instance003",
    templateId: "badge003", // Bronze Star
    receiverId: "user123", // Current user
    giverId: "user101",
    giverName: "Art Enthusiasts",
    giverInitial: "A",
    givenAt: "2023-06-05T09:15:00Z", 
    template: mockBadgeTemplates.find(b => b.id === "badge003"),
  },
];

// Trophy case badges (subset of received badges selected for display)
export const mockTrophyCase = [
  {
    id: "instance004",
    templateId: "badge004", // Supreme Coder
    receiverId: "user123", // Current user
    giverId: "user456",
    giverName: "Tech Innovators",
    giverInitial: "T",
    givenAt: "2023-05-20T11:30:00Z",
    template: mockBadgeTemplates.find(b => b.id === "badge004"),
  },
  {
    id: "instance005", 
    templateId: "badge005", // Gem Finder
    receiverId: "user123", // Current user
    giverId: "user202",
    giverName: "Movers & Shakers",
    giverInitial: "M",
    givenAt: "2023-05-15T16:45:00Z",
    template: mockBadgeTemplates.find(b => b.id === "badge005"),
  },
  {
    id: "instance006",
    templateId: "badge006", // Community Heart
    receiverId: "user123", // Current user
    giverId: "user101",
    giverName: "Art Enthusiasts",
    giverInitial: "A",
    givenAt: "2023-05-10T13:20:00Z",
    template: mockBadgeTemplates.find(b => b.id === "badge006"),
  },
  {
    id: "instance007",
    templateId: "badge007", // Rapid Response
    receiverId: "user123", // Current user
    giverId: "user303",
    giverName: "Knowledge Seekers",
    giverInitial: "K",
    givenAt: "2023-05-05T08:10:00Z",
    template: mockBadgeTemplates.find(b => b.id === "badge007"),
  },
];

// Available badges for the user to give to others
export const mockAvailableBadges = [
  {
    tier: "GOLD",
    remaining: 3,
    totalPerPeriod: 3,
  },
  {
    tier: "SILVER",
    remaining: 7,
    totalPerPeriod: 10,
  },
  {
    tier: "BRONZE",
    remaining: 18,
    totalPerPeriod: 30,
  },
];

// Notifications
export const mockNotifications = [
  {
    id: "notif001",
    type: "GUILD_INVITE",
    title: "Writers Club has invited you to join their guild",
    sender: "Writers Club",
    createdAt: "2023-06-15T08:30:00Z",
    read: false,
    meta: {
      guildId: "guild005",
      inviteId: "invite001",
    },
    requiresAction: true,
  },
  {
    id: "notif002",
    type: "BADGE_RECEIVED",
    title: "You received a Gold Badge from Alex in Tech Innovators",
    sender: "Alex",
    createdAt: "2023-06-14T15:45:00Z",
    read: true,
    meta: {
      badgeInstanceId: "instance008",
      guildId: "guild004",
      badgeTier: "GOLD",
    },
    requiresAction: false,
  },
  {
    id: "notif003",
    type: "GUILD_JOIN",
    title: "Sarah has joined Design Masters using your invite",
    sender: "Sarah",
    createdAt: "2023-06-13T09:20:00Z",
    read: true,
    meta: {
      guildId: "guild001",
      inviteId: "invite002",
      userId: "user909",
    },
    requiresAction: false,
  },
];

// Combined export of all mock data
export const mockData = {
  user: mockUser,
  guilds: mockGuilds,
  badgeTemplates: mockBadgeTemplates,
  receivedBadges: mockReceivedBadges,
  trophyCase: mockTrophyCase,
  availableBadges: mockAvailableBadges,
  notifications: mockNotifications,
};

export default mockData; 