# Streaming Analytics Pipeline Deployment Guide

This guide provides step-by-step instructions for deploying the complete streaming analytics pipeline, including data ingestion, processing, storage, monitoring, and the frontend dashboard.

## Prerequisites

- Docker v20.10.0+
- Docker Compose v2.0.0+
- Kubernetes v1.24.0+
- Helm v3.8.0+
- kubectl v1.24.0+
- A Kubernetes cluster (local or cloud-based)
- Git

## 1. Clone the Repository

```bash
git clone https://github.com/your-org/streaming-analytics-pipeline.git
cd streaming-analytics-pipeline
```

## 2. Configure Environment

### Set up environment variables

Create a `.env` file to store your environment-specific configurations:

```bash
cat > .env << EOF
# Docker Registry
export REGISTRY=registry.example.com
export REGISTRY_USERNAME=your-username
export REGISTRY_PASSWORD=your-password

# Kubernetes namespace
export NAMESPACE=streaming-analytics

# Domain for ingress
export DOMAIN=streaming-analytics.local

# Version
export VERSION=1.0.0
