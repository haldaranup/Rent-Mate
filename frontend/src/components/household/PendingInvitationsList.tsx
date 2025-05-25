"use client";

import { useEffect, useState, useCallback } from "react";
import axiosInstance from "@/lib/axiosInstance";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, XCircle, Mail, Hash, Trash2, RefreshCw, Info, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { User, UserRole } from "@/types/user";

interface Invitation {
  id: string;
  email?: string | null;
  shortCode?: string | null;
  status: string;
  expiresAt: string;
  createdAt: string;
  // invitedById: string; // Might add later if we want to show who invited
}

interface PendingInvitationsListProps {
  currentUser: User;
  householdId: string; // Explicitly pass householdId for clarity and future flexibility
}

export function PendingInvitationsList({ currentUser, householdId }: PendingInvitationsListProps) {
  const { toast } = useToast();
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const fetchPendingInvitations = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await axiosInstance.get<Invitation[]>("/invitations/pending");
      setInvitations(response.data);
    } catch (err: any) {
      console.error("Failed to fetch pending invitations:", err);
      setError(err.response?.data?.message || "Could not load pending invitations. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Only fetch if user is owner/admin (or has householdId - already checked by backend)
    if (currentUser && householdId && (currentUser.role === UserRole.OWNER || currentUser.role === UserRole.MEMBER )) {
        fetchPendingInvitations();
    }
  }, [currentUser, householdId, fetchPendingInvitations]);

  const handleCancelInvitation = async (invitationId: string) => {
    setCancellingId(invitationId);
    try {
      await axiosInstance.post(`/invitations/${invitationId}/cancel`);
      toast({
        title: "Invitation Cancelled",
        description: "The pending invitation has been successfully cancelled.",
      });
      // Refresh the list
      fetchPendingInvitations(); 
    } catch (err: any) {
      console.error("Failed to cancel invitation:", err);
      toast({
        title: "Cancellation Failed",
        description: err.response?.data?.message || "Could not cancel the invitation. Please try again.",
        variant: "destructive",
      });
    } finally {
      setCancellingId(null);
    }
  };

  if (!currentUser || !(currentUser.role === UserRole.OWNER || currentUser.role === UserRole.MEMBER )) {
    // Silently don't render if user isn't an owner or member - backend also protects this.
    // Or display a message if preferred.
    return null;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <p className="ml-3 text-muted-foreground">Loading pending invitations...</p>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="my-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Error Loading Invitations</AlertTitle>
        <AlertDescription>
          {error} 
          <Button variant="link" onClick={fetchPendingInvitations} className="p-0 h-auto ml-2 text-destructive-foreground hover:underline">
            Try again
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="mt-6 pt-6 border-t">
      <div className="flex justify-between items-center mb-4">
        <h4 className="text-lg font-semibold">Pending Invitations ({invitations.length})</h4>
        <Button variant="outline" size="sm" onClick={fetchPendingInvitations} disabled={isLoading || !!cancellingId}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh List
        </Button>
      </div>
      
      {invitations.length === 0 ? (
        <Alert className="border-dashed">
            <Info className="h-4 w-4" />
            <AlertTitle>No Pending Invitations</AlertTitle>
            <AlertDescription>
            There are currently no pending invitations for this household.
            </AlertDescription>
        </Alert>
      ) : (
        <ul className="space-y-3">
          {invitations.map((invite) => (
            <li key={invite.id} className="p-4 border rounded-lg bg-card shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div className="flex-grow">
                {invite.email ? (
                  <div className="flex items-center">
                    <Mail className="h-5 w-5 mr-2 text-muted-foreground" /> 
                    <span className="font-medium text-foreground break-all">{invite.email}</span>
                  </div>
                ) : invite.shortCode ? (
                  <div className="flex items-center">
                    <Hash className="h-5 w-5 mr-2 text-muted-foreground" /> 
                    <span className="font-mono text-lg font-bold tracking-wider text-primary bg-primary/10 px-2 py-1 rounded">{invite.shortCode}</span>
                  </div>
                ) : (
                  <span className="text-muted-foreground italic">Unknown invitation type</span>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  Expires: {new Date(invite.expiresAt).toLocaleString()} (Created: {new Date(invite.createdAt).toLocaleDateString()})
                </p>
              </div>
              <Button 
                variant="ghost" 
                size="sm"
                className="text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 hover:text-red-700 dark:hover:text-red-500 shrink-0 mt-2 sm:mt-0"
                onClick={() => handleCancelInvitation(invite.id)}
                disabled={cancellingId === invite.id}
              >
                {cancellingId === invite.id ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Trash2 className="h-4 w-4 mr-2" />
                )}
                Cancel Invitation
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
} 