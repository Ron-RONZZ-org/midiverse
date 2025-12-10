## Quick access

```bash
ssh ronzz-linux-server-2
cd /var/www/midiverse-deployment/midiverse
cd frontend

sudo nano /etc/nginx/sites-available/midiverse
sudo nginx -t
sudo systemctl restart nginx
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

## Known pitfalls

- Port conflicts
  - PM2 cluster mode with 2 instances 
    - Both backend instances tried to bind to port 3010
    - causing EADDRINUSE errors
- Wrong build path
  - PM2 was looking for dist/main.js but it was at dist/src/main.js