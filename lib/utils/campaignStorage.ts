// Centralized campaign storage utility that eliminates localStorage usage
// All campaign data is now managed through Redis storage via the job campaign store

import { toast } from 'sonner';

/**
 * Utility to clear any legacy localStorage campaign data
 * This ensures we don't have conflicting data between localStorage and Redis
 */
export function clearLegacyLocalStorage() {
  if (typeof window !== 'undefined' && window.localStorage) {
    const legacyKeys = [
      'currentJobCampaignId',
      'jobCampaignDraft',
      'campaignFormData'
    ];
    
    legacyKeys.forEach(key => {
      const value = localStorage.getItem(key);
      if (value) {
        console.warn(`Clearing legacy localStorage key: ${key}`);
        localStorage.removeItem(key);
      }
    });
  }
}

/**
 * Validates campaign ID format
 */
export function isValidCampaignId(campaignId: string | null): boolean {
  if (!campaignId || campaignId.trim() === '') return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(campaignId);
}

/**
 * Validates if a campaign exists in the database
 */
export async function validateCampaignExists(campaignId: string): Promise<boolean> {
  try {
    const response = await fetch(`/api/campaigns/jobs/${campaignId}`);
    return response.ok;
  } catch (error) {
    console.error('Error validating campaign existence:', error);
    return false;
  }
}

/**
 * Handles campaign not found errors consistently across the app
 */
export function handleCampaignNotFound(
  setCampaignId: (id: string) => void,
  redirectPath: string = '/dashboard/job-campaign'
) {
  console.warn('Campaign not found, clearing invalid campaign ID');
  
  // Clear from Redis storage via store
  setCampaignId('');
  
  // Clear any legacy localStorage data
  clearLegacyLocalStorage();
  
  // Show user-friendly message
  toast.error('Campaign not found. Redirecting to campaign list...', {
    description: 'The campaign may have been deleted or moved.'
  });
  
  // Redirect after a short delay
  setTimeout(() => {
    window.location.href = redirectPath;
  }, 2000);
}

/**
 * Initialize campaign storage - clears legacy localStorage on app start
 */
export function initializeCampaignStorage() {
  clearLegacyLocalStorage();
  console.log('Campaign storage initialized - using Redis only');
}