'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useJobCampaignStore } from '@/shared/store/jobCampaignStore';
import { handleCampaignNotFound, clearLegacyLocalStorage, isValidCampaignId } from '@/lib/utils/campaignStorage';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/shared/card';
import { Button } from '@/components/ui/shared/button';
import { Input } from '@/components/ui/shared/input';
import { Badge } from '@/components/ui/shared/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/shared/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/shared/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/shared/dialog';
import { Checkbox } from '@/components/ui/shared/checkbox';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/shared/dropdown-menu';
import { Textarea } from '@/components/ui/textarea';
import CandidateProfileModal from "@/components/candidate/candidateProfileModal";
import CircularProgress from "@/components/admin/CircularProgress";
import { Search, Filter, Download, Upload, Mail, Phone, MapPin, Calendar, User, Briefcase, FileText, Star, Users, TrendingUp, Trash2, MoreHorizontal, CheckCircle, AlertTriangle, XCircle, X, RefreshCw, RefreshCcw, ThumbsUp, ThumbsDown, Clock, ArrowRight, EyeIcon, Trash } from 'lucide-react';
import { toast } from 'sonner';

interface Candidate {
  id: string;
  name: string;
  email: string;
  phone?: string;
  location?: string;
  experience?: string;
  skills?: string[];
  status: string;
  appliedDate: string;
  resumeUrl?: string;
  campaignId: string;
  talentFitScore?: number;
  overallScore?: number;
  source?: string;
  campaignName?: string;
  jobTitle?: string;
}

interface InterviewSetup {
  id: string;
  roundNumber: number;
  roundName: string;
  title: string;
  description: string;
  interviewType: string;
  timeLimit: number;
  passingScore: number;
  isActive: boolean;
}

interface CandidateInterview {
  id: string;
  setupId: string;
  interviewId: string;
  status: string;
  score?: number;
  completedAt?: string;
  roundNumber: number;
  roundName: string;
}

export default function JobCampaignCandidatesPage() {
  const { data: session } = useSession();
  const { state, setCampaignId } = useJobCampaignStore();
  const { campaignId, jobDetails } = state;
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('all');
  const [showUpload, setShowUpload] = useState(false);
  const [uploadingResume, setUploadingResume] = useState(false);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
  const [showProfile, setShowProfile] = useState(false);
  const [selectedCandidates, setSelectedCandidates] = useState<Set<string>>(new Set());
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [candidateToDelete, setCandidateToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletionStatus, setDeletionStatus] = useState<{
    show: boolean;
    type: 'success' | 'error' | 'warning';
    message: string;
    details?: any;
  }>({ show: false, type: 'success', message: '', details: null });
  const [recalculatingScores, setRecalculatingScores] = useState<Set<string>>(new Set());

  // Clear legacy localStorage and handle campaign selection
  useEffect(() => {
    clearLegacyLocalStorage();
    
    // Check if campaignId is provided in URL params
    const urlCampaignId = searchParams.get('campaignId');
    
    if (urlCampaignId) {
      // Validate and set campaign ID from URL
      if (isValidCampaignId(urlCampaignId)) {
        if (campaignId !== urlCampaignId) {
          setCampaignId(urlCampaignId);
        }
      } else {
        console.warn('Invalid campaign ID in URL:', urlCampaignId);
        toast.error('Invalid campaign ID. Redirecting to campaign list...');
        setTimeout(() => {
          router.push('/dashboard/job-campaign');
        }, 1500);
      }
    } else if (!campaignId) {
      toast.error('No campaign selected. Redirecting to campaign list...');
      setTimeout(() => {
        router.push('/dashboard/job-campaign');
      }, 1500);
    }
  }, [searchParams, campaignId, setCampaignId, router]);

  useEffect(() => {
    if (campaignId) {
      fetchCandidates();
    }
  }, [campaignId]);

  // Check if candidate is from direct interview or campaign
  const isDirectInterview = (candidate: Candidate) => {
    return candidate.campaignName === 'Direct Interview' || candidate.jobTitle === 'Direct Interview';
  };

  // Selection and deletion functions
  const handleSelectCandidate = (candidateId: string) => {
    const newSelected = new Set(selectedCandidates);
    if (newSelected.has(candidateId)) {
      newSelected.delete(candidateId);
    } else {
      newSelected.add(candidateId);
    }
    setSelectedCandidates(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedCandidates.size === filteredCandidates.length) {
      setSelectedCandidates(new Set());
    } else {
      setSelectedCandidates(new Set(filteredCandidates.map(c => c.id)));
    }
  };

  const handleDeleteCandidate = (candidateId: string) => {
    setCandidateToDelete(candidateId);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!candidateToDelete) return;
    
    setIsDeleting(true);
    setDeletionStatus({ show: false, type: 'success', message: '', details: null });
    
    try {
      const response = await fetch(`/api/candidates/${candidateToDelete}`, {
        method: 'DELETE',
      });
      
      const result = await response.json();
      
      if (response.ok && result.success) {
        // Remove from local state
        setCandidates(prev => prev.filter(c => c.id !== candidateToDelete));
        setSelectedCandidates(prev => {
          const newSet = new Set(prev);
          newSet.delete(candidateToDelete);
          return newSet;
        });
        
        // Show success message with details
        const message = result.deletionSummary?.filesDeletionSuccess 
          ? `Candidate "${result.deletionSummary.candidateName}" and all files deleted successfully`
          : `Candidate "${result.deletionSummary.candidateName}" deleted, but some files may still exist in storage`;
        
        setDeletionStatus({
          show: true,
          type: result.deletionSummary?.filesDeletionSuccess ? 'success' : 'warning',
          message,
          details: result.deletionSummary
        });
        
        toast.success(message);
        
        // Auto-hide status after 5 seconds
        setTimeout(() => {
          setDeletionStatus(prev => ({ ...prev, show: false }));
        }, 5000);
      } else {
        const errorMessage = result.error || 'Failed to delete candidate';
        setDeletionStatus({
          show: true,
          type: 'error',
          message: errorMessage,
          details: result
        });
        toast.error(errorMessage);
      }
    } catch (error) {
      console.error('Error deleting candidate:', error);
      const errorMessage = 'Network error occurred while deleting candidate';
      setDeletionStatus({
        show: true,
        type: 'error',
        message: errorMessage,
        details: error
      });
      toast.error(errorMessage);
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setCandidateToDelete(null);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedCandidates.size === 0) return;
    
    setIsDeleting(true);
    setDeletionStatus({ show: false, type: 'success', message: '', details: null });
    
    try {
      const deletePromises = Array.from(selectedCandidates).map(async candidateId => {
        const response = await fetch(`/api/candidates/${candidateId}`, { method: 'DELETE' });
        const result = await response.json();
        return { candidateId, success: response.ok && result.success, result };
      });
      
      const results = await Promise.all(deletePromises);
      const successful = results.filter(r => r.success);
      const failed = results.filter(r => !r.success);
      
      // Remove successfully deleted candidates from local state
      const successfulIds = new Set(successful.map(r => r.candidateId));
      setCandidates(prev => prev.filter(c => !successfulIds.has(c.id)));
      setSelectedCandidates(new Set());
      
      // Show comprehensive feedback
      const totalFiles = successful.length;
      const filesDeleted = successful.filter(r => r.result.deletionSummary?.filesDeletionSuccess).length;
      
      let message: string;
      let type: 'success' | 'warning' | 'error';
      
      if (failed.length === 0) {
        if (filesDeleted === totalFiles) {
          message = `Successfully deleted ${successful.length} candidates and all associated files`;
          type = 'success';
        } else {
          message = `Successfully deleted ${successful.length} candidates, but ${totalFiles - filesDeleted} files may still exist in storage`;
          type = 'warning';
        }
      } else {
        message = `Deleted ${successful.length} of ${selectedCandidates.size} candidates. ${failed.length} failed to delete.`;
        type = 'error';
      }
      
      setDeletionStatus({
        show: true,
        type,
        message,
        details: {
          total: selectedCandidates.size,
          successful: successful.length,
          failed: failed.length,
          filesDeleted,
          totalFiles
        }
      });
      
      toast[type](message);
      
      // Auto-hide status after 7 seconds for bulk operations
      setTimeout(() => {
        setDeletionStatus(prev => ({ ...prev, show: false }));
      }, 7000);
      
    } catch (error) {
      console.error('Error deleting candidates:', error);
      const errorMessage = 'Network error occurred during bulk deletion';
      setDeletionStatus({
        show: true,
        type: 'error',
        message: errorMessage,
        details: error
      });
      toast.error(errorMessage);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleRecalculateScore = async (candidateId: string) => {
    setRecalculatingScores(prev => new Set(prev).add(candidateId));
    
    try {
      const response = await fetch(`/api/candidates/${candidateId}/talent-fit-score`, {
           method: 'POST',
         });
      
      const result = await response.json();
      
      if (response.ok && result.success) {
        // Update the candidate's scores in local state
        setCandidates(prev => prev.map(candidate => 
          candidate.id === candidateId 
            ? { ...candidate, talentFitScore: result.data.talentFitScore }
            : candidate
        ));
        
        toast.success(`Talent fit score recalculated successfully: ${result.data.talentFitScore}%`);
      } else {
        toast.error(result.error || 'Failed to recalculate talent fit score');
      }
    } catch (error) {
      console.error('Error recalculating score:', error);
      toast.error('Network error occurred while recalculating score');
    } finally {
      setRecalculatingScores(prev => {
        const newSet = new Set(prev);
        newSet.delete(candidateId);
        return newSet;
      });
    }
  };

  const handleBulkRecalculateScores = async () => {
    if (selectedCandidates.size === 0) return;
    
    const candidateIds = Array.from(selectedCandidates);
    setRecalculatingScores(prev => new Set([...prev, ...candidateIds]));
    
    try {
      const recalculatePromises = candidateIds.map(async candidateId => {
        const response = await fetch(`/api/candidates/${candidateId}/talent-fit-score`, {
          method: 'POST',
        });
        const result = await response.json();
        return { candidateId, success: response.ok && result.success, result };
      });
      
      const results = await Promise.all(recalculatePromises);
      const successful = results.filter(r => r.success);
      const failed = results.filter(r => !r.success);
      
      // Update scores for successful recalculations
      setCandidates(prev => prev.map(candidate => {
        const successfulResult = successful.find(r => r.candidateId === candidate.id);
        return successfulResult 
          ? { ...candidate, talentFitScore: successfulResult.result.data.talentFitScore }
          : candidate;
      }));
      
      // Show feedback
      if (failed.length === 0) {
        toast.success(`Successfully recalculated scores for ${successful.length} candidates`);
      } else {
        toast.warning(`Recalculated ${successful.length} of ${candidateIds.length} scores. ${failed.length} failed.`);
      }
      
    } catch (error) {
      console.error('Error bulk recalculating scores:', error);
      toast.error('Network error occurred during bulk score recalculation');
    } finally {
      setRecalculatingScores(prev => {
        const newSet = new Set(prev);
        candidateIds.forEach(id => newSet.delete(id));
        return newSet;
      });
    }
  };

  const fetchCandidates = async () => {
    if (!campaignId) {
      toast.error('No campaign selected');
      return;
    }
    
    // Validate campaign ID format
    if (!isValidCampaignId(campaignId)) {
      toast.error('Invalid campaign ID. Please refresh the page and try again.');
      console.warn('Invalid campaign ID format:', campaignId);
      // Clear invalid campaign ID from store
      setCampaignId('');
      return;
    }
    
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      
      if (statusFilter !== 'all') queryParams.append('status', statusFilter);
      if (sourceFilter !== 'all') queryParams.append('source', sourceFilter);
      if (searchQuery) queryParams.append('search', searchQuery);
      
      const response = await fetch(`/api/campaigns/jobs/${campaignId}/candidates?${queryParams}`);
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setCandidates(data.data || []);
        } else {
          toast.error(data.error || 'Failed to fetch candidates');
        }
      } else if (response.status === 404) {
        // Use centralized error handling for campaign not found
        handleCampaignNotFound(setCampaignId);
      } else {
        toast.error('Failed to fetch candidates');
      }
    } catch (error) {
      console.error('Error fetching candidates:', error);
      toast.error('Failed to fetch candidates');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'applied': return 'bg-blue-100 text-blue-800';
      case 'screening': return 'bg-yellow-100 text-yellow-800';
      case 'interview': return 'bg-purple-100 text-purple-800';
      case 'hired': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'shortlisted': return 'bg-indigo-100 text-indigo-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleResumeUpload = async (files: FileList) => {
    if (!files || files.length === 0) {
      toast.error('Please select resume files to upload');
      return;
    }
    
    if (!campaignId) {
      toast.error('No campaign selected. Please refresh the page and try again.');
      return;
    }
    
    // Validate campaign ID format (UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(campaignId)) {
      toast.error('Invalid campaign ID. Please refresh the page and try again.');
      return;
    }
    
    // Check if user is authenticated
    if (!session?.user?.email) {
      toast.error('You must be logged in to upload resumes');
      return;
    }
    
    setUploadingResume(true);
    try {
      const formData = new FormData();
      Array.from(files).forEach(file => {
        formData.append('resumes', file);
      });
      formData.append('campaignId', campaignId);
      formData.append('source', 'manual_upload');

      console.log(`Uploading ${files.length} files to campaign: ${campaignId}`);
      console.log('Current session:', session);

      const response = await fetch('/api/candidates/resumes/upload', {
        method: 'PUT',
        body: formData,
        credentials: 'include', // Ensure cookies are sent
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        const uploadedCount = data.data?.summary?.successful || 0;
        const campaignName = jobDetails?.campaignName || 'the selected campaign';
        toast.success(`Successfully uploaded ${uploadedCount} resumes to ${campaignName}`);
        fetchCandidates();
        setShowUpload(false);
      } else {
        console.error('Resume upload failed:', data);
        const errorMessage = data.details || data.error || 'Failed to upload resumes';
        toast.error(errorMessage);
        
        // If campaign not found, use centralized error handling
        if (data.error === 'Campaign not found') {
          handleCampaignNotFound(setCampaignId);
        }
      }
    } catch (error) {
      console.error('Error uploading resumes:', error);
      toast.error('Failed to upload resumes');
    } finally {
      setUploadingResume(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      handleResumeUpload(files);
    }
  };

  const filteredCandidates = candidates.filter(candidate => {
    const matchesSearch = candidate.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         candidate.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || candidate.status === statusFilter;
    const matchesSource = sourceFilter === 'all' || candidate.source === sourceFilter;
    
    let matchesTab = true;
    if (activeTab !== 'all') {
      matchesTab = candidate.status === activeTab;
    }
    
    return matchesSearch && matchesStatus && matchesSource && matchesTab;
  });

  const candidatesByStatus = {
    all: candidates.length,
    applied: candidates.filter(c => c.status === 'applied').length,
    screening: candidates.filter(c => c.status === 'screening').length,
    shortlisted: candidates.filter(c => c.status === 'shortlisted').length,
    interview: candidates.filter(c => c.status === 'interview').length,
    hired: candidates.filter(c => c.status === 'hired').length,
    rejected: candidates.filter(c => c.status === 'rejected').length,
  };

  const averageScore = candidates.length > 0 
    ? Math.round(candidates.reduce((sum, c) => sum + (c.talentFitScore || 0), 0) / candidates.length)
    : 0;

  if (!campaignId) {
    return (
      <div className="min-h-screen flex flex-col">
        <div className="container mx-auto px-4 py-4 sm:py-6">
          <Card>
            <CardContent className="p-6 sm:p-8 text-center">
              <Users className="h-10 w-10 sm:h-12 sm:w-12 text-gray-400 mx-auto mb-3 sm:mb-4" />
              <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">No Campaign Selected</h3>
              <p className="text-sm sm:text-base text-gray-600">Please select a campaign to view candidates.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <div className="container mx-auto px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
          {/* Header skeleton */}
          <div className="flex justify-between items-center">
            <div>
              <div className="h-6 sm:h-8 w-48 sm:w-64 bg-gray-200 rounded-lg animate-pulse mb-2"></div>
              <div className="h-4 w-64 sm:w-80 bg-gray-200 rounded animate-pulse"></div>
            </div>
            <div className="flex gap-2">
              <div className="h-8 sm:h-10 w-24 sm:w-32 bg-gray-200 rounded-md animate-pulse"></div>
              <div className="h-8 sm:h-10 w-20 sm:w-24 bg-gray-200 rounded-md animate-pulse"></div>
            </div>
          </div>

          {/* Stats Cards skeleton */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
            {[1, 2, 3, 4].map((index) => (
              <Card key={index}>
                <CardContent className="p-3 sm:p-4 text-center">
                  <div className="h-5 sm:h-6 w-12 sm:w-16 bg-gray-200 rounded mb-1 animate-pulse mx-auto"></div>
                  <div className="h-3 sm:h-4 w-16 sm:w-20 bg-gray-200 rounded animate-pulse mx-auto"></div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Filters skeleton */}
          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-3">
                <div className="flex-1 min-w-0">
                  <div className="h-10 w-full bg-gray-200 rounded-md animate-pulse"></div>
                </div>
                <div className="h-10 w-full sm:w-32 bg-gray-200 rounded-md animate-pulse"></div>
                <div className="h-10 w-full sm:w-32 bg-gray-200 rounded-md animate-pulse"></div>
              </div>
            </CardContent>
          </Card>

          {/* Tabs skeleton */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 sm:gap-3">
              {[1, 2, 3, 4, 5, 6, 7].map((index) => (
                <div key={index} className="h-10 bg-gray-200 rounded-md animate-pulse"></div>
              ))}
            </div>

            {/* Candidate cards skeleton */}
            <div className="grid gap-3 sm:gap-4">
              {[1, 2, 3, 4, 5].map((index) => (
                <Card key={index}>
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
                      <div className="w-full flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
                        <div className="flex items-center space-x-2 sm:space-x-3">
                          <div className="h-4 w-4 bg-gray-200 rounded animate-pulse"></div>
                          <div className="h-8 w-8 sm:h-10 sm:w-10 bg-gray-200 rounded-full animate-pulse"></div>
                          <div>
                            <div className="h-4 sm:h-5 w-32 sm:w-48 bg-gray-200 rounded animate-pulse mb-1"></div>
                            <div className="h-3 sm:h-4 w-24 sm:w-32 bg-gray-200 rounded animate-pulse"></div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                          <div className="h-6 w-16 bg-gray-200 rounded animate-pulse"></div>
                          <div className="h-6 w-12 bg-gray-200 rounded animate-pulse"></div>
                          <div className="h-8 w-8 bg-gray-200 rounded animate-pulse"></div>
                          <div className="h-8 w-8 bg-gray-200 rounded animate-pulse"></div>
                          <div className="h-6 w-16 bg-gray-200 rounded animate-pulse"></div>
                          <div className="h-8 w-8 bg-gray-200 rounded animate-pulse"></div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-3 sm:mt-4 space-y-2">
                      <div className="flex flex-wrap gap-2 sm:gap-4">
                        <div className="h-3 sm:h-4 w-32 sm:w-40 bg-gray-200 rounded animate-pulse"></div>
                        <div className="h-3 sm:h-4 w-24 sm:w-32 bg-gray-200 rounded animate-pulse"></div>
                        <div className="h-3 sm:h-4 w-20 sm:w-28 bg-gray-200 rounded animate-pulse"></div>
                        <div className="h-3 sm:h-4 w-28 sm:w-36 bg-gray-200 rounded animate-pulse"></div>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {[1, 2, 3, 4].map((skillIndex) => (
                          <div key={skillIndex} className="h-5 w-12 sm:w-16 bg-gray-200 rounded animate-pulse"></div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <div className="container mx-auto px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl sm:text-2xl font-medium">Campaign Candidates</h1>
            <p className="text-sm text-gray-600 mt-1">
              {jobDetails.campaignName ? `${jobDetails.campaignName} - ${jobDetails.jobTitle}` : 'Manage candidates for this campaign'}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowUpload(true)}>
              <Upload className="h-4 w-4 mr-2" />
              Upload Resume
            </Button>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          <Card>
            <CardContent className="p-3 sm:p-4 text-center">
              <div className="text-lg sm:text-xl font-medium mb-1">
                {candidatesByStatus.all}
              </div>
              <p className="text-xs sm:text-sm text-gray-600">Total Candidates</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 sm:p-4 text-center">
              <div className="text-lg sm:text-xl font-medium mb-1 text-green-600">
                {candidatesByStatus.shortlisted}
              </div>
              <p className="text-xs sm:text-sm text-gray-600">Shortlisted</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 sm:p-4 text-center">
              <div className="text-lg sm:text-xl font-medium mb-1 text-purple-600">
                {candidatesByStatus.interview}
              </div>
              <p className="text-xs sm:text-sm text-gray-600">In Interview</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 sm:p-4 text-center">
              <div className="text-lg sm:text-xl font-medium mb-1 text-orange-600">
                {averageScore}%
              </div>
              <p className="text-xs sm:text-sm text-gray-600">Avg Score</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-3">
              <div className="flex-1 min-w-0">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search candidates by name or email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 w-full"
                  />
                </div>
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-36">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="applied">Applied</SelectItem>
                  <SelectItem value="screening">Screening</SelectItem>
                  <SelectItem value="shortlisted">Shortlisted</SelectItem>
                  <SelectItem value="interview">Interview</SelectItem>
                  <SelectItem value="hired">Hired</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sourceFilter} onValueChange={setSourceFilter}>
                <SelectTrigger className="w-full sm:w-44">
                  <SelectValue placeholder="Filter by source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sources</SelectItem>
                  <SelectItem value="manual_upload">Manual Upload</SelectItem>
                  <SelectItem value="job_board">Job Board</SelectItem>
                  <SelectItem value="referral">Referral</SelectItem>
                  <SelectItem value="direct_application">Direct Application</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Bulk Actions */}
        {selectedCandidates.size > 0 && (
          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <Checkbox
                    checked={selectedCandidates.size === filteredCandidates.length}
                    onCheckedChange={handleSelectAll}
                  />
                  <span className="text-sm font-medium">
                    {selectedCandidates.size} of {filteredCandidates.length} candidates selected
                  </span>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleBulkRecalculateScores}
                    disabled={Array.from(selectedCandidates).some(id => recalculatingScores.has(id))}
                    className="text-xs sm:text-sm"
                  >
                    {Array.from(selectedCandidates).some(id => recalculatingScores.has(id)) ? (
                      <div className="flex items-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                        Recalculating...
                      </div>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Recalculate Scores ({selectedCandidates.size})
                      </>
                    )}
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleBulkDelete}
                    disabled={isDeleting}
                    className="text-xs sm:text-sm"
                  >
                    {isDeleting ? (
                      <div className="flex items-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Deleting...
                      </div>
                    ) : (
                      <>
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Selected ({selectedCandidates.size})
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Candidates Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 sm:gap-3 overflow-x-auto w-full">
            <TabsTrigger value="all" className="text-xs sm:text-sm">
              All ({candidatesByStatus.all})
            </TabsTrigger>
            <TabsTrigger value="applied" className="text-xs sm:text-sm">
              Applied ({candidatesByStatus.applied})
            </TabsTrigger>
            <TabsTrigger value="screening" className="text-xs sm:text-sm">
              Screening ({candidatesByStatus.screening})
            </TabsTrigger>
            <TabsTrigger value="shortlisted" className="text-xs sm:text-sm">
              Shortlisted ({candidatesByStatus.shortlisted})
            </TabsTrigger>
            <TabsTrigger value="interview" className="text-xs sm:text-sm">
              Interview ({candidatesByStatus.interview})
            </TabsTrigger>
            <TabsTrigger value="hired" className="text-xs sm:text-sm">
              Hired ({candidatesByStatus.hired})
            </TabsTrigger>
            <TabsTrigger value="rejected" className="text-xs sm:text-sm">
              Rejected ({candidatesByStatus.rejected})
            </TabsTrigger>
          </TabsList>

        <TabsContent value={activeTab} className="mt-4 sm:mt-6">
          {filteredCandidates.length === 0 ? (
            <Card>
              <CardContent className="p-4 sm:p-6 text-center">
                <User className="h-8 w-8 sm:h-10 sm:w-10 text-gray-400 mx-auto mb-3 sm:mb-4" />
                <h3 className="text-sm sm:text-base font-medium text-gray-900 mb-2">No candidates found</h3>
                <p className="text-xs sm:text-sm text-gray-600">
                  {candidates.length === 0 
                    ? "No candidates have applied to this campaign yet. Upload resumes or share the job posting to get started."
                    : "No candidates match your current filters."
                  }
                </p>
                {candidates.length === 0 && (
                  <Button className="mt-4" onClick={() => setShowUpload(true)}>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload First Resume
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 sm:gap-4">
              {filteredCandidates.map((candidate) => {
                return (
                  <Card key={candidate.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-3 sm:p-4">
                      {/* Top Column */}
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
                        <div className="w-full flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
                          {/* Name and Job Title */}
                          <div className="flex items-center space-x-2 sm:space-x-3">
                            <Checkbox
                              checked={selectedCandidates.has(candidate.id)}
                              onCheckedChange={() => handleSelectCandidate(candidate.id)}
                              className="mt-1"
                            />
                            <Avatar className="h-8 w-8 sm:h-10 sm:w-10">
                              <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${candidate.name}`} />
                              <AvatarFallback>
                                {candidate.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <h3 className="text-sm sm:text-base font-semibold text-gray-900">{candidate.name}</h3>
                              <p className="text-xs sm:text-sm text-gray-600">
                                {candidate.jobTitle || jobDetails.jobTitle || 'Campaign Candidate'}
                              </p>
                            </div>
                          </div>

                          {/* Talent Fit Score, Resume and View Profile Buttons */}
                          <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                            <div 
                              className="flex items-center gap-1 sm:gap-2 text-gray-500 hover:text-gray-700 cursor-pointer text-xs sm:text-sm transition-colors"
                              onClick={() => handleRecalculateScore(candidate.id)}
                            >
                              {recalculatingScores.has(candidate.id) ? (
                                <>
                                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-600"></div>
                                  <p>Recalculating...</p>
                                </>
                              ) : (
                                <>
                                  <RefreshCcw size={14} />
                                  <p>Recalculate</p>
                                </>
                              )}
                            </div>
                            {candidate.talentFitScore && (
                              <div className="relative group flex items-center gap-1 sm:gap-2 text-xs">
                                <div>
                                  <CircularProgress score={candidate.talentFitScore} />
                                  <div className="absolute right-0 bottom-full mb-2 hidden group-hover:flex flex-col bg-white rounded-md border-[1px] border-gray-200 shadow-sm z-20 p-3 sm:p-4 text-xs sm:text-sm text-gray-700 transition-all duration-75 w-80 sm:w-96">
                                    {candidate.skills &&
                                      typeof candidate.skills === "string" &&
                                      (() => {
                                        try {
                                          const skills = JSON.parse(candidate.skills);
                                          const bgColors = [
                                            "bg-[#FFDCFC]",
                                            "bg-[#F1FFE9]",
                                            "bg-[#FFE5D3]",
                                            "bg-[#DAE4FF]",
                                            "bg-[#CCF8FE]",
                                          ];
                                          const getRandomColor = () =>
                                            bgColors[
                                              Math.floor(
                                                Math.random() * bgColors.length
                                              )
                                            ];
                                          return (
                                            <div className="space-y-3 sm:space-y-4">
                                              {skills.technical?.length > 0 && (
                                                <div className="flex flex-wrap items-center gap-1 sm:gap-2">
                                                  <span className="font-semibold text-gray-900 text-xs sm:text-sm">
                                                    Technical Skills:
                                                  </span>
                                                  <ul className="flex flex-wrap gap-1 sm:gap-2">
                                                    {skills.technical
                                                      .slice(0, 2)
                                                      .map((skill: string, index: number) => (
                                                        <li
                                                          key={index}
                                                          className={`text-gray-700 list-none px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-3xl text-xs ${getRandomColor()}`}
                                                        >
                                                          {skill}
                                                        </li>
                                                      ))}
                                                  </ul>
                                                </div>
                                              )}
                                              {skills.languages?.length > 0 && (
                                                <div className="flex flex-wrap items-center gap-1 sm:gap-2">
                                                  <span className="font-semibold text-gray-900 text-xs sm:text-sm">
                                                    Languages:
                                                  </span>
                                                  <ul className="flex flex-wrap gap-1 sm:gap-2">
                                                    {skills.languages
                                                      .slice(0, 2)
                                                      .map((lang: string, index: number) => (
                                                        <li
                                                          key={index}
                                                          className={`text-gray-700 list-none px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-3xl text-xs ${getRandomColor()}`}
                                                        >
                                                          {lang}
                                                        </li>
                                                      ))}
                                                  </ul>
                                                </div>
                                              )}
                                              {skills.frameworks?.length > 0 && (
                                                <div className="flex flex-wrap items-center gap-1 sm:gap-2">
                                                  <span className="font-semibold text-gray-900 text-xs sm:text-sm">
                                                    Frameworks:
                                                  </span>
                                                  <ul className="flex flex-wrap gap-1 sm:gap-2">
                                                    {skills.frameworks
                                                      .slice(0, 2)
                                                      .map((framework: string, index: number) => (
                                                        <li
                                                          key={index}
                                                          className={`text-gray-700 list-none px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-3xl text-xs ${getRandomColor()}`}
                                                        >
                                                          {framework}
                                                        </li>
                                                      ))}
                                                  </ul>
                                                </div>
                                              )}
                                              {skills.tools?.length > 0 && (
                                                <div className="flex flex-wrap items-center gap-1 sm:gap-2">
                                                  <span className="font-semibold text-gray-900 text-xs sm:text-sm">
                                                    Tools:
                                                  </span>
                                                  <ul className="flex flex-wrap gap-1 sm:gap-2">
                                                    {skills.tools
                                                      .slice(0, 2)
                                                      .map((tool: string, index: number) => (
                                                        <li
                                                          key={index}
                                                          className={`text-gray-700 list-none px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-3xl text-xs ${getRandomColor()}`}
                                                        >
                                                          {tool}
                                                        </li>
                                                      ))}
                                                  </ul>
                                                </div>
                                              )}
                                            </div>
                                          );
                                        } catch (error) {
                                          return (
                                            <div className="text-red-600 text-xs sm:text-sm">
                                              Error parsing skills
                                            </div>
                                          );
                                        }
                                      })()}
                                    {(!candidate.skills || 
                                      (Array.isArray(candidate.skills) && candidate.skills.length === 0) ||
                                      (typeof candidate.skills === 'string' && candidate.skills.trim() === '')) && (
                                      <div className="text-gray-500 text-xs sm:text-sm">
                                        No skills information available
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}
                            {candidate.resumeUrl && (
                              <Button variant="outline" size="sm" asChild>
                                <a href={candidate.resumeUrl} target="_blank" rel="noopener noreferrer">
                                  <Download className="h-4 w-4" />
                                </a>
                              </Button>
                            )}
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => {
                                setSelectedCandidateId(candidate.id);
                                setShowProfile(true);
                              }}
                            >
                              <EyeIcon className="h-4 w-4" />
                            </Button>
                            <Select value={candidate.status}>
                              <SelectTrigger className="w-full sm:w-36 text-xs sm:text-sm">
                                <SelectValue placeholder="Status" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="applied">Applied</SelectItem>
                                <SelectItem value="screening">Screening</SelectItem>
                                <SelectItem value="shortlisted">Shortlisted</SelectItem>
                                <SelectItem value="interview">Interview</SelectItem>
                                <SelectItem value="hired">Hired</SelectItem>
                                <SelectItem value="rejected">Rejected</SelectItem>
                              </SelectContent>
                            </Select>
                            <Button
                              variant="outline"
                              size="sm"
                              className="bg-red-100 hover:bg-red-200"
                              onClick={() => handleDeleteCandidate(candidate.id)}
                            >
                              <Trash className="h-4 w-4 text-red-600" />
                            </Button>
                          </div>
                        </div>
                      </div>

                      {/* Bottom Column */}
                      <div className="text-xs sm:text-sm text-gray-600 flex flex-col sm:flex-row sm:justify-between mt-3 sm:mt-4 gap-2 sm:gap-4">
                        <div className="flex flex-col w-full sm:w-auto space-y-2 sm:space-y-3">
                          <div className="flex flex-wrap gap-2 sm:gap-4">
                            <div className="flex items-center gap-1 sm:gap-2">
                              <Mail className="h-4 w-4" />
                              <span>{candidate.email}</span>
                            </div>
                            <div className="flex items-center gap-1 sm:gap-2 text-nowrap">
                              <Calendar className="h-4 w-4" />
                              <span>
                                Applied {candidate.appliedDate ? new Date(candidate.appliedDate).toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric'
                                }) : 'Unknown'}
                              </span>
                            </div>
                            {candidate.phone && (
                              <div className="flex items-center gap-1 sm:gap-2">
                                <Phone className="h-4 w-4" />
                                <span>{candidate.phone ? candidate.phone : 'Unknown'}</span>
                              </div>
                            )}
                            {candidate.location && (
                              <div className="flex items-center gap-1 sm:gap-2 text-nowrap">
                                <MapPin className="h-4 w-4" />
                                <span>{candidate.location ? candidate.location : 'Unknown'}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Upload Dialog */}
      <Dialog open={showUpload} onOpenChange={setShowUpload}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Upload Candidate Resumes</DialogTitle>
            <DialogDescription>
              Upload resumes for candidates applying to {jobDetails.campaignName || 'this campaign'}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-sm text-gray-600 mb-4">
                Drag and drop resume files here, or click to browse
              </p>
              <input
                type="file"
                multiple
                accept=".pdf,.doc,.docx"
                onChange={handleFileSelect}
                className="hidden"
                id="resume-upload"
                disabled={uploadingResume}
              />
              <Button
                variant="outline"
                onClick={() => document.getElementById('resume-upload')?.click()}
                disabled={uploadingResume}
              >
                {uploadingResume ? 'Uploading...' : 'Select Files'}
              </Button>
            </div>
            <p className="text-xs text-gray-500">
              Supported formats: PDF, DOC, DOCX. Maximum file size: 10MB per file.
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Candidate Profile Modal */}
      {selectedCandidateId && (
        <CandidateProfileModal
          isOpen={showProfile}
          onClose={() => {
            setShowProfile(false);
            setSelectedCandidateId(null);
          }}
          candidateId={selectedCandidateId}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Candidate</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this candidate? This action cannot be undone and will remove all associated data including interviews, documents, and scores.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Deleting...
                </div>
              ) : (
                'Delete Candidate'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Deletion Status Notification */}
      {deletionStatus.show && (
        <div className={`fixed top-4 right-4 z-50 max-w-md p-4 rounded-lg shadow-lg border ${
          deletionStatus.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' :
          deletionStatus.type === 'warning' ? 'bg-yellow-50 border-yellow-200 text-yellow-800' :
          'bg-red-50 border-red-200 text-red-800'
        }`}>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center">
                {deletionStatus.type === 'success' && (
                  <CheckCircle className="h-5 w-5 mr-2 text-green-600" />
                )}
                {deletionStatus.type === 'warning' && (
                  <AlertTriangle className="h-5 w-5 mr-2 text-yellow-600" />
                )}
                {deletionStatus.type === 'error' && (
                  <XCircle className="h-5 w-5 mr-2 text-red-600" />
                )}
                <h4 className="font-medium">
                  {deletionStatus.type === 'success' ? 'Success' :
                   deletionStatus.type === 'warning' ? 'Partial Success' : 'Error'}
                </h4>
              </div>
              <p className="mt-1 text-sm">{deletionStatus.message}</p>
               {deletionStatus.details && deletionStatus.type !== 'error' && (
                 <div className="mt-2 text-xs opacity-75">
                   {/* Single candidate deletion details */}
                   {deletionStatus.details.totalRecordsDeleted && (
                     <p>Records deleted: {deletionStatus.details.totalRecordsDeleted}</p>
                   )}
                   {deletionStatus.details.resumeUrl && (
                     <p>Resume file: {deletionStatus.details.filesDeletionSuccess ? 'Deleted' : 'May still exist'}</p>
                   )}
                   {/* Bulk deletion details */}
                   {deletionStatus.details.total && (
                     <div>
                       <p>Total: {deletionStatus.details.total} | Successful: {deletionStatus.details.successful} | Failed: {deletionStatus.details.failed}</p>
                       {deletionStatus.details.totalFiles > 0 && (
                         <p>Files deleted: {deletionStatus.details.filesDeleted}/{deletionStatus.details.totalFiles}</p>
                       )}
                     </div>
                   )}
                 </div>
               )}
            </div>
            <button
              onClick={() => setDeletionStatus(prev => ({ ...prev, show: false }))}
              className="ml-2 text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}