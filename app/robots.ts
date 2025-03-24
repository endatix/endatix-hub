import type { MetadataRoute } from 'next';
import { headers } from 'next/headers';

/**
 * Rule set for main Endatix domains that allow login access
 */
export const MAIN_ENDATIX_RULES = [
  {
    userAgent: '*',
    allow: '/login',
    disallow: '/'
  }
];

/**
 * Rule set for all other domains - fully restrictive
 */
export const RESTRICTED_RULES = [
  {
    userAgent: '*',
    disallow: '/'
  }
];

/**
 * Dynamic robots.txt generation based on the current hostname
 * 
 * The robots.txt content will vary based on the domain:
 * - For domains explicitly listed in ROBOTS_ALLOWED_DOMAINS: Allow /login, Disallow /
 * - For all other domains: Disallow all
 * 
 * Usage: Set ROBOTS_ALLOWED_DOMAINS=app.endatix.com,portal.endatix.com
 * Note: Only exact domain matches are allowed; subdomains must be explicitly listed
 */
export default async function robots(): Promise<MetadataRoute.Robots> {
  // Default fallback domain that should always allow /login
  const DEFAULT_DOMAIN = 'app.endatix.com';
  
  try {
    // Get the current domain from request headers
    const headersList = await headers();
    const host = headersList.get('host') || '';
    
    // Clean up the host value to remove port if present
    const currentDomain = host.split(':')[0];
    
    // Default to main rules for the default domain
    if (currentDomain === DEFAULT_DOMAIN) {
      return { rules: MAIN_ENDATIX_RULES };
    }
    
    // Check allowed domains from environment
    const allowedDomainsString = process.env.ROBOTS_ALLOWED_DOMAINS || '';
    if (!allowedDomainsString) {
      return { rules: RESTRICTED_RULES };
    }
    
    const allowedDomains = allowedDomainsString
      .split(',')
      .map(domain => domain.trim())
      .filter(domain => domain.length > 0);
    
    // Check for exact match with the current domain
    if (allowedDomains.includes(currentDomain)) {
      return { rules: MAIN_ENDATIX_RULES };
    }
  } catch (error) {
    console.error('Error accessing request headers for robots.txt:', error);
  }
  
  // Default to restricted rules
  return { rules: RESTRICTED_RULES };
} 