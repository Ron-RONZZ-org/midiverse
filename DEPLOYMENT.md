# Production Deployment Guide

This guide covers deploying Midiverse to an Ubuntu 24.04 LTS (Noble Numbat) server with all production features enabled.

## Prerequisites

- Ubuntu 24.04 LTS server
- PostgreSQL 14+ installed
- Node.js 18+ and npm installed
- Domain name configured (optional, but recommended)
- Cloudflare account (for Turnstile)
- Email service (SMTP) access

## 1. Server Setup

### Install Dependencies

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PostgreSQL
sudo apt install postgresql postgresql-contrib -y

# Install PM2 for process management
sudo npm install -g pm2
```


## 2. Application Setup

### Clone and Install

```bash
# Clone repository
sudo mkdir -p /var/www/midiverse-deployment/
cd /var/www/midiverse-deployment/
git clone https://github.com/Ron-RONZZ-org/midiverse.git
cd midiverse

# Install backend dependencies
npm install

# Install frontend dependencies
cd frontend
npm install
cd ..
```

### Configure Environment Variables

#### Backend Configuration (.env)

Create `.env` file in the root directory:

```env
# Database
DATABASE_URL="postgresql://midiverseuser:your-secure-password@localhost:5432/midiverse?schema=public"

# JWT Configuration
JWT_SECRET="generate-a-strong-random-secret-key-here"
JWT_EXPIRATION="7d"

# Server
PORT=3000

# Cloudflare Turnstile
TURNSTILE_SECRET_KEY="your-turnstile-secret-key"

# Email Configuration (Example: Gmail)
EMAIL_HOST="smtp.gmail.com"
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER="your-email@gmail.com"
EMAIL_PASSWORD="your-app-specific-password"
EMAIL_FROM="noreply@yourdomain.com"

# Application URL (used in email verification links)
EMAIL_LINK_BASEURL="https://yourdomain.com"
```

#### Frontend Configuration (frontend/.env)

Create `frontend/.env` file:

```env
# Backend API URL
NUXT_PUBLIC_API_BASE=https://yourdomain.com/api

# Cloudflare Turnstile Site Key
NUXT_PUBLIC_TURNSTILE_SITE_KEY="your-turnstile-site-key"
```

## 3. Configure Cloudflare Turnstile

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Navigate to Turnstile section
3. Create a new site
4. Copy the **Site Key** (for frontend) and **Secret Key** (for backend)
5. Add your domain to the allowed domains list

## 4. Configure Email Service

### Using Gmail

1. Enable 2-factor authentication on your Google account
2. Generate an App Password:
   - Go to Google Account Settings → Security
   - Select "2-Step Verification"
   - Scroll to "App passwords"
   - Generate password for "Mail"
3. Use this app password in `EMAIL_PASSWORD`

### Using Other SMTP Services

Update the following variables based on your provider:
- `EMAIL_HOST` - SMTP server address
- `EMAIL_PORT` - SMTP port (usually 587 for TLS or 465 for SSL)
- `EMAIL_SECURE` - Set to "true" for SSL, "false" for TLS
- `EMAIL_USER` - Your SMTP username
- `EMAIL_PASSWORD` - Your SMTP password

## 5. Database Migration

Run migrations to set up the database schema:

```bash
# Generate Prisma Client
npx prisma generate

# Run migrations
npx prisma migrate deploy
```

## 6. Build the Application

```bash
# Build backend
npm run build

# Build frontend
cd frontend
npm run build
cd ..
```

## 7. Start with PM2

Create PM2 ecosystem file `~/ecosystem.config.js`:

```javascript
module.exports = {
  apps: [
    {
      name: 'midiverse-backend',
      script: './dist/main.js',
      cwd: '/var/www/midiverse-deployment/midiverse',
      env: {
        NODE_ENV: 'production',
        PORT: 3010,
        FRONTEND_URL: "https://midiverse.org",
      },
      instances: 2,
      exec_mode: 'cluster',
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
    },
    {
      name: 'midiverse-frontend',
      script: 'node_modules/nuxt/bin/nuxt.mjs',
      args: 'start',
      cwd: '/var/www/midiverse-deployment/midiverse/frontend',
      env: {
        NODE_ENV: 'production',
        HOST: '0.0.0.0',
        PORT: 3001,
        FRONTEND_URL: "https://midiverse.org",
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
    },
  ],
};
```

Start the applications:

```bash
# Start applications
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
```

Test the deployment:

```bash
sudo apt install curl 
pm2 status # if you switched user to execute sudo, you may need to restart the applications
curl http://localhost:3001
```

## 8. Configure Nginx (Reverse Proxy)

Install and configure Nginx:

```bash
sudo apt install nginx -y
```

Create Nginx configuration `/etc/nginx/sites-available/midiverse`:

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    # Backend API (all API routes are prefixed with /api)
    location /api {
        proxy_pass http://localhost:3010;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # Frontend (all other routes)
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable the site and allow it through firewall:

```bash
sudo ln -s /etc/nginx/sites-available/midiverse /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
# Configure UFW
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS
sudo ufw enable
```

Test connection from another machine:

```bash
curl http://<server-ip-address>
```

You should see the nginx welcome page. You do not see your actual site content since nginx is built for multi-site hosting and you must specify the web domain name in your request header to resolve to the actual site.

See [guide on uncomplicated firewall if the site is not accessible from the public internet](https://ronzz.org/uncomplicated-firewall-ufw/)

If the server is now publically available via `HTTP`, add the following DNS records in your domain name configuration through your DNS provider :

```BIND
; A records (replace <SERVER_IPV4> with your server IP)
@       IN  A   <SERVER_IPV4>
www     IN  A   <SERVER_IPV4>

; Optional IPv6
@       IN  AAAA  <SERVER_IPV6>
www     IN  AAAA  <SERVER_IPV6>

; Allow Let's Encrypt to issue certificates
@       IN  CAA 0 issue "letsencrypt.org"
```

## 9. SSL Certificate (Let's Encrypt)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Obtain SSL certificate
sudo certbot --nginx -d yourdomain.com

# Auto-renewal is configured automatically
sudo certbot renew --dry-run
```

## 10. Monitoring and Logs

### View PM2 Logs

```bash
# View all logs
pm2 logs

# View specific application logs
pm2 logs midiverse-backend
pm2 logs midiverse-frontend

# Monitor resources
pm2 monit
```

### View Nginx Logs

```bash
# Access logs
sudo tail -f /var/log/nginx/access.log

# Error logs
sudo tail -f /var/log/nginx/error.log
```

## 11. Maintenance

### Update Application

```bash
cd /var/www/midiverse-deployment/midiverse
# Pull latest changes
git pull origin main

# Install dependencies
npm install
cd frontend && npm install && cd ..

# Run new migrations
npx prisma migrate deploy

# Rebuild applications
npm run build
cd frontend && npm run build && cd ..

# Restart applications
pm2 restart all
```

## Security Checklist

- [ ] Enable firewall (UFW)
- [ ] Install SSL certificate
- [ ] Keep system and dependencies updated
- [ ] Configure proper file permissions
- [ ] Enable Cloudflare Turnstile for bot protection
- [ ] Use environment variables (never commit secrets)
- [ ] Regular database backups
- [ ] Monitor logs for suspicious activity
- [ ] Use app-specific passwords for email

## Troubleshooting

### Backend won't start
- Check database connection in `.env`
- Verify PostgreSQL is running: `sudo systemctl status postgresql`
- Check logs: `pm2 logs midiverse-backend`

### Email verification not working
- Verify SMTP credentials
- Check if email service allows less secure apps or requires app password
- Check backend logs for email sending errors

### Turnstile not loading
- Verify site key is correct in frontend `.env`
- Check browser console for errors
- Ensure domain is whitelisted in Cloudflare Turnstile settings

### Database migration errors
- Ensure database user has proper permissions
- Check if previous migrations completed successfully
- Review migration files in `prisma/migrations/`

## Performance Optimization

1. **Enable Nginx Caching**: Add caching rules for static assets
2. **PostgreSQL Tuning**: Adjust `postgresql.conf` for production
3. **PM2 Clustering**: Use cluster mode for backend (already configured)
4. **CDN**: Consider using Cloudflare CDN for static assets
5. **Monitoring**: Set up monitoring with tools like Prometheus/Grafana

## Support

For issues or questions:
- Check the [GitHub Issues](https://github.com/Ron-RONZZ-org/midiverse/issues)
- Review application logs
- Consult the main [README.md](./README.md)
