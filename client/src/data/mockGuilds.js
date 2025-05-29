/**
 * Mock guilds data that mirrors the expected API response structure
 * This will be used during frontend development until the backend is ready
 */

export const mockUserGuilds = [
  {
    id: "g1",
    name: "Design Masters",
    description: "A guild for designers and creatives to share ideas, get feedback, and collaborate on projects. We focus on UI/UX, graphic design, illustration, and other creative fields.",
    avatar: null,
    isOpen: false,
    createdAt: "2023-06-15T10:30:00Z",
    updatedAt: "2023-07-20T14:45:00Z",
    role: "OWNER",
    isPrimary: true,
    memberCount: 56,
    creator: {
      id: "u1",
      username: "janedoe",
      avatar: null
    }
  },
  {
    id: "g2",
    name: "Code Ninjas",
    description: "A community of developers passionate about coding. We discuss best practices, new technologies, and help each other solve programming challenges.",
    avatar: null,
    isOpen: true,
    createdAt: "2023-05-10T08:15:00Z",
    updatedAt: "2023-07-15T11:20:00Z",
    role: "MEMBER",
    isPrimary: false,
    memberCount: 128,
    creator: {
      id: "u2",
      username: "johndoe",
      avatar: null
    }
  },
  {
    id: "g3",
    name: "Gaming League",
    description: "For gamers of all levels to connect, organize tournaments, and discuss gaming news and strategies.",
    avatar: null,
    isOpen: true,
    createdAt: "2023-04-05T16:45:00Z",
    updatedAt: "2023-07-10T09:30:00Z",
    role: "ADMIN",
    isPrimary: false,
    memberCount: 92,
    creator: {
      id: "u3",
      username: "bobsmith",
      avatar: null
    }
  },
  {
    id: "g4",
    name: "Tech Innovators",
    description: "A guild dedicated to discussing emerging technologies, startups, and innovation in the tech space.",
    avatar: null,
    isOpen: false,
    createdAt: "2023-03-20T13:00:00Z",
    updatedAt: "2023-07-05T15:10:00Z",
    role: "MEMBER",
    isPrimary: false,
    memberCount: 45,
    creator: {
      id: "u2",
      username: "johndoe",
      avatar: null
    }
  },
  {
    id: "g5",
    name: "Content Creators",
    description: "For YouTubers, streamers, podcasters, and other content creators to network and share tips and strategies.",
    avatar: null,
    isOpen: false,
    createdAt: "2023-02-15T09:20:00Z",
    updatedAt: "2023-06-30T12:15:00Z",
    role: "MEMBER",
    isPrimary: false,
    memberCount: 74,
    creator: {
      id: "u1",
      username: "janedoe",
      avatar: null
    }
  }
];

export const mockGuildDetails = {
  id: "g1",
  name: "Design Masters",
  description: "A guild for designers and creatives to share ideas, get feedback, and collaborate on projects. We focus on UI/UX, graphic design, illustration, and other creative fields.",
  avatar: null,
  isOpen: false,
  createdAt: "2023-06-15T10:30:00Z",
  updatedAt: "2023-07-20T14:45:00Z",
  creator: {
    id: "u1",
    username: "janedoe",
    avatar: null
  },
  memberships: [
    {
      id: "m1",
      role: "OWNER",
      joinedAt: "2023-06-15T10:30:00Z",
      user: {
        id: "u1",
        username: "janedoe",
        avatar: null
      }
    },
    {
      id: "m2",
      role: "ADMIN",
      joinedAt: "2023-06-16T11:45:00Z",
      user: {
        id: "u3",
        username: "bobsmith",
        avatar: null
      }
    },
    {
      id: "m3",
      role: "MEMBER",
      joinedAt: "2023-06-17T14:20:00Z",
      user: {
        id: "u2",
        username: "johndoe",
        avatar: null
      }
    }
  ]
};

export const mockGuildSearch = [
  {
    id: "g2",
    name: "Code Ninjas",
    description: "A community of developers passionate about coding. We discuss best practices, new technologies, and help each other solve programming challenges.",
    avatar: null,
    isOpen: true,
    createdAt: "2023-05-10T08:15:00Z",
    updatedAt: "2023-07-15T11:20:00Z",
    memberCount: 128,
    creator: {
      id: "u2",
      username: "johndoe",
      avatar: null
    }
  },
  {
    id: "g3",
    name: "Gaming League",
    description: "For gamers of all levels to connect, organize tournaments, and discuss gaming news and strategies.",
    avatar: null,
    isOpen: true,
    createdAt: "2023-04-05T16:45:00Z",
    updatedAt: "2023-07-10T09:30:00Z",
    memberCount: 92,
    creator: {
      id: "u3",
      username: "bobsmith",
      avatar: null
    }
  },
  {
    id: "g6",
    name: "Data Scientists",
    description: "A guild for data scientists, analysts, and enthusiasts to collaborate on projects and share knowledge.",
    avatar: null,
    isOpen: true,
    createdAt: "2023-01-10T12:30:00Z",
    updatedAt: "2023-06-25T08:45:00Z",
    memberCount: 63,
    creator: {
      id: "u4",
      username: "alicejohnson",
      avatar: null
    }
  }
]; 