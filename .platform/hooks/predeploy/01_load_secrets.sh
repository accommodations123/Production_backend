#!/bin/bash
set -e

echo "===== Loading secrets from AWS Secrets Manager ====="

SECRET_JSON=$(aws secretsmanager get-secret-value \
  --region us-east-2 \
  --secret-id arn:aws:secretsmanager:us-east-2:322284515163:secret:nextkinlife/production-KPkMl4 \
  --query SecretString \
  --output text)

# Write env vars for Docker
echo "$SECRET_JSON" \
 | sed 's/[{},"]//g' \
 | tr ':' '=' \
 > /opt/elasticbeanstalk/deployment/env

echo "===== Secrets loaded successfully ====="

