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
sudo npm run build
cd frontend && sudo npm run build
```

## pm2 reload

> ❗ pm2 SHOULD be managed from the **midiverse-user**, so the created system services are correctly attached to midiverse-user.

```bash
pm2 status

pm2 delete all

# Start applications
pm2 start /var/www/midiverse-deployment/midiverse/ecosystem.config.js

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