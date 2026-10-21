import { describe, expect, it } from 'vitest';
import headers from '../../../infra/security-headers.json' with { type: 'json' };
import template from '../../../infra/left-bauer.yaml?raw';

/**
 * The preview server sends infra/security-headers.json, so the E2E run
 * tests the policy CloudFront serves only while the two files agree.
 */
describe('the production security headers', () => {
  it('serve the same Content-Security-Policy as the preview server', () => {
    expect(template).toContain(`ContentSecurityPolicy: "${headers['Content-Security-Policy']}"`);
  });

  it('match the rest of the CloudFront response headers policy', () => {
    const hsts = /max-age=(\d+); includeSubDomains/.exec(headers['Strict-Transport-Security'])!;
    expect(template).toContain(`AccessControlMaxAgeSec: ${hsts[1]}`);
    expect(template).toContain('IncludeSubdomains: true');
    expect(headers['X-Content-Type-Options']).toBe('nosniff');
    expect(template).toContain('ContentTypeOptions:');
    expect(template).toContain(`FrameOption: ${headers['X-Frame-Options']}`);
    expect(template).toContain(`ReferrerPolicy: ${headers['Referrer-Policy']}`);
    expect(template).toContain(`Value: ${headers['Permissions-Policy']}`);
  });
});
