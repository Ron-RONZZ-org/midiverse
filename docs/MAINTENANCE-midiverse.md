## Quick access

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