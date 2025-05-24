# GeoQuiz Deployment Guide

## Overview

This guide covers deploying GeoQuiz from development to production, including hosting setup, environment configuration, and monitoring implementation.

## Pre-Deployment Checklist

### Code Preparation
- [ ] All features tested across game types (location, capital, flag, population)
- [ ] No vertical scrolling on any screen size or device
- [ ] Map functionality works smoothly with triple-buffer system
- [ ] Satellite imagery loads with proper Esri fallback
- [ ] Analytics tracking implemented and tested
- [ ] Error boundaries and fallback UI implemented
- [ ] Console errors resolved and debug logging removed

### Environment Setup
- [ ] MapBox API account created and production token obtained
- [ ] Domain name registered and DNS configured
- [ ] SSL certificate plan confirmed (usually included with hosting)
- [ ] Analytics platform configured (if using external service)
- [ ] Error monitoring service configured (optional but recommended)

### Performance Optimization
- [ ] Production build tested locally (`npm run build`)
- [ ] Bundle size optimization verified
- [ ] Image assets optimized and compressed
- [ ] API caching strategies implemented
- [ ] Critical path CSS inlined (if applicable)

---

## Recommended Deployment: Netlify

### Why Netlify?
- **Perfect for React**: Optimized for single-page applications
- **Free SSL**: Automatic HTTPS with Let's Encrypt
- **CDN Included**: Global edge network for fast loading
- **Easy Deployments**: Git-based automatic deployments
- **Environment Variables**: Secure configuration management
- **Generous Free Tier**: 100GB bandwidth, 300 build minutes/month

### Step-by-Step Netlify Deployment

#### 1. Prepare Repository
```bash
# Ensure your code is in a Git repository
git init
git add .
git commit -m "Initial commit for deployment"

# Push to GitHub (recommended) or GitLab
git remote add origin https://github.com/yourusername/geoquiz.git
git push -u origin main
```

#### 2. Create Netlify Account
1. Visit [netlify.com](https://netlify.com) and sign up
2. Connect your GitHub/GitLab account
3. Authorize Netlify to access your repositories

#### 3. Configure Site
1. Click "New site from Git"
2. Choose your repository provider (GitHub)
3. Select the GeoQuiz repository
4. Configure build settings:
   - **Branch to deploy**: `main`
   - **Build command**: `npm run build`
   - **Publish directory**: `build`

#### 4. Set Environment Variables
In Netlify dashboard → Site settings → Environment variables:
```
REACT_APP_MAPBOX_TOKEN = your_production_mapbox_token
REACT_APP_ENV = production
```

#### 5. Configure Domain (Optional)
1. In Site settings → Domain management
2. Add custom domain: `yourdomain.com`
3. Configure DNS records as instructed
4. SSL certificate automatically provisioned

#### 6. Deploy
- Initial deployment starts automatically
- Future deployments trigger on every Git push
- Monitor deployment progress in Netlify dashboard

---

## Alternative Hosting Options

### Vercel (Similar to Netlify)
**Pros**: Excellent React support, fast deployments, generous free tier  
**Cons**: More complex pricing for high traffic

**Setup**:
```bash
npm install -g vercel
vercel login
vercel --prod
```

### AWS S3 + CloudFront
**Pros**: Scalable, cost-effective for high traffic, full AWS ecosystem  
**Cons**: More complex setup, requires AWS knowledge

**Basic Setup**:
1. Create S3 bucket with static website hosting
2. Set up CloudFront distribution
3. Configure Route 53 for custom domain
4. Upload build files to S3

### GitHub Pages (Limited)
**Pros**: Free, integrated with GitHub  
**Cons**: Limited features, no server-side functionality, no environment variables

**Setup**:
```bash
npm install --save-dev gh-pages

# Add to package.json scripts:
"predeploy": "npm run build",
"deploy": "gh-pages -d build"

npm run deploy
```

---

## MapBox API Setup

### 1. Create MapBox Account
1. Visit [mapbox.com](https://mapbox.com) and sign up
2. Free tier includes 50,000 map loads/month
3. Navigate to Account → Access tokens

### 2. Create Production Token
1. Click "Create a token"
2. Name: "GeoQuiz Production"
3. Scopes needed:
   - ✅ `styles:tiles` (for satellite imagery)
   - ✅ `styles:read` (for style access)
   - ✅ `fonts:read` (for map labels)
4. URL restrictions (optional but recommended):
   - Add your production domain: `https://yourdomain.com/*`

### 3. Monitor Usage
- Dashboard → Statistics shows usage metrics
- Set up billing alerts if approaching limits
- Consider caching strategies to reduce requests

### 4. Fallback Configuration
Esri World Imagery is automatically used as fallback:
- No API key required
- Reliable global coverage
- Activates when MapBox tiles fail

---

## Domain and SSL Configuration

### Domain Registration
**Recommended Registrars**:
- Namecheap (~$12/year for .com)
- Google Domains (~$12/year)
- Cloudflare (~$10/year with additional features)

### DNS Configuration
For Netlify deployment:
1. Add CNAME record: `www` → `your-site-name.netlify.app`
2. Add A record: `@` → `75.2.60.5` (Netlify's load balancer)
3. Or use Netlify DNS for simplified management

### SSL Certificate
- Automatic with Netlify (Let's Encrypt)
- Renews automatically every 90 days
- Forces HTTPS redirects

---

## Environment Configuration

### Production Environment Variables
```bash
# Required
REACT_APP_MAPBOX_TOKEN=pk.your_production_token_here

# Optional
REACT_APP_ENV=production
REACT_APP_ANALYTICS_ID=your_analytics_id
REACT_APP_ERROR_TRACKING_DSN=your_sentry_dsn
```

### Build-Time Optimizations
```javascript
// In package.json
{
  "scripts": {
    "build": "react-scripts build",
    "build:analyze": "npm run build && npx serve -s build"
  }
}
```

### Runtime Configuration
```javascript
// In src/config/environment.js
const config = {
  production: {
    apiTimeout: 10000,
    mapboxToken: process.env.REACT_APP_MAPBOX_TOKEN,
    enableAnalytics: true,
    logLevel: 'error'
  },
  development: {
    apiTimeout: 30000,
    mapboxToken: process.env.REACT_APP_MAPBOX_TOKEN || 'demo_token',
    enableAnalytics: false,
    logLevel: 'debug'
  }
};

export default config[process.env.REACT_APP_ENV || 'development'];
```

---

## Performance Monitoring

### Built-in Analytics
GeoQuiz includes analytics service that tracks:
- Page views and user navigation
- Quiz completion rates and accuracy
- Map interaction patterns
- Error rates and types

### External Analytics (Optional)

#### Google Analytics 4
```bash
npm install gtag

# Add to public/index.html
<script async src="https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID"></script>
```

#### Error Tracking with Sentry
```bash
npm install @sentry/react

# In src/index.js
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: process.env.REACT_APP_SENTRY_DSN,
  environment: process.env.REACT_APP_ENV
});
```

### Performance Metrics
Monitor these key metrics:
- **First Contentful Paint (FCP)**: < 2 seconds
- **Largest Contentful Paint (LCP)**: < 4 seconds
- **First Input Delay (FID)**: < 100ms
- **Cumulative Layout Shift (CLS)**: < 0.1

### Lighthouse Optimization
Target scores for production:
- **Performance**: 90+
- **Accessibility**: 95+
- **Best Practices**: 90+
- **SEO**: 85+

---

## Security Configuration

### Content Security Policy (CSP)
Add to `public/index.html`:
```html
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  script-src 'self' 'unsafe-inline' https://api.mapbox.com;
  style-src 'self' 'unsafe-inline' https://api.mapbox.com;
  img-src 'self' data: https: blob:;
  connect-src 'self' https://api.mapbox.com https://restcountries.com https://raw.githubusercontent.com;
  font-src 'self' https://api.mapbox.com;
">
```

### Environment Security
- Never commit API keys to version control
- Use environment variables for all sensitive configuration
- Implement API key rotation strategy
- Monitor API usage for anomalies

### HTTPS Enforcement
- Force HTTPS redirects (automatic with Netlify)
- Use secure cookies if implementing user accounts
- Implement HSTS headers for enhanced security

---

## Deployment Workflow

### Continuous Deployment
```yaml
# .github/workflows/deploy.yml (if using GitHub Actions)
name: Deploy to Netlify

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v2
    - uses: actions/setup-node@v2
      with:
        node-version: '16'
    - run: npm ci
    - run: npm run build
    - uses: netlify/actions/cli@master
      with:
        args: deploy --prod --dir=build
      env:
        NETLIFY_AUTH_TOKEN: ${{ secrets.NETLIFY_AUTH_TOKEN }}
        NETLIFY_SITE_ID: ${{ secrets.NETLIFY_SITE_ID }}
```

### Manual Deployment
```bash
# Build for production
npm run build

# Test build locally
npx serve -s build

# Deploy to Netlify (if using CLI)
npm install -g netlify-cli
netlify login
netlify deploy --prod --dir=build
```

### Rollback Strategy
- Netlify maintains deployment history
- One-click rollback to previous versions
- Keep Git tags for major releases

---

## Post-Deployment Tasks

### 1. Verification Testing
- [ ] Test all four quiz types across multiple devices
- [ ] Verify MapBox satellite imagery loads correctly
- [ ] Confirm fallback to Esri imagery works
- [ ] Test triple-buffer map system across International Date Line
- [ ] Verify no vertical scrolling on any screen size
- [ ] Check analytics data collection

### 2. Performance Validation
- [ ] Run Lighthouse audit (target 90+ performance score)
- [ ] Test loading speed from multiple geographic locations
- [ ] Verify CDN distribution working correctly
- [ ] Monitor Core Web Vitals in production

### 3. Monitoring Setup
- [ ] Configure uptime monitoring (UptimeRobot, Pingdom)
- [ ] Set up error alerts (Sentry, LogRocket)
- [ ] Monitor API usage and costs (MapBox dashboard)
- [ ] Track user analytics and engagement

### 4. SEO Optimization
- [ ] Submit sitemap to Google Search Console
- [ ] Configure social media meta tags
- [ ] Implement structured data markup
- [ ] Optimize page titles and descriptions

---

## Maintenance and Updates

### Regular Maintenance Tasks
- **Weekly**: Monitor API usage and costs
- **Monthly**: Review error logs and user feedback
- **Quarterly**: Update dependencies and security patches
- **Annually**: Renew domain and review hosting costs

### Update Deployment Process
1. Test changes in development environment
2. Create feature branch and test thoroughly
3. Merge to main branch (triggers automatic deployment)
4. Monitor deployment and performance metrics
5. Rollback if issues detected

### Scaling Considerations
- **Traffic Growth**: Monitor bandwidth usage and upgrade plans
- **API Limits**: Implement request optimization and caching
- **Performance**: Consider code splitting and lazy loading
- **Global Users**: Evaluate CDN performance and geographic distribution

---

## Cost Breakdown

### Minimal Production Setup
- **Domain Registration**: $12/year
- **Netlify Hosting**: Free (up to 100GB bandwidth)
- **MapBox API**: Free (up to 50k requests/month)
- **SSL Certificate**: Free (included with Netlify)
- **Total Year 1**: ~$12

### Growing Traffic Scenario
- **Domain**: $12/year
- **Netlify Pro**: $19/month ($228/year)
- **MapBox**: $5-50/month depending on usage
- **Analytics/Monitoring**: $10-30/month (optional)
- **Total Year 1**: $300-900

### Enterprise Scale
- **Domain + CDN**: $50/year
- **AWS/CloudFront**: $50-200/month
- **MapBox Enterprise**: $500+/month
- **Monitoring/Analytics**: $100+/month
- **Support**: $200+/month

---

## Troubleshooting

### Common Deployment Issues

**Build Failures**:
- Check Node.js version compatibility
- Verify all dependencies are properly installed
- Review build logs for specific error messages
- Ensure environment variables are set correctly

**Map Not Loading**:
- Verify MapBox API token is valid and properly set
- Check browser console for CORS or network errors
- Confirm fallback to Esri imagery is working
- Test from different geographic locations

**Performance Issues**:
- Analyze bundle size and implement code splitting
- Optimize image assets and implement lazy loading
- Review third-party dependencies for bloat
- Implement service worker for caching

**API Rate Limiting**:
- Monitor MapBox usage dashboard
- Implement request caching and optimization
- Consider upgrading to paid tier if needed
- Optimize tile requests for better efficiency

### Support Resources
- **Netlify**: Comprehensive documentation and community support
- **MapBox**: Developer documentation and support forum
- **React**: Official documentation and Stack Overflow
- **GeoQuiz**: GitHub issues for project-specific problems

---

Last Updated: Current Session  
Deployment Version: 2.0.0  
Status: Production Ready