"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import axiosInstance from "@/lib/axiosInstance";
import { AxiosResponse } from "axios";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import LocalStorageService from "@/lib/localStorage";
import { User, UserRole } from "@/types/user";
import { Household } from "@/types/household";
import ChoresSection from "@/components/chores/ChoresSection";
import { ExpensesSection } from "@/components/expenses/ExpensesSection";
import { LayoutDashboard, Home, Users, AlertTriangle, Loader2, LogInIcon, Trash2, UserX, HandCoins, History, IndianRupee, ListChecks, CalendarDays } from "lucide-react";
import { InviteMemberForm } from "@/components/household/InviteMemberForm";
import { JoinHouseholdModal } from "@/components/household/JoinHouseholdModal";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

// Household form schema remains for creating a household
const householdFormSchema = z.object({
  name: z
    .string()
    .min(2, { message: "Household name must be at least 2 characters." })
    .max(100),
});
type HouseholdFormValues = z.infer<typeof householdFormSchema>;

export default function DashboardPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [isCreatingHousehold, setIsCreatingHousehold] = useState(false);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<User | null>(null);
  const [isRemovingMember, setIsRemovingMember] = useState(false);

  const householdForm = useForm<HouseholdFormValues>({
    resolver: zodResolver(householdFormSchema),
    defaultValues: { name: "" },
  });

  const fetchUserProfile = async (showSuccessToast = false) => {
    setIsLoadingUser(true);
    try {
      const token = LocalStorageService.get<string>("rentmate_token");
      if (!token) {
        router.push("/login");
        return null;
      }
      const response = await axiosInstance.get("/auth/me");
      setCurrentUser(response.data);
      if (showSuccessToast && response.data.householdId) {
        toast({ title: "Joined Household!", description: "Welcome to your household dashboard." });
      }
      return response.data;
    } catch (error) {
      console.error("Failed to fetch user profile:", error);
      toast({
        title: "Error Loading Profile",
        description: "Could not fetch your user profile. Please try logging in again.",
        variant: "destructive",
      });
      LocalStorageService.remove("rentmate_token");
      router.push("/login");
      return null;
    } finally {
      setIsLoadingUser(false);
    }
  };

  useEffect(() => {
    fetchUserProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreateHousehold = async (values: HouseholdFormValues) => {
    setIsCreatingHousehold(true);
    try {
      const response: AxiosResponse<Household> = await axiosInstance.post(
        "/households",
        values
      );
      toast({
        title: "Household Created!",
        description: `Successfully created "${response.data.name}".`,
      });
      await fetchUserProfile(); // Refetch to get new householdId and household details
      householdForm.reset(); // Reset form regardless of success for better UX
    } catch (error: any) {
      console.error("Failed to create household:", error);
      const errorMessage = error.response?.data?.message || "Failed to create household. Please try again.";
      toast({
        title: "Creation Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsCreatingHousehold(false);
    }
  };

  const handleHouseholdJoined = () => {
    fetchUserProfile(true); // Pass true to show success toast after joining
  };

  const confirmRemoveMember = (member: User) => {
    setMemberToRemove(member);
  };

  const executeRemoveMember = async () => {
    if (!memberToRemove) return;
    setIsRemovingMember(true);
    try {
      await axiosInstance.delete(`/households/members/${memberToRemove.id}`);
      toast({
        title: "Member Removed",
        description: `${memberToRemove.name || memberToRemove.email} has been removed from the household.`,
      });
      setMemberToRemove(null); // Close dialog
      await fetchUserProfile(); // Refresh data
    } catch (error: any) {
      console.error("Failed to remove member:", error);
      const errorMessage = error.response?.data?.message || "Could not remove member. Please try again.";
      toast({
        title: "Removal Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsRemovingMember(false);
    }
  };

  if (isLoadingUser) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[calc(100vh-80px)] p-4 text-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-lg text-muted-foreground">Loading your dashboard...</p>
      </div>
    );
  }

  if (!currentUser) {
    // This state should ideally be brief as fetchUserProfile redirects
    return (
      <div className="flex flex-col justify-center items-center min-h-[calc(100vh-80px)] p-4 text-center">
        <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
        <p className="text-lg text-muted-foreground">Could not load user profile. Redirecting to login...</p>
      </div>
    );
  }

  if (!currentUser.householdId || !currentUser.household) {
    return (
      <>
        <div className="container mx-auto p-4 md:p-8 flex flex-col items-center justify-center min-h-[calc(100vh-100px)]">
          <Card className="w-full max-w-lg shadow-lg">
            <CardHeader className="items-center text-center">
              <Home className="h-12 w-12 text-primary mb-3" />
              <CardTitle className="text-2xl md:text-3xl">Welcome to RentMate!</CardTitle>
              <CardDescription className="text-base">
                You&apos;re not part of a household yet. Create one or join an existing household to get started.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <Form {...householdForm}>
                <form
                  onSubmit={householdForm.handleSubmit(handleCreateHousehold)}
                  className="space-y-6"
                >
                  <FormField
                    control={householdForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base">Household Name</FormLabel>
                        <FormControl>
                          <Input className="text-base py-3 px-4" placeholder="E.g., The Harmony House" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="submit"
                    size="lg"
                    className="w-full text-base py-3"
                    disabled={isCreatingHousehold}
                  >
                    {isCreatingHousehold ? (
                      <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Creating...</>
                    ) : (
                      "Create New Household"
                    )}
                  </Button>
                </form>
              </Form>
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                    Or
                    </span>
                </div>
              </div>
              <Button 
                variant="outline" 
                size="lg" 
                className="w-full text-base py-3"
                onClick={() => setIsJoinModalOpen(true)}
              >
                <LogInIcon className="mr-2 h-5 w-5" /> Join Existing Household with Code
              </Button>
            </CardContent>
          </Card>
        </div>
        <JoinHouseholdModal 
          isOpen={isJoinModalOpen} 
          onOpenChange={setIsJoinModalOpen} 
          onHouseholdJoined={handleHouseholdJoined} 
        />
      </>
    );
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 md:px-8 pb-4 sm:pb-6 md:pb-8 pt-0">
      <header className="mb-8 md:mb-12 pb-6 border-b">
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
                <LayoutDashboard className="h-10 w-10 text-primary hidden sm:block" />
                <div>
                  <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold">
                    Welcome, {currentUser.name || currentUser.email}!
                  </h1>
                  <p className="text-md sm:text-lg text-muted-foreground">
                    Here&apos;s what&apos;s happening in your household.
                  </p>
                </div>
            </div>
        </div>
      </header>

      <main className="bg-card/30 dark:bg-muted/10 p-4 sm:p-6 rounded-xl flex flex-col gap-6 md:gap-8">
        {/* Section 1: Household Overview and Navigation Side-by-Side - Enhanced Styling */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 p-4 sm:p-6 bg-muted/30 dark:bg-muted/20 rounded-xl border border-border/60 shadow-md">
          {/* Household Info Card */}
          {currentUser.household && (
            <Card className="shadow-sm hover:shadow-md transition-shadow h-full">
              <CardHeader className="flex flex-row items-start gap-3 space-y-0 pb-3">
                <Home className="h-6 w-6 text-primary mt-1" />
                <div>
                  <CardTitle className="text-xl md:text-2xl">{currentUser.household.name}</CardTitle>
                  <CardDescription>Household Overview</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <h3 className="text-md font-semibold mb-2 text-foreground">Members:</h3>
                {currentUser.household.members && currentUser.household.members.length > 0 ? (
                  <ul className="space-y-2">
                    {currentUser.household.members.map((m) => {
                      // DEBUGGING: Log roles for comparison
                      console.log("Current User Role:", currentUser.role, "| UserRole.OWNER Enum:", UserRole.OWNER, "| Member Role:", m.role);
                      console.log("Is Owner?", currentUser.role === UserRole.OWNER);
                      console.log("Is different user?", m.id !== currentUser.id);
                      
                      return (
                        <li key={m.id} className="flex items-center justify-between gap-2 text-sm p-2 rounded-md bg-secondary/50">
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium text-foreground">{m.name || m.email}</span>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">
                              {m.role}
                            </span>
                          </div>
                          {currentUser.role.toUpperCase() === UserRole.OWNER && m.id !== currentUser.id && (
                            <AlertDialog open={memberToRemove?.id === m.id} onOpenChange={(open) => !open && setMemberToRemove(null)}>
                              <AlertDialogTrigger asChild onClick={() => confirmRemoveMember(m)}>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="text-destructive hover:bg-destructive/10 hover:text-destructive-foreground p-1 h-auto"
                                >
                                  <UserX className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              {memberToRemove?.id === m.id && (
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Remove {memberToRemove.name || memberToRemove.email}?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to remove this member from the household? This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel onClick={() => setMemberToRemove(null)} disabled={isRemovingMember}>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={executeRemoveMember} disabled={isRemovingMember} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                                      {isRemovingMember ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />} Remove Member
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              )}
                            </AlertDialog>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">No members found in this household.</p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Navigation Card */}
          <Card className="shadow-sm hover:shadow-md transition-shadow h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Navigation</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Explore</div>
              <p className="text-xs text-muted-foreground">
                Manage your household effectively.
              </p>
              <div className="mt-4 flex flex-col sm:flex-row gap-2">
                  <Button asChild className="w-full sm:w-auto">
                      <Link href="/finances">
                          <IndianRupee className="mr-2 h-4 w-4" /> View Finances
                      </Link>
                  </Button>
                  <Button asChild className="w-full sm:w-auto" variant="outline">
                      <Link href="/activity-log">
                          <ListChecks className="mr-2 h-4 w-4" /> Activity Log
                      </Link>
                  </Button>
                  <Button asChild className="w-full sm:w-auto" variant="outline">
                      <Link href="/calendar">
                          <CalendarDays className="mr-2 h-4 w-4" /> View Calendar
                      </Link>
                  </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Section 2: Invite Panel - Full width below, visible if user is owner */}
        {currentUser.household && currentUser.role.toUpperCase() === UserRole.OWNER && (
          <Card className="shadow-md hover:shadow-lg transition-shadow w-full">
            <CardHeader>
              <CardTitle className="text-xl md:text-2xl">Invite Members</CardTitle>
              <CardDescription>Expand your household by sending invitations.</CardDescription>
            </CardHeader>
            <CardContent>
              <InviteMemberForm 
                householdId={currentUser.household.id} 
                currentUser={currentUser} 
                onInvitationSent={fetchUserProfile}
              />
            </CardContent>
          </Card>
        )}

        {/* Section 3: Chores and Expenses Sections - Grid layout */}
        {currentUser.household && (
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
                <ChoresSection
                    currentUser={currentUser}
                    household={currentUser.household}
                />
                <ExpensesSection
                    currentUser={currentUser}
                    householdMembers={currentUser.household.members || []} 
                />
            </div>
        )}

      </main>
    </div>
  );
}
