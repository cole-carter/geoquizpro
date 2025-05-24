#!/bin/bash

# GeoQuiz Pro Deployment Script
# This script automates the local setup and provides step-by-step instructions for external services

set -e  # Exit on any error

echo "🚀 GeoQuiz Pro Deployment Script"
echo "================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_step() {
    echo -e "${BLUE}📋 STEP $1: $2${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ️  $1${NC}"
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "Please run this script from the geoquiz project root directory"
    exit 1
fi

# Check if project name contains geoquiz
if ! grep -q "geoquiz" package.json; then
    print_error "This doesn't appear to be the GeoQuiz project"
    exit 1
fi

print_step "1" "Preparing Local Environment"

# Create .env.example file
cat > .env.example << EOF
# MapBox API Token (Required for production)
REACT_APP_MAPBOX_TOKEN=pk.your_mapbox_token_here

# Environment setting
REACT_APP_ENV=production

# Optional: Analytics and monitoring
REACT_APP_ANALYTICS_ID=your_analytics_id
REACT_APP_ERROR_TRACKING_DSN=your_sentry_dsn
EOF

print_success ".env.example file created"

# Create netlify.toml configuration
cat > netlify.toml << EOF
[build]
  publish = "build"
  command = "npm run build"

[build.environment]
  NODE_VERSION = "18"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-XSS-Protection = "1; mode=block"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"

[[headers]]
  for = "/static/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"
EOF

print_success "Netlify configuration file created"

# Create GitHub workflow
mkdir -p .github/workflows
cat > .github/workflows/deploy.yml << EOF
name: Deploy GeoQuiz Pro

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run tests
      run: npm test -- --coverage --passWithNoTests
    
    - name: Build project
      run: npm run build
      env:
        REACT_APP_MAPBOX_TOKEN: \${{ secrets.REACT_APP_MAPBOX_TOKEN }}
        REACT_APP_ENV: production

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'

    steps:
    - uses: actions/checkout@v3
    
    - name: Deploy to Netlify
      uses: netlify/actions/cli@master
      with:
        args: deploy --prod --dir=build
      env:
        NETLIFY_AUTH_TOKEN: \${{ secrets.NETLIFY_AUTH_TOKEN }}
        NETLIFY_SITE_ID: \${{ secrets.NETLIFY_SITE_ID }}
EOF

print_success "GitHub Actions workflow created"

# Create _redirects file for Netlify SPA routing
cat > public/_redirects << EOF
/*    /index.html   200
EOF

print_success "Netlify redirects file created"

# Create robots.txt for SEO
cat > public/robots.txt << EOF
User-agent: *
Allow: /

Sitemap: https://geoquizpro.com/sitemap.xml
EOF

print_success "Robots.txt file created"

# Update package.json with homepage
if ! grep -q '"homepage"' package.json; then
    # Add homepage field
    sed -i 's/"private": true,/"private": true,\n  "homepage": "https:\/\/geoquizpro.com",/' package.json
    print_success "Homepage added to package.json"
fi

print_step "2" "Testing Production Build"

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    print_info "Installing dependencies..."
    npm install
fi

# Test build
print_info "Creating production build..."
if npm run build; then
    print_success "Production build successful!"
    
    # Get build size info
    BUILD_SIZE=$(du -sh build | cut -f1)
    print_info "Build size: $BUILD_SIZE"
    
    # Check for common issues
    if [ -d "build/static/js" ]; then
        JS_FILES=$(ls -la build/static/js/*.js | wc -l)
        print_info "JavaScript chunks: $JS_FILES"
    fi
    
    if [ -d "build/static/css" ]; then
        CSS_FILES=$(ls -la build/static/css/*.css | wc -l)
        print_info "CSS files: $CSS_FILES"
    fi
else
    print_error "Production build failed! Please fix errors before deploying."
    exit 1
fi

print_step "3" "Git Repository Setup"

# Initialize git if not already done
if [ ! -d ".git" ]; then
    print_info "Initializing Git repository..."
    git init
    print_success "Git repository initialized"
else
    print_info "Git repository already exists"
fi

# Create .gitignore if it doesn't exist
if [ ! -f ".gitignore" ]; then
    cat > .gitignore << EOF
# Dependencies
/node_modules
/.pnp
.pnp.js

# Testing
/coverage

# Production
/build

# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Logs
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Runtime data
pids
*.pid
*.seed
*.pid.lock

# Editor directories and files
.vscode/*
!.vscode/extensions.json
.idea
.DS_Store
*.suo
*.ntvs*
*.njsproj
*.sln
*.sw?

# Temporary files
*.tmp
*.temp
EOF
    print_success ".gitignore file created"
fi

# Stage all files
git add .

# Check if there are changes to commit
if git diff --staged --quiet; then
    print_info "No changes to commit"
else
    print_info "Committing changes..."
    git commit -m "Production deployment setup

- Add Netlify configuration
- Add GitHub Actions workflow  
- Add production build files
- Configure routing and SEO
- Prepare for geoquizpro.com deployment"
    print_success "Changes committed"
fi

print_step "4" "Deployment Instructions"

echo ""
echo "🎯 MANUAL STEPS REQUIRED:"
echo "========================"
echo ""

echo "1. 📱 CREATE GITHUB REPOSITORY:"
echo "   → Go to https://github.com/new"
echo "   → Repository name: geoquiz"
echo "   → Make it public"
echo "   → Don't initialize with README (we have files already)"
echo "   → Click 'Create repository'"
echo ""

echo "2. 🔗 CONNECT LOCAL TO GITHUB:"
echo "   → Copy the commands GitHub shows you, they'll look like:"
echo "   → git remote add origin https://github.com/YOURUSERNAME/geoquiz.git"
echo "   → git branch -M main"
echo "   → git push -u origin main"
echo ""

echo "3. 🗺️  GET MAPBOX TOKEN:"
echo "   → Go to https://account.mapbox.com/access-tokens/"
echo "   → Click 'Create a token'"
echo "   → Name: 'GeoQuiz Pro Production'"
echo "   → Scopes: ✅ styles:tiles ✅ styles:read ✅ fonts:read"
echo "   → URL restrictions: https://geoquizpro.com/* and https://www.geoquizpro.com/*"
echo "   → Copy the token (starts with pk.)"
echo ""

echo "4. 🚀 DEPLOY TO NETLIFY:"
echo "   → Go to https://app.netlify.com/start"
echo "   → Click 'Import from Git' → GitHub"
echo "   → Select your geoquiz repository"
echo "   → Build settings should auto-fill (build command: npm run build, publish: build)"
echo "   → Click 'Deploy site'"
echo ""

echo "5. ⚙️  ADD ENVIRONMENT VARIABLES:"
echo "   → In Netlify dashboard → Site settings → Environment variables"
echo "   → Add variable: REACT_APP_MAPBOX_TOKEN = your_mapbox_token"
echo "   → Add variable: REACT_APP_ENV = production"
echo "   → Click 'Redeploy' to apply changes"
echo ""

echo "6. 🌐 CONFIGURE DOMAIN (geoquizpro.com):"
echo "   → In Netlify: Site settings → Domain management"
echo "   → Add custom domain: geoquizpro.com"
echo "   → Also add: www.geoquizpro.com"
echo ""

echo "7. 📡 UPDATE GODADDY DNS:"
echo "   → Go to GoDaddy DNS management for geoquizpro.com"
echo "   → Delete any existing A/CNAME records"
echo "   → Add A record: @ → 75.2.60.5"
echo "   → Add CNAME record: www → YOUR-NETLIFY-SITE.netlify.app"
echo "   → (Replace YOUR-NETLIFY-SITE with your actual Netlify site name)"
echo ""

echo "8. ⏱️  WAIT FOR PROPAGATION:"
echo "   → DNS changes take 15-60 minutes to propagate"
echo "   → SSL certificate will auto-provision after DNS is active"
echo "   → Check https://geoquizpro.com when ready"
echo ""

echo "✅ VERIFICATION CHECKLIST:"
echo "   → All 4 quiz types work"
echo "   → Satellite map loads properly"
echo "   → No vertical scrolling on mobile"
echo "   → Click-anywhere detection works"
echo "   → HTTPS is enabled"
echo "   → Site loads from geoquizpro.com and www.geoquizpro.com"
echo ""

print_step "5" "Quick Commands Reference"

cat > DEPLOYMENT_COMMANDS.md << EOF
# Quick Deployment Commands

## After creating GitHub repository, run these commands:

\`\`\`bash
# Connect to GitHub (replace YOURUSERNAME)
git remote add origin https://github.com/YOURUSERNAME/geoquiz.git
git branch -M main
git push -u origin main
\`\`\`

## GoDaddy DNS Records:
| Type | Name | Value | TTL |
|------|------|-------|-----|
| A | @ | 75.2.60.5 | 1 Hour |
| CNAME | www | your-site-name.netlify.app | 1 Hour |

## Netlify Environment Variables:
- REACT_APP_MAPBOX_TOKEN = pk.your_mapbox_token_here
- REACT_APP_ENV = production

## Test URLs after deployment:
- https://geoquizpro.com
- https://www.geoquizpro.com

## Troubleshooting:
- DNS Checker: https://whatsmydns.net
- Netlify Logs: Site dashboard → Deploys
- Browser Console: Check for errors
EOF

print_success "DEPLOYMENT_COMMANDS.md created for reference"

echo ""
print_success "🎉 Local setup complete!"
print_info "Follow the manual steps above to complete deployment"
print_info "Estimated total time: 30-60 minutes (mostly waiting for DNS)"
echo ""
print_warning "💡 TIP: Keep the MapBox token secure - never commit it to Git!"
print_info "📚 See DEPLOYMENT_COMMANDS.md for quick reference"