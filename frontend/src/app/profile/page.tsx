"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axiosInstance from "@/lib/axiosInstance";
import { useToast } from "@/hooks/use-toast";
import { User } from "@/types/user";
import LocalStorageService from "@/lib/localStorage";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { UserCircle2, Mail, Shield, Edit, Loader2, AlertTriangle, Home } from "lucide-react";

export default function ProfilePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchProfileData = async () => {
      setIsLoading(true);
      try {
        const token = LocalStorageService.get<string>("rentmate_token");
        if (!token) {
          toast({
            title: "Authentication Error",
            description: "You are not logged in. Redirecting...",
            variant: "destructive",
          });
          router.push("/login");
          return;
        }
        // Fetch fresh user data from the backend
        const response = await axiosInstance.get("/auth/me");
        setCurrentUser(response.data);
      } catch (error) {
        console.error("Failed to fetch user profile:", error);
        toast({
          title: "Error Loading Profile",
          description: "Could not fetch your profile data. Please try again.",
          variant: "destructive",
        });
        // Optionally redirect or show an error message without redirecting
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfileData();
  }, [router, toast]);

  if (isLoading) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[calc(100vh-120px)] p-4 text-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-lg text-muted-foreground">Loading your profile...</p>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[calc(100vh-120px)] p-4 text-center">
        <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
        <p className="text-lg text-muted-foreground">Could not load profile data.</p>
        <Button onClick={() => router.push("/dashboard")} className="mt-4">Go to Dashboard</Button>
      </div>
    );
  }

  const userInitial = currentUser.name?.charAt(0).toUpperCase() || currentUser.email?.charAt(0).toUpperCase() || "U";

  return (
    <div className="container mx-auto py-8 px-4 md:px-6 lg:px-8">
      <Card className="max-w-2xl mx-auto shadow-lg">
        <CardHeader className="items-center text-center pb-6 border-b">
          <Avatar className="h-24 w-24 mb-4 ring-2 ring-primary ring-offset-2 ring-offset-background">
            {/* <AvatarImage src={currentUser.avatarUrl} alt={currentUser.name || "User"} /> */}
            <AvatarFallback className="text-4xl">{userInitial}</AvatarFallback>
          </Avatar>
          <CardTitle className="text-3xl font-bold">{currentUser.name || "User Profile"}</CardTitle>
          <CardDescription className="text-lg">View and manage your profile information.</CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <div className="space-y-4">
            <div className="flex items-center space-x-3 p-3 bg-secondary/50 rounded-md">
              <UserCircle2 className="h-6 w-6 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Full Name</p>
                <p className="text-md font-medium">{currentUser.name || "Not set"}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3 p-3 bg-secondary/50 rounded-md">
              <Mail className="h-6 w-6 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Email Address</p>
                <p className="text-md font-medium">{currentUser.email}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3 p-3 bg-secondary/50 rounded-md">
              <Shield className="h-6 w-6 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Role</p>
                <p className="text-md font-medium capitalize">{currentUser.role?.toLowerCase() || "N/A"}</p>
              </div>
            </div>
            {currentUser.household && (
                <div className="flex items-center space-x-3 p-3 bg-secondary/50 rounded-md">
                    <Home className="h-6 w-6 text-primary" />
                    <div>
                        <p className="text-sm text-muted-foreground">Household</p>
                        <p className="text-md font-medium">{currentUser.household.name}</p>
                    </div>
                </div>
            )}
          </div>
          <div className="pt-6 border-t text-center">
            <Button variant="outline" disabled>
              <Edit className="mr-2 h-4 w-4" /> Edit Profile (Coming Soon)
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 