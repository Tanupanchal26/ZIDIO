# IntellMeet — Deployment Guide

---

## Prerequisites

- AWS account with appropriate IAM permissions
- Terraform >= 1.6
- Docker + Docker Compose
- AWS CLI v2, configured with credentials
- Node.js 18+

---

## 1. Infrastructure Provisioning (Terraform)

```bash
cd infrastructure/terraform

# Initialise Terraform (creates S3 state bucket if it exists)
terraform init

# Review planned changes
terraform plan -var="region=us-east-1"

# Apply
terraform apply -var="region=us-east-1"
```

Resources created:
- VPC with public/private subnets across 2 AZs
- ECR repositories: `intellmeet-backend`, `intellmeet-frontend`
- ECS Fargate cluster: `intellmeet-cluster`
- Application Load Balancer
- ElastiCache Redis cluster
- Security groups

---

## 2. Secrets Configuration

Store production secrets in AWS Secrets Manager, then inject them into ECS Task Definitions via `secrets` field, or into Kubernetes via Sealed Secrets / External Secrets Operator.

**Never store plaintext secrets in Kubernetes manifests or Terraform state.**

```bash
# Example: Create Kubernetes secrets
kubectl create secret generic intellmeet-secrets \
  --from-literal=MONGO_URI="mongodb+srv://..." \
  --from-literal=REDIS_URL="rediss://..." \
  --from-literal=JWT_SECRET="$(openssl rand -hex 64)" \
  --from-literal=JWT_REFRESH_SECRET="$(openssl rand -hex 64)" \
  --from-literal=OPENAI_API_KEY="sk-..." \
  -n intellmeet
```

---

## 3. Docker Image Build & Push

```bash
# Login to ECR
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin <AWS_ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com

# Build and push backend
docker build -t intellmeet-backend ./server
docker tag intellmeet-backend:latest \
  <ECR_URI>/intellmeet-backend:latest
docker push <ECR_URI>/intellmeet-backend:latest

# Build and push frontend
docker build \
  --build-arg VITE_API_BASE_URL=https://api.intellmeet.com/api/v1 \
  --build-arg VITE_SOCKET_URL=https://api.intellmeet.com \
  -t intellmeet-frontend ./client
docker tag intellmeet-frontend:latest \
  <ECR_URI>/intellmeet-frontend:latest
docker push <ECR_URI>/intellmeet-frontend:latest
```

---

## 4. Kubernetes Deployment

```bash
# Apply namespace and secrets first
kubectl apply -f infrastructure/k8s/api-deployment.yaml -n intellmeet

# Verify pods are running
kubectl get pods -n intellmeet

# Check logs
kubectl logs -l app=intellmeet-api -n intellmeet --tail=100

# Check health endpoints
kubectl port-forward svc/intellmeet-api-svc 5000:80 -n intellmeet
curl http://localhost:5000/health
```

---

## 5. GitHub Actions (Automated CI/CD)

The pipeline at `.github/workflows/ci-cd.yml` runs automatically on push to `main`:

1. **Lint** — ESLint (backend + frontend)
2. **Type check** — `tsc --noEmit` (frontend)
3. **Test** — Jest with coverage (backend)
4. **Security audit** — `npm audit --audit-level=high`
5. **Build** — Vite production build (frontend)
6. **Docker build & push** — Tagged with `github.sha` + `latest`
7. **ECS deploy** — Force new deployment on both services
8. **Smoke test** — `curl /health`

**Required GitHub Secrets:**
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`

---

## 6. SSL/TLS

Production HTTPS is terminated at the ALB or Nginx.

For local HTTPS testing with Docker:
```bash
# Generate self-signed cert
mkdir -p nginx/certs
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout nginx/certs/privkey.pem \
  -out nginx/certs/fullchain.pem \
  -subj "/CN=localhost"
```

For production, use AWS ACM (free, auto-renews) with your ALB.

---

## 7. Health Checks

| Endpoint                            | Expected Response |
|-------------------------------------|-------------------|
| `GET /health`                       | `{ "status": "ok", "uptime": <n> }` |
| Kubernetes liveness (`/health`)     | HTTP 200 within 5s |
| Kubernetes readiness (`/health`)    | HTTP 200 within 5s |
| ECS health check (`/health`)        | HTTP 200 within 10s |

---

## 8. Post-Deployment Verification

```bash
# Health check
curl https://api.intellmeet.com/health

# Signup test
curl -X POST https://api.intellmeet.com/api/v1/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","password":"TestP@ss1"}'

# Verify frontend loads
curl -sI https://intellmeet.com | grep "200 OK"
```

---

## 9. Rollback

```bash
# ECS rollback — deploy previous task definition revision
aws ecs update-service \
  --cluster intellmeet-cluster \
  --service intellmeet-api-service \
  --task-definition intellmeet-api:<PREVIOUS_REVISION>

# Kubernetes rollback
kubectl rollout undo deployment/intellmeet-api -n intellmeet
kubectl rollout status deployment/intellmeet-api -n intellmeet
```

---

## 10. Monitoring

Recommended stack:
- **CloudWatch Container Insights** — enabled in Terraform (ECS cluster)
- **CloudWatch Alarms** — CPU > 80%, memory > 80%, 5xx error rate
- **Winston logs** — structured JSON to stdout → CloudWatch Logs
- **Redis monitoring** — ElastiCache CloudWatch metrics
