#!/bin/bash
# Midiverse Production Deployment Script
# Based on docs/DEPLOYMENT-midiverse.md
# 
# This script automates the initial deployment of Midiverse on Ubuntu 24.04 LTS
# 
# Usage: sudo ./scripts/deploy.sh [options]
# Options:
#   --skip-system-deps   Skip system dependencies installation (Node.js, PM2)
#   --skip-nginx         Skip Nginx configuration
#   --skip-ssl           Skip SSL certificate setup
#   --app-dir DIR        Set custom application directory (default: /var/www/midiverse-deployment/midiverse)
#   --repo-url URL       Set custom repository URL (default: https://github.com/Ron-RONZZ-org/midiverse.git)
#   --domain DOMAIN      Set domain name for Nginx and SSL
#   --help               Show this help message

set -e  # Exit on error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default configuration
SKIP_SYSTEM_DEPS=false
SKIP_NGINX=false
SKIP_SSL=false
APP_DIR="/var/www/midiverse-deployment/midiverse"
REPO_URL="https://github.com/Ron-RONZZ-org/midiverse.git"
DOMAIN=""
BACKEND_PORT=3010
FRONTEND_PORT=3001

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --skip-system-deps)
      SKIP_SYSTEM_DEPS=true
      shift
      ;;
    --skip-nginx)
      SKIP_NGINX=true
      shift
      ;;
    --skip-ssl)
      SKIP_SSL=true
      shift
      ;;
    --app-dir)
      APP_DIR="$2"
      shift 2
      ;;
    --repo-url)
      REPO_URL="$2"
      shift 2
      ;;
    --domain)
      DOMAIN="$2"
      shift 2
      ;;
    --help)
      head -n 15 "$0" | tail -n 13
      exit 0
      ;;
    *)
      echo -e "${RED}Error: Unknown option $1${NC}"
      echo "Use --help for usage information"
      exit 1
      ;;
  esac
done

# Helper functions
print_header() {
  echo ""
  echo -e "${BLUE}========================================${NC}"
  echo -e "${BLUE}$1${NC}"
  echo -e "${BLUE}========================================${NC}"
  echo ""
}

print_success() {
  echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
  echo -e "${YELLOW}⚠ $1${NC}"
}

print_error() {
  echo -e "${RED}✗ $1${NC}"
}

print_info() {
  echo -e "${BLUE}ℹ $1${NC}"
}

# Check if running as root
check_root() {
  if [ "$EUID" -ne 0 ]; then
    print_error "This script must be run as root (use sudo)"
    exit 1
  fi
}

# Install system dependencies
install_system_deps() {
  if [ "$SKIP_SYSTEM_DEPS" = true ]; then
    print_warning "Skipping system dependencies installation"
    return
  fi

  print_header "Installing System Dependencies"

  print_info "Updating system packages..."
  apt update && apt upgrade -y
  print_success "System packages updated"

  print_info "Installing Node.js 18..."
  if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt-get install -y nodejs
    print_success "Node.js installed: $(node --version)"
  else
    print_success "Node.js already installed: $(node --version)"
  fi

  print_info "Installing PM2..."
  if ! command -v pm2 &> /dev/null; then
    npm install -g pm2
    print_success "PM2 installed: $(pm2 --version)"
  else
    print_success "PM2 already installed: $(pm2 --version)"
  fi
}

# Clone and setup application
setup_application() {
  print_header "Setting Up Application"

  # Create application directory
  APP_BASE_DIR=$(dirname "$APP_DIR")
  if [ ! -d "$APP_BASE_DIR" ]; then
    print_info "Creating application directory: $APP_BASE_DIR"
    mkdir -p "$APP_BASE_DIR"
    print_success "Directory created"
  fi

  # Clone repository
  cd "$APP_BASE_DIR"
  if [ ! -d "$APP_DIR" ]; then
    print_info "Cloning repository from $REPO_URL..."
    git clone "$REPO_URL"
    print_success "Repository cloned"
  else
    print_warning "Application directory already exists: $APP_DIR"
    print_info "Pulling latest changes..."
    cd "$APP_DIR"
    git pull origin main || print_warning "Failed to pull latest changes (may already be up-to-date)"
  fi

  cd "$APP_DIR"

  # Install backend dependencies
  print_info "Installing backend dependencies..."
  npm install
  print_success "Backend dependencies installed"

  # Install frontend dependencies
  print_info "Installing frontend dependencies..."
  cd frontend
  npm install
  cd ..
  print_success "Frontend dependencies installed"
}

# Configure environment files
configure_env() {
  print_header "Configuring Environment Files"

  # Check if .env exists
  if [ -f "$APP_DIR/.env" ]; then
    print_warning ".env file already exists, skipping creation"
    print_info "Please ensure your .env file has all required variables"
  else
    print_info "Creating .env file from template..."
    if [ -f "$APP_DIR/.env.example" ]; then
      cp "$APP_DIR/.env.example" "$APP_DIR/.env"
      print_warning ".env file created from .env.example"
      print_warning "IMPORTANT: You must edit .env and configure:"
      print_warning "  - DATABASE_URL (PostgreSQL connection)"
      print_warning "  - JWT_SECRET (generate a strong random key)"
      print_warning "  - TURNSTILE_SECRET_KEY (from Cloudflare)"
      print_warning "  - EMAIL_* variables (SMTP configuration)"
      print_warning "  - EMAIL_LINK_BASEURL (your domain URL)"
    else
      print_error ".env.example not found!"
      exit 1
    fi
  fi

  # Check if frontend/.env exists
  if [ -f "$APP_DIR/frontend/.env" ]; then
    print_warning "frontend/.env file already exists, skipping creation"
  else
    print_info "Creating frontend/.env file..."
    cat > "$APP_DIR/frontend/.env" << 'EOF'
# Backend API URL - Use relative path to avoid CORS issues
NUXT_PUBLIC_API_BASE=/api

# Cloudflare Turnstile Site Key (you must set this)
NUXT_PUBLIC_TURNSTILE_SITE_KEY=your-turnstile-site-key
EOF
    print_warning "frontend/.env file created"
    print_warning "IMPORTANT: You must edit frontend/.env and set:"
    print_warning "  - NUXT_PUBLIC_TURNSTILE_SITE_KEY (from Cloudflare)"
  fi

  print_info "Please review and update environment files before continuing:"
  print_info "  - $APP_DIR/.env"
  print_info "  - $APP_DIR/frontend/.env"
  echo ""
  read -p "Press Enter to continue after configuring environment files, or Ctrl+C to exit..."
}

# Setup database
setup_database() {
  print_header "Setting Up Database"

  cd "$APP_DIR"

  # Check if DATABASE_URL is set in .env
  if ! grep -q "^DATABASE_URL=" .env || grep -q "^DATABASE_URL=.*your-secure-password.*" .env; then
    print_error "DATABASE_URL not properly configured in .env"
    print_info "Please configure DATABASE_URL in .env before continuing"
    exit 1
  fi

  print_info "Generating Prisma Client..."
  npx prisma generate
  print_success "Prisma Client generated"

  print_info "Running database migrations..."
  npx prisma migrate deploy
  print_success "Database migrations completed"
}

# Build applications
build_applications() {
  print_header "Building Applications"

  cd "$APP_DIR"

  print_info "Building backend..."
  npm run build
  print_success "Backend build completed"

  print_info "Building frontend..."
  cd frontend
  npm run build
  cd ..
  print_success "Frontend build completed"
}

# Setup PM2
setup_pm2() {
  print_header "Setting Up PM2"

  cd "$APP_DIR"

  # Check if ecosystem.config.js exists
  if [ ! -f "ecosystem.config.js" ]; then
    print_error "ecosystem.config.js not found!"
    print_info "Please ensure ecosystem.config.js exists in $APP_DIR"
    exit 1
  fi

  # Update ecosystem.config.js with actual paths
  print_info "Updating ecosystem.config.js with current directory..."
  sed -i "s|cwd: '/var/www/midiverse-deployment/midiverse'|cwd: '$APP_DIR'|g" ecosystem.config.js
  sed -i "s|cwd: '/var/www/midiverse-deployment/midiverse/frontend'|cwd: '$APP_DIR/frontend'|g" ecosystem.config.js

  # Update ports if needed
  if [ "$BACKEND_PORT" != "3010" ]; then
    sed -i "s|PORT: 3010|PORT: $BACKEND_PORT|g" ecosystem.config.js
  fi
  if [ "$FRONTEND_PORT" != "3001" ]; then
    sed -i "s|PORT: 3001|PORT: $FRONTEND_PORT|g" ecosystem.config.js
  fi

  print_success "ecosystem.config.js updated"

  # Start applications with PM2
  print_info "Starting applications with PM2..."
  pm2 start ecosystem.config.js
  print_success "Applications started"

  # Save PM2 configuration
  print_info "Saving PM2 configuration..."
  pm2 save
  print_success "PM2 configuration saved"

  # Setup PM2 startup
  print_info "Configuring PM2 to start on boot..."
  pm2 startup systemd -u root --hp /root
  print_success "PM2 startup configured"

  # Show PM2 status
  print_info "PM2 Status:"
  pm2 status
}

# Configure Nginx
configure_nginx() {
  if [ "$SKIP_NGINX" = true ]; then
    print_warning "Skipping Nginx configuration"
    return
  fi

  print_header "Configuring Nginx"

  if [ -z "$DOMAIN" ]; then
    print_warning "No domain specified, skipping Nginx configuration"
    print_info "Use --domain option to configure Nginx automatically"
    return
  fi

  # Install Nginx if not present
  if ! command -v nginx &> /dev/null; then
    print_info "Installing Nginx..."
    apt install nginx -y
    print_success "Nginx installed"
  else
    print_success "Nginx already installed"
  fi

  # Create Nginx configuration
  print_info "Creating Nginx configuration for $DOMAIN..."
  cat > /etc/nginx/sites-available/midiverse << EOF
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;

    # Backend API (all API routes are prefixed with /api)
    location /api {
        proxy_pass http://localhost:$BACKEND_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    }

    # Frontend (all other routes)
    location / {
        proxy_pass http://localhost:$FRONTEND_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF
  print_success "Nginx configuration created"

  # Enable site
  print_info "Enabling Nginx site..."
  ln -sf /etc/nginx/sites-available/midiverse /etc/nginx/sites-enabled/
  print_success "Site enabled"

  # Test configuration
  print_info "Testing Nginx configuration..."
  nginx -t
  print_success "Nginx configuration is valid"

  # Restart Nginx
  print_info "Restarting Nginx..."
  systemctl restart nginx
  print_success "Nginx restarted"

  # Configure firewall
  print_info "Configuring UFW firewall..."
  ufw allow 22/tcp   # SSH
  ufw allow 80/tcp   # HTTP
  ufw allow 443/tcp  # HTTPS
  ufw --force enable
  print_success "Firewall configured"
}

# Setup SSL
setup_ssl() {
  if [ "$SKIP_SSL" = true ]; then
    print_warning "Skipping SSL setup"
    return
  fi

  if [ -z "$DOMAIN" ]; then
    print_warning "No domain specified, skipping SSL setup"
    print_info "Use --domain option to configure SSL automatically"
    return
  fi

  print_header "Setting Up SSL Certificate"

  # Install Certbot
  if ! command -v certbot &> /dev/null; then
    print_info "Installing Certbot..."
    apt install certbot python3-certbot-nginx -y
    print_success "Certbot installed"
  else
    print_success "Certbot already installed"
  fi

  # Obtain SSL certificate
  print_info "Obtaining SSL certificate for $DOMAIN..."
  print_warning "This will require domain verification. Ensure your domain points to this server."
  read -p "Continue with SSL certificate setup? (y/n) " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    certbot --nginx -d "$DOMAIN" -d "www.$DOMAIN" --non-interactive --agree-tos --redirect
    print_success "SSL certificate obtained"
    
    # Test auto-renewal
    print_info "Testing SSL certificate auto-renewal..."
    certbot renew --dry-run
    print_success "SSL auto-renewal configured"
  else
    print_warning "SSL setup skipped by user"
  fi
}

# Final checks and information
final_checks() {
  print_header "Deployment Complete!"

  print_success "Midiverse has been deployed successfully!"
  echo ""
  print_info "Application Status:"
  pm2 status
  echo ""
  print_info "Next Steps:"
  echo "  1. Verify environment variables in $APP_DIR/.env"
  echo "  2. Verify frontend configuration in $APP_DIR/frontend/.env"
  echo "  3. Configure Cloudflare Turnstile (get site key and secret key)"
  echo "  4. Configure email service (SMTP credentials)"
  if [ -n "$DOMAIN" ]; then
    echo "  5. Ensure DNS records point to this server:"
    # Get server IP securely
    SERVER_IP=$(ip route get 1 2>/dev/null | awk '{print $7; exit}')
    if [ -z "$SERVER_IP" ]; then
      SERVER_IP="YOUR_SERVER_IP"
    fi
    echo "     A record: $DOMAIN -> $SERVER_IP"
    echo "     A record: www.$DOMAIN -> $SERVER_IP"
    echo "  6. Visit https://$DOMAIN to access your application"
  else
    echo "  5. Configure Nginx with your domain (use --domain option or configure manually)"
    echo "  6. Setup SSL certificate with Certbot"
  fi
  echo ""
  print_info "Useful Commands:"
  echo "  - View logs: pm2 logs"
  echo "  - Restart apps: pm2 restart all"
  echo "  - Stop apps: pm2 stop all"
  echo "  - Update app: sudo bash $APP_DIR/scripts/update.sh"
  echo ""
  print_warning "Security Checklist:"
  echo "  - Enable firewall (UFW) - $(ufw status | head -n 1)"
  echo "  - Keep system and dependencies updated"
  echo "  - Setup regular database backups"
  echo ""
}

# Main execution
main() {
  print_header "Midiverse Production Deployment"
  print_info "Starting automated deployment..."

  check_root
  install_system_deps
  setup_application
  configure_env
  setup_database
  build_applications
  setup_pm2
  configure_nginx
  setup_ssl
  final_checks
}

# Run main function
main
