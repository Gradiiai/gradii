"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/shared/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/shared/card";
import { Input } from "@/components/ui/shared/input";
import { Label } from "@/components/ui/shared/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/shared/switch";
import { toast } from "sonner";

interface Post {
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
  currency?: string;
  isRemote?: boolean;
  isHybrid?: boolean;
  salaryNegotiable?: boolean;
  courseDegree?: string;
  specialization?: string;
}

const employeeTypes = ["Full-time", "Part-time", "Contract", "Internship"];
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
const experienceLevels = [
  "Entry Level (0-2 years)",
  "Mid Level (3-5 years)",
  "Senior Level (6-10 years)",
  "Lead/Principal (10+ years)",
  "Executive/Director (15+ years)",
];

export default function PostsPage() {
  const { data: session } = useSession();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState<Partial<Post>>({ currency: "INR" });
  const [submitting, setSubmitting] = useState(false);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/content/posts`);
      const data = await res.json();
      if (data.success) setPosts(data.data);
    } catch (e) {
      toast.error("Failed to load posts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, [session?.user?.companyId]);

  const createPost = async () => {
    if (!form.title || !form.department || !form.location || !form.employeeType) {
      toast.error("Please fill required fields");
      return;
    }
    try {
      setSubmitting(true);
      const res = await fetch("/api/content/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success("Post created");
        setForm({ currency: form.currency || "INR" });
        fetchPosts();
      } else {
        toast.error(data.error || "Failed to create post");
      }
    } catch (e) {
      toast.error("Failed to create post");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="ml-2 text-sm sm:text-base text-gray-600">
            Loading posts...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-xl sm:text-2xl font-medium text-gray-900">Job Posts</h1>
        <p className="text-sm sm:text-base text-gray-600 mt-1">
          Create and manage your job postings
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl font-medium">Create New Post</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 sm:space-y-6">
          {/* Basic Information */}
          <div>
            <h3 className="text-base font-medium text-gray-900 mb-3">Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              <div className="space-y-1 sm:space-y-2">
                <Label className="text-sm font-medium text-gray-700">Job Title *</Label>
                <Input 
                  value={form.title || ""} 
                  onChange={(e) => setForm({ ...form, title: e.target.value })} 
                  placeholder="e.g. Senior Software Engineer"
                  className="w-full"
                />
              </div>
              <div className="space-y-1 sm:space-y-2">
                <Label className="text-sm font-medium text-gray-700">Department *</Label>
                <Select value={form.department || ""} onValueChange={(v) => setForm({ ...form, department: v })}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((d) => (
                      <SelectItem key={d} value={d}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1 sm:space-y-2">
                <Label className="text-sm font-medium text-gray-700">Location *</Label>
                <Input 
                  value={form.location || ""} 
                  onChange={(e) => setForm({ ...form, location: e.target.value })} 
                  placeholder="e.g. Mumbai, India"
                  className="w-full"
                />
              </div>
            </div>
          </div>

          {/* Employment Details */}
          <div>
            <h3 className="text-base font-medium text-gray-900 mb-3">Employment Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              <div className="space-y-1 sm:space-y-2">
                <Label className="text-sm font-medium text-gray-700">Experience Level</Label>
                <Select value={form.experienceLevel || ""} onValueChange={(v) => setForm({ ...form, experienceLevel: v })}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select experience level" />
                  </SelectTrigger>
                  <SelectContent>
                    {experienceLevels.map((lvl) => (
                      <SelectItem key={lvl} value={lvl}>{lvl}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1 sm:space-y-2">
                <Label className="text-sm font-medium text-gray-700">Employment Type *</Label>
                <Select value={form.employeeType || ""} onValueChange={(v) => setForm({ ...form, employeeType: v })}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select employment type" />
                  </SelectTrigger>
                  <SelectContent>
                    {employeeTypes.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1 sm:space-y-2">
                <Label className="text-sm font-medium text-gray-700">Currency</Label>
                <Input 
                  value={form.currency || "INR"} 
                  onChange={(e) => setForm({ ...form, currency: e.target.value })} 
                  placeholder="INR"
                  className="w-full"
                />
              </div>
            </div>
          </div>

          {/* Qualifications */}
          <div>
            <h3 className="text-base font-medium text-gray-900 mb-3">Qualifications</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              <div className="space-y-1 sm:space-y-2">
                <Label className="text-sm font-medium text-gray-700">Course/Degree</Label>
                <Input 
                  value={form.courseDegree || ""} 
                  onChange={(e) => setForm({ ...form, courseDegree: e.target.value })} 
                  placeholder="e.g. B.Tech, MBA"
                  className="w-full"
                />
              </div>
              <div className="space-y-1 sm:space-y-2">
                <Label className="text-sm font-medium text-gray-700">Specialization</Label>
                <Input 
                  value={form.specialization || ""} 
                  onChange={(e) => setForm({ ...form, specialization: e.target.value })} 
                  placeholder="e.g. Computer Science, Marketing"
                  className="w-full"
                />
              </div>
            </div>
          </div>

          {/* Work Arrangement & Compensation */}
          <div>
            <h3 className="text-base font-medium text-gray-900 mb-3">Work Arrangement & Compensation</h3>
            
            {/* Work Arrangement Switches */}
            <div className="space-y-3 sm:space-y-4 mb-6 sm:mb-6">
                <div className="flex flex-wrap gap-3 sm:gap-6">
                  <div className="flex items-center space-x-2">
                    <Switch 
                      id="isRemote" 
                      checked={!!form.isRemote} 
                      onCheckedChange={(checked) => setForm({ ...form, isRemote: checked })} 
                      className="data-[state=checked]:bg-purple-600"
                    />
                    <Label htmlFor="isRemote" className="text-sm text-gray-600">Remote Work Available</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch 
                      id="isHybrid" 
                      checked={!!form.isHybrid} 
                      onCheckedChange={(checked) => setForm({ ...form, isHybrid: checked })} 
                      className="data-[state=checked]:bg-purple-600"
                    />
                    <Label htmlFor="isHybrid" className="text-sm text-gray-600">Hybrid Work Available</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch 
                      id="salaryNegotiable" 
                      checked={!!form.salaryNegotiable} 
                      onCheckedChange={(checked) => setForm({ ...form, salaryNegotiable: checked })} 
                      className="data-[state=checked]:bg-purple-600"
                    />
                    <Label htmlFor="salaryNegotiable" className="text-sm text-gray-600">
                      Salary is negotiable
                    </Label>
                  </div>
                </div>

              {/* Salary Section */}
              <div>
                {!form.salaryNegotiable && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div className="space-y-1 sm:space-y-2">
                      <Label className="text-sm font-medium text-gray-700">Minimum Salary</Label>
                      <Input 
                        type="number" 
                        value={form.salaryMin ?? ""} 
                        onChange={(e) => setForm({ ...form, salaryMin: e.target.value ? Number(e.target.value) : undefined })} 
                        placeholder="e.g. 500000"
                        className="w-full"
                      />
                    </div>
                    <div className="space-y-1 sm:space-y-2">
                      <Label className="text-sm font-medium text-gray-700">Maximum Salary</Label>
                      <Input 
                        type="number" 
                        value={form.salaryMax ?? ""} 
                        onChange={(e) => setForm({ ...form, salaryMax: e.target.value ? Number(e.target.value) : undefined })} 
                        placeholder="e.g. 800000"
                        className="w-full"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end pt-4 border-t">
            <Button 
              onClick={createPost} 
              disabled={submitting}
              className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white"
            >
              {submitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Creating Post...
                </>
              ) : (
                'Create Job Post'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Existing Posts Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl font-medium">Published Posts</CardTitle>
          <p className="text-sm text-gray-600 mt-1">
            {posts.length > 0 ? `${posts.length} job post${posts.length === 1 ? '' : 's'} published` : 'No posts published yet'}
          </p>
        </CardHeader>
        <CardContent>
          {posts.length === 0 ? (
            <div className="text-center py-8 sm:py-12">
              <div className="text-gray-400 mb-4">
                <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-sm sm:text-base font-medium text-gray-900 mb-2">
                No job posts yet
              </h3>
              <p className="text-xs sm:text-sm text-gray-600">
                Create your first job post using the form above to start attracting candidates.
              </p>
            </div>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {posts.map((post) => (
                <div key={post.id} className="border rounded-lg p-4 sm:p-6 hover:shadow-sm transition-shadow bg-white">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
                    <div className="flex-1">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-4 mb-3">
                        <div>
                          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-1">{post.title}</h3>
                          <div className="flex flex-wrap gap-2 text-xs sm:text-sm text-gray-600">
                            <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded-md">{post.department}</span>
                            <span className="flex items-center gap-1">
                              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                              {post.location}
                            </span>
                            <span className="bg-green-50 text-green-700 px-2 py-1 rounded-md">{post.employeeType}</span>
                          </div>
                        </div>
                      </div>

                      {/* Additional Details */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs sm:text-sm text-gray-600">
                        {post.experienceLevel && (
                          <div className="flex items-center gap-2">
                            <span className="font-medium">Experience:</span>
                            <span>{post.experienceLevel}</span>
                          </div>
                        )}
                        {(post.salaryMin || post.salaryMax) && !post.salaryNegotiable && (
                          <div className="flex items-center gap-2">
                            <span className="font-medium">Salary:</span>
                            <span>
                              {post.salaryMin && post.salaryMax 
                                ? `${post.currency || 'INR'} ${post.salaryMin.toLocaleString()} - ${post.salaryMax.toLocaleString()}`
                                : post.salaryMin 
                                ? `${post.currency || 'INR'} ${post.salaryMin.toLocaleString()}+`
                                : `Up to ${post.currency || 'INR'} ${post.salaryMax?.toLocaleString()}`
                              }
                            </span>
                          </div>
                        )}
                        {post.salaryNegotiable && (
                          <div className="flex items-center gap-2">
                            <span className="font-medium">Salary:</span>
                            <span className="text-orange-600">Negotiable</span>
                          </div>
                        )}
                        {(post.isRemote || post.isHybrid) && (
                          <div className="flex items-center gap-2">
                            <span className="font-medium">Work Style:</span>
                            <div className="flex gap-1">
                              {post.isRemote && <span className="bg-purple-50 text-purple-700 px-2 py-0.5 rounded">Remote</span>}
                              {post.isHybrid && <span className="bg-orange-50 text-orange-700 px-2 py-0.5 rounded">Hybrid</span>}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Qualifications */}
                      {(post.courseDegree || post.specialization) && (
                        <div className="mt-3 pt-3 border-t border-gray-100">
                          <div className="text-xs sm:text-sm text-gray-600">
                            {post.courseDegree && (
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium">Degree:</span>
                                <span>{post.courseDegree}</span>
                              </div>
                            )}
                            {post.specialization && (
                              <div className="flex items-center gap-2">
                                <span className="font-medium">Specialization:</span>
                                <span>{post.specialization}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Actions */}
                    <div className="flex sm:flex-col gap-2">
                      <Button variant="outline" size="sm" className="text-xs">
                        Edit
                      </Button>
                      <Button variant="outline" size="sm" className="text-xs text-red-600 hover:text-red-700 hover:border-red-300">
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}


