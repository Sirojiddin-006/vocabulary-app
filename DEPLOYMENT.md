# Vocabulary Learning Website - Deployment Guide

This guide explains how to deploy the Vocabulary Learning Website for self-hosting.

## Prerequisites

Before deploying, ensure you have:

- **Node.js** (v18 or higher)
- **npm** or **pnpm** package manager
- **MySQL** database (v8.0 or higher)
- **Git** for version control

## Environment Variables

Create a `.env.local` file in the project root with the following variables:

```env
# Database Configuration
DATABASE_URL=mysql://username:password@localhost:3306/vocabulary_db

# JWT Secret for session management
JWT_SECRET=your-secure-random-secret-key-here

# Manus OAuth Configuration (if using Manus OAuth)
VITE_APP_ID=your-manus-app-id
OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=https://portal.manus.im

# Application Settings
VITE_APP_TITLE=Vocabulary Learning Website
VITE_APP_LOGO=/logo.svg

# Owner Information (for admin privileges)
OWNER_OPEN_ID=your-admin-user-id
OWNER_NAME=Admin User

# Built-in APIs (if using Manus platform)
BUILT_IN_FORGE_API_URL=https://api.manus.im
BUILT_IN_FORGE_API_KEY=your-api-key

# Frontend API Keys
VITE_FRONTEND_FORGE_API_URL=https://api.manus.im
VITE_FRONTEND_FORGE_API_KEY=your-frontend-api-key

# Analytics (optional)
VITE_ANALYTICS_ENDPOINT=https://analytics.example.com
VITE_ANALYTICS_WEBSITE_ID=your-website-id
```

## Database Setup

### 1. Create MySQL Database

```bash
mysql -u root -p
CREATE DATABASE vocabulary_db;
CREATE USER 'vocab_user'@'localhost' IDENTIFIED BY 'secure_password';
GRANT ALL PRIVILEGES ON vocabulary_db.* TO 'vocab_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### 2. Run Database Migrations

```bash
cd /path/to/vocabulary-app
pnpm install
pnpm db:push
```

This will create all necessary tables (users, folders, words, userProgress) and set up the schema.

## Installation & Setup

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/vocabulary-app.git
cd vocabulary-app
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Build the Project

```bash
pnpm build
```

### 4. Start the Server

For development:
```bash
pnpm dev
```

For production:
```bash
pnpm start
```

The application will be available at `http://localhost:3000`

## Docker Deployment (Optional)

Create a `Dockerfile` in the project root:

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install

COPY . .

RUN pnpm build

EXPOSE 3000

CMD ["pnpm", "start"]
```

Build and run:
```bash
docker build -t vocabulary-app .
docker run -p 3000:3000 --env-file .env.local vocabulary-app
```

## Nginx Configuration (Reverse Proxy)

Example Nginx configuration for production:

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## SSL/TLS Certificate (Let's Encrypt)

```bash
sudo apt-get install certbot python3-certbot-nginx
sudo certbot certonly --nginx -d yourdomain.com
```

Update Nginx configuration to use SSL:

```nginx
server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
        # ... rest of proxy configuration
    }
}

server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}
```

## PM2 Process Management (Recommended)

Install PM2:
```bash
npm install -g pm2
```

Create `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [{
    name: 'vocabulary-app',
    script: 'pnpm',
    args: 'start',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
};
```

Start with PM2:
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

## Monitoring & Logs

View logs:
```bash
pm2 logs vocabulary-app
```

Monitor resources:
```bash
pm2 monit
```

## Backup & Maintenance

### Database Backup

```bash
mysqldump -u vocab_user -p vocabulary_db > backup_$(date +%Y%m%d).sql
```

### Restore from Backup

```bash
mysql -u vocab_user -p vocabulary_db < backup_20240101.sql
```

## Troubleshooting

### Database Connection Issues

- Verify MySQL is running: `sudo systemctl status mysql`
- Check DATABASE_URL format in .env.local
- Ensure database user has proper permissions

### Port Already in Use

```bash
lsof -i :3000
kill -9 <PID>
```

### Memory Issues

Increase Node.js memory:
```bash
NODE_OPTIONS="--max-old-space-size=4096" pnpm start
```

## Security Recommendations

1. **Keep dependencies updated**: `pnpm update`
2. **Use strong JWT_SECRET**: Generate with `openssl rand -base64 32`
3. **Enable HTTPS**: Always use SSL/TLS in production
4. **Database security**: Use strong passwords, restrict access
5. **Environment variables**: Never commit .env.local to version control
6. **Regular backups**: Automate database backups
7. **Monitor logs**: Set up log aggregation and monitoring

## Support & Resources

- **GitHub Issues**: Report bugs and feature requests
- **Documentation**: See README.md for feature documentation
- **Community**: Join our community forum for discussions

## License

This project is licensed under the MIT License. See LICENSE file for details.
