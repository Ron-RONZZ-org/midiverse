# Midiverse maintenance instructions

> If after successful update, the changes are still not applied to the web application, you are VERY LIKELY having multiple instances attached to different system users running via their own `pm2` manager. Since you only updated one of them, all others are still serving the older version. See [kill stale processes](#kill-stale-processes) for help. 

## Quick access

### Automated Update (Recommended)

For automated updates, use the update script:

> ❗ The script pulls the latest version on `remote main`. Uncommitted local changes will be stashed ! Commit them if you would like them reflected !

```bash
cd /var/www/midiverse-deployment/midiverse

# Standard update (pull, install deps, migrate, build, restart)
sudo ./scripts/update.sh

# Update with full PM2 restart (recommended if having issues)
sudo ./scripts/update.sh --full-restart

# Dry run to preview changes
sudo ./scripts/update.sh --dry-run

# Update from specific branch
sudo ./scripts/update.sh --branch develop
```

See [scripts/README.md](../scripts/README.md) for more options and troubleshooting.

### Manual Access (for debugging or custom operations)

```bash
ssh ronzz-linux-server-2

cd /var/www/midiverse-deployment/midiverse
cd frontend

nano /var/www/midiverse-deployment/midiverse/ecosystem.config.js
nano /var/www/midiverse-deployment/midiverse/.env
nano /var/www/midiverse-deployment/midiverse/frontend/.env

sudo nano /etc/nginx/sites-available/midiverse
sudo nginx -t
sudo systemctl restart nginx
```

## prisma migration

```bash
npx prisma migrate deploy
npx prisma generate --no-engine
```

## rebuilding

### Automated (Recommended)

```bash
# Use the update script for automated rebuilding
sudo ./scripts/update.sh
```

### Manual

```bash
git pull && git status
sudo rm -rf dist
sudo npm run build
cd frontend && sudo npm run build
```

## Kill stale processes

> **pm2 configurations are per user. Having multiple users each starting their own instances with exactly the same configuration is destined to cause weird port/version conflict behaviors and MAKE YOU A VERY UNHAPPY INDIVIDUAL.** The only way to be sure is to kill all processes listening on the target port and start afresh.

```bash
sudo systemctl stop pm2-midiverse-user
sudo systemctl stop pm2-ubuntu
sudo systemctl disable pm2-midiverse-user
sudo systemctl disable pm2-ubuntu
sudo rm /etc/systemd/system/pm2-midiverse-user.service
sudo rm /etc/systemd/system/pm2-ubuntu.service
sudo pkill -f PM2
sudo pkill -f node
sudo lsof -i :3010 # should see no output
```

## pm2 reload

> ❗ pm2 SHOULD be managed from the **midiverse-user**, so the created system services are correctly attached to midiverse-user.

```bash
sudo su - midiverse-user

pm2 status

pm2 delete all

# Start applications
pm2 start /var/www/midiverse-deployment/midiverse/ecosystem.config.js

pm2 status
# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
```

> You may be tempted to do a simple `pm2 restart all -update-env`. This will not serve the latest build.

## Known pitfalls

- Port conflicts
  - PM2 cluster mode with 2 instances
    - Both backend instances tried to bind to port 3010
    - causing EADDRINUSE errors
- Wrong build path
  - PM2 was looking for dist/main.js but it was at dist/src/main.js
