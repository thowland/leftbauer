#!/usr/bin/env bash
# SPDX-License-Identifier: GPL-3.0-or-later
# Copyright (C) 2026 Tim Howland

# Build and publish the site to the left-bauer stack (ADR-0006).
#
#   1. Run `npm run verify`, then build dist/ (SKIP_VERIFY=1 skips the gate).
#   2. Upload the hashed files in dist/assets/ for a year, immutable.
#   3. Upload everything else no-cache, so index.html, the service worker
#      and the manifest are fetched fresh and a new release shows up on the
#      next launch.
#   4. Only then delete what the new build no longer has, so a page that
#      is mid-load never loses a file.
#   5. Invalidate CloudFront's copies.
#
# Reads deploy.env (see deploy.env.example); the environment wins over it.

set -euo pipefail
cd "$(dirname "$0")/.."
# shellcheck source=./load-deploy-env.sh
source scripts/load-deploy-env.sh

STACK_NAME="${STACK_NAME:-left-bauer}"
REGION="us-east-1"

output() {
  aws cloudformation describe-stacks --stack-name "$STACK_NAME" --region "$REGION" \
    --query "Stacks[0].Outputs[?OutputKey=='$1'].OutputValue" --output text
}

BUCKET="$(output BucketName)"
DIST_ID="$(output DistributionId)"
if [[ -z "$BUCKET" || -z "$DIST_ID" || "$BUCKET" == "None" ]]; then
  echo "ERROR: stack '$STACK_NAME' has no BucketName or DistributionId. Run: npm run infra:deploy" >&2
  exit 1
fi

if [[ "${SKIP_VERIFY:-0}" != "1" ]]; then
  npm run verify
fi
npm run build

echo "Publishing to s3://$BUCKET (distribution $DIST_ID)..."
aws s3 sync dist/assets/ "s3://$BUCKET/assets/" \
  --cache-control "public, max-age=31536000, immutable"
aws s3 sync dist/ "s3://$BUCKET/" --exclude "assets/*" \
  --cache-control "no-cache"
aws s3 sync dist/ "s3://$BUCKET/" --delete

aws cloudfront create-invalidation --distribution-id "$DIST_ID" --paths "/*" \
  --query 'Invalidation.{Id:Id,Status:Status}' --output table

echo "Deployed: $(output SiteUrl)"
