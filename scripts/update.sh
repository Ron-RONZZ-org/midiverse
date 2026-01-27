#!/bin/bash
# Midiverse Update/Maintenance Script
# Based on docs/MAINTENANCE-midiverse.md
# 
# This script automates the update process for Midiverse
# 
# Usage: sudo ./scripts/update.sh [options]
# Options:
#   --app-dir DIR        Set custom application directory (default: /var/www/midiverse-deployment/midiverse)
#   --skip-deps          Skip dependency installation
#   --skip-migration     Skip database migration
#   --skip-build         Skip application rebuild
#   --skip-restart       Skip PM2 restart
#   --branch BRANCH      Git branch to pull from (default: main)
#   --full-restart       Delete all PM2 processes and start fresh
#   --dry-run            Show what would be done without making changes
#   --help               Show this help message

set -e  # Exit on error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default configuration
APP_DIR="/var/www/midiverse-deployment/midiverse"
SKIP_DEPS=false
SKIP_MIGRATION=false
SKIP_BUILD=false
SKIP_RESTART=false
BRANCH="main"
FULL_RESTART=false
DRY_RUN=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --app-dir)
      APP_DIR="$2"
      shift 2
      ;;
    --skip-deps)
      SKIP_DEPS=true
      shift
      ;;
    --skip-migration)
      SKIP_MIGRATION=true
      shift
      ;;
    --skip-build)
      SKIP_BUILD=true
      shift
      ;;
    --skip-restart)
      SKIP_RESTART=true
      shift
      ;;
    --branch)
      BRANCH="$2"
      shift 2
      ;;
    --full-restart)
      FULL_RESTART=true
      shift
      ;;
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --help)
      head -n 16 "$0" | tail -n 14
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

execute_command() {
  local cmd="$1"
  local description="$2"
  
  if [ "$DRY_RUN" = true ]; then
    print_info "[DRY RUN] Would execute: $cmd"
    print_info "[DRY RUN] Description: $description"
    return 0
  fi
  
  print_info "$description"
  eval "$cmd"
}

# Check if directory exists
check_directory() {
  if [ ! -d "$APP_DIR" ]; then
    print_error "Application directory not found: $APP_DIR"
    print_info "Use --app-dir option to specify correct directory"
    exit 1
  fi
  print_success "Application directory found: $APP_DIR"
}

# Backup current state
backup_state() {
  print_header "Creating Backup"

  local BACKUP_DIR="$APP_DIR/.backup-$(date +%Y%m%d-%H%M%S)"
  
  if [ "$DRY_RUN" = true ]; then
    print_info "[DRY RUN] Would create backup at: $BACKUP_DIR"
    return 0
  fi

  print_info "Creating backup at: $BACKUP_DIR"
  mkdir -p "$BACKUP_DIR"

  # Backup .env files
  if [ -f "$APP_DIR/.env" ]; then
    cp "$APP_DIR/.env" "$BACKUP_DIR/backend.env"
    print_success "Backend .env backed up"
  fi

  if [ -f "$APP_DIR/frontend/.env" ]; then
    cp "$APP_DIR/frontend/.env" "$BACKUP_DIR/frontend.env"
    print_success "Frontend .env backed up"
  fi

  # Backup ecosystem config
  if [ -f "$APP_DIR/ecosystem.config.js" ]; then
    cp "$APP_DIR/ecosystem.config.js" "$BACKUP_DIR/ecosystem.config.js"
    print_success "PM2 config backed up"
  fi

  print_success "Backup created at: $BACKUP_DIR"
  print_info "To restore, copy files from $BACKUP_DIR back to $APP_DIR"
}

# Check current status
check_status() {
  print_header "Checking Current Status"

  cd "$APP_DIR"

  # Git status
  print_info "Git Status:"
  git status --short || print_warning "Failed to get git status"
  
  print_info "Current branch: $(git branch --show-current)"
  print_info "Latest commit: $(git log -1 --oneline)"

  # PM2 status
  if command -v pm2 &> /dev/null; then
    print_info "PM2 Status:"
    pm2 status || print_warning "PM2 not running or no processes"
  else
    print_warning "PM2 not installed"
  fi
}

# Pull latest changes
pull_changes() {
  print_header "Pulling Latest Changes"

  cd "$APP_DIR"

  # Stash any local changes
  execute_command "git stash" "Stashing local changes..."

  # Pull latest changes
  execute_command "git pull origin $BRANCH" "Pulling from origin/$BRANCH..."
  
  if [ "$DRY_RUN" = false ]; then
    print_success "Changes pulled successfully"
    print_info "Changes summary:"
    git --no-pager log --oneline -5
  fi
}

# Install dependencies
install_dependencies() {
  if [ "$SKIP_DEPS" = true ]; then
    print_warning "Skipping dependency installation"
    return
  fi

  print_header "Installing Dependencies"

  cd "$APP_DIR"

  # Backend dependencies
  execute_command "npm install && npm audit fix || true" "Installing backend dependencies..." 
  if [ "$DRY_RUN" = false ]; then
    print_success "Backend dependencies installed"
  fi

  # Frontend dependencies
  execute_command "cd frontend && npm install && npm audit fix || true && cd .." "Installing frontend dependencies..."
  if [ "$DRY_RUN" = false ]; then
    print_success "Frontend dependencies installed"
  fi
}

# Run database migrations
run_migrations() {
  if [ "$SKIP_MIGRATION" = true ]; then
    print_warning "Skipping database migrations"
    return
  fi

  print_header "Running Database Migrations"

  cd "$APP_DIR"

  # Check if DATABASE_URL is set
  if [ ! -f ".env" ]; then
    print_error ".env file not found!"
    exit 1
  fi

  # Generate Prisma client
  execute_command "npx prisma generate" "Generating Prisma Client..."
  if [ "$DRY_RUN" = false ]; then
    print_success "Prisma Client generated"
  fi

  # Run migrations
  execute_command "npx prisma migrate deploy" "Running database migrations..."
  if [ "$DRY_RUN" = false ]; then
    print_success "Migrations completed"
  fi
}

# Build applications
build_applications() {
  if [ "$SKIP_BUILD" = true ]; then
    print_warning "Skipping application build"
    return
  fi

  print_header "Building Applications"

  cd "$APP_DIR"

  # Clean old build (as mentioned in maintenance docs)
  print_info "Cleaning old build files..."
  if [ "$DRY_RUN" = false ]; then
    rm -rf dist
    print_success "Old build cleaned"
  else
    print_info "[DRY RUN] Would remove dist directory"
  fi

  # Build backend
  execute_command "npm run build" "Building backend..."
  if [ "$DRY_RUN" = false ]; then
    print_success "Backend built successfully"
    
    # Verify build output
    if [ ! -f "dist/src/main.js" ] && [ ! -f "dist/main.js" ]; then
      print_error "Build output not found! Expected dist/src/main.js or dist/main.js"
      print_info "Please check the build logs above"
      exit 1
    fi
    print_success "Build output verified"
  fi

  # Build frontend
  execute_command "cd frontend && npm run build && cd .." "Building frontend..."
  if [ "$DRY_RUN" = false ]; then
    print_success "Frontend built successfully"
    
    # Verify frontend build
    if [ ! -f "frontend/.output/server/index.mjs" ]; then
      print_error "Frontend build output not found! Expected frontend/.output/server/index.mjs"
      print_info "Please check the build logs above"
      exit 1
    fi
    print_success "Frontend build output verified"
  fi
}

# Restart PM2 services
restart_services() {
  if [ "$SKIP_RESTART" = true ]; then
    print_warning "Skipping service restart"
    return
  fi

  print_header "Restarting Services"

  if ! command -v pm2 &> /dev/null; then
    print_error "PM2 not installed!"
    exit 1
  fi

  cd "$APP_DIR"

  if [ "$FULL_RESTART" = true ]; then
    print_info "Performing full restart (delete all + start fresh)..."
    
    if [ "$DRY_RUN" = false ]; then
      # Delete all processes
      pm2 delete all || print_warning "No processes to delete"
      
      # Start fresh
      if [ ! -f "ecosystem.config.js" ]; then
        print_error "ecosystem.config.js not found!"
        exit 1
      fi
      
      pm2 start ecosystem.config.js
      pm2 save
      print_success "Services restarted (full restart)"
    else
      print_info "[DRY RUN] Would delete all PM2 processes and start fresh"
    fi
  else
    print_info "Restarting PM2 services..."
    
    if [ "$DRY_RUN" = false ]; then
      # Simple restart (this serves the latest build)
      pm2 restart all
      print_success "Services restarted"
    else
      print_info "[DRY RUN] Would restart all PM2 processes"
    fi
  fi

  # Show status
  if [ "$DRY_RUN" = false ]; then
    print_info "PM2 Status:"
    pm2 status
  fi
}

# Verify deployment
verify_deployment() {
  print_header "Verifying Deployment"

  if [ "$DRY_RUN" = true ]; then
    print_info "[DRY RUN] Skipping verification"
    return
  fi

  # Check if services are running
  print_info "Checking if services are running..."
  
  # Get backend port from ecosystem config
  BACKEND_PORT=$(grep -oP "PORT:\s*\K\d+" "$APP_DIR/ecosystem.config.js" | head -1)
  FRONTEND_PORT=$(grep -oP "PORT:\s*\K\d+" "$APP_DIR/ecosystem.config.js" | tail -1)
  
  if [ -z "$BACKEND_PORT" ]; then
    BACKEND_PORT=3010
  fi
  if [ -z "$FRONTEND_PORT" ]; then
    FRONTEND_PORT=3001
  fi

  # Wait a moment for services to start
  sleep 3

  # Check backend
  if curl -s "http://localhost:$BACKEND_PORT/api/health" > /dev/null 2>&1 || \
     curl -s "http://localhost:$BACKEND_PORT/api" > /dev/null 2>&1; then
    print_success "Backend is responding on port $BACKEND_PORT"
  else
    print_warning "Backend may not be responding on port $BACKEND_PORT"
    print_info "Check logs with: pm2 logs midiverse-backend"
  fi

  # Check frontend
  if curl -s "http://localhost:$FRONTEND_PORT" > /dev/null 2>&1; then
    print_success "Frontend is responding on port $FRONTEND_PORT"
  else
    print_warning "Frontend may not be responding on port $FRONTEND_PORT"
    print_info "Check logs with: pm2 logs midiverse-frontend"
  fi
}

# Show summary
show_summary() {
  print_header "Update Complete!"

  if [ "$DRY_RUN" = true ]; then
    print_info "This was a dry run. No changes were made."
    print_info "Run without --dry-run to apply changes."
    return
  fi

  print_success "Midiverse has been updated successfully!"
  echo ""
  print_info "Update Summary:"
  echo "  - Branch: $BRANCH"
  echo "  - Latest commit: $(cd $APP_DIR && git log -1 --oneline)"
  echo "  - Dependencies: $([ "$SKIP_DEPS" = true ] && echo "Skipped" || echo "Updated")"
  echo "  - Migrations: $([ "$SKIP_MIGRATION" = true ] && echo "Skipped" || echo "Executed")"
  echo "  - Build: $([ "$SKIP_BUILD" = true ] && echo "Skipped" || echo "Completed")"
  echo "  - Services: $([ "$SKIP_RESTART" = true ] && echo "Not restarted" || echo "Restarted")"
  echo ""
  print_info "Useful Commands:"
  echo "  - View logs: pm2 logs"
  echo "  - View specific logs: pm2 logs midiverse-backend"
  echo "  - Restart services: pm2 restart all"
  echo "  - Check status: pm2 status"
  echo "  - Monitor resources: pm2 monit"
  echo ""
  
  # Check for backups
  BACKUP_FOUND=$(ls -td "$APP_DIR"/.backup-* 2>/dev/null | head -1)
  if [ -n "$BACKUP_FOUND" ]; then
    print_info "Backup created at: $BACKUP_FOUND"
  fi
}

# Main execution
main() {
  print_header "Midiverse Update/Maintenance"
  
  if [ "$DRY_RUN" = true ]; then
    print_warning "DRY RUN MODE - No changes will be made"
  fi

  print_info "Starting update process..."

  check_directory
  backup_state
  check_status
  pull_changes
  install_dependencies
  run_migrations
  build_applications
  restart_services
  verify_deployment
  show_summary
}

# Handle errors
trap 'print_error "Update failed! Check the error messages above."; exit 1' ERR

# Run main function
main
