#!/usr/bin/env bash
# Create or update the left-bauer CloudFormation stack (ADR-0006):
# infra/left-bauer.yaml, in us-east-1 for CloudFront's certificate.
#
# Reads deploy.env (see deploy.env.example); the environment wins over it.
#   HOSTED_ZONE_ID  required: the beta-site.us Route 53 zone
#   DOMAIN_NAME     default leftbauer.beta-site.us
#   STACK_NAME      default left-bauer
#   AWS_PROFILE     passed to the AWS CLI
#
# The first run waits for the certificate to validate and for CloudFront to
# deploy, which can take 15 minutes or more.

set -euo pipefail
cd "$(dirname "$0")/.."
# shellcheck source=./load-deploy-env.sh
source scripts/load-deploy-env.sh

STACK_NAME="${STACK_NAME:-left-bauer}"
DOMAIN_NAME="${DOMAIN_NAME:-leftbauer.beta-site.us}"
REGION="us-east-1"

if [[ -z "${HOSTED_ZONE_ID:-}" ]]; then
  echo "ERROR: HOSTED_ZONE_ID is required; set it in deploy.env." >&2
  echo "  aws route53 list-hosted-zones --query \"HostedZones[?Name=='beta-site.us.'].Id\" --output text" >&2
  exit 1
fi

echo "Deploying stack '$STACK_NAME' in $REGION for $DOMAIN_NAME..."
aws cloudformation deploy \
  --template-file infra/left-bauer.yaml \
  --stack-name "$STACK_NAME" \
  --region "$REGION" \
  --parameter-overrides DomainName="$DOMAIN_NAME" HostedZoneId="$HOSTED_ZONE_ID" \
  --no-fail-on-empty-changeset

aws cloudformation describe-stacks \
  --stack-name "$STACK_NAME" --region "$REGION" \
  --query 'Stacks[0].Outputs[*].[OutputKey,OutputValue]' --output table

echo "Next: npm run deploy"
