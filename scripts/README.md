# Midiverse Deployment Scripts

This directory contains automated scripts for deploying and maintaining Midiverse in production.

## Available Scripts

### 1. `deploy.sh` - Initial Deployment Script

Automates the complete initial deployment of Midiverse on Ubuntu 24.04 LTS.

**Usage:**
```bash
sudo ./scripts/deploy.sh [options]
```

**Options:**
- `--skip-system-deps` - Skip system dependencies installation (Node.js, PostgreSQL, PM2)
- `--skip-nginx` - Skip Nginx configuration
- `--skip-ssl` - Skip SSL certificate setup
- `--app-dir DIR` - Set custom application directory (default: `/var/www/midiverse-deployment/midiverse`)
- `--repo-url URL` - Set custom repository URL (default: `https://github.com/Ron-RONZZ-org/midiverse.git`)
- `--domain DOMAIN` - Set domain name for Nginx and SSL
- `--help` - Show help message

**What it does:**
1. Installs system dependencies (Node.js, PostgreSQL, PM2)
2. Clones the repository
3. Installs backend and frontend dependencies
4. Creates environment configuration files
5. Sets up the database (Prisma migrations)
6. Builds backend and frontend applications
7. Configures and starts PM2
8. Configures Nginx as reverse proxy
9. Sets up SSL certificate with Let's Encrypt (if domain provided)

**Example - Full deployment with domain:**
```bash
sudo ./scripts/deploy.sh --domain example.com
```

**Example - Skip system deps (already installed):**
```bash
sudo ./scripts/deploy.sh --domain example.com --skip-system-deps
```

**Example - Deploy to custom directory:**
```bash
sudo ./scripts/deploy.sh --app-dir /opt/midiverse --domain example.com
```

### 2. `update.sh` - Update/Maintenance Script

Automates the update process for an existing Midiverse deployment.

**Usage:**
```bash
sudo ./scripts/update.sh [options]
```

**Options:**
- `--app-dir DIR` - Set custom application directory (default: `/var/www/midiverse-deployment/midiverse`)
- `--skip-deps` - Skip dependency installation
- `--skip-migration` - Skip database migration
- `--skip-build` - Skip application rebuild
- `--skip-restart` - Skip PM2 restart
- `--branch BRANCH` - Git branch to pull from (default: `main`)
- `--full-restart` - Delete all PM2 processes and start fresh
- `--dry-run` - Show what would be done without making changes
- `--help` - Show help message

**What it does:**
1. Creates backup of configuration files
2. Checks current status
3. Pulls latest changes from Git
4. Installs dependencies
5. Runs database migrations
6. Builds applications
7. Restarts PM2 services
8. Verifies deployment

**Example - Standard update:**
```bash
sudo ./scripts/update.sh
```

**Example - Update with full restart:**
```bash
sudo ./scripts/update.sh --full-restart
```

**Example - Dry run (see what would happen):**
```bash
sudo ./scripts/update.sh --dry-run
```

**Example - Update from specific branch:**
```bash
sudo ./scripts/update.sh --branch develop
```

**Example - Quick restart without rebuild:**
```bash
sudo ./scripts/update.sh --skip-deps --skip-build
```

### 3. `setup-production-db.sh` - Database Setup Script

Sets up the database for production (existing script).

**Usage:**
```bash
# Ensure DATABASE_URL is set in .env
./scripts/setup-production-db.sh
```

## Prerequisites

### For `deploy.sh`:
- Ubuntu 24.04 LTS server
- Root access (sudo)
- Domain name (optional, but recommended for Nginx/SSL)

### For `update.sh`:
- Existing Midiverse deployment
- Root access (sudo)
- Working PM2 configuration

## Important Notes

### Environment Configuration

Both scripts will work with environment files. You need to configure:

**Backend (`.env`):**
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Strong random secret key
- `TURNSTILE_SECRET_KEY` - Cloudflare Turnstile secret
- `EMAIL_*` - SMTP configuration
- `EMAIL_LINK_BASEURL` - Your domain URL

**Frontend (`frontend/.env`):**
- `NUXT_PUBLIC_API_BASE` - API base path (use `/api`)
- `NUXT_PUBLIC_TURNSTILE_SITE_KEY` - Cloudflare Turnstile site key

### PM2 Configuration

The scripts work with the `ecosystem.config.js` file. Ensure it's properly configured with:
- Correct script paths (`.dist/src/main.js` for backend, `.output/server/index.mjs` for frontend)
- Proper ports (default: 3010 for backend, 3001 for frontend)
- Environment variables as needed

### Database Migrations

The update script automatically runs Prisma migrations. If a migration fails:
1. Check the error message
2. Review migration files in `prisma/migrations/`
3. Ensure database credentials are correct
4. Fix the issue and run the script again

### Backup and Recovery

The update script creates automatic backups before making changes. Backups are stored in:
```
$APP_DIR/.backup-YYYYMMDD-HHMMSS/
```

To restore from backup:
```bash
cd /var/www/midiverse-deployment/midiverse
cp .backup-20240101-120000/.env .env
cp .backup-20240101-120000/frontend.env frontend/.env
cp .backup-20240101-120000/ecosystem.config.js ecosystem.config.js
```

## Troubleshooting

### Script fails with permission error
Make sure to run with sudo:
```bash
sudo ./scripts/deploy.sh
```

### PM2 not found after installation
Reload your shell or source your profile:
```bash
source ~/.bashrc
# or
source ~/.profile
```

### Services not restarting properly
Try a full restart:
```bash
sudo ./scripts/update.sh --full-restart
```

### Build path issues
If PM2 can't find the build output, check:
- Backend: Should be at `dist/src/main.js` or `dist/main.js`
- Frontend: Should be at `frontend/.output/server/index.mjs`

Update `ecosystem.config.js` if the paths differ.

### Port conflicts
If you see `EADDRINUSE` errors:
1. Check what's using the port: `sudo lsof -i :3010`
2. Stop conflicting processes
3. Run the script again

## Best Practices

1. **Always test in staging first** - Use `--dry-run` with update script to see changes
2. **Backup before major updates** - The script does this automatically, but manual backups are recommended for major updates
3. **Monitor logs after updates** - Run `pm2 logs` to check for errors
4. **Keep environment files secure** - Never commit `.env` files to Git
5. **Regular database backups** - Set up automated PostgreSQL backups
6. **Monitor resources** - Use `pm2 monit` to watch memory and CPU usage

## Security Considerations

- Scripts require root access - review them before running
- Environment files are backed up but not encrypted
- SSL certificates are automatically renewed by Certbot
- Keep system and dependencies updated regularly
- Use strong passwords and secrets in environment files

## Additional Resources

- [Full Deployment Guide](../docs/DEPLOYMENT-midiverse.md)
- [Maintenance Guide](../docs/MAINTENANCE-midiverse.md)
- [GitHub Issues](https://github.com/Ron-RONZZ-org/midiverse/issues)

## Support

If you encounter issues:
1. Check the script output for error messages
2. Review application logs: `pm2 logs`
3. Check Nginx logs: `sudo tail -f /var/log/nginx/error.log`
4. Consult the deployment documentation
5. Open an issue on GitHub with details
