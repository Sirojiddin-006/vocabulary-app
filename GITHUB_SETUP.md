# GitHub Setup & Deployment Guide

This guide explains how to upload the Vocabulary Learning Website to GitHub and deploy it for self-hosting.

## Step 1: Create a GitHub Repository

1. Go to [GitHub.com](https://github.com) and sign in to your account
2. Click the **+** icon in the top-right corner and select **New repository**
3. Fill in the repository details:
   - **Repository name**: `vocabulary-app` (or your preferred name)
   - **Description**: "A modern vocabulary learning application with interactive flashcards"
   - **Visibility**: Choose **Public** or **Private** based on your preference
   - **Initialize repository**: Leave unchecked (we'll push existing code)
4. Click **Create repository**

## Step 2: Configure Git Locally

### First Time Setup

```bash
# Configure your Git identity
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

### Navigate to Project

```bash
cd /home/ubuntu/vocabulary-app
```

## Step 3: Connect Local Repository to GitHub

```bash
# Add the remote repository
git remote add origin https://github.com/yourusername/vocabulary-app.git

# Rename branch to main (if needed)
git branch -M main

# Push the code to GitHub
git push -u origin main
```

### Using SSH (Recommended for Security)

1. **Generate SSH key** (if you don't have one):
   ```bash
   ssh-keygen -t ed25519 -C "your.email@example.com"
   ```

2. **Add SSH key to GitHub**:
   - Copy the public key: `cat ~/.ssh/id_ed25519.pub`
   - Go to GitHub Settings → SSH and GPG keys → New SSH key
   - Paste the key and save

3. **Use SSH remote**:
   ```bash
   git remote set-url origin git@github.com:yourusername/vocabulary-app.git
   git push -u origin main
   ```

## Step 4: Create .gitignore

Ensure sensitive files are not committed:

```bash
cat > .gitignore << 'EOF'
# Environment variables
.env
.env.local
.env.*.local

# Dependencies
node_modules/
pnpm-lock.yaml
yarn.lock
package-lock.json

# Build output
dist/
build/
.next/

# IDE
.vscode/
.idea/
*.swp
*.swo
*~

# OS
.DS_Store
Thumbs.db

# Logs
logs/
*.log
npm-debug.log*
yarn-debug.log*

# Database
*.db
*.sqlite
*.sql

# Temp files
tmp/
temp/
EOF
```

## Step 5: Deployment Options

### Option A: Deploy to Vercel (Recommended for Frontend)

1. **Sign up** at [Vercel.com](https://vercel.com)
2. **Connect GitHub repository**:
   - Click "New Project"
   - Select your GitHub repository
   - Authorize Vercel to access GitHub
3. **Configure environment variables**:
   - Add all variables from `.env.local` in Project Settings → Environment Variables
4. **Deploy**:
   - Vercel will automatically deploy on every push to main
   - Your app will be available at `yourusername.vercel.app`

### Option B: Deploy to Railway (Full Stack)

1. **Sign up** at [Railway.app](https://railway.app)
2. **Create new project**:
   - Click "New Project" → "Deploy from GitHub"
   - Select your repository
3. **Add services**:
   - Add MySQL database service
   - Configure environment variables
4. **Deploy**:
   - Railway will build and deploy automatically
   - Your app will get a public URL

### Option C: Self-Host on VPS (Full Control)

#### Using DigitalOcean, AWS, or Linode

1. **Create a VPS**:
   - Choose Ubuntu 22.04 LTS
   - Recommended: 2GB RAM, 2 vCPU minimum

2. **SSH into your server**:
   ```bash
   ssh root@your_server_ip
   ```

3. **Install dependencies**:
   ```bash
   # Update system
   sudo apt update && sudo apt upgrade -y

   # Install Node.js
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt install -y nodejs

   # Install pnpm
   npm install -g pnpm

   # Install MySQL
   sudo apt install -y mysql-server

   # Install Nginx
   sudo apt install -y nginx

   # Install PM2
   npm install -g pm2
   ```

4. **Clone repository**:
   ```bash
   cd /home/ubuntu
   git clone https://github.com/yourusername/vocabulary-app.git
   cd vocabulary-app
   ```

5. **Setup database**:
   ```bash
   sudo mysql -u root << EOF
   CREATE DATABASE vocabulary_db;
   CREATE USER 'vocab_user'@'localhost' IDENTIFIED BY 'your_secure_password';
   GRANT ALL PRIVILEGES ON vocabulary_db.* TO 'vocab_user'@'localhost';
   FLUSH PRIVILEGES;
   EOF
   ```

6. **Install and build**:
   ```bash
   pnpm install
   pnpm db:push
   pnpm build
   ```

7. **Create .env.local**:
   ```bash
   cp .env.example .env.local
   # Edit with your configuration
   nano .env.local
   ```

8. **Start with PM2**:
   ```bash
   pm2 start "pnpm start" --name "vocabulary-app"
   pm2 save
   pm2 startup
   ```

9. **Configure Nginx**:
   ```bash
   sudo nano /etc/nginx/sites-available/vocabulary-app
   ```

   Add this configuration:
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
       }
   }
   ```

10. **Enable site and restart Nginx**:
    ```bash
    sudo ln -s /etc/nginx/sites-available/vocabulary-app /etc/nginx/sites-enabled/
    sudo nginx -t
    sudo systemctl restart nginx
    ```

11. **Setup SSL with Let's Encrypt**:
    ```bash
    sudo apt install -y certbot python3-certbot-nginx
    sudo certbot --nginx -d yourdomain.com
    ```

## Step 6: Continuous Integration/Deployment (CI/CD)

### GitHub Actions Workflow

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install pnpm
        run: npm install -g pnpm
      
      - name: Install dependencies
        run: pnpm install
      
      - name: Build
        run: pnpm build
      
      - name: Deploy to server
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.HOST }}
          username: ${{ secrets.USERNAME }}
          key: ${{ secrets.SSH_KEY }}
          script: |
            cd /home/ubuntu/vocabulary-app
            git pull origin main
            pnpm install
            pnpm build
            pm2 restart vocabulary-app
```

### Configure GitHub Secrets

1. Go to Repository Settings → Secrets and variables → Actions
2. Add the following secrets:
   - `HOST`: Your server IP address
   - `USERNAME`: SSH username (usually `ubuntu` or `root`)
   - `SSH_KEY`: Your private SSH key

## Step 7: Monitoring & Maintenance

### Check Deployment Status

```bash
# Check PM2 status
pm2 status

# View logs
pm2 logs vocabulary-app

# Monitor resources
pm2 monit
```

### Regular Updates

```bash
# Pull latest changes
git pull origin main

# Update dependencies
pnpm update

# Run migrations
pnpm db:push

# Restart application
pm2 restart vocabulary-app
```

## Troubleshooting

### Port Already in Use
```bash
lsof -i :3000
kill -9 <PID>
```

### Database Connection Failed
```bash
# Check MySQL status
sudo systemctl status mysql

# Verify credentials in .env.local
cat .env.local | grep DATABASE_URL
```

### Nginx Not Working
```bash
# Test configuration
sudo nginx -t

# Check logs
sudo tail -f /var/log/nginx/error.log
```

## Security Checklist

- [ ] Use strong passwords for database and SSH
- [ ] Enable firewall: `sudo ufw enable`
- [ ] Allow only necessary ports: `sudo ufw allow 22,80,443`
- [ ] Use SSL/TLS certificates (Let's Encrypt)
- [ ] Keep dependencies updated: `pnpm update`
- [ ] Use environment variables for secrets
- [ ] Enable GitHub branch protection
- [ ] Regular database backups
- [ ] Monitor server resources and logs

## Support Resources

- **GitHub Documentation**: https://docs.github.com
- **Vercel Docs**: https://vercel.com/docs
- **Railway Docs**: https://docs.railway.app
- **DigitalOcean Tutorials**: https://www.digitalocean.com/community/tutorials
- **Nginx Documentation**: https://nginx.org/en/docs/

## Next Steps

1. Push code to GitHub
2. Choose a deployment platform
3. Configure environment variables
4. Set up monitoring and backups
5. Share your application with users!
