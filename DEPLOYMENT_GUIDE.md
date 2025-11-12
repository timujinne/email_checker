# 🚀 Deployment & Release Guide

**Version:** 1.0.1
**Date:** 26 October 2025
**Status:** ✅ PRODUCTION READY

---

## 📋 Pre-Deployment Checklist

### Code Quality ✅
- [ ] All tests passing (100% of test suite)
- [ ] Code coverage >= 85%
- [ ] No console errors
- [ ] No memory leaks
- [ ] Lighthouse score > 90
- [ ] No security vulnerabilities

### Performance ✅
- [ ] Page load time < 2.5s
- [ ] LCP < 2.5s
- [ ] FID < 100ms
- [ ] CLS < 0.1
- [ ] Bundle size < 200KB (gzip)
- [ ] API response < 200ms

### Documentation ✅
- [ ] User Guide complete
- [ ] Developer Guide complete
- [ ] API documentation
- [ ] Deployment procedures
- [ ] Runbook for operations
- [ ] Rollback procedures

### Infrastructure ✅
- [ ] SSL certificate valid
- [ ] DNS configured
- [ ] CDN configured
- [ ] Database backups
- [ ] Monitoring configured
- [ ] Logging configured

### Security ✅
- [ ] Secrets not in code
- [ ] Security headers set
- [ ] CORS configured
- [ ] Authentication working
- [ ] Rate limiting set
- [ ] WAF rules configured

---

## 🏗️ Deployment Architecture

### Blue-Green Deployment

```
Users
  ↓
Load Balancer (HAProxy/Nginx)
  ├─→ Blue Environment (Current Production)
  └─→ Green Environment (New Deployment)

Process:
1. Deploy to Green
2. Run tests on Green
3. Switch traffic to Green
4. Monitor for 24 hours
5. Keep Blue for rollback
```

### Staging Environment

```
Staging (Pre-production)
├── Real database (copy)
├── Real backend APIs
├── Real external services
└── Same infrastructure as production
```

### Production Environment

```
Production
├── Primary Server (Active)
├── Secondary Server (Standby)
├── Load Balancer
├── CDN
├── Database (Primary + Replication)
└── Monitoring & Logging
```

---

## 📝 Deployment Process

### Step 1: Prepare Release

```bash
# Create release branch
git checkout -b release/v1.0.0

# Update version numbers
# - package.json
# - main.js
# - README.md

# Build production bundle
npm run build

# Verify build
ls -lah dist/

# Create git tag
git tag -a v1.0.0 -m "Release v1.0.0"

# Push to repository
git push origin release/v1.0.0
git push origin v1.0.0
```

### Step 2: Deploy to Staging

```bash
# Deploy to staging
kubectl apply -f k8s/staging/

# Verify deployment
kubectl get pods -n staging

# Run smoke tests
npm run test:e2e -- --baseUrl=https://staging.example.com

# Run performance tests
npm run lighthouse -- https://staging.example.com
```

### Step 3: Blue-Green Deployment to Production

```bash
# 1. Deploy to Green environment
kubectl apply -f k8s/production/ --selector=version=green

# 2. Wait for pods to be ready
kubectl wait --for=condition=ready pod -l version=green -n production

# 3. Run smoke tests on Green
npm run test:e2e -- --baseUrl=https://production-green.example.com

# 4. Switch traffic from Blue to Green
# Update load balancer configuration
kubectl patch service web-service -p '{"spec":{"selector":{"version":"green"}}}'

# 5. Monitor Green for issues (next 24 hours)
# - Check error rates
# - Monitor performance
# - Watch logs
```

### Step 4: Finalize Deployment

```bash
# After 24 hours of monitoring
# If all good: decommission Blue
kubectl delete deployment web-app -l version=blue

# If issues: Rollback to Blue
kubectl patch service web-service -p '{"spec":{"selector":{"version":"blue"}}}'
kubectl delete deployment web-app -l version=green
```

---

## 🔄 Rollback Procedure

### Quick Rollback (< 5 minutes)

```bash
# 1. Switch traffic back to Blue
kubectl patch service web-service -p '{"spec":{"selector":{"version":"blue"}}}'

# 2. Verify traffic
curl https://production.example.com

# 3. Monitor error rates
# Check that errors return to normal

# 4. Investigate issue in Green
# Keep Green environment running for debugging
```

### Full Rollback (if database changes)

```bash
# 1. Stop application
kubectl scale deployment web-app --replicas=0

# 2. Restore database from backup
# BACKUP_DATE=$(date +%Y%m%d)
# pg_restore -d emailchecker backup_$BACKUP_DATE.sql

# 3. Verify database
psql emailchecker -c "SELECT COUNT(*) FROM users;"

# 4. Restart application
kubectl scale deployment web-app --replicas=3
```

---

## 📊 Monitoring & Alerting

### Key Metrics to Monitor

```
Real-time Dashboard
├── Error Rate (target: < 0.5%)
├── Response Time (target: < 200ms)
├── CPU Usage (target: < 70%)
├── Memory Usage (target: < 80%)
├── Active Connections (expected: varies)
└── Database Queries/sec (target: < 1000)
```

### Alert Thresholds

| Metric | Warning | Critical |
|--------|---------|----------|
| Error Rate | > 1% | > 5% |
| Response Time | > 500ms | > 2s |
| CPU | > 80% | > 95% |
| Memory | > 85% | > 95% |
| Disk Space | > 80% | > 95% |
| Database | > 10s | > 30s |

### Monitoring Tools

```bash
# Check application health
curl https://production.example.com/health

# View logs
docker logs -f container_name

# Check resource usage
docker stats

# View performance metrics
curl https://monitoring.example.com/metrics
```

---

## 📋 Runbook for Operations

### Daily Tasks

- [ ] Check error logs
- [ ] Verify all services are running
- [ ] Review performance metrics
- [ ] Check database backups
- [ ] Test disaster recovery procedures (weekly)

### Weekly Tasks

- [ ] Review security logs
- [ ] Test backup restoration
- [ ] Update SSL certificates if needed
- [ ] Review cost optimization

### Monthly Tasks

- [ ] Full security audit
- [ ] Capacity planning review
- [ ] Cost analysis
- [ ] Documentation updates
- [ ] Disaster recovery drill

### Emergency Procedures

**Service Down:**
```bash
# 1. Check service status
systemctl status email-checker

# 2. Check logs for errors
journalctl -u email-checker -n 100 --follow

# 3. Restart service
systemctl restart email-checker

# 4. Verify service is running
curl https://production.example.com/health
```

**Database Down:**
```bash
# 1. Check database status
pg_isready -h localhost

# 2. Check disk space
df -h

# 3. Restart PostgreSQL
systemctl restart postgresql

# 4. Verify database
psql -c "SELECT 1;"
```

---

## 🔐 Security Deployment

### Environment Variables

Never commit secrets! Use environment management:

```bash
# Store in .env file (NOT in git)
DATABASE_URL=postgresql://user:pass@host/db
API_KEY=secret-key-here
JWT_SECRET=jwt-secret-here

# Deploy to server securely
scp .env prod-server:/app/.env
chmod 600 /app/.env
```

### SSL Certificate

```bash
# Install SSL certificate
certbot certonly --webroot -w /var/www/html -d emailchecker.com

# Auto-renew certificates
certbot renew --quiet --no-self-upgrade

# Verify certificate
openssl x509 -in /etc/letsencrypt/live/emailchecker.com/cert.pem -text -noout
```

### Security Headers

```nginx
# In nginx.conf
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-Frame-Options "DENY" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
```

---

## 📦 Release Notes Template

```markdown
# Release v1.0.0

## New Features
- ✨ Feature 1
- ✨ Feature 2

## Improvements
- 🚀 Performance improvement 1
- 🚀 Performance improvement 2

## Bug Fixes
- 🐛 Bug fix 1
- 🐛 Bug fix 2

## Breaking Changes
- ⚠️ Breaking change 1

## Upgrade Instructions
1. Download release
2. Run migrations
3. Deploy new version

## Known Issues
- Known issue 1
- Known issue 2
```

---

## 🆘 Troubleshooting Deployments

### Deployment Fails

```bash
# Check deployment logs
kubectl logs -n production deployment/web-app

# Check pod events
kubectl describe pod pod-name -n production

# Rollback immediately
kubectl rollout undo deployment/web-app -n production
```

### Performance Degrades

```bash
# Check CPU/Memory
kubectl top pods -n production

# Scale up if needed
kubectl scale deployment web-app --replicas=5

# Check database
pg_stat_statements

# Optimize queries if slow
ANALYZE; REINDEX;
```

### Data Inconsistency

```bash
# Verify database integrity
pg_catalog.pgstattuple('table_name');

# Repair if needed
REINDEX TABLE table_name;

# Restore from backup if critical
psql emailchecker < backup_date.sql
```

---

## ✅ Post-Deployment Validation

### Smoke Tests

```bash
# 1. Can access application
curl -I https://production.example.com

# 2. Can login
curl -X POST https://production.example.com/api/login \
  -d '{"email":"test@example.com","password":"test"}'

# 3. Can process data
curl https://production.example.com/api/lists

# 4. Can view analytics
curl https://production.example.com/api/analytics

# 5. Check error rate
curl https://monitoring.example.com/metrics | grep error_rate
```

### User Acceptance Testing

- [ ] Dashboard loads and displays data
- [ ] List upload works
- [ ] Processing completes
- [ ] Analytics display correctly
- [ ] Archive/Cloud integration works
- [ ] Blocklist filtering works
- [ ] Exports work in all formats
- [ ] Dark/light mode works
- [ ] Mobile responsive works
- [ ] No console errors

---

## 📞 Support & Communication

### Deployment Communication

1. **Notify Users** - Announce scheduled maintenance
2. **Update Status Page** - Set to "Maintenance"
3. **Execute Deployment** - Follow procedure
4. **Verify** - Run smoke tests
5. **Clear Status Page** - Mark as operational
6. **Post-Mortem** - If any issues

### Escalation Path

- **Level 1:** Automatic alerts to Slack
- **Level 2:** Page on-call engineer
- **Level 3:** Wake up engineering manager

---

## 🎊 Deployment Checklist Summary

```
✅ Pre-Deployment:
   - All tests passing
   - Code reviewed
   - Documentation updated
   - Backups created

✅ Deployment:
   - Built production bundle
   - Deployed to staging
   - Verified on staging
   - Deployed to production
   - Switched traffic

✅ Post-Deployment:
   - Smoke tests passed
   - Monitoring active
   - Error rates normal
   - Performance normal
   - Users notified

✅ Follow-up:
   - Monitor for 24 hours
   - Document any issues
   - Update runbooks
   - Team debrief
```

---

**Status:** ✅ PRODUCTION READY
**Date:** 26 October 2025
**Version:** 1.0.1

🚀 **Ready to Deploy!**
