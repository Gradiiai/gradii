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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Posts</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Job Title *</Label>
              <Input value={form.title || ""} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div>
              <Label>Department *</Label>
              <Select value={form.department || ""} onValueChange={(v) => setForm({ ...form, department: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((d) => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Location *</Label>
              <Input value={form.location || ""} onChange={(e) => setForm({ ...form, location: e.target.value })} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Experience Level</Label>
              <Select value={form.experienceLevel || ""} onValueChange={(v) => setForm({ ...form, experienceLevel: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select level" />
                </SelectTrigger>
                <SelectContent>
                  {experienceLevels.map((lvl) => (
                    <SelectItem key={lvl} value={lvl}>{lvl}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Employee Type *</Label>
              <Select value={form.employeeType || ""} onValueChange={(v) => setForm({ ...form, employeeType: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {employeeTypes.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Currency</Label>
              <Input value={form.currency || "INR"} onChange={(e) => setForm({ ...form, currency: e.target.value })} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Course/ Degree</Label>
              <Input value={form.courseDegree || ""} onChange={(e) => setForm({ ...form, courseDegree: e.target.value })} />
            </div>
            <div>
              <Label>Specialization</Label>
              <Input value={form.specialization || ""} onChange={(e) => setForm({ ...form, specialization: e.target.value })} />
            </div>
          </div>

          {/* Work Arrangement */}
          <div className="space-y-2">
            <Label>Work Arrangement</Label>
            <div className="flex items-center gap-6">
              <div className="flex items-center space-x-2">
                <Switch id="isRemote" checked={!!form.isRemote} onCheckedChange={(checked) => setForm({ ...form, isRemote: checked })} />
                <Label htmlFor="isRemote">Remote Work</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch id="isHybrid" checked={!!form.isHybrid} onCheckedChange={(checked) => setForm({ ...form, isHybrid: checked })} />
                <Label htmlFor="isHybrid">Hybrid Work</Label>
              </div>
            </div>
          </div>

          {/* Salary negotiable */}
          <div className="flex items-center space-x-2">
            <Switch id="salaryNegotiable" checked={!!form.salaryNegotiable} onCheckedChange={(checked) => setForm({ ...form, salaryNegotiable: checked })} />
            <Label htmlFor="salaryNegotiable">Salary is negotiable</Label>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Salary Min</Label>
              <Input type="number" value={form.salaryMin ?? ""} onChange={(e) => setForm({ ...form, salaryMin: e.target.value ? Number(e.target.value) : undefined })} />
            </div>
            <div>
              <Label>Salary Max</Label>
              <Input type="number" value={form.salaryMax ?? ""} onChange={(e) => setForm({ ...form, salaryMax: e.target.value ? Number(e.target.value) : undefined })} />
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={createPost} disabled={submitting}>{submitting ? 'Saving...' : 'Create Post'}</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Existing Posts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="divide-y">
            {loading ? (
              <div className="text-sm text-gray-500">Loading...</div>
            ) : posts.length === 0 ? (
              <div className="text-sm text-gray-500">No posts yet</div>
            ) : (
              posts.map((p) => (
                <div key={p.id} className="py-3 flex items-center justify-between">
                  <div>
                    <div className="font-medium">{p.title}</div>
                    <div className="text-sm text-gray-500">{p.department} • {p.location} • {p.employeeType}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


