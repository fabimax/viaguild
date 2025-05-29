# Revised ViaGuild Guild System Implementation Plan for MVP

## Overview
This document outlines the phased implementation plan for adding the Guild System to ViaGuild's Minimum Viable Product (MVP). The plan breaks down the work into small, testable increments, prioritizing core functionality. Additional guild features may be added in future releases based on user feedback and business requirements.

## Implementation Phases

### Phase 1: Core Guild Data Models and Basic Backend
**Focus**: Establish the foundation with database models and basic API endpoints.

1. **Database Schema Updates**
   - Add Guild model 
   - Add GuildMembership model with role field (OWNER, ADMIN, MEMBER)
   - Create database migration

2. **Basic Guild Service and API**
   - Create, read, update, and delete operations for guilds
   - List and search functionality
   - Guild details endpoints

3. **Guild Membership Service and API**
   - Join/leave operations
   - Membership listing
   - User's guilds listing

**Testing Approach for Phase 1:**
- Create unit tests for each model validating schema constraints
- Write service layer tests with mocked database responses
- Develop API endpoint tests using supertest
- Create test fixtures for sample guilds and memberships
- Test error handling for invalid inputs and edge cases
- **Integration Testing:**
  - Create integration tests that verify the entire guild creation flow from API to database
  - Test database constraints and cascade behaviors across related models
  - Implement end-to-end API tests that perform sequences of operations (create guild → add member → update role → etc.)
  - Verify transactions work correctly when multiple database operations are needed

### Phase 2: Role System and Primary Guild Selection
**Focus**: Implement the permission system and primary guild designation.

4. **Role System Implementation**
   - Role-based permissions (Owner, Admin, Member)
   - Role management endpoints
   - Permission validation middleware

5. **Primary Guild Selection**
   - Set primary guild functionality
   - Update user profile to display primary guild

**Testing Approach for Phase 2:**
- Test role-based access control for each permission level
- Create tests for role assignment and modification
- Test primary guild selection and validation
- Verify constraints (e.g., user can only have one primary guild)
- Test integration with existing user profile system
- **Integration Testing:**
  - Create multi-user scenarios to test permission boundaries (e.g., what happens when an admin tries to modify an owner's role)
  - Test guild membership changes across multiple concurrent requests
  - Implement integration tests for membership lifecycle (join → get role → set primary → leave)
  - Verify database consistency after complex operations with multiple users and roles

### Phase 3: Frontend Guild Implementation
**Focus**: Build the user interface for interacting with guilds.

6. **Guild List & Details Views**
   - Guild browsing interface
   - Individual guild view
   - Search and filtering

7. **Guild Management UI**
   - Guild creation form
   - Guild settings management
   - Member management interface

8. **User Guild Membership UI**
   - My guilds dashboard
   - Primary guild selection
   - Profile guild information display

**Testing Approach for Phase 3:**
- Create React component tests with React Testing Library
- Test UI state management and transitions
- Verify form validation and submission
- Test responsive design across device sizes
- **End-to-End Testing:**
  - Implement Cypress for E2E testing of critical user flows
  - Create user journey tests that cover the entire guild lifecycle from creation to management
  - Test real API integration with mocked or test database
  - Verify frontend authorization works correctly with the backend permission system
  - Test error states and recovery paths (network failures, validation errors, etc.)
  - Create visual regression tests for important guild UI components

### Phase 4: Invite System
**Focus**: Enable community growth through various invitation methods.

9. **Invite Data Model**
    - GuildInvite model with codes, limits, and expiration
    - GuildInvitedUser for tracking invitations
    - Database migration

10. **Invite Backend**
    - Invite generation and validation
    - Invite acceptance/rejection
    - Pending invite management

11. **Invite Frontend**
    - Invite creation interface
    - Invite management dashboard
    - Email invitation workflow

**Testing Approach for Phase 4:**
- Test invite code generation and uniqueness
- Verify expiration and usage limit functionality
- Test invite acceptance flows
- Test email delivery integration
- Create security tests to prevent invite abuse

### Phase 5: Badge System
**Focus**: Add recognition and rewards within guilds.

12. **Badge Data Models**
    - BadgeTemplate model
    - BadgeInstance model
    - Default badges setup

13. **Badge Backend**
    - Badge creation and attribution
    - Badge revocation logic
    - Badge count limits and tiers

14. **Badge Frontend**
    - Badge display components
    - Badge creation UI
    - Profile badge showcase

**Testing Approach for Phase 5:**
- Test badge template creation and validation
- Verify badge attribution and permissions
- Test badge display in various contexts
- Validate badge limits and replenishment
- Test image upload and processing

### Phase 6: Origin Guilds
**Focus**: Implement the special default guilds concept.

15. **Origin Guilds Implementation**
    - Create Scarlet and Azure origin guilds
    - Add logic for origin guild assignment
    - Balance distribution between guilds
    - UI for origin guild selection

**Testing Approach for Phase 6:**
- Test automatic guild assignment for new users
- Verify guild distribution balance logic
- Test that users can't leave their origin guild
    without joining another origin guild
- Validate special status indicators for origin guilds

### Phase 7: External API
**Focus**: Enable third-party integrations.

16. **External API Implementation**
    - Guild membership lookup for social users
    - Badge assignment endpoints
    - Authentication for external apps

17. **API Documentation**
    - Document endpoint usage
    - Provide integration examples

**Testing Approach for Phase 7:**
- Test API endpoint security and authentication
- Verify correct data exposure through API
- Create rate limiting tests
- Test API versioning support
- Develop integration examples with test applications

## Implementation Notes

### Development Approach
For each implementation step:
1. Implement one model/feature at a time
2. Write unit tests for each service before implementation
3. Follow test-driven development where practical
4. Test API endpoints independently
5. Build UI components that can work in isolation
6. Integrate components only after individual testing
7. Create integration tests for feature interactions
8. Develop end-to-end tests for critical user flows

This multi-layered approach ensures we can verify each component works individually and as part of the larger system, reducing the risk of accumulated bugs and making debugging easier.