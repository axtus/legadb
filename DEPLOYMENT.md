# GLedger Production Deployment Guide

This guide explains how to deploy GLedger in production using Docker.

## Prerequisites

- Docker Engine 20.10+
- Docker Compose 2.0+
- PostgreSQL database (or use the included docker-compose setup)

## Environment Variables

Create a `.env` file in the project root with the following variables:

```bash
# Database Configuration
DATABASE_URL=postgresql://gledger:gledger_password@postgres:5432/gledger

# PostgreSQL Configuration (for Docker Compose)
POSTGRES_USER=gledger
POSTGRES_PASSWORD=gledger_password
POSTGRES_DB=gledger
POSTGRES_PORT=5432

# Application Configuration
APP_PORT=7373
NODE_ENV=production

# Encryption Key for API Keys (REQUIRED)
# Generate with: openssl rand -base64 32
GL_ENC_KEY=your-encryption-key-here
```

## Deployment Options

### Option 1: Using Docker Compose (Recommended)

This is the easiest way to deploy with a bundled PostgreSQL database.

1. **Set up environment variables:**
   ```bash
   # Copy and edit the environment variables
   cp .env.example .env
   # Edit .env with your production values
   ```

2. **Start the services:**
   ```bash
   docker-compose up -d
   ```

3. **Run database migrations:**
   ```bash
   docker-compose exec app bunx prisma db push
   ```

4. **Check logs:**
   ```bash
   docker-compose logs -f app
   ```

5. **Stop the services:**
   ```bash
   docker-compose down
   ```

### Option 2: Using Docker Only

If you have an external PostgreSQL database:

1. **Build the image:**
   ```bash
   docker build -t gledger:latest .
   ```

2. **Run the container:**
   ```bash
   docker run -d \
     --name gledger-app \
     -p 7373:7373 \
     -e DATABASE_URL="postgresql://user:password@host:5432/database" \
     -e NODE_ENV=production \
     -e GL_ENC_KEY="your-encryption-key" \
     gledger:latest
   ```

3. **Run database migrations:**
   ```bash
   docker exec gledger-app bunx prisma db push
   ```

## Production Checklist

- [ ] Set strong `POSTGRES_PASSWORD`
- [ ] Generate secure `GL_ENC_KEY` using `openssl rand -base64 32`
- [ ] Configure proper `DATABASE_URL` for your database
- [ ] Set up SSL/TLS termination (use a reverse proxy like Nginx or Traefik)
- [ ] Configure firewall rules to restrict database access
- [ ] Set up database backups
- [ ] Configure log aggregation
- [ ] Set up monitoring and alerting
- [ ] Review and update `bun-server.ts` to set `development = false`

## Dockerfile Features

The production Dockerfile includes:

- **Multi-stage builds** for minimal image size
- **Non-root user** for enhanced security
- **Health checks** for container orchestration
- **Production dependencies only** in final image
- **Optimized layer caching** for faster builds

## Scaling Considerations

For production deployments:

1. **Database**: Use a managed PostgreSQL service (AWS RDS, Google Cloud SQL,
   etc.)
2. **Load Balancing**: Deploy multiple app containers behind a load balancer
3. **Secrets Management**: Use Docker secrets or a secrets manager (AWS Secrets
   Manager, HashiCorp Vault)
4. **Monitoring**: Integrate with Prometheus, Grafana, or your monitoring stack
5. **Logging**: Configure centralized logging (ELK stack, CloudWatch, etc.)

## Troubleshooting

### Container won't start

```bash
# Check logs
docker-compose logs app

# Check if database is ready
docker-compose logs postgres
```

### Database connection issues

```bash
# Verify DATABASE_URL is correct
docker-compose exec app env | grep DATABASE_URL

# Test database connectivity
docker-compose exec postgres psql -U gledger -d gledger -c "SELECT 1;"
```

### Permission issues

```bash
# Ensure proper file permissions
docker-compose exec app ls -la /app
```

## Security Notes

1. **Never commit `.env` files** to version control
2. **Rotate encryption keys** regularly
3. **Use strong passwords** for database access
4. **Enable SSL/TLS** for database connections in production
5. **Keep Docker images updated** with security patches
6. **Scan images** for vulnerabilities using tools like Trivy

## Support

For issues or questions, refer to the main README.md or project documentation.
