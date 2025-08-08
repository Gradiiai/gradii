"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Users,
  Briefcase,
  MessageSquare,
  BarChart3,
  Settings,
  FileText,
  Calendar,
  Target,
  Brain,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  Linkedin,
  FlaskConical,
  ChevronDown
} from "lucide-react";
import { Button } from "@/components/ui/shared/button";
import { cn } from "@/lib/utils";

interface DashboardSidebarProps {
  session: any;
}

const navigation = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    description: "Overview and analytics"},
  {
    name: "Job Campaigns",
    href: "/dashboard/job-campaign",
    icon: Briefcase,
    description: "Manage job postings"},
  {
    name: "Talent Pool",
    href: "/dashboard/candidates",
    icon: Users,
    description: "View and manage candidates"},
  {
    name: "Interviews",
    href: "/dashboard/interviews",
    icon: MessageSquare,
    description: "Schedule and conduct interviews"},
  {
    name: "Interview Results",
    href: "/dashboard/interview-results",
    icon: Target,
    description: "AI-powered interview analysis"},
  {
    name: "Analytics",
    href: "/dashboard/unified-analytics",
    icon: BarChart3,
    description: "Comprehensive analytics dashboard"},
  // Labs group placeholder (handled specially in render)
  {
    name: "Labs",
    href: "#",
    icon: FlaskConical,
    description: "Experimental tools and resources",
    children: [
      { name: "Posts", href: "/dashboard/posts", icon: FileText },
      { name: "Question Bank", href: "/dashboard/question-bank", icon: FileText },
      { name: "Templates", href: "/dashboard/templates", icon: Brain },
      { name: "LinkedIn", href: "/dashboard/linkedin", icon: Linkedin },
    ]
  },
  {
    name: "Settings",
    href: "/dashboard/settings",
    icon: Settings,
    description: "Account and preferences"},
];

export default function DashboardSidebar({ session }: DashboardSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isLabsExpanded, setIsLabsExpanded] = useState(false);
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/dashboard") {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  // Check if any Labs child is active
  const isLabsActive = () => {
    const labsItem = navigation.find(item => item.name === 'Labs');
    if (labsItem && Array.isArray((labsItem as any).children)) {
      return (labsItem as any).children.some((child: any) => isActive(child.href));
    }
    return false;
  };

  const sidebarVariants = {
    expanded: { width: 256 },
    collapsed: { width: 80 }};

  const contentVariants = {
    expanded: { opacity: 1, x: 0 },
    collapsed: { opacity: 0, x: -10 }};

  return (
    <>
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsMobileOpen(true)}
          className="bg-white shadow-md"
        >
          <Menu className="h-4 w-4" />
        </Button>
      </div>

      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {isMobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="lg:hidden fixed inset-0 z-40 bg-gray-900/50 backdrop-blur-sm"
              onClick={() => setIsMobileOpen(false)}
            />
            <motion.div
              initial={{ x: -256 }}
              animate={{ x: 0 }}
              exit={{ x: -256 }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="lg:hidden fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-xl"
            >
              <MobileSidebarContent
                navigation={navigation}
                pathname={pathname}
                isActive={isActive}
                onClose={() => setIsMobileOpen(false)}
                session={session}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Desktop sidebar */}
      <motion.div
        variants={sidebarVariants}
        animate={isCollapsed ? "collapsed" : "expanded"}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 lg:block bg-white border-r border-gray-200 shadow-sm"
      >
        <div className="flex h-full flex-col">
          {/* Logo and collapse button */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <AnimatePresence mode="wait">
              {!isCollapsed && (
                <motion.div
                  variants={contentVariants}
                  initial="collapsed"
                  animate="expanded"
                  exit="collapsed"
                  className="flex justify-center items-center"
                >
                  <img src="/Gradii-logo.jpg" alt="" className="w-[100px]" />
                </motion.div>
              )}
            </AnimatePresence>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="hover:bg-gray-100"
            >
              {isCollapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronLeft className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2">
            {navigation.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);

              // Render Labs with dropdown children
              if (item.name === 'Labs' && Array.isArray((item as any).children)) {
                const labsActive = isLabsActive();
                return (
                  <div key={item.name} className="space-y-1">
                    <div
                      onClick={() => setIsLabsExpanded(!isLabsExpanded)}
                      className={cn(
                        "flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 group relative cursor-pointer",
                        labsActive
                          ? "bg-purple-50 text-purple-700 border border-purple-200"
                          : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                      )}
                    >
                      <Icon className={cn(
                        "h-5 w-5",
                        labsActive
                          ? "text-purple-600"
                          : "text-gray-400 group-hover:text-gray-600"
                      )} />
                      <AnimatePresence mode="wait">
                        {!isCollapsed && (
                          <motion.div
                            variants={contentVariants}
                            initial="collapsed"
                            animate="expanded"
                            exit="collapsed"
                            className="ml-3 flex-1 min-w-0 flex items-center justify-between"
                          >
                            <span className="truncate">{item.name}</span>
                            <motion.div
                              animate={{ rotate: isLabsExpanded ? 180 : 0 }}
                              transition={{ duration: 0.2 }}
                            >
                              <ChevronDown className={cn(
                                "h-4 w-4",
                                labsActive ? "text-purple-600" : "text-gray-400"
                              )} />
                            </motion.div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                    <AnimatePresence>
                      {!isCollapsed && isLabsExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                          className="ml-9 space-y-1 overflow-hidden"
                        >
                          {(item as any).children.map((child: any) => {
                            const ChildIcon = child.icon;
                            const childActive = isActive(child.href);
                            return (
                              <Link
                                key={child.name}
                                href={child.href}
                                className={cn(
                                  "flex items-center px-3 py-2 text-sm rounded-lg transition-all duration-200",
                                  childActive ? "text-black font-medium" : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                                )}
                              >
                                <ChildIcon className={cn("h-4 w-4", childActive ? "text-black" : "text-gray-400 group-hover:text-gray-600")} />
                                <span className="ml-3">{child.name}</span>
                              </Link>
                            );
                          })}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              }

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 group relative",
                    active
                      ? "bg-purple-50 text-purple-700 border border-purple-200"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  )}
                >
                  <Icon
                    className={cn(
                      "h-5 w-5 shrink-0",
                      active
                        ? "text-purple-600"
                        : "text-gray-400 group-hover:text-gray-600"
                    )}
                  />

                  <AnimatePresence mode="wait">
                    {!isCollapsed && (
                      <motion.div
                        variants={contentVariants}
                        initial="collapsed"
                        animate="expanded"
                        exit="collapsed"
                        className="ml-3 flex-1 min-w-0"
                      >
                        <span className="truncate">{item.name}</span>
                        {!active && (
                          <p className="text-xs text-gray-500 truncate mt-0.5">
                            {item.description}
                          </p>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Link>
              );
            })}
          </nav>

          {/* User info */}
          <div className="p-4 border-t border-gray-200">
            <div
              className={cn(
                "flex items-center space-x-3 p-3 rounded-lg bg-gray-50",
                isCollapsed && "justify-center"
              )}
            >
              <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center shrink-0">
                <span className="text-white font-medium text-sm">
                  {session?.user?.name?.charAt(0) || "U"}
                </span>
              </div>

              <AnimatePresence mode="wait">
                {!isCollapsed && (
                  <motion.div
                    variants={contentVariants}
                    initial="collapsed"
                    animate="expanded"
                    exit="collapsed"
                    className="flex-1 min-w-0"
                  >
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {session?.user?.name || "User"}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {session?.user?.email}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </motion.div>
    </>
  );
}

// Mobile sidebar content component
function MobileSidebarContent({
  navigation,
  pathname,
  isActive,
  onClose,
  session}: {
  navigation: any[];
  pathname: string;
  isActive: (href: string) => boolean;
  onClose: () => void;
  session: any;
}) {
  const [isMobileLabsExpanded, setIsMobileLabsExpanded] = useState(false);

  // Check if any Labs child is active
  const isLabsActive = () => {
    const labsItem = navigation.find(item => item.name === 'Labs');
    if (labsItem && Array.isArray((labsItem as any).children)) {
      return (labsItem as any).children.some((child: any) => isActive(child.href));
    }
    return false;
  };
  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <img src="/Gradii-logo.jpg" alt="" />
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="p-2 hover:bg-gray-100"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {navigation.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);

          // Handle Labs with children in mobile
          if (item.name === 'Labs' && Array.isArray((item as any).children)) {
            const labsActive = isLabsActive();
            return (
              <div key={item.name} className="space-y-1">
                <div 
                  onClick={() => setIsMobileLabsExpanded(!isMobileLabsExpanded)}
                  className={cn(
                    "flex items-center px-3 py-2.5 text-sm font-medium rounded-lg cursor-pointer transition-all duration-200",
                    labsActive
                      ? "bg-purple-50 text-purple-700 border border-purple-200"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  )}
                >
                  <Icon className={cn(
                    "h-5 w-5 shrink-0",
                    labsActive ? "text-purple-600" : "text-gray-400"
                  )} />
                  <div className="ml-3 flex-1 flex items-center justify-between">
                    <div>
                      <span>{item.name}</span>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {item.description}
                      </p>
                    </div>
                    <motion.div
                      animate={{ rotate: isMobileLabsExpanded ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <ChevronDown className={cn(
                        "h-4 w-4",
                        labsActive ? "text-purple-600" : "text-gray-400"
                      )} />
                    </motion.div>
                  </div>
                </div>
                <AnimatePresence>
                  {isMobileLabsExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="ml-9 space-y-1 overflow-hidden"
                    >
                      {(item as any).children.map((child: any) => {
                        const ChildIcon = child.icon;
                        const childActive = isActive(child.href);
                        return (
                          <Link
                            key={child.name}
                            href={child.href}
                            onClick={onClose}
                            className={cn(
                              "flex items-center px-3 py-2 text-sm rounded-lg transition-all duration-200",
                              childActive ? "text-black font-medium" : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                            )}
                          >
                            <ChildIcon className={cn("h-4 w-4", childActive ? "text-black" : "text-gray-400")} />
                            <span className="ml-3">{child.name}</span>
                          </Link>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          }

          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={onClose}
              className={cn(
                "flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 group",
                active
                  ? "bg-purple-50 text-purple-700 border border-purple-200"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              )}
            >
              <Icon
                className={cn(
                  "h-5 w-5 shrink-0",
                  active
                    ? "text-purple-600"
                    : "text-gray-400 group-hover:text-gray-600"
                )}
              />
              <div className="ml-3 flex-1">
                <span>{item.name}</span>
                <p className="text-xs text-gray-500 mt-0.5">
                  {item.description}
                </p>
              </div>
            </Link>
          );
        })}
      </nav>

      {/* User info */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center space-x-3 p-3 rounded-lg bg-gray-50">
          <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center">
            <span className="text-white font-medium text-sm">
              {session?.user?.name?.charAt(0) || "U"}
            </span>
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-900">
              {session?.user?.name || "User"}
            </p>
            <p className="text-xs text-gray-500">{session?.user?.email}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
