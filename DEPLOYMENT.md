# Deployment Guide

This guide covers deploying AI Wordle Duel to production.

## Prerequisites

- Node.js 18+ installed
- npm 9+ installed
- Redis (optional, for production caching)
- PostgreSQL (optional, for leaderboards)
- Domain name (optional)
- SSL certificate (recommended)

## Production Build

### 1. Build the Project

```bash
# Install dependencies
npm install

# Prepare word lists
npm run prepare-data

# Build frontend and backend
npm run build
```

This creates:
- `dist/frontend/` - Static frontend files
- `dist/backend/` - Compiled backend code

### 2. Configure Environment

Create a `.env` file for production:

```bash
# Production environment
NODE_ENV=production
PORT=3000
FRONTEND_URL=https://yourdomain.com

# Redis (recommended for production)
REDIS_HOST=your-redis-host
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password

# PostgreSQL (for leaderboards)
POSTGRES_HOST=your-postgres-host
POSTGRES_PORT=5432
POSTGRES_DB=wordle_duel
POSTGRES_USER=your-postgres-user
POSTGRES_PASSWORD=your-postgres-password

# Security
JWT_SECRET=your-long-random-secret-key
ALLOWED_ORIGINS=https://yourdomain.com

# Rate limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
```

## Deployment Options

### Option 1: Traditional Server (VPS)

#### Using PM2

1. Install PM2 globally:
   ```bash
   npm install -g pm2
   ```

2. Create PM2 ecosystem file (`ecosystem.config.js`):
   ```javascript
   module.exports = {
     apps: [{
       name: 'wordle-duel',
       script: './dist/backend/server.js',
       instances: 2,
       exec_mode: 'cluster',
       env: {
         NODE_ENV: 'production',
         PORT: 3000
       }
     }]
   };
   ```

3. Start the application:
   ```bash
   pm2 start ecosystem.config.js
   pm2 save
   pm2 startup
   ```

4. Serve frontend with Nginx:
   ```nginx
   server {
     listen 80;
     server_name yourdomain.com;

     # Redirect to HTTPS
     return 301 https://$server_name$request_uri;
   }

   server {
     listen 443 ssl http2;
     server_name yourdomain.com;

     ssl_certificate /path/to/cert.pem;
     ssl_certificate_key /path/to/key.pem;

     # Frontend
     location / {
       root /path/to/dist/frontend;
       try_files $uri $uri/ /index.html;
     }

     # API
     location /api {
       proxy_pass http://localhost:3000;
       proxy_http_version 1.1;
       proxy_set_header Upgrade $http_upgrade;
       proxy_set_header Connection 'upgrade';
       proxy_set_header Host $host;
       proxy_cache_bypass $http_upgrade;
     }
   }
   ```

### Option 2: Docker

1. Create `Dockerfile`:
   ```dockerfile
   FROM node:18-alpine

   WORKDIR /app

   # Copy package files
   COPY package*.json ./

   # Install dependencies
   RUN npm ci --only=production

   # Copy built files
   COPY dist ./dist
   COPY data ./data
   COPY .env .env

   EXPOSE 3000

   CMD ["node", "dist/backend/server.js"]
   ```

2. Create `docker-compose.yml`:
   ```yaml
   version: '3.8'

   services:
     app:
       build: .
       ports:
         - "3000:3000"
       environment:
         - NODE_ENV=production
       depends_on:
         - redis
         - postgres

     redis:
       image: redis:7-alpine
       ports:
         - "6379:6379"

     postgres:
       image: postgres:15-alpine
       environment:
         POSTGRES_DB: wordle_duel
         POSTGRES_USER: postgres
         POSTGRES_PASSWORD: your_password
       volumes:
         - postgres-data:/var/lib/postgresql/data

   volumes:
     postgres-data:
   ```

3. Build and run:
   ```bash
   docker-compose up -d
   ```

### Option 3: Cloud Platforms

#### Vercel (Frontend)

1. Install Vercel CLI:
   ```bash
   npm install -g vercel
   ```

2. Deploy frontend:
   ```bash
   cd dist/frontend
   vercel --prod
   ```

#### Railway/Render/Heroku (Backend)

1. Create `Procfile`:
   ```
   web: node dist/backend/server.js
   ```

2. Push to platform or connect GitHub repository

3. Set environment variables in platform dashboard

#### AWS/GCP/Azure

Follow platform-specific guides for Node.js applications.

## Post-Deployment

### 1. Verify Deployment

```bash
# Check backend health
curl https://yourdomain.com/api/health

# Check frontend
curl https://yourdomain.com
```

### 2. Monitor Application

```bash
# PM2 monitoring
pm2 monit

# View logs
pm2 logs wordle-duel

# Or with Docker
docker-compose logs -f app
```

### 3. Set Up SSL

Use Let's Encrypt for free SSL:

```bash
sudo certbot --nginx -d yourdomain.com
```

### 4. Configure Backups

- Back up word lists and data
- Back up database (if using PostgreSQL)
- Back up ML models
- Set up automated backups

### 5. Performance Optimization

- Enable gzip compression (already configured in server)
- Use CDN for static assets
- Configure Redis caching
- Set up load balancing for high traffic
- Monitor and optimize database queries

## Maintenance

### Updating the Application

```bash
# Pull latest changes
git pull origin main

# Install dependencies
npm install

# Rebuild
npm run build

# Restart PM2
pm2 restart wordle-duel

# Or Docker
docker-compose down
docker-compose up -d --build
```

### Database Migrations

When schema changes occur:

```bash
# Run migrations (if using a migration tool)
npm run migrate

# Or manually update the database
```

### Monitoring Checklist

- [ ] Server CPU and memory usage
- [ ] API response times
- [ ] Error rates and logs
- [ ] Database performance
- [ ] Disk space
- [ ] SSL certificate expiration

## Troubleshooting

### Common Issues

**Port already in use:**
```bash
# Find and kill process
lsof -i :3000
kill -9 <PID>
```

**Permission denied:**
```bash
# Fix file permissions
chmod -R 755 dist/
```

**Module not found:**
```bash
# Reinstall dependencies
rm -rf node_modules
npm install
npm run build
```

**High memory usage:**
- Reduce PM2 instances
- Enable Redis caching
- Optimize word list loading

## Security Checklist

- [ ] HTTPS enabled
- [ ] Environment variables secured
- [ ] Rate limiting configured
- [ ] CORS properly configured
- [ ] Helmet middleware enabled
- [ ] Dependencies updated
- [ ] Sensitive data encrypted
- [ ] Regular security audits

## Scaling Considerations

For high traffic:
- Use load balancer (nginx, HAProxy)
- Add more PM2 instances
- Use Redis for session storage
- Implement CDN for static assets
- Consider horizontal scaling
- Optimize database with indexing
- Use connection pooling

## Support

For deployment issues:
- Check logs first
- Review configuration
- Search GitHub issues
- Create new issue with details

## License

MIT License - see LICENSE file
