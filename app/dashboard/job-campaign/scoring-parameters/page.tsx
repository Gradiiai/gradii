"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useJobCampaignStore } from "@/shared/store/jobCampaignStore";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/shared/card";
import { Button } from "@/components/ui/shared/button";
import { Input } from "@/components/ui/shared/input";
import { Label } from "@/components/ui/shared/label";
import { Badge } from "@/components/ui/shared/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/shared/switch";
import { Separator } from "@/components/ui/shared/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Plus,
  Trash2,
  ArrowRight,
  ArrowLeft,
  Settings,
  Target,
  Brain,
  Award,
  Loader2,
  AlertCircle,
  CheckCircle,
  GraduationCapIcon,
  Calendar,
  StarOff,
  Star,
  ZapIcon,
} from "lucide-react";
import { motion } from "framer-motion";
import {
  createScoringParameter,
  getScoringParameters,
} from "@/lib/database/queries/campaigns";
import { JobCampaignNavigation } from "@/components/job-campaign/JobCampaignNavigation";

interface ScoringParameter {
  id?: string;
  parameterType: "skill" | "competency" | "other";
  parameterName: string;
  proficiencyLevel?: "Beginner" | "Intermediate" | "Advanced" | "Expert";
  weight: number; // percentage
  isRequired?: boolean;
}

interface SkillSetup {
  skillTemplate: string;
  skills: ScoringParameter[];
}

interface CompetencySetup {
  competencyScoring: boolean;
  competencies: ScoringParameter[];
}

interface OtherScoring {
  parameters: ScoringParameter[];
}

interface SkillTemplate {
  id: string;
  name: string;
  category?: string;
}

const proficiencyLevels = ["Beginner", "Intermediate", "Advanced", "Expert"];

export default function ScoringParameters() {
  const router = useRouter();
  const { data: session } = useSession();
  const { state, setCurrentStep } = useJobCampaignStore();
  const { campaignId } = state;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [skillTemplates, setSkillTemplates] = useState<SkillTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);

  // Skill Setup State
  const [skillSetup, setSkillSetup] = useState<SkillSetup>({
    skillTemplate: "custom",
    skills: [],
  });

  // Competency Setup State
  const [competencySetup, setCompetencySetup] = useState<CompetencySetup>({
    competencyScoring: false,
    competencies: [
      {
        parameterType: "competency",
        parameterName: "",
        weight: 0,
      },
    ],
  });

  // Other Scoring State
  const [otherScoring, setOtherScoring] = useState<OtherScoring>({
    parameters: [
      {
        parameterType: "other",
        parameterName: "",
        weight: 0,
      },
    ],
  });

  // Toggle states for sections
  const [competencyScoringEnabled, setCompetencyScoringEnabled] = useState(false);
  const [educationExperienceEnabled, setEducationExperienceEnabled] = useState(false);
  const [otherScoringEnabled, setOtherScoringEnabled] = useState(false);

  // Fetch skill templates
  const fetchSkillTemplates = async () => {
    try {
      setLoadingTemplates(true);
      const response = await fetch("/api/content/skill-templates");
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // Filter out any empty or invalid templates
          const validTemplates = (data.data || []).filter(
            (template: SkillTemplate) =>
              template && template.id && template.name
          );
          setSkillTemplates([
            ...validTemplates,
            { id: "custom", name: "Custom Template" },
          ]);
        }
      }
    } catch (error) {
      console.error("Error fetching skill templates:", error);
      // Set default custom template on error
      setSkillTemplates([{ id: "custom", name: "Custom Template" }]);
    } finally {
      setLoadingTemplates(false);
    }
  };

  // Load existing scoring parameters
  useEffect(() => {
    fetchSkillTemplates();
    const loadScoringParameters = async () => {
      try {
        setLoading(true);
        setError(null);

        if (!campaignId) {
          setLoading(false);
          return;
        }

        const result = await getScoringParameters(campaignId);

        if (result.success && result.data && result.data.length > 0) {
          // Group parameters by type
          const skills = result.data.filter((p) => p.parameterType === "skill");
          const competencies = result.data.filter(
            (p) => p.parameterType === "competency"
          );
          const others = result.data.filter((p) => p.parameterType === "other");

          if (skills.length > 0) {
            setSkillSetup({
              skillTemplate: "custom",
              skills: skills.map((s) => ({
                id: s.id,
                parameterType: "skill",
                parameterName: s.parameterName,
                proficiencyLevel: s.proficiencyLevel as any,
                weight: s.weight,
              })),
            });
          } else {
            // Add default empty skill if none exist
            setSkillSetup((prev) => ({
              ...prev,
              skills:
                prev.skills.length === 0
                  ? [
                      {
                        parameterType: "skill",
                        parameterName: "",
                        proficiencyLevel: "Beginner",
                        weight: 0,
                      },
                    ]
                  : prev.skills,
            }));
          }

          if (competencies.length > 0) {
            setCompetencySetup({
              competencyScoring: true,
              competencies: competencies.map((c) => ({
                id: c.id,
                parameterType: "competency",
                parameterName: c.parameterName,
                weight: c.weight,
              })),
            });
          } else {
            // Add default empty competency if none exist
            setCompetencySetup((prev) => ({
              ...prev,
              competencies:
                prev.competencies.length === 0
                  ? [
                      {
                        parameterType: "competency",
                        parameterName: "",
                        weight: 0,
                      },
                    ]
                  : prev.competencies,
            }));
          }

          if (others.length > 0) {
            setOtherScoring({
              parameters: others.map((o) => ({
                id: o.id,
                parameterType: "other",
                parameterName: o.parameterName,
                weight: o.weight,
              })),
            });
          } else {
            // Add default empty other parameter if none exist
            setOtherScoring((prev) => ({
              parameters:
                prev.parameters.length === 0
                  ? [
                      {
                        parameterType: "other",
                        parameterName: "",
                        weight: 0,
                      },
                    ]
                  : prev.parameters,
            }));
          }
        } else {
          // Add default empty skill if no data exists
          setSkillSetup((prev) => ({
            ...prev,
            skills: [
              {
                parameterType: "skill",
                parameterName: "",
                proficiencyLevel: "Beginner",
                weight: 0,
              },
            ],
          }));

          // Add default empty competency if no data exists
          setCompetencySetup((prev) => ({
            ...prev,
            competencies: [
              {
                parameterType: "competency",
                parameterName: "",
                weight: 0,
              },
            ],
          }));

          // Add default empty other parameter if no data exists
          setOtherScoring((prev) => ({
            parameters: [
              {
                parameterType: "other",
                parameterName: "",
                weight: 0,
              },
            ],
          }));
        }
      } catch (err) {
        setError("Failed to load scoring parameters");
        console.error("Error loading scoring parameters:", err);
        // Add default empty skill even on error
        setSkillSetup((prev) => ({
          ...prev,
          skills:
            prev.skills.length === 0
              ? [
                  {
                    parameterType: "skill",
                    parameterName: "",
                    proficiencyLevel: "Beginner",
                    weight: 0,
                  },
                ]
              : prev.skills,
        }));

        // Add default empty competency even on error
        setCompetencySetup((prev) => ({
          ...prev,
          competencies:
            prev.competencies.length === 0
              ? [
                  {
                    parameterType: "competency",
                    parameterName: "",
                    weight: 0,
                  },
                ]
              : prev.competencies,
        }));

        // Add default empty other parameter even on error
        setOtherScoring((prev) => ({
          parameters:
            prev.parameters.length === 0
              ? [
                  {
                    parameterType: "other",
                    parameterName: "",
                    weight: 0,
                  },
                ]
              : prev.parameters,
        }));
      } finally {
        setLoading(false);
      }
    };

    if (campaignId) {
      loadScoringParameters();
    } else {
      // Add default empty skill when no campaign ID
      setSkillSetup((prev) => ({
        ...prev,
        skills:
          prev.skills.length === 0
            ? [
                {
                  parameterType: "skill",
                  parameterName: "",
                  proficiencyLevel: "Beginner",
                  weight: 0,
                },
              ]
            : prev.skills,
      }));

      // Add default empty competency when no campaign ID
      setCompetencySetup((prev) => ({
        ...prev,
        competencies:
          prev.competencies.length === 0
            ? [
                {
                  parameterType: "competency",
                  parameterName: "",
                  weight: 0,
                },
              ]
            : prev.competencies,
      }));

      // Add default empty other parameter when no campaign ID
      setOtherScoring((prev) => ({
        parameters:
          prev.parameters.length === 0
            ? [
                {
                  parameterType: "other",
                  parameterName: "",
                  weight: 0,
                },
              ]
            : prev.parameters,
      }));

      setLoading(false);
    }
  }, [campaignId]);

  const addSkill = () => {
    setSkillSetup((prev) => ({
      ...prev,
      skills: [
        ...prev.skills,
        {
          parameterType: "skill",
          parameterName: "",
          proficiencyLevel: "Beginner",
          weight: 0,
        },
      ],
    }));
  };

  const removeSkill = (index: number) => {
    setSkillSetup((prev) => ({
      ...prev,
      skills: prev.skills.filter((_, i) => i !== index),
    }));
  };

  const updateSkill = (
    index: number,
    field: keyof ScoringParameter,
    value: any
  ) => {
    setSkillSetup((prev) => ({
      ...prev,
      skills: prev.skills.map((skill, i) =>
        i === index ? { ...skill, [field]: value } : skill
      ),
    }));
  };

  const addCompetency = () => {
    setCompetencySetup((prev) => ({
      ...prev,
      competencies: [
        ...prev.competencies,
        {
          parameterType: "competency",
          parameterName: "",
          weight: 0,
        },
      ],
    }));
  };

  const removeCompetency = (index: number) => {
    setCompetencySetup((prev) => ({
      ...prev,
      competencies: prev.competencies.filter((_, i) => i !== index),
    }));
  };

  const updateCompetency = (
    index: number,
    field: keyof ScoringParameter,
    value: any
  ) => {
    setCompetencySetup((prev) => ({
      ...prev,
      competencies: prev.competencies.map((comp, i) =>
        i === index ? { ...comp, [field]: value } : comp
      ),
    }));
  };

  const addOtherParameter = () => {
    setOtherScoring((prev) => ({
      ...prev,
      parameters: [
        ...prev.parameters,
        {
          parameterType: "other",
          parameterName: "",
          weight: 0,
        },
      ],
    }));
  };

  const removeOtherParameter = (index: number) => {
    setOtherScoring((prev) => ({
      ...prev,
      parameters: prev.parameters.filter((_, i) => i !== index),
    }));
  };

  const updateOtherParameter = (
    index: number,
    field: keyof ScoringParameter,
    value: any
  ) => {
    setOtherScoring((prev) => ({
      ...prev,
      parameters: prev.parameters.map((param, i) =>
        i === index ? { ...param, [field]: value } : param
      ),
    }));
  };

  // Calculate available weight for skills
  const getAvailableWeightOptions = (currentIndex: number, currentWeight: number, sectionType: 'skill' | 'competency' | 'other') => {
    let usedWeight = 0;
    
    if (sectionType === 'skill') {
      skillSetup.skills.forEach((skill, index) => {
        if (index !== currentIndex) {
          usedWeight += skill.weight;
        }
      });
    } else if (sectionType === 'competency') {
      competencySetup.competencies.forEach((competency, index) => {
        if (index !== currentIndex) {
          usedWeight += competency.weight;
        }
      });
    } else if (sectionType === 'other') {
      otherScoring.parameters.forEach((param, index) => {
        if (index !== currentIndex) {
          usedWeight += param.weight;
        }
      });
    }

    const maxAvailable = 100 - usedWeight;
    const weightOptions = [];
    
    for (let weight = 10; weight <= 100; weight += 10) {
      if (weight <= maxAvailable || weight === currentWeight) {
        weightOptions.push(weight);
      }
    }
    
    return weightOptions;
  };

  // Check if weightage is fully allocated for a section
  const isWeightageFullyAllocated = (sectionType: 'skill' | 'competency' | 'other') => {
    let totalWeight = 0;
    
    if (sectionType === 'skill') {
      totalWeight = skillSetup.skills.reduce((sum, skill) => sum + skill.weight, 0);
    } else if (sectionType === 'competency') {
      totalWeight = competencySetup.competencies.reduce((sum, comp) => sum + comp.weight, 0);
    } else if (sectionType === 'other') {
      totalWeight = otherScoring.parameters.reduce((sum, param) => sum + param.weight, 0);
    }
    
    return totalWeight >= 100;
  };

  const handleSubmit = async () => {
    try {
      setSaving(true);
      setError(null);

      if (!campaignId) {
        setError(
          "Campaign ID not found. Please go back to the job details page."
        );
        return;
      }

      // Collect all parameters only from enabled sections
      const allParameters: ScoringParameter[] = [
        ...skillSetup.skills,
        ...(competencyScoringEnabled ? competencySetup.competencies : []),
        ...(otherScoringEnabled ? otherScoring.parameters : []),
      ];

      // Validate parameters
      const validParameters = allParameters.filter(
        (p) => p.parameterName.trim() && p.weight > 0
      );

      if (validParameters.length === 0) {
        setError(
          "Please add at least one scoring parameter with a name and weight."
        );
        return;
      }

      // Save parameters to database
      const results = [];
      for (const param of validParameters) {
        const result = await createScoringParameter({
          campaignId,
          parameterType: param.parameterType,
          parameterName: param.parameterName,
          weight: param.weight,
          proficiencyLevel: param.proficiencyLevel,
          isRequired: param.isRequired || false,
        });
        results.push(result);
      }

      const allSuccessful = results.every((result) => result.success);

      if (allSuccessful) {
        // Move to next step
        setCurrentStep(4);
        router.push("/dashboard/job-campaign/success");
      } else {
        setError("Failed to save some scoring parameters");
      }
    } catch (err) {
      setError("Failed to save scoring parameters");
      console.error("Error saving scoring parameters:", err);
    } finally {
      setSaving(false);
    }
  };

  const isFormValid = () => {
    const allParameters = [
      ...skillSetup.skills,
      ...(competencyScoringEnabled ? competencySetup.competencies : []),
      ...(otherScoringEnabled ? otherScoring.parameters : []),
    ];
    return allParameters.some((p) => p.parameterName.trim() && p.weight > 0);
  };

  if (loading) {
    return (
      <div className="min-h-screen p-6">
        <div className="max-w-6xl mx-auto">
          {/* Header Skeleton */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-8"
          >
            {/* Navigation Skeleton */}
            <div className="mb-6">
              <div className="h-12 bg-gray-200 rounded-lg animate-pulse"></div>
            </div>
          </motion.div>

          {/* Main Card Skeleton */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
              <CardContent className="space-y-6 pt-6">
                {/* Title and Progress Skeleton */}
                <div className="space-y-4">
                  <div className="h-6 w-48 bg-gray-200 rounded animate-pulse"></div>
                  <div className="flex items-center justify-between gap-4 pb-4 border-b border-gray-200">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="h-4 w-20 bg-gray-200 rounded animate-pulse"></div>
                      <div className="h-1 w-60 bg-gray-200 rounded animate-pulse"></div>
                    </div>
                  </div>
                </div>

                {/* Skill Setup Skeleton */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 bg-gray-200 rounded animate-pulse"></div>
                    <div className="h-5 w-24 bg-gray-200 rounded animate-pulse"></div>
                  </div>

                  <div className="space-y-4">
                    {/* Skill Template Dropdown Skeleton */}
                    <div>
                      <div className="h-4 w-32 bg-gray-200 rounded animate-pulse mb-3"></div>
                      <div className="h-11 bg-gray-200 rounded animate-pulse"></div>
                    </div>

                    {/* Skills Table Skeleton */}
                    <div className="border rounded-lg overflow-hidden">
                      <div className="bg-purple-100 border-b p-3">
                        <div className="flex">
                          <div className="w-[40%] pr-3">
                            <div className="h-4 w-12 bg-gray-300 rounded animate-pulse"></div>
                          </div>
                          <div className="w-[30%] pr-3">
                            <div className="h-4 w-20 bg-gray-300 rounded animate-pulse"></div>
                          </div>
                          <div className="w-[30%] pr-3">
                            <div className="h-4 w-16 bg-gray-300 rounded animate-pulse"></div>
                          </div>
                          <div className="w-[10%]">
                            <div className="h-6 w-6 bg-gray-300 rounded animate-pulse mx-auto"></div>
                          </div>
                        </div>
                      </div>
                      {[1, 2].map((i) => (
                        <div key={i} className="border-b border-gray-200 p-3">
                          <div className="flex">
                            <div className="w-[40%] pr-3">
                              <div className="h-9 bg-gray-200 rounded animate-pulse"></div>
                            </div>
                            <div className="w-[30%] pr-3">
                              <div className="h-9 bg-gray-200 rounded animate-pulse"></div>
                            </div>
                            <div className="w-[30%] pr-3">
                              <div className="h-9 bg-gray-200 rounded animate-pulse"></div>
                            </div>
                            <div className="w-[10%]">
                              <div className="h-8 w-8 bg-gray-200 rounded animate-pulse mx-auto"></div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Separator */}
                <div className="border-t border-gray-200"></div>

                {/* Competency Skeleton */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 bg-gray-200 rounded animate-pulse"></div>
                      <div className="h-5 w-36 bg-gray-200 rounded animate-pulse"></div>
                    </div>
                    <div className="w-12 h-6 bg-gray-200 rounded-full animate-pulse"></div>
                  </div>
                </div>

                {/* Separator */}
                <div className="border-t border-gray-200"></div>

                {/* Education & Experience Skeleton */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 bg-gray-200 rounded animate-pulse"></div>
                      <div className="h-5 w-44 bg-gray-200 rounded animate-pulse"></div>
                    </div>
                    <div className="w-12 h-6 bg-gray-200 rounded-full animate-pulse"></div>
                  </div>
                </div>

                {/* Separator */}
                <div className="border-t border-gray-200"></div>

                {/* Other Scoring Skeleton */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 bg-gray-200 rounded animate-pulse"></div>
                      <div className="h-5 w-28 bg-gray-200 rounded animate-pulse"></div>
                    </div>
                    <div className="w-12 h-6 bg-gray-200 rounded-full animate-pulse"></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Navigation Skeleton */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex justify-between mt-8"
          >
            <div className="h-10 w-44 bg-gray-200 rounded animate-pulse"></div>
            <div className="flex gap-3">
              <div className="h-10 w-28 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-10 w-32 bg-gray-200 rounded animate-pulse"></div>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-6xl mx-auto">
        {/* Error Alert */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          {/* 2. Job Campaign Navigation */}
          <div className="mb-6">
            <JobCampaignNavigation />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
            <CardContent className="space-y-4 pt-6">
              <h2 className="text-xl font-medium text-gray-900">
                Scoring Parameters
              </h2>
              {/* Step Progress */}
              <div className="flex items-center justify-between gap-4 pb-4 border-b border-gray-200">
                <div className="flex items-center gap-4 flex-1">
                  <p className="text-gray-600 whitespace-nowrap">
                    Step 3 of 5
                  </p>
                  <Progress
                    value={60}
                    className="h-1 w-60 [&>div]:bg-purple-600"
                  />
                </div>
              </div>

              {/* Skill Setup */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Star className="w-5 h-5 text-purple-600" />
                  <h3 className="text-lg font-semibold text-gray-900">
                    Skill Setup
                  </h3>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label
                      htmlFor="skill-template"
                      className="text-sm font-medium mb-3 block"
                    >
                      Skill Template
                    </Label>
                    <Select
                      value={skillSetup.skillTemplate}
                      onValueChange={(value) =>
                        setSkillSetup((prev) => ({
                          ...prev,
                          skillTemplate: value,
                        }))
                      }
                      disabled={loadingTemplates}
                    >
                      <SelectTrigger className="h-11">
                        <SelectValue
                          placeholder={
                            loadingTemplates
                              ? "Loading templates..."
                              : "Choose a Skill Template"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {skillTemplates.map((template) => (
                          <SelectItem key={template.id} value={template.id}>
                            {template.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-3 mt-3">
                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full">
                        <thead className="bg-purple-100 border-b">
                          <tr>
                            <th className="text-left text-md p-3 font-medium text-gray-700 w-[40%] border-r border-gray-200">
                              Skills
                            </th>
                            <th className="text-left text-md p-3 font-medium text-gray-700 w-[30%] border-r border-gray-200">
                              Proficiency
                            </th>
                            <th className="text-left text-md p-3 font-medium text-gray-700 w-[30%] border-r border-gray-200">
                              Weightage
                            </th>
                            <th className="text-center p-3 font-medium text-purple-700 w-[10%]">
                              <Button
                                type="button"
                                size="sm"
                                onClick={addSkill}
                                className="flex items-center gap-1 bg-transparent text-purple-600 hover:text-purple-800 hover:bg-transparent"
                              >
                                <Plus className="w-4 h-4 text-purple-600" />
                              </Button>
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {skillSetup.skills.map((skill, index) => (
                            <tr
                              key={index}
                              className="border-b border-gray-200"
                            >
                              <td className="p-3 border-r border-gray-200">
                                <Input
                                  value={skill.parameterName}
                                  onChange={(e) =>
                                    updateSkill(
                                      index,
                                      "parameterName",
                                      e.target.value
                                    )
                                  }
                                  placeholder="Enter skill name"
                                  className="border border-gray-200 bg-transparent focus:bg-white focus:border focus:border-gray-400"
                                />
                              </td>
                              <td className="p-3 border-r border-gray-200">
                                <Select
                                  value={skill.proficiencyLevel}
                                  onValueChange={(value) =>
                                    updateSkill(
                                      index,
                                      "proficiencyLevel",
                                      value
                                    )
                                  }
                                >
                                  <SelectTrigger className="border border-gray-200 bg-transparent focus:bg-white focus:border focus:border-gray-200">
                                    <SelectValue placeholder="Select level" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {[
                                      "Beginner",
                                      "Intermediate",
                                      "Advanced",
                                    ].map((level) => (
                                      <SelectItem key={level} value={level}>
                                        {level}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </td>
                              <td className="p-3 border-r border-gray-200">
                                <Select
                                  value={skill.weight.toString()}
                                  onValueChange={(value) =>
                                    updateSkill(
                                      index,
                                      "weight",
                                      parseInt(value)
                                    )
                                  }
                                >
                                  <SelectTrigger className="border border-gray-200 bg-transparent focus:bg-white focus:border focus:border-gray-200">
                                    <SelectValue placeholder="Weight" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {getAvailableWeightOptions(index, skill.weight, 'skill').length > 0 ? (
                                      getAvailableWeightOptions(index, skill.weight, 'skill').map((weight) => (
                                        <SelectItem key={weight} value={weight.toString()}>
                                          {weight}%
                                        </SelectItem>
                                      ))
                                    ) : (
                                      <div className="px-3 py-2 text-sm text-red-600 text-center">
                                        100% weightage already allocated
                                      </div>
                                    )}
                                  </SelectContent>
                                </Select>
                              </td>
                              <td className="p-3 text-center">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeSkill(index)}
                                  className="text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100"
                                  disabled={skillSetup.skills.length === 1}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Competency Scoring */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Award className="w-5 h-5 text-purple-600" />
                    <h3 className="text-lg font-semibold text-gray-900">
                      Competency Scoring
                    </h3>
                  </div>
                  <Switch
                    checked={competencyScoringEnabled}
                    onCheckedChange={setCompetencyScoringEnabled}
                    className="data-[state=checked]:bg-purple-600"
                  />
                </div>

                {competencyScoringEnabled && (
                  <div className="space-y-3 mt-3">
                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full">
                        <thead className="bg-purple-100 border-b">
                          <tr>
                            <th className="text-left text-md p-3 font-medium text-gray-700 w-[68%] border-r border-gray-200">
                              Competency Name
                            </th>
                            <th className="text-left text-md p-3 font-medium text-gray-700 w-[29%] border-r border-gray-200">
                              Weightage
                            </th>
                            <th className="text-center p-3 font-medium text-purple-700 w-[10%]">
                              <Button
                                type="button"
                                size="sm"
                                onClick={addCompetency}
                                className="flex items-center gap-1 bg-transparent text-purple-600 hover:text-purple-800 hover:bg-transparent"
                              >
                                <Plus className="w-4 h-4 text-purple-600" />
                              </Button>
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {competencySetup.competencies.map(
                            (competency, index) => (
                              <tr
                                key={index}
                                className="border-b border-gray-200"
                              >
                                <td className="p-3 border-r border-gray-200">
                                  <Input
                                    value={competency.parameterName}
                                    onChange={(e) =>
                                      updateCompetency(
                                        index,
                                        "parameterName",
                                        e.target.value
                                      )
                                    }
                                    placeholder="Enter competency name"
                                    className="border border-gray-200 bg-transparent focus:bg-white focus:border focus:border-gray-400"
                                  />
                                </td>
                                <td className="p-3 border-r border-gray-200">
                                  <Select
                                    value={competency.weight.toString()}
                                    onValueChange={(value) =>
                                      updateCompetency(
                                        index,
                                        "weight",
                                        parseInt(value)
                                      )
                                    }
                                  >
                                    <SelectTrigger className="border border-gray-200 bg-transparent focus:bg-white focus:border focus:border-gray-200">
                                      <SelectValue placeholder="Weight" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {getAvailableWeightOptions(index, competency.weight, 'competency').length > 0 ? (
                                        getAvailableWeightOptions(index, competency.weight, 'competency').map((weight) => (
                                          <SelectItem key={weight} value={weight.toString()}>
                                            {weight}%
                                          </SelectItem>
                                        ))
                                      ) : (
                                        <div className="px-3 py-2 text-sm text-red-600 text-center">
                                          100% weightage already allocated
                                        </div>
                                      )}
                                    </SelectContent>
                                  </Select>
                                </td>
                                <td className="p-3 text-center">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeCompetency(index)}
                                    className="text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100"
                                    disabled={
                                      competencySetup.competencies.length === 1
                                    }
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </td>
                              </tr>
                            )
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              <Separator />

              {/* Education & Experience */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <GraduationCapIcon className="w-5 h-5 text-purple-600" />
                    <h3 className="text-lg font-semibold text-gray-900">
                      Education & Experience
                    </h3>
                  </div>
                  <Switch
                    checked={educationExperienceEnabled}
                    onCheckedChange={setEducationExperienceEnabled}
                    className="data-[state=checked]:bg-purple-600"
                  />
                </div>

                {educationExperienceEnabled && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label
                          htmlFor="education-weightage"
                          className="text-sm font-medium mb-2 block"
                        >
                          Education Weightage
                        </Label>
                        <Select
                        // value={educationExperience.educationWeightage.toString()}
                        // onValueChange={(value) =>
                        //   setEducationExperience((prev) => ({
                        //     ...prev,
                        //     educationWeightage: parseInt(value),
                        //   }))
                        // }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="10%" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="10">10%</SelectItem>
                            <SelectItem value="20">20%</SelectItem>
                            <SelectItem value="30">30%</SelectItem>
                            <SelectItem value="40">40%</SelectItem>
                            <SelectItem value="50">50%</SelectItem>
                            <SelectItem value="60">60%</SelectItem>
                            <SelectItem value="70">70%</SelectItem>
                            <SelectItem value="80">80%</SelectItem>
                            <SelectItem value="90">90%</SelectItem>
                            <SelectItem value="100">100%</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label
                          htmlFor="experience-weightage"
                          className="text-sm font-medium mb-2 block"
                        >
                          Experience Weightage
                        </Label>
                        <Select
                        // value={educationExperience.experienceWeightage.toString()}
                        // onValueChange={(value) =>
                        //   setEducationExperience((prev) => ({
                        //     ...prev,
                        //     experienceWeightage: parseInt(value),
                        //   }))
                        // }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="10%" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="10">10%</SelectItem>
                            <SelectItem value="20">20%</SelectItem>
                            <SelectItem value="30">30%</SelectItem>
                            <SelectItem value="40">40%</SelectItem>
                            <SelectItem value="50">50%</SelectItem>
                            <SelectItem value="60">60%</SelectItem>
                            <SelectItem value="70">70%</SelectItem>
                            <SelectItem value="80">80%</SelectItem>
                            <SelectItem value="90">90%</SelectItem>
                            <SelectItem value="100">100%</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <Separator />

              {/* Other Scoring */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ZapIcon className="w-5 h-5 text-purple-600" />
                    <h3 className="text-lg font-semibold text-gray-900">
                      Other Scoring
                    </h3>
                  </div>
                  <Switch
                    checked={otherScoringEnabled}
                    onCheckedChange={setOtherScoringEnabled}
                    className="data-[state=checked]:bg-purple-600"
                  />
                </div>

                {otherScoringEnabled && (
                  <div className="space-y-3 mt-3">
                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full">
                        <thead className="bg-purple-100 border-b">
                          <tr>
                            <th className="text-left text-md p-3 font-medium text-gray-700 w-[68%] border-r border-gray-200">
                              Parameter Name
                            </th>
                            <th className="text-left text-md p-3 font-medium text-gray-700 w-[29%] border-r border-gray-200">
                              Weightage
                            </th>
                            <th className="text-center p-3 font-medium text-purple-700 w-[10%]">
                              <Button
                                type="button"
                                size="sm"
                                onClick={addOtherParameter}
                                className="flex items-center gap-1 bg-transparent text-purple-600 hover:text-purple-800 hover:bg-transparent"
                              >
                                <Plus className="w-4 h-4 text-purple-600" />
                              </Button>
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {otherScoring.parameters.map((parameter, index) => (
                            <tr key={index} className="border-b border-gray-200">
                              <td className="p-3 border-r border-gray-200">
                                <Input
                                  value={parameter.parameterName}
                                  onChange={(e) =>
                                    updateOtherParameter(
                                      index,
                                      "parameterName",
                                      e.target.value
                                    )
                                  }
                                  placeholder="Enter parameter name"
                                  className="border border-gray-200 bg-transparent focus:bg-white focus:border focus:border-gray-400"
                                />
                              </td>
                              <td className="p-3 border-r border-gray-200">
                                <Select
                                  value={parameter.weight.toString()}
                                  onValueChange={(value) =>
                                    updateOtherParameter(
                                      index,
                                      "weight",
                                      parseInt(value)
                                    )
                                  }
                                >
                                  <SelectTrigger className="border border-gray-200 bg-transparent focus:bg-white focus:border focus:border-gray-200">
                                    <SelectValue placeholder="Weight" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {getAvailableWeightOptions(index, parameter.weight, 'other').length > 0 ? (
                                      getAvailableWeightOptions(index, parameter.weight, 'other').map((weight) => (
                                        <SelectItem key={weight} value={weight.toString()}>
                                          {weight}%
                                        </SelectItem>
                                      ))
                                    ) : (
                                      <div className="px-3 py-2 text-sm text-red-600 text-center">
                                        100% weightage already allocated
                                      </div>
                                    )}
                                  </SelectContent>
                                </Select>
                              </td>
                              <td className="p-3 text-center">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeOtherParameter(index)}
                                  className="text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100"
                                  disabled={otherScoring.parameters.length === 1}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Navigation */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex justify-between mt-8"
        >
          <Button
            variant="outline"
            onClick={() =>
              router.push("/dashboard/job-campaign/interview-setup")
            }
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Interview Setup
          </Button>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={handleSubmit}
              disabled={!isFormValid() || saving}
              className="flex items-center gap-2"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4" />
              )}
              {saving ? "Saving..." : "Save as draft"}
            </Button>

            <Button
              onClick={handleSubmit}
              disabled={!isFormValid() || saving}
              className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ArrowRight className="w-4 h-4" />
              )}
              {saving ? "Saving..." : "Submit & Next"}
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
