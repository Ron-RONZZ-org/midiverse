# GitHub Copilot Instructions for Midiverse

## General instructions

Copilot should thoroughly test its modifications before demanding human review.

## Project Overview

Midiverse is a NestJS application for editing and displaying markmaps (visual markdown mind maps). It provides a RESTful API backend with JWT authentication, allowing users to create, view, edit, and share markmaps.

## Technology Stack

- **Framework**: NestJS (Node.js framework)
- **Language**: TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT with Passport
- **Validation**: class-validator, class-transformer
- **Password Security**: bcrypt
- **Markmap Libraries**: markmap-lib, markmap-view
- **Testing**: Jest

## Code Style and Conventions

### General Guidelines

- Follow NestJS best practices and conventions
- Use TypeScript strict mode
- Use dependency injection for all services
- Keep controllers thin - business logic belongs in services
- Use DTOs (Data Transfer Objects) for all request/response payloads
- Apply validation decorators from class-validator on all DTOs

### Naming Conventions

- **Files**: Use kebab-case for file names (e.g., `markmaps.service.ts`)
- **Classes**: Use PascalCase (e.g., `MarkmapsService`)
- **Interfaces**: Use PascalCase with descriptive names (e.g., `CreateMarkmapDto`)
- **Variables/Functions**: Use camelCase (e.g., `getUserProfile`)
- **Constants**: Use UPPER_SNAKE_CASE (e.g., `JWT_SECRET`)

### Code Organization

- Group related functionality into modules (`*.module.ts`)
- Place DTOs in `dto/` subdirectories within each module
- Keep guards, decorators, and shared utilities in `src/common/`
- One class per file
- Export interfaces and types from their respective modules

### Formatting

- Use Prettier for code formatting (config in `.prettierrc`)
- Use ESLint for linting (config in `eslint.config.mjs`)
- Run `npm run format` before committing
- Run `npm run lint` to check for issues

## Database Schema

### Models

1. **User**
   - Fields: id (UUID), email (unique), username (unique), password (hashed), createdAt, updatedAt
   - Relations: markmaps[], viewHistory[], interactions[]

2. **Markmap**
   - Fields: id (UUID), title, text (markdown), language?, topic?, maxWidth, colorFreezeLevel, initialExpandLevel, isPublic, createdAt, updatedAt
   - Relations: author (User), viewHistory[], interactions[]
   - Indexes: authorId, isPublic, language, topic

3. **ViewHistory**
   - Fields: id (UUID), viewedAt
   - Relations: user (User), markmap (Markmap)
   - Used to track when users view markmaps

4. **Interaction**
   - Fields: id (UUID), type (string), metadata (JSON), interactedAt
   - Relations: user (User), markmap (Markmap)
   - Used to track user interactions (expand, collapse, search, etc.)

### Prisma Usage

- Use Prisma Client for all database operations
- Inject `PrismaService` into services that need database access
- Use transactions for operations that modify multiple tables
- Always use proper error handling for database operations
- Use `select` and `include` to optimize queries and prevent over-fetching

## Authentication

### JWT Strategy

- JWT tokens are issued upon login via `/auth/login`
- Token contains: userId, username, email
- Protect endpoints with `@UseGuards(JwtAuthGuard)`
- Access current user via `@CurrentUser()` decorator
- Tokens are validated via `JwtStrategy` in `src/auth/jwt.strategy.ts`

### Password Security

- Passwords are hashed using bcrypt before storage
- Never store or log plain text passwords
- Use bcrypt.compare() for password verification

## API Design Patterns

### Controllers

- Use appropriate HTTP methods (GET, POST, PATCH, DELETE)
- Apply validation pipes at controller level
- Use DTOs for request bodies and query parameters
- Return consistent response structures
- Handle errors with NestJS exception filters

### Services

- Contain all business logic
- Perform database operations via PrismaService
- Throw appropriate exceptions (NotFoundException, UnauthorizedException, etc.)
- Keep methods focused and single-purpose

### DTOs

- Create separate DTOs for create, update, and search operations
- Use class-validator decorators (@IsString, @IsOptional, @IsEmail, etc.)
- Use @ApiProperty decorators for Swagger documentation (if added)
- Use PartialType from @nestjs/mapped-types for update DTOs

## Testing

### Unit Tests

- Test files should have `.spec.ts` extension
- Place test files alongside the code they test
- Mock external dependencies (PrismaService, external APIs)
- Test both success and error scenarios
- Use descriptive test names: `it('should return user profile when authenticated')`

### E2E Tests

- E2E tests are in the `test/` directory
- Use `supertest` for HTTP request testing
- Set up test database separately from development database
- Clean up test data after each test

### Running Tests

- `npm test` - Run unit tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:cov` - Run tests with coverage
- `npm run test:e2e` - Run end-to-end tests

## Development Workflow

### Starting Development

1. Ensure PostgreSQL is running
2. Copy `.env.example` to `.env` and configure
3. Run `npx prisma generate` to generate Prisma Client
4. Run `npx prisma migrate dev` to apply migrations
5. Run `npm run start:dev` for hot-reload development

### Adding New Features

1. Generate module structure: `nest generate module feature-name`
2. Create service: `nest generate service feature-name`
3. Create controller: `nest generate controller feature-name`
4. Add DTOs in `src/feature-name/dto/`
5. Update Prisma schema if needed (then run migrations)
6. Write tests for the new feature
7. Update documentation (README.md, API.md)

### Database Changes

1. Modify `prisma/schema.prisma`
2. Run `npx prisma migrate dev --name descriptive_name`
3. Run `npx prisma generate` to update Prisma Client
4. Update affected services and DTOs
5. Update tests to reflect schema changes

## Common Patterns

### Authorization Patterns

```typescript
// Protect endpoint
@UseGuards(JwtAuthGuard)
@Get('profile')
getProfile(@CurrentUser() user: UserFromToken) {
  return this.usersService.getProfile(user.id);
}

// Optional authentication (for public endpoints with user context)
@UseGuards(OptionalJwtAuthGuard)
@Get('markmaps/:id')
getMarkmap(@Param('id') id: string, @CurrentUser() user?: UserFromToken) {
  return this.markmapsService.findOne(id, user?.id);
}
```

### Error Handling

```typescript
// In services
async findOne(id: string) {
  const markmap = await this.prisma.markmap.findUnique({ where: { id } });
  if (!markmap) {
    throw new NotFoundException(`Markmap with ID ${id} not found`);
  }
  return markmap;
}
```

### Validation

```typescript
// In DTOs
export class CreateMarkmapDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  text: string;

  @IsString()
  @IsOptional()
  language?: string;
}
```

## Frontend Development Patterns

### Vue 3 + Nuxt 3 Best Practices

#### Chart Rendering with External Libraries

When integrating heavy libraries like Plotly that aren't SSR-compatible:

**Problem**: Libraries that depend on browser globals (like `window`, `document`, `self`) will fail during server-side rendering.

**Solution Pattern**:
1. **Dynamic Import**: Load the library only on the client side using `onMounted` hook
2. **Reactive Watchers**: Use Vue's `watch()` to automatically render when data is ready
3. **Avoid Manual Timing**: Let Vue's reactivity system handle timing instead of using retries/delays

**Example Implementation** (Tags Page Charts):

```typescript
// 1. Dynamic client-side import
let Plotly: any = null
const plotlyLoaded = ref(false)

onMounted(async () => {
  if (process.client) {
    const module = await import('plotly.js-dist-min')
    Plotly = module.default
    plotlyLoaded.value = true
    fetchStatistics() // Initial data fetch
  }
})

// 2. Use watchers to automatically render when conditions are met
watch([statistics, loading, plotlyLoaded], async () => {
  if (!loading.value && plotlyLoaded.value) {
    await nextTick() // Wait for DOM update
    renderChart()
  }
})

// 3. Simple render function - no retries needed
const renderChart = () => {
  if (!plotlyLoaded.value || !Plotly || !chartRef.value || data.value.length === 0) {
    return
  }
  Plotly.newPlot(chartRef.value, data, layout, config)
}
```

**Benefits of This Approach**:
- ✅ No SSR errors (library only loads in browser)
- ✅ Automatic rendering when data arrives (Vue reactivity)
- ✅ Smaller server bundle (library not included in SSR)
- ✅ No race conditions or timing issues
- ✅ Simpler, more maintainable code

**Anti-patterns to Avoid**:
- ❌ Static imports of browser-only libraries
- ❌ Manual timing with `setTimeout` delays
- ❌ Complex retry logic with counters
- ❌ Manually calling render functions after data fetch
- ❌ Setting loading state to false before calling render (creates race conditions)

### Reactive State Management

#### Authentication State

For state that needs to be reactive across components but is stored in localStorage:

**Problem**: Direct localStorage access isn't tracked by Vue's reactivity system.

**Solution**: Wrap localStorage access in reactive refs:

```typescript
const authState = ref({
  token: null as string | null,
  user: null as any
})

// Initialize from localStorage
if (process.client) {
  authState.value.token = localStorage.getItem('token')
  authState.value.user = JSON.parse(localStorage.getItem('user') || 'null')
}

// Getters that read from reactive state
const getToken = () => authState.value.token
const getUser = () => authState.value.user

// Setters that update both localStorage AND reactive state
const setToken = (token: string) => {
  if (process.client) {
    localStorage.setItem('token', token)
    authState.value.token = token
  }
}
```

This ensures UI components that use `getToken()` or `getUser()` automatically update when auth state changes.

## Environment Variables

Required environment variables (see `.env.example`):
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secret key for JWT token signing
- `PORT` - Application port (default: 3000)

## Important Notes

- Public markmaps can be viewed without authentication
- Only markmap authors can update or delete their markmaps
- ViewHistory and Interactions can be anonymous (userId is optional)
- Always validate user permissions before allowing updates/deletes
- Use transactions when creating related records
- Cascade deletes are configured for ViewHistory and Interaction when a Markmap is deleted

## Build and Deploy

- Build: `npm run build`
- Start production: `npm run start:prod`
- Build output is in `dist/` directory
- Ensure all migrations are applied in production before starting the app
