# Development Guide

## Prerequisites

- Node.js 18+ and npm
- PostgreSQL database
- Git

## Initial Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/Ron-RONZZ-org/midiverse.git
   cd midiverse
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```
   
   Note: This automatically runs `prisma generate` to create the Prisma Client.

3. **Configure environment variables**
   
   Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
   
   Update the `.env` file with your configuration:
   ```env
   DATABASE_URL="postgresql://user:password@localhost:5432/midiverse?schema=public"
   JWT_SECRET="your-secure-secret-key"
   PORT=3000
   ```

4. **Set up the database**
   
   Run database migrations:
   ```bash
   npx prisma migrate dev --name init
   ```
   
   (Optional) Seed the database:
   ```bash
   npx prisma db seed
   ```
   
   Note: `prisma generate` is automatically run after `npm install`, so you don't need to run it manually unless you modify the schema.

## Running the Application

### Development Mode
```bash
npm run start:dev
```

This starts the application with hot-reload enabled. The server will be available at `http://localhost:3000`.

### Production Mode
```bash
npm run build
npm run start:prod
```

### Debug Mode
```bash
npm run start:debug
```

## Testing

### Run all tests
```bash
npm test
```

### Run tests in watch mode
```bash
npm run test:watch
```

### Run tests with coverage
```bash
npm run test:cov
```

### Run e2e tests
```bash
npm run test:e2e
```

## Code Quality

### Linting
```bash
npm run lint
```

### Format code
```bash
npm run format
```

## Database Management

### View database in Prisma Studio
```bash
npx prisma studio
```

### Create a new migration
```bash
npx prisma migrate dev --name your_migration_name
```

### Reset database (WARNING: This will delete all data)
```bash
npx prisma migrate reset
```

### Generate Prisma Client after schema changes
```bash
npx prisma generate
```

## Project Structure

```
midiverse/
├── prisma/
│   └── schema.prisma          # Database schema
├── src/
│   ├── auth/                  # Authentication module
│   │   ├── dto/              # Data Transfer Objects
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── auth.module.ts
│   │   └── jwt.strategy.ts
│   ├── markmaps/             # Markmap module
│   │   ├── dto/
│   │   ├── markmaps.controller.ts
│   │   ├── markmaps.service.ts
│   │   └── markmaps.module.ts
│   ├── users/                # Users module
│   │   ├── users.controller.ts
│   │   ├── users.service.ts
│   │   └── users.module.ts
│   ├── prisma/               # Prisma service
│   │   ├── prisma.service.ts
│   │   └── prisma.module.ts
│   ├── common/               # Shared utilities
│   │   ├── decorators/
│   │   ├── guards/
│   │   └── interfaces/
│   ├── app.module.ts
│   └── main.ts
├── test/                     # E2E tests
├── .env                      # Environment variables (not in git)
├── .env.example              # Environment variables template
└── package.json
```

## Adding a New Feature

1. **Create a new module**
   ```bash
   nest generate module feature-name
   nest generate service feature-name
   nest generate controller feature-name
   ```

2. **Add DTOs**
   Create DTO files in `src/feature-name/dto/`

3. **Update Prisma schema** (if needed)
   Edit `prisma/schema.prisma` and run:
   ```bash
   npx prisma migrate dev --name add_feature_name
   npx prisma generate
   ```

4. **Write tests**
   Create `.spec.ts` files alongside your services and controllers

5. **Update documentation**
   Update `README.md` and `API.md` as needed

## Common Development Tasks

### Adding a new endpoint
1. Define the DTO in the appropriate module's `dto/` directory
2. Add the method to the service
3. Add the route handler to the controller
4. Add validation using class-validator decorators
5. Add authentication guards if needed (`@UseGuards(JwtAuthGuard)`)
6. Write tests for the new endpoint

### Modifying the database schema
1. Edit `prisma/schema.prisma`
2. Create and apply migration: `npx prisma migrate dev`
3. Update affected services to use the new schema
4. Update DTOs if needed
5. Update tests

### Adding authentication to an endpoint
```typescript
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Get('protected')
getProtectedData(@CurrentUser() user: UserFromToken) {
  // user is automatically populated from JWT
  return this.service.getData(user.id);
}
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| DATABASE_URL | PostgreSQL connection string | Required |
| JWT_SECRET | Secret key for JWT signing | Required |
| PORT | Port for the application | 3000 |

## Troubleshooting

### Database connection errors
- Ensure PostgreSQL is running
- Check DATABASE_URL format
- Verify database credentials

### Prisma Client errors
- The Prisma Client is automatically generated after `npm install`
- If you modify the schema, run `npx prisma generate` to regenerate the client
- Ensure migrations are up to date with `npx prisma migrate dev`

### Build errors
- Clear the `dist` folder: `rm -rf dist`
- Reinstall dependencies: `rm -rf node_modules && npm install`

### Test failures
- Ensure test database is properly configured
- Check for timing issues in async tests
- Verify mock data is correct

## Contributing

1. Create a feature branch: `git checkout -b feature/your-feature`
2. Make your changes
3. Run tests: `npm test`
4. Run linter: `npm run lint`
5. Commit your changes: `git commit -m "Add feature"`
6. Push to the branch: `git push origin feature/your-feature`
7. Create a Pull Request

## Useful Commands

```bash
# Install a new package
npm install package-name

# Install a dev dependency
npm install -D package-name

# View logs in development
npm run start:dev | grep "Error"

# Check for outdated packages
npm outdated

# Update packages
npm update

# Clean build
rm -rf dist node_modules && npm install && npm run build
```

## Resources

- [NestJS Documentation](https://docs.nestjs.com/)
- [Prisma Documentation](https://www.prisma.io/docs/)
- [Markmap Documentation](https://markmap.js.org/)
- [JWT Authentication](https://jwt.io/)
