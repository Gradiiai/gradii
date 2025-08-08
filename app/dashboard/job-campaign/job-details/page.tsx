"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/shared/card";
import { Input } from "@/components/ui/shared/input";
import { Label } from "@/components/ui/shared/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/shared/button";
import { Switch } from "@/components/ui/shared/switch";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/shared/tabs";
import { Badge } from "@/components/ui/shared/badge";
import { Separator } from "@/components/ui/shared/separator";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Briefcase,
  MapPin,
  DollarSign,
  Users,
  Clock,
  FileText,
  Sparkles,
  Save,
  ArrowRight,
  X,
  Loader2,
  AlertCircle,
  CalendarIcon,
  Target,
  Download,
  CheckCircle,
  Info,
  Settings,
  GraduationCap,
  CircleDollarSign,
} from "lucide-react";
import { motion } from "framer-motion";
import { useSession } from "next-auth/react";
import { useJobCampaignStore } from "@/shared/store/jobCampaignStore";
import { JobCampaignNavigation } from "@/components/job-campaign/JobCampaignNavigation";
import {
  JobDetailsForm,
  JobDescriptionTemplate,
} from "@/shared/types/job-campaign";
import { CURRENCIES } from "@/lib/campaign-constants";
import { toast } from "sonner";
import { z } from "zod";

// Interface for job posts
interface JobPost {
  id: string;
  title: string;
  department: string;
  location: string;
  experienceLevel?: string;
  experienceMin?: number;
  experienceMax?: number;
  employeeType: string;
  salaryMin?: number;
  salaryMax?: number;
  currency: string;
  isRemote: boolean;
  isHybrid: boolean;
  salaryNegotiable: boolean;
  courseDegree?: string;
  specialization?: string;
  createdAt: string;
}

// Validation schema for job details
const jobDetailsSchema = z
  .object({
    campaignName: z
      .string()
      .min(3, "Campaign name must be at least 3 characters")
      .max(100, "Campaign name too long"),
    jobTitle: z
      .string()
      .min(2, "Job title must be at least 2 characters")
      .max(100, "Job title too long"),
    department: z.string().min(2, "Department is required"),
    location: z.string().min(2, "Location is required"),
    experienceLevel: z.string().min(1, "Experience level is required"),
    employeeType: z.string().min(1, "Employment type is required"),
    numberOfOpenings: z
      .number()
      .min(1, "At least 1 opening required")
      .max(100, "Too many openings"),
    salaryMin: z.number().optional(),
    salaryMax: z.number().optional(),
    jobDescription: z
      .string()
      .min(50, "Job description must be at least 50 characters")
      .max(5000, "Job description too long"),
    jobDuties: z.string().optional(),
    requirements: z.string().optional(),
    benefits: z.string().optional(),
    skills: z.string().optional(),
    campaignType: z.enum(["permanent", "specific"], {
      message: "Campaign type is required",
    }),
    applicationDeadline: z.string().optional(),
    targetHireDate: z.string().optional(),
    courseDegree: z.string().optional(),
    specialization: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.salaryMin && data.salaryMax && data.salaryMin > data.salaryMax) {
        return false;
      }
      return true;
    },
    {
      message: "Minimum salary cannot be greater than maximum salary",
      path: ["salaryMax"],
    }
  )
  .refine(
    (data) => {
      // For specific campaigns, require application deadline
      if (
        data.campaignType === "specific" &&
        (!data.applicationDeadline ||
          data.applicationDeadline.trim() === "" ||
          data.applicationDeadline === "0000-00-00")
      ) {
        return false;
      }
      return true;
    },
    {
      message: "Application deadline is required for specific campaigns",
      path: ["applicationDeadline"],
    }
  )
  .refine(
    (data) => {
      // For specific campaigns, require target hire date
      if (
        data.campaignType === "specific" &&
        (!data.targetHireDate ||
          data.targetHireDate.trim() === "" ||
          data.targetHireDate === "0000-00-00" ||
          data.targetHireDate.startsWith("0001-"))
      ) {
        return false;
      }
      return true;
    },
    {
      message: "Target hire date is required for specific campaigns",
      path: ["targetHireDate"],
    }
  )
  .refine(
    (data) => {
      // Only validate date order if both dates are provided and valid
      if (
        data.applicationDeadline &&
        data.targetHireDate &&
        data.applicationDeadline.trim() !== "" &&
        data.targetHireDate.trim() !== ""
      ) {
        const appDate = new Date(data.applicationDeadline);
        const targetDate = new Date(data.targetHireDate);
        if (
          appDate.toString() !== "Invalid Date" &&
          targetDate.toString() !== "Invalid Date"
        ) {
          return targetDate >= appDate;
        }
      }
      return true;
    },
    {
      message: "Target hire date must be after Application deadline",
      path: ["targetHireDate"],
    }
  );

const employeeTypes = ["Full-time", "Part-time", "Contract", "Internship"];

const experienceLevels = [
  "Entry Level (0-2 years)",
  "Mid Level (3-5 years)",
  "Senior Level (6-10 years)",
  "Lead/Principal (10+ years)",
  "Executive/Director (15+ years)",
];

const departments = [
  "Engineering",
  "Product",
  "Design",
  "Marketing",
  "Sales",
  "Operations",
  "Human Resources",
  "Finance",
  "Customer Success",
  "Data Science",
  "DevOps",
  "Quality Assurance",
  "Business Development",
  "Legal",
  "Other",
];

export default function JobDetailsStep() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const {
    state,
    updateJobDetails,
    setCampaignId,
    setCurrentStep,
    setLoading,
    setError,
    resetCampaign,
    saveToStorage,
    isFormValid,
  } = useJobCampaignStore();

  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [showTemplatePreview, setShowTemplatePreview] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [jobDescriptionTemplates, setJobDescriptionTemplates] = useState<
    JobDescriptionTemplate[]
  >([]);
  const [companyName, setCompanyName] = useState("");
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [loadingCompany, setLoadingCompany] = useState(false);
  const [skillTemplates, setSkillTemplates] = useState<any[]>([]);
  const [selectedSkillTemplate, setSelectedSkillTemplate] = useState("");
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveProgress, setSaveProgress] = useState(0);
  const [isEditMode, setIsEditMode] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [availablePosts, setAvailablePosts] = useState<JobPost[]>([]);
  const [selectedPostId, setSelectedPostId] = useState<string>("");
  const [creationMode, setCreationMode] = useState<'custom' | 'from-post'>('custom');
  const [loadingJobPosts, setLoadingJobPosts] = useState(false);

  function formatDateInput(dateString: string | null): string {
    if (!dateString) return "";

    const date = new Date(dateString);
    if (isNaN(date.getTime())) return ""; // Invalid date fallback

    return date.toISOString().split("T")[0]; // Returns YYYY-MM-DD
  }

  const handleInputChange = (field: keyof JobDetailsForm, value: any) => {
    updateJobDetails({ [field]: value });
    setHasUnsavedChanges(true);

    // Clear validation error for this field
    if (validationErrors[field]) {
      setValidationErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
    if (field === "applicationDeadline" || field === "targetHireDate") {
      validateForm();
    }
  };

  // Fetch available job posts
  const fetchJobPosts = async () => {
    if (!session?.user?.companyId) return;
    
    setLoadingJobPosts(true);
    try {
      const response = await fetch(`/api/content/posts?companyId=${session.user.companyId}`);
      const result = await response.json();
      
      if (result.success) {
        setAvailablePosts(result.data || []);
      } else {
        console.error("Failed to fetch job posts:", result.error);
      }
    } catch (error) {
      console.error("Error fetching job posts:", error);
    } finally {
      setLoadingJobPosts(false);
    }
  };

  // Handle job post selection
  const handleJobPostSelection = (postId: string) => {
    const selectedPost = availablePosts.find(post => post.id === postId);
    if (selectedPost) {
      setSelectedPostId(postId);
      
      // Map ALL job post data to job details form with proper fallbacks
      updateJobDetails({
        // Always generate campaign name from job title for consistency
        campaignName: `${selectedPost.title} Campaign`,
        jobTitle: selectedPost.title || "",
        department: selectedPost.department || "",
        location: selectedPost.location || "",
        experienceLevel: selectedPost.experienceLevel || "",
        employeeType: selectedPost.employeeType || "",
        // Salary information
        salaryMin: selectedPost.salaryMin || undefined,
        salaryMax: selectedPost.salaryMax || undefined,
        currency: selectedPost.currency || "INR",
        salaryNegotiable: selectedPost.salaryNegotiable || false,
        
        // Set defaults for campaign-specific fields
        numberOfOpenings: state.jobDetails.numberOfOpenings || 1,
        campaignType: state.jobDetails.campaignType || "specific",
        
        // Work arrangement flags
        isRemote: selectedPost.isRemote || false,
        isHybrid: selectedPost.isHybrid || false,
        
        // Experience ranges (corrected field mapping)
        minExperience: selectedPost.experienceMin || undefined,
        maxExperience: selectedPost.experienceMax || undefined,
        
        // Education fields
        courseDegree: selectedPost.courseDegree || "",
        specialization: selectedPost.specialization || "",
        
        // Generate basic job description from post info if not exists
        jobDescription: state.jobDetails.jobDescription || `Join our ${selectedPost.department} team as a ${selectedPost.title} in ${selectedPost.location}. We are looking for talented individuals to contribute to our growing organization.`,
        
        // Keep existing values for other fields or set empty defaults
        jobDuties: state.jobDetails.jobDuties || "",
        requirements: state.jobDetails.requirements || [],
        benefits: state.jobDetails.benefits || [],
        skills: state.jobDetails.skills || [],
        applicationDeadline: state.jobDetails.applicationDeadline || "",
        targetHireDate: state.jobDetails.targetHireDate || "",
      });
      
      setHasUnsavedChanges(true);
      
      // Build success message with loaded fields
      const loadedFields = [
        'Job Title', 'Department', 'Location', 'Employee Type',
        selectedPost.experienceLevel && 'Experience Level',
        (selectedPost.salaryMin || selectedPost.salaryMax) && 'Salary Range',
        selectedPost.isRemote && 'Remote Work',
        selectedPost.isHybrid && 'Hybrid Work',
        selectedPost.courseDegree && 'Education',
        selectedPost.specialization && 'Specialization'
      ].filter(Boolean);
      
      console.log('Selected post data:', selectedPost);
      console.log('Salary data loaded:', {
        salaryMin: selectedPost.salaryMin,
        salaryMax: selectedPost.salaryMax,
        currency: selectedPost.currency,
        salaryNegotiable: selectedPost.salaryNegotiable
      });
      
      toast.success(`Job post "${selectedPost.title}" loaded! ${loadedFields.length} fields populated: ${loadedFields.join(', ')}`);
    }
  };

  // Clear form function
  const clearForm = () => {
    updateJobDetails({
      campaignName: "",
      jobTitle: "",
      department: "",
      location: "",
      experienceLevel: "",
      employeeType: "",
      salaryMin: undefined,
      salaryMax: undefined,
      currency: "INR",
      numberOfOpenings: 1,
      jobDescription: "",
      jobDuties: "",
      requirements: [],
      benefits: [],
      skills: [],
      minExperience: undefined,
      maxExperience: undefined,
      campaignType: "specific",
      applicationDeadline: "",
      targetHireDate: "",
      isRemote: false,
      isHybrid: false,
      courseDegree: "",
      specialization: "",
      salaryNegotiable: false,
    });
    setSelectedPostId("");
    setHasUnsavedChanges(false);
    toast.success("Form cleared successfully!");
  };

  // Handle creation mode change
  const handleCreationModeChange = (mode: 'custom' | 'from-post') => {
    setCreationMode(mode);
    
    if (mode === 'from-post') {
      fetchJobPosts();
      // Clear form when switching to job post mode
      if (!isEditMode) {
        updateJobDetails({
          campaignName: "",
          jobTitle: "",
          department: "",
          location: "",
          experienceLevel: "",
          employeeType: "",
          salaryMin: undefined,
          salaryMax: undefined,
          currency: "INR",
          numberOfOpenings: 1,
          jobDescription: "",
          jobDuties: "",
          requirements: [],
          benefits: [],
          skills: [],
          minExperience: undefined,
          maxExperience: undefined,
          campaignType: "specific",
          applicationDeadline: "",
          targetHireDate: "",
          isRemote: false,
          isHybrid: false,
          courseDegree: "",
          specialization: "",
          salaryNegotiable: false,
        });
      }
    } else {
      // Clear selected post and form when switching to custom mode
      setSelectedPostId("");
      if (!isEditMode) {
        updateJobDetails({
          campaignName: "",
          jobTitle: "",
          department: "",
          location: "",
          experienceLevel: "",
          employeeType: "",
          salaryMin: undefined,
          salaryMax: undefined,
          currency: "INR",
          numberOfOpenings: 1,
          jobDescription: "",
          jobDuties: "",
          requirements: [],
          benefits: [],
          skills: [],
          minExperience: undefined,
          maxExperience: undefined,
          campaignType: "specific",
          applicationDeadline: "",
          targetHireDate: "",
          isRemote: false,
          isHybrid: false,
          courseDegree: "",
          specialization: "",
          salaryNegotiable: false,
        });
      }
    }
    setHasUnsavedChanges(false);
  };

  // Validate form data (for saving)
  const validateForm = () => {
    try {
      const formData = {
        campaignName: (state.jobDetails.campaignName || "").trim(),
        jobTitle: (state.jobDetails.jobTitle || "").trim(),
        department: (state.jobDetails.department || "").trim(),
        location: (state.jobDetails.location || "").trim(),
        experienceLevel: (state.jobDetails.experienceLevel || "").trim(),
        employeeType: (state.jobDetails.employeeType || "").trim(),
        numberOfOpenings: parseInt(
          state.jobDetails.numberOfOpenings?.toString() || "1"
        ),
        salaryMin: state.jobDetails.salaryMin
          ? parseInt(state.jobDetails.salaryMin.toString())
          : undefined,
        salaryMax: state.jobDetails.salaryMax
          ? parseInt(state.jobDetails.salaryMax.toString())
          : undefined,
        jobDescription: (state.jobDetails.jobDescription || "").trim(),
        jobDuties: state.jobDetails.jobDuties
          ? Array.isArray(state.jobDetails.jobDuties)
            ? state.jobDetails.jobDuties.join("\n").trim()
            : (state.jobDetails.jobDuties as string).trim()
          : undefined,
        requirements: state.jobDetails.requirements
          ? Array.isArray(state.jobDetails.requirements)
            ? state.jobDetails.requirements.join("\n").trim()
            : (state.jobDetails.requirements as string).trim()
          : undefined,
        campaignType: state.jobDetails.campaignType || "specific",
        applicationDeadline: (
          state.jobDetails.applicationDeadline || ""
        ).trim(),
        targetHireDate: (state.jobDetails.targetHireDate || "").trim(),
        courseDegree: (state.jobDetails.courseDegree || "").trim(),
        specialization: (state.jobDetails.specialization || "").trim(),
      };

      console.log("Validating form data:", formData);
      jobDetailsSchema.parse(formData);
      setValidationErrors({});
      return true;
    } catch (error) {
      console.log("Validation error:", error);
      if (error instanceof z.ZodError) {
        const errors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            errors[err.path[0] as string] = err.message;
          }
        });
        console.log("Parsed validation errors:", errors);
        setValidationErrors(errors);
      }
      return false;
    }
  };

  // Check if form is valid (for UI state, doesn't trigger state updates)
  const isFormValidMemo = useMemo(() => {
    try {
      const formData = {
        campaignName: (state.jobDetails.campaignName || "").trim(),
        jobTitle: (state.jobDetails.jobTitle || "").trim(),
        department: (state.jobDetails.department || "").trim(),
        location: (state.jobDetails.location || "").trim(),
        experienceLevel: (state.jobDetails.experienceLevel || "").trim(),
        employeeType: (state.jobDetails.employeeType || "").trim(),
        numberOfOpenings: parseInt(
          state.jobDetails.numberOfOpenings?.toString() || "1"
        ),
        salaryMin: state.jobDetails.salaryMin
          ? parseInt(state.jobDetails.salaryMin.toString())
          : undefined,
        salaryMax: state.jobDetails.salaryMax
          ? parseInt(state.jobDetails.salaryMax.toString())
          : undefined,
        jobDescription: (state.jobDetails.jobDescription || "").trim(),
        jobDuties: state.jobDetails.jobDuties
          ? Array.isArray(state.jobDetails.jobDuties)
            ? state.jobDetails.jobDuties.join("\n").trim()
            : (state.jobDetails.jobDuties as string).trim()
          : undefined,
        requirements: state.jobDetails.requirements
          ? Array.isArray(state.jobDetails.requirements)
            ? state.jobDetails.requirements.join("\n").trim()
            : (state.jobDetails.requirements as string).trim()
          : undefined,
        campaignType: state.jobDetails.campaignType || "specific",
        applicationDeadline: (
          state.jobDetails.applicationDeadline || ""
        ).trim(),
        targetHireDate: (state.jobDetails.targetHireDate || "").trim(),
        courseDegree: (state.jobDetails.courseDegree || "").trim(),
        specialization: (state.jobDetails.specialization || "").trim(),
      };

      jobDetailsSchema.parse(formData);
      return true;
    } catch (error) {
      return false;
    }
  }, [state.jobDetails]);

  // Clear validation errors when form becomes valid
  useEffect(() => {
    if (isFormValidMemo && Object.keys(validationErrors).length > 0) {
      setValidationErrors({});
    }
  }, [isFormValidMemo, validationErrors]);

  // Save job campaign
  const saveJobCampaign = async () => {
    if (!validateForm()) {
      toast.error("Please fix validation errors before saving");
      return false;
    }

    if (!session?.user?.companyId) {
      toast.error("Company information not found");
      return false;
    }

    setIsSaving(true);
    setSaveProgress(0);

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setSaveProgress((prev) => Math.min(prev + 20, 90));
      }, 200);

      const payload = {
        campaignName: state.jobDetails.campaignName,
        jobTitle: state.jobDetails.jobTitle,
        department: state.jobDetails.department,
        location: state.jobDetails.location,
        experienceLevel: state.jobDetails.experienceLevel,
        employeeType: state.jobDetails.employeeType,
        numberOfOpenings: parseInt(
          state.jobDetails.numberOfOpenings?.toString() || "1"
        ),
        salaryMin: state.jobDetails.salaryMin,
        salaryMax: state.jobDetails.salaryMax,
        jobDescription: state.jobDetails.jobDescription,
        jobDuties: state.jobDetails.jobDuties,
        requirements: state.jobDetails.requirements,
        benefits: state.jobDetails.benefits,
        applicationDeadline: state.jobDetails.applicationDeadline,
        targetHireDate: state.jobDetails.targetHireDate,
        skills: state.jobDetails.skills,
        courseDegree: state.jobDetails.courseDegree,
        specialization: state.jobDetails.specialization,
        isRemote: state.jobDetails.isRemote,
        isHybrid: state.jobDetails.isHybrid,
        salaryNegotiable: state.jobDetails.salaryNegotiable,
        currency: state.jobDetails.currency,
        minExperience: state.jobDetails.minExperience,
        maxExperience: state.jobDetails.maxExperience,
        companyId: session.user.companyId,
      };

      console.log("Sending payload:", payload);
      console.log("Job details state:", state.jobDetails);
      
      // Determine if this is an update (campaign exists) or create (new campaign)
      const isUpdate = !!state.campaignId;
      
      console.log("Save operation:", { 
        isUpdate, 
        campaignId: state.campaignId, 
        isEditMode, 
        method: isUpdate ? "PUT" : "POST", 
        url: isUpdate
          ? `/api/campaigns/jobs/${state.campaignId}`
          : "/api/campaigns/jobs"
      });

      const url = isUpdate
          ? `/api/campaigns/jobs/${state.campaignId}`
          : "/api/campaigns/jobs";

      const method = isUpdate ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      clearInterval(progressInterval);
      setSaveProgress(100);

      if (!response.ok) {
        const errorData = await response.json();
        console.error("API Error:", errorData);
        if (errorData.validationErrors) {
          console.error("Validation Errors:", errorData.validationErrors);
          const errorMessages = Object.entries(errorData.validationErrors)
            .map(([field, message]) => `${field}: ${message}`)
            .join(", ");
          throw new Error(`Validation failed: ${errorMessages}`);
        }
        throw new Error(errorData.error || "Failed to save job campaign");
      }

      const result = await response.json();

      if (result.success && result.data) {
        // Only set campaign ID if this was a new campaign creation
        if (!state.campaignId) {
          setCampaignId(result.data.id);
        }
        setHasUnsavedChanges(false);
        toast.success(
          isUpdate
            ? "Job campaign updated successfully!"
            : "Job campaign created successfully!"
        );
        return true;
      } else {
        throw new Error(result.error || "Failed to save job campaign");
      }
    } catch (error) {
      console.error("Error saving job campaign:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to save job campaign"
      );
      return false;
    } finally {
      setIsSaving(false);
      setSaveProgress(0);
    }
  };

  // Handle continue to next step
  const handleContinue = async () => {
    const saved = await saveJobCampaign();
    if (saved) {
      router.push("/dashboard/job-campaign/interview-setup");
    }
  };

  // Save as draft function
  const saveDraftAsync = async () => {
    const saved = await saveJobCampaign();
    if (saved) {
      toast.success("Draft saved successfully!");
    }
  };

  // Auto-save functionality
  useEffect(() => {
    if (hasUnsavedChanges && state.campaignId) {
      const autoSaveTimer = setTimeout(() => {
        saveJobCampaign();
      }, 30000); // Auto-save after 30 seconds of inactivity

      return () => clearTimeout(autoSaveTimer);
    }
  }, [hasUnsavedChanges, state.campaignId]);

  // Warn user about unsaved changes before leaving
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // Fetch job description templates
  const fetchJobDescriptionTemplates = async () => {
    try {
      setLoadingTemplates(true);
      const response = await fetch("/api/content/job-templates");
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setJobDescriptionTemplates(data.data);
        }
      }
    } catch (error) {
      console.error("Error fetching job description templates:", error);
      toast.error("Failed to load job description templates");
    } finally {
      setLoadingTemplates(false);
    }
  };

  // Fetch skill templates
  const fetchSkillTemplates = async () => {
    try {
      const response = await fetch("/api/content/templates?type=skill");
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setSkillTemplates(data.data || []);
        }
      }
    } catch (error) {
      console.error("Error fetching skill templates:", error);
      toast.error("Failed to load skill templates");
    }
  };

  // Fetch company information
  const fetchCompanyInfo = async () => {
    if (!session?.user?.companyId) return;

    try {
      setLoadingCompany(true);
      const response = await fetch(`/api/companies/${session.user.companyId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setCompanyName(data.data.name || "");
        }
      }
    } catch (error) {
      console.error("Error fetching company info:", error);
    } finally {
      setLoadingCompany(false);
    }
  };

  // Load existing campaign data if editing
  useEffect(() => {
    const loadCampaignData = async () => {
      // Check if we have a campaign ID from URL parameters (for direct editing)
      const urlCampaignId = searchParams.get('campaignId') || searchParams.get('id');
      
      // Use URL campaign ID if available, otherwise use store campaign ID
      const campaignId = urlCampaignId || state.campaignId;

      if (!campaignId) {
        // No campaign ID means we're creating a new campaign
        // Reset the store to initial state
        if (state.campaignId) {
          setCampaignId("");
          updateJobDetails({
            campaignName: "",
            jobTitle: "",
            department: "",
            location: "",
            experienceLevel: "",
            employeeType: "",
            numberOfOpenings: 1,
            salaryMin: undefined,
            salaryMax: undefined,
            currency: "INR",
            jobDescription: "",
            jobDuties: "",
            requirements: [],
            benefits: [],
            skills: [],
            applicationDeadline: "",
            targetHireDate: "",
            isRemote: false,
            isHybrid: false,
            courseDegree: "",
            specialization: "",
            salaryNegotiable: false,
          });
          setIsEditMode(false);
        }
        return;
      }

      // If we have a campaign ID (either from URL or store), load the campaign data
      if (campaignId) {
        try {
          setLoading(true);
          console.log('Loading campaign data for ID:', campaignId);
          
          const response = await fetch(`/api/campaigns/jobs/${campaignId}`);
          if (response.ok) {
            const data = await response.json();
            if (data.success && data.data) {
              const campaign = data.data;
              console.log('Loaded campaign data:', campaign);

              // Check if this is a Direct Interview campaign (should be excluded)
              if (campaign.campaignName === 'Direct Interview') {
                console.error('Attempted to load Direct Interview campaign, redirecting to job campaigns list');
                toast.error('Direct Interview campaigns cannot be edited here');
                router.push('/dashboard/job-campaign');
                return;
              }

              // Update the store with the loaded campaign data
              setCampaignId(campaignId);
              updateJobDetails({
                campaignName: campaign.campaignName || "",
                jobTitle: campaign.jobTitle || "",
                department: campaign.department || "",
                location: campaign.location || "",
                experienceLevel: campaign.experienceLevel || "",
                employeeType: campaign.employeeType || "",
                numberOfOpenings: campaign.numberOfOpenings || 1,
                salaryMin: campaign.salaryMin || 0,
                salaryMax: campaign.salaryMax || 0,
                currency: campaign.currency || "INR",
                jobDescription: campaign.jobDescription || "",
                jobDuties: campaign.jobDuties || "",
                requirements: (campaign as any).jobRequirements
                  ? typeof (campaign as any).jobRequirements === "string"
                    ? (campaign as any).jobRequirements
                        .split(",")
                        .map((r: string) => r.trim())
                        .filter(Boolean)
                    : (campaign as any).jobRequirements
                  : [],
                benefits: (campaign as any).jobBenefits
                  ? typeof (campaign as any).jobBenefits === "string"
                    ? (campaign as any).jobBenefits
                        .split(",")
                        .map((b: string) => b.trim())
                        .filter(Boolean)
                    : (campaign as any).jobBenefits
                  : [],
                skills: (campaign as any).requiredSkills
                  ? typeof (campaign as any).requiredSkills === "string"
                    ? (campaign as any).requiredSkills
                        .split(",")
                        .map((s: string) => s.trim())
                        .filter(Boolean)
                    : (campaign as any).requiredSkills
                  : [],
                applicationDeadline: campaign.applicationDeadline 
                  ? campaign.applicationDeadline.split('T')[0] 
                  : "",
                targetHireDate: campaign.targetHireDate 
                  ? campaign.targetHireDate.split('T')[0] 
                  : "",
                isRemote: campaign.isRemote || false,
                isHybrid: campaign.isHybrid || false,
                courseDegree: campaign.courseDegree || "",
                specialization: campaign.specialization || "",
                salaryNegotiable: campaign.salaryNegotiable || false,
                minExperience: campaign.minExperience || undefined,
                maxExperience: campaign.maxExperience || undefined,
              });

              setIsEditMode(true);
              setHasUnsavedChanges(false); // Reset unsaved changes flag when loading
              
              console.log('Campaign data loaded successfully');
              toast.success('Campaign data loaded for editing');
            } else {
              console.error('Failed to load campaign data:', data.error || data.message);
              if (data.error === 'Campaign not found') {
                toast.error('Campaign not found. It may have been deleted.');
                router.push('/dashboard/job-campaign');
                return;
              } else {
                toast.error('Failed to load campaign data');
              }
            }
          } else {
            console.error('Failed to fetch campaign:', response.status);
            if (response.status === 404) {
              toast.error('Campaign not found. It may have been deleted or moved.');
              router.push('/dashboard/job-campaign');
              return;
            } else {
              toast.error(`Failed to load campaign data (${response.status})`);
            }
          }
        } catch (error) {
          console.error("Error loading campaign data:", error);
          toast.error('Error loading campaign data');
        } finally {
          setLoading(false);
        }
      }
    };

    loadCampaignData();
  }, [session?.user?.companyId, searchParams]); // Add searchParams as dependency

  // Load templates and company info on mount
  useEffect(() => {
    fetchJobDescriptionTemplates();
    fetchSkillTemplates();
    fetchCompanyInfo();
    // Load posts for current company
    (async () => {
      try {
        if (!session?.user?.companyId) return;
        const res = await fetch(`/api/content/posts?companyId=${session.user.companyId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.success) setAvailablePosts(data.data || []);
        }
      } catch (e) {
        // ignore silently
      }
    })();
  }, [session?.user?.companyId]);

  const generateWithAI = async () => {
    if (!state.jobDetails.jobTitle.trim()) {
      toast.error("Please enter a job title first");
      return;
    }

    setIsGenerating(true);
    try {
      const response = await fetch("/api/ai/generate-job-duties", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          jobTitle: state.jobDetails.jobTitle,
          department: state.jobDetails.department,
          experienceLevel: `${state.jobDetails.minExperience || 0}-${state.jobDetails.maxExperience || 0} years`,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate job duties");
      }

      const data = await response.json();

      if (data.success && data.jobDuties) {
        // Convert array of job duties to formatted string
        const formattedJobDescription = Array.isArray(data.jobDuties)
          ? data.jobDuties
              .map((duty: string, index: number) => `${index + 1}. ${duty}`)
              .join("\n")
          : data.jobDuties;

        updateJobDetails({ jobDescription: formattedJobDescription });
        toast.success(
          `Job duties generated successfully! (${data.generated === "ai" ? "AI-powered" : "Template-based"})`
        );
      } else {
        throw new Error(data.message || "Failed to generate job duties");
      }
    } catch (error) {
      console.error("Error generating job duties:", error);
      toast.error("Failed to generate job duties. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadJobDescriptionPDF = async () => {
    if (!state.campaignId) {
      toast.error("Please save the job campaign first");
      return;
    }

    try {
      const response = await fetch("/api/job-description-pdf", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          campaignId: state.campaignId,
          download: true,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate PDF");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = url;
      a.download = `${state.jobDetails.jobTitle.replace(/\s+/g, "_")}_JD.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success("Job description PDF downloaded successfully!");
    } catch (error) {
      console.error("Error downloading PDF:", error);
      toast.error("Failed to download PDF. Please try again.");
    }
  };

  // Removed duplicate handleSubmit function - using saveJobCampaign instead

  const saveDraft = () => {
    // Draft is automatically saved via Redis storage in the job campaign store
    saveToStorage();
    toast.success("Draft saved successfully!");
  };

  // Draft data is now automatically loaded via Redis in the job campaign store
  // No need for manual draft loading as it's handled by the JobCampaignProvider

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          {/* 1. Create Job Campaigns headline */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-medium text-gray-900 mb-2">
                {isEditMode ? "Edit Job Campaign" : "Create Job Campaign"}
              </h1>
            </div>
            <div className="flex items-center gap-3">
              {hasUnsavedChanges && (
                <div className="flex items-center gap-2 px-3 py-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <Info className="w-4 h-4 text-yellow-600" />
                  <span className="text-sm text-yellow-700">
                    Unsaved changes
                  </span>
                </div>
              )}
              <Badge variant="outline" className="px-3 py-1">
                <Briefcase className="w-4 h-4 mr-1" />
                Job Setup
              </Badge>
            </div>
          </div>

          {/* 2. Job Campaign Navigation */}
          <div className="mb-6">
            <JobCampaignNavigation />
          </div>

          {/* Progress indicator */}
          {isSaving && (
            <div className="mt-4">
              <div className="flex items-center gap-2 mb-2">
                <Loader2 className="w-4 h-4 animate-spin text-purple-600" />
                <span className="text-sm text-gray-600">
                  Saving campaign... {saveProgress}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-blue-600 to-purple-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${saveProgress}%` }}
                ></div>
              </div>
            </div>
          )}
        </motion.div>

        {/* Error Alert */}
        {state.error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{state.error}</AlertDescription>
          </Alert>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm py-6 px-2">
            <CardContent className="space-y-6">
              {/* 3. Step indicator and progress bar */}
              <div className="pb-4 border-b border-gray-200">
                <h3 className="font-medium text-xl mb-3">Job Details</h3>
                <div className="flex gap-3 items-center flex-nowrap">
                  <p className="text-gray-600 text-nowrap">Step 1 of 4:</p>
                  <Progress value={25} className="h-1 [&>div]:bg-purple-600" />
                </div>
              </div>

              {/* Company Information */}
              {companyName && (
                <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-purple-600">
                      Company: {companyName}
                    </span>
                    {loadingCompany && (
                      <Loader2 className="w-4 h-4 animate-spin text-purple-600" />
                    )}
                  </div>
                </div>
              )}

              {/* Creation Mode Selection */}
              {!isEditMode && (
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="font-medium text-gray-900">How would you like to create this job campaign?</h4>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={clearForm}
                      className="text-gray-600 hover:text-gray-800"
                    >
                      <X className="w-4 h-4 mr-1" />
                      Clear Form
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      creationMode === 'custom'
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                    onClick={() => handleCreationModeChange('custom')}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        creationMode === 'custom' ? 'border-purple-500' : 'border-gray-300'
                      }`}>
                        {creationMode === 'custom' && (
                          <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                        )}
                      </div>
                      <div>
                        <h5 className="font-medium text-gray-900">Create Custom Job</h5>
                        <p className="text-sm text-gray-600">Fill in job details manually</p>
                      </div>
                    </div>
                  </motion.div>

                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      creationMode === 'from-post'
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                    onClick={() => handleCreationModeChange('from-post')}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        creationMode === 'from-post' ? 'border-purple-500' : 'border-gray-300'
                      }`}>
                        {creationMode === 'from-post' && (
                          <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                        )}
                      </div>
                      <div>
                        <h5 className="font-medium text-gray-900">Use Existing Job Post</h5>
                        <p className="text-sm text-gray-600">Select from your job posts</p>
                      </div>
                    </div>
                  </motion.div>
                </div>
                </div>
              )}

              {/* Basic Information */}
              <div className="flex-col space-y-4">
                <div className="grid grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label
                      htmlFor="campaignName"
                      className="text-sm font-medium"
                    >
                      Campaign Name *
                    </Label>
                    <Input
                      id="campaignName"
                      placeholder="e.g., Senior Developer Hiring Q1 2024"
                      value={state.jobDetails.campaignName || ""}
                      onChange={(e) =>
                        handleInputChange("campaignName", e.target.value)
                      }
                      className={`h-11 ${
                        validationErrors.campaignName
                          ? "border-red-300 focus:ring-red-500"
                          : ""
                      }`}
                    />
                    {validationErrors.campaignName && (
                      <p className="mt-1 text-sm text-red-600 flex items-center">
                        <Info className="w-4 h-4 mr-1" />
                        {validationErrors.campaignName}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="jobTitle" className="text-sm font-medium">
                      Job Title *
                    </Label>
                                         {creationMode === 'custom' ? (
                       <Input
                         id="jobTitle"
                         placeholder="e.g., Senior Software Engineer"
                         value={state.jobDetails.jobTitle || ""}
                         onChange={(e) =>
                           handleInputChange("jobTitle", e.target.value)
                         }
                         className={`h-11 ${
                           validationErrors.jobTitle
                             ? "border-red-300 focus:ring-red-500"
                             : ""
                         }`}
                       />
                     ) : (
                       <div className="space-y-2">
                         <Select
                           value={selectedPostId}
                           onValueChange={handleJobPostSelection}
                           disabled={loadingJobPosts}
                         >
                           <SelectTrigger className={`h-11 ${
                             validationErrors.jobTitle
                               ? "border-red-300 focus:ring-red-500"
                               : ""
                           }`}>
                             <SelectValue placeholder={
                               loadingJobPosts 
                                 ? "Loading job posts..." 
                                 : availablePosts.length === 0 
                                   ? "No job posts available - Create one first"
                                   : "Select a job title from existing posts"
                             } />
                           </SelectTrigger>
                           <SelectContent>
                             {availablePosts.map((post) => (
                               <SelectItem key={post.id} value={post.id}>
                                 {post.title}
                               </SelectItem>
                             ))}
                           </SelectContent>
                         </Select>
                         {availablePosts.length === 0 && !loadingJobPosts && (
                           <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                             <p className="text-sm text-blue-800">
                               No job posts found. 
                               <a 
                                 href="/dashboard/posts" 
                                 className="underline font-medium hover:text-blue-900 ml-1"
                                 target="_blank"
                               >
                                 Create job posts first
                               </a> or switch to custom mode.
                             </p>
                           </div>
                         )}
                         {selectedPostId && (
                           <div className="p-2 bg-green-50 border border-green-200 rounded text-sm text-green-800">
                             ✓ Job post selected. All fields have been populated. You can modify any field as needed.
                           </div>
                         )}
                       </div>
                     )}
                    {validationErrors.jobTitle && (
                      <p className="mt-1 text-sm text-red-600 flex items-center">
                        <Info className="w-4 h-4 mr-1" />
                        {validationErrors.jobTitle}
                      </p>
                    )}
                  </div>
                  {state.jobDetails.campaignType === "specific" && (
                    <div className="space-y-2">
                      <Label>
                        Application Deadline*
                      </Label>
                      <Input
                        type="date"
                        value={formatDateInput(
                          state.jobDetails.applicationDeadline ?? null
                        )}
                        onChange={(e) =>
                          handleInputChange(
                            "applicationDeadline",
                            e.target.value
                          )
                        }
                      />
                      {validationErrors.applicationDeadline && (
                        <div className="flex items-center gap-1 mt-1">
                          <Info className="w-4 h-4 mr-1 text-red-500" />
                          <span className="text-red-500 text-xs font-medium">
                            {validationErrors.applicationDeadline}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-6">
                  {state.jobDetails.campaignType === "specific" && (
                    <div className="space-y-2">
                      <Label
                        htmlFor="targetHireDate"
                        className="text-sm font-medium"
                      >
                        Target Hire Date*
                      </Label>
                      <Input
                        name="targetHireDate"
                        type="date"
                        value={state.jobDetails.targetHireDate || ""}
                        onChange={(e) =>
                          handleInputChange("targetHireDate", e.target.value)
                        }
                      />
                      {validationErrors.targetHireDate && (
                        <div className="text-red-600 text-sm mt-1 flex items-center gap-1">
                          <AlertCircle className="w-4 h-4 text-red-600" />
                          {validationErrors.targetHireDate}
                        </div>
                      )}
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="department" className="text-sm font-medium">
                      Department *
                    </Label>
                    <Select
                      value={state.jobDetails.department || ""}
                      onValueChange={(value) =>
                        handleInputChange("department", value)
                      }
                    >
                      <SelectTrigger
                        className={`h-11 ${
                          validationErrors.department
                            ? "border-red-300 focus:ring-red-500"
                            : ""
                        }`}
                      >
                        <SelectValue placeholder="Select department" />
                      </SelectTrigger>
                      <SelectContent>
                        {departments.map((dept) => (
                          <SelectItem key={dept} value={dept}>
                            {dept}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {validationErrors.department && (
                      <p className="mt-1 text-sm text-red-600 flex items-center">
                        <Info className="w-4 h-4 mr-1" />
                        {validationErrors.department}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label
                      htmlFor="location"
                      className="text-sm font-medium flex items-center gap-1"
                    >
                      <MapPin className="w-4 h-4" />
                      Location *
                    </Label>
                    <Input
                      id="location"
                      placeholder="e.g., San Francisco, CA"
                      value={state.jobDetails.location || ""}
                      onChange={(e) =>
                        handleInputChange("location", e.target.value)
                      }
                      className={`h-11 ${
                        validationErrors.location
                          ? "border-red-300 focus:ring-red-500"
                          : ""
                      }`}
                    />
                    {validationErrors.location && (
                      <p className="mt-1 text-sm text-red-600 flex items-center">
                        <Info className="w-4 h-4 mr-1" />
                        {validationErrors.location}
                      </p>
                    )}
                  </div>
                </div>

                {/* Work Arrangement */}
                <div className="space-y-4">
                  <h4 className="text-md font-medium text-gray-900">
                    Work Arrangement
                  </h4>
                  <div className="flex items-center gap-6">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="isRemote"
                        checked={state.jobDetails.isRemote}
                        onCheckedChange={(checked) =>
                          handleInputChange("isRemote", checked)
                        }
                      />
                      <Label htmlFor="isRemote" className="text-sm font-medium">
                        Remote Work
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="isHybrid"
                        checked={state.jobDetails.isHybrid}
                        onCheckedChange={(checked) =>
                          handleInputChange("isHybrid", checked)
                        }
                      />
                      <Label htmlFor="isHybrid" className="text-sm font-medium">
                        Hybrid Work
                      </Label>
                    </div>
                  </div>
                </div>
              </div>
              <Separator />

              {/* Education & Employment */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <GraduationCap className="w-5 h-5 text-purple-600" />
                  Education & Employment
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">
                      Experience Level *
                    </Label>
                    <Select
                      value={state.jobDetails.experienceLevel || ""}
                      onValueChange={(value) =>
                        handleInputChange("experienceLevel", value)
                      }
                    >
                      <SelectTrigger
                        className={`h-11 ${
                          validationErrors.experienceLevel
                            ? "border-red-300 focus:ring-red-500"
                            : ""
                        }`}
                      >
                        <SelectValue placeholder="Select level" />
                      </SelectTrigger>
                      <SelectContent>
                        {experienceLevels.map((level) => (
                          <SelectItem key={level} value={level}>
                            {level}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {validationErrors.experienceLevel && (
                      <p className="mt-1 text-sm text-red-600 flex items-center">
                        <Info className="w-4 h-4 mr-1" />
                        {validationErrors.experienceLevel}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">
                      Employee Type *
                    </Label>
                    <Select
                      value={state.jobDetails.employeeType || ""}
                      onValueChange={(value) =>
                        handleInputChange("employeeType", value)
                      }
                    >
                      <SelectTrigger
                        className={`h-11 ${
                          validationErrors.employeeType
                            ? "border-red-300 focus:ring-red-500"
                            : ""
                        }`}
                      >
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        {employeeTypes.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {validationErrors.employeeType && (
                      <p className="mt-1 text-sm text-red-600 flex items-center">
                        <Info className="w-4 h-4 mr-1" />
                        {validationErrors.employeeType}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      Number of Openings *
                    </Label>
                    <Input
                      type="number"
                      min="1"
                      value={state.jobDetails.numberOfOpenings || 1}
                      onChange={(e) =>
                        handleInputChange(
                          "numberOfOpenings",
                          parseInt(e.target.value) || 1
                        )
                      }
                      className={`h-11 ${
                        validationErrors.numberOfOpenings
                          ? "border-red-300 focus:ring-red-500"
                          : ""
                      }`}
                    />
                    {validationErrors.numberOfOpenings && (
                      <p className="mt-1 text-sm text-red-600 flex items-center">
                        <Info className="w-4 h-4 mr-1" />
                        {validationErrors.numberOfOpenings}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium flex items-center gap-1">
                      Course/ Degree
                    </Label>
                    <Input
                      type="text"
                      value={state.jobDetails.courseDegree || ""}
                      onChange={(e) => handleInputChange("courseDegree", e.target.value)}
                      className={`h-11 ${
                        validationErrors.courseDegree ? "border-red-300 focus:ring-red-500" : ""
                      }`}
                    />
                    {validationErrors.courseDegree && (
                      <p className="mt-1 text-sm text-red-600 flex items-center">
                        <Info className="w-4 h-4 mr-1" />
                        {validationErrors.courseDegree}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium flex items-center gap-1">
                      Specialization
                    </Label>
                    <Input
                      type="text"
                      value={state.jobDetails.specialization || ""}
                      onChange={(e) => handleInputChange("specialization", e.target.value)}
                      className={`h-11 ${
                        validationErrors.specialization ? "border-red-300 focus:ring-red-500" : ""
                      }`}
                    />
                    {validationErrors.specialization && (
                      <p className="mt-1 text-sm text-red-600 flex items-center">
                        <Info className="w-4 h-4 mr-1" />
                        {validationErrors.specialization}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <Separator />

              {/* Salary Range */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <CircleDollarSign className="w-5 h-5 text-purple-600" />
                  Salary Range
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Currency</Label>
                    <Select
                      value={state.jobDetails.currency || "INR"}
                      onValueChange={(value) =>
                        handleInputChange("currency", value)
                      }
                    >
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="Select currency" />
                      </SelectTrigger>
                      <SelectContent>
                        {CURRENCIES.map((currency) => (
                          <SelectItem key={currency.code} value={currency.code}>
                            {currency.code} - {currency.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">
                      Minimum Salary ({state.jobDetails.currency})
                    </Label>
                    <Input
                      type="number"
                      placeholder="e.g., 80000"
                      value={state.jobDetails.salaryMin || ""}
                      onChange={(e) =>
                        handleInputChange(
                          "salaryMin",
                          e.target.value ? parseInt(e.target.value) : undefined
                        )
                      }
                      className={`h-11 ${
                        validationErrors.salaryMin
                          ? "border-red-300 focus:ring-red-500"
                          : ""
                      }`}
                      disabled={!state.jobDetails.salaryNegotiable}
                    />
                    {validationErrors.salaryMin && (
                      <p className="mt-1 text-sm text-red-600 flex items-center">
                        <Info className="w-4 h-4 mr-1" />
                        {validationErrors.salaryMin}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">
                      Maximum Salary ({state.jobDetails.currency})
                    </Label>
                    <Input
                      type="number"
                      placeholder="e.g., 120000"
                      value={state.jobDetails.salaryMax || ""}
                      onChange={(e) =>
                        handleInputChange(
                          "salaryMax",
                          e.target.value ? parseInt(e.target.value) : undefined
                        )
                      }
                      className={`h-11 ${
                        validationErrors.salaryMax
                          ? "border-red-300 focus:ring-red-500"
                          : ""
                      }`}
                      disabled={!state.jobDetails.salaryNegotiable}
                    />
                    {validationErrors.salaryMax && (
                      <p className="mt-1 text-sm text-red-600 flex items-center">
                        <Info className="w-4 h-4 mr-1" />
                        {validationErrors.salaryMax}
                      </p>
                    )}
                  </div>
                </div>

                {/* Salary Negotiable Toggle */}
                <div className="flex items-center space-x-2 pt-2">
                  <Switch
                    id="salaryNegotiable"
                    checked={state.jobDetails.salaryNegotiable || false}
                    onCheckedChange={(checked) =>
                      handleInputChange("salaryNegotiable", checked)
                    }
                  />
                  <Label
                    htmlFor="salaryNegotiable"
                    className="text-sm font-medium"
                  >
                    Salary is negotiable
                  </Label>
                </div>
              </div>

              <Separator />

              {/* Job Description */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-purple-600" />
                  Job Description
                </h3>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">
                      Job Description Template
                    </Label>
                    <Select
                      value={selectedTemplate}
                      onValueChange={(value) => {
                        setSelectedTemplate(value);
                        const template = jobDescriptionTemplates.find(
                          (t) => t.id === value
                        );
                        if (template && template.templateContent) {
                          updateJobDetails({
                            jobDescription: template.templateContent,
                          });
                        }
                      }}
                    >
                      <SelectTrigger className="h-11">
                        <SelectValue
                          placeholder={
                            loadingTemplates
                              ? "Loading templates..."
                              : "Choose a template"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {jobDescriptionTemplates.map((template) => (
                          <SelectItem key={template.id} value={template.id}>
                            {template.templateName}
                          </SelectItem>
                        ))}
                        <SelectItem value="custom">Custom Template</SelectItem>
                      </SelectContent>
                    </Select>

                    {selectedTemplate && (
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setShowTemplatePreview(!showTemplatePreview)
                          }
                        >
                          {showTemplatePreview ? "Hide" : "Show"} Preview
                        </Button>
                        <Button variant="outline" size="sm">
                          Manage Templates
                        </Button>
                      </div>
                    )}

                    {showTemplatePreview &&
                      selectedTemplate &&
                      selectedTemplate !== "custom" && (
                        <div className="p-3 bg-gray-50 rounded-lg border">
                          <p className="text-sm text-gray-600">
                            {jobDescriptionTemplates.find(
                              (t) => t.id === selectedTemplate
                            )?.templateContent ||
                              "Template preview not available"}
                          </p>
                        </div>
                      )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">
                        Job Duties & Responsibilities
                      </Label>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={generateWithAI}
                          disabled={isGenerating || !state.jobDetails.jobTitle}
                          className="flex items-center gap-1"
                        >
                          <Sparkles className="w-4 h-4" />
                          {isGenerating ? (
                            <>
                              Generating...
                            </>
                          ) : (
                            <>Generate With AI</>
                          )}
                        </Button>
                        {state.campaignId && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={downloadJobDescriptionPDF}
                            className="flex items-center gap-1"
                          >
                            <Download className="w-4 h-4" />
                            Download PDF
                          </Button>
                        )}
                        <Button variant="outline" size="sm">
                          Customize
                        </Button>
                      </div>
                    </div>
                    <Textarea
                      placeholder="Enter job duties and responsibilities..."
                      value={state.jobDetails.jobDescription || ""}
                      onChange={(e) => {
                        updateJobDetails({ jobDescription: e.target.value });
                      }}
                      className={`min-h-[120px] resize-none ${
                        validationErrors.jobDescription
                          ? "border-red-300 focus:ring-red-500"
                          : ""
                      }`}
                    />
                    {validationErrors.jobDescription && (
                      <p className="mt-1 text-sm text-red-600 flex items-center">
                        <Info className="w-4 h-4 mr-1" />
                        {validationErrors.jobDescription}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex items-center justify-between mt-8"
        >
          <Button
            variant="outline"
            onClick={() => router.push("/dashboard")}
            className="flex items-center gap-2"
          >
            <X className="w-4 h-4" />
            Cancel
          </Button>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={saveDraft}
              className="flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              Save as Draft
            </Button>

            <Button
              onClick={handleContinue}
              disabled={!isFormValidMemo || isSaving}
              className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {saveProgress > 0 && (
                    <span className="ml-2">{saveProgress}%</span>
                  )}
                  Saving...
                </>
              ) : (
                <>
                  Continue to Interview Setup
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>

            {/* Validation errors display */}
            {!isFormValidMemo && (
              <div className="mt-2">
                {Object.keys(validationErrors).length > 0 ? (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm font-medium text-red-800 mb-2">
                      Please fix the following errors:
                    </p>
                    <ul className="text-sm text-red-700 space-y-1">
                      {Object.entries(validationErrors).map(
                        ([field, error]) => (
                          <li key={field} className="flex items-center gap-2">
                            <span className="w-2 h-2 bg-red-400 rounded-full"></span>
                            <span className="font-medium capitalize">
                              {field.replace(/([A-Z])/g, " $1")}:
                            </span>{" "}
                            {error}
                          </li>
                        )
                      )}
                    </ul>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      // Trigger validation to show errors
                      console.log("Current form data:", {
                        campaignName: state.jobDetails.campaignName,
                        jobTitle: state.jobDetails.jobTitle,
                        department: state.jobDetails.department,
                        location: state.jobDetails.location,
                        experienceLevel: state.jobDetails.experienceLevel,
                        employeeType: state.jobDetails.employeeType,
                        numberOfOpenings: state.jobDetails.numberOfOpenings,
                        salaryMin: state.jobDetails.salaryMin,
                        salaryMax: state.jobDetails.salaryMax,
                        jobDescription: state.jobDetails.jobDescription,
                        jobDuties: state.jobDetails.jobDuties,
                        requirements: state.jobDetails.requirements,
                        applicationDeadline:
                          state.jobDetails.applicationDeadline,
                        targetHireDate: state.jobDetails.targetHireDate,
                        benefits: state.jobDetails.benefits,
                        skills: state.jobDetails.skills,
                      });
                      const isValid = validateForm();
                      console.log("Validation result:", isValid);
                      console.log("Validation errors:", validationErrors);
                    }}
                    className="text-red-600 border-red-200 hover:bg-red-50"
                  >
                    <Info className="w-4 h-4 mr-2" />
                    Show what's missing
                  </Button>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}