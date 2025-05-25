'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { api } from '@/services/api'; // Assuming you have an API service wrapper
import { useAuth } from '@/hooks/useAuth'; // Assuming you have an auth hook

// TODO: Define types for Invitation
interface PendingInvitation {
  id: string;
  email?: string;
  shortCode?: string;
  status: string;
  expiresAt: string;
  householdId: string;
  // Add householdName if backend provides it or fetch separately
}

export default function HouseholdSettingsPage() {
  const { toast } = useToast();
  const { user, token } = useAuth(); // Assuming useAuth provides current user and token
  const [inviteEmail, setInviteEmail] = useState('');
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [generatedCodeExpiresAt, setGeneratedCodeExpiresAt] = useState<string | null>(null);
  const [pendingInvitations, setPendingInvitations] = useState<PendingInvitation[]>([]);
  const [isLoadingEmailInvite, setIsLoadingEmailInvite] = useState(false);
  const [isLoadingCodeInvite, setIsLoadingCodeInvite] = useState(false);
  const [isLoadingPendingInvites, setIsLoadingPendingInvites] = useState(false);

  const householdId = user?.householdId; // Get household ID from the authenticated user

  const fetchPendingInvitations = async () => {
    if (!householdId || !token) return;
    setIsLoadingPendingInvites(true);
    try {
      const response = await api.get('/invitations/pending', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPendingInvitations(response.data);
    } catch (error: any) {
      toast({
        title: 'Error fetching pending invitations',
        description: error.response?.data?.message || error.message || 'Could not load invitations.',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingPendingInvites(false);
    }
  };

  useEffect(() => {
    fetchPendingInvitations();
  }, [householdId, token]);

  const handleSendEmailInvite = async () => {
    if (!inviteEmail || !householdId || !token) {
      toast({ title: 'Error', description: 'Email and household ID are required.', variant: 'destructive' });
      return;
    }
    setIsLoadingEmailInvite(true);
    try {
      await api.post(
        '/invitations/send-email',
        { email: inviteEmail, householdId },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      toast({ title: 'Success', description: `Invitation sent to ${inviteEmail}.` });
      setInviteEmail('');
      fetchPendingInvitations(); // Refresh list
    } catch (error: any) {
      toast({
        title: 'Error sending invitation',
        description: error.response?.data?.message || error.message || 'Could not send invitation.',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingEmailInvite(false);
    }
  };

  const handleGenerateCodeInvite = async () => {
    if (!householdId || !token) return;
    setIsLoadingCodeInvite(true);
    try {
      const response = await api.post(
        '/invitations/generate-code',
        { householdId },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setGeneratedCode(response.data.shortCode);
      setGeneratedCodeExpiresAt(new Date(response.data.expiresAt).toLocaleString());
      toast({ title: 'Success', description: 'Invitation code generated.' });
      fetchPendingInvitations(); // Refresh list
    } catch (error: any) {
      toast({
        title: 'Error generating code',
        description: error.response?.data?.message || error.message || 'Could not generate code.',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingCodeInvite(false);
    }
  };

  const handleCancelInvitation = async (invitationId: string) => {
    if (!token) return;
    try {
      await api.post(
        `/invitations/${invitationId}/cancel`,
        {}, // Empty body
        { headers: { Authorization: `Bearer ${token}` } },
      );
      toast({ title: 'Success', description: 'Invitation cancelled.' });
      fetchPendingInvitations(); // Refresh list
    } catch (error: any) {
      toast({
        title: 'Error cancelling invitation',
        description: error.response?.data?.message || error.message || 'Could not cancel invitation.',
        variant: 'destructive',
      });
    }
  };
  
  if (!householdId) {
    return (
      <div className="container mx-auto p-4">
        <p>You must be part of a household to manage settings and invitations.</p>
        {/* Optionally, link to create/join household page */}
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-8">
      <h1 className="text-3xl font-bold">Household Invitations & Settings</h1>

      {/* Section 1: Invite by Email */}
      <section className="p-6 bg-card border rounded-lg shadow">
        <h2 className="text-2xl font-semibold mb-4">Invite by Email</h2>
        <div className="flex gap-2">
          <Input
            type="email"
            placeholder="Invitee's email address"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            className="flex-grow"
          />
          <Button onClick={handleSendEmailInvite} disabled={isLoadingEmailInvite || !inviteEmail.trim()}>
            {isLoadingEmailInvite ? 'Sending...' : 'Send Invite'}
          </Button>
        </div>
      </section>

      {/* Section 2: Invite by Code */}
      <section className="p-6 bg-card border rounded-lg shadow">
        <h2 className="text-2xl font-semibold mb-4">Invite by Code</h2>
        <Button onClick={handleGenerateCodeInvite} disabled={isLoadingCodeInvite} className="mb-3">
          {isLoadingCodeInvite ? 'Generating...' : 'Generate New Invitation Code'}
        </Button>
        {generatedCode && (
          <div className="p-3 bg-muted rounded-md">
            <p className="text-lg">
              Share this code: <strong className="text-xl font-mono">{generatedCode}</strong>
            </p>
            {generatedCodeExpiresAt && <p className="text-sm text-muted-foreground">Expires: {generatedCodeExpiresAt}</p>}
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => {
                navigator.clipboard.writeText(generatedCode);
                toast({ title: 'Copied!', description: 'Invitation code copied to clipboard.' });
              }}
            >
              Copy Code
            </Button>
          </div>
        )}
      </section>

      {/* Section 3: Pending Invitations */}
      <section className="p-6 bg-card border rounded-lg shadow">
        <h2 className="text-2xl font-semibold mb-4">Pending Invitations</h2>
        {isLoadingPendingInvites && <p>Loading invitations...</p>}
        {!isLoadingPendingInvites && pendingInvitations.length === 0 && (
          <p>No pending invitations for this household.</p>
        )}
        {!isLoadingPendingInvites && pendingInvitations.length > 0 && (
          <ul className="space-y-3">
            {pendingInvitations.map((invite) => (
              <li key={invite.id} className="p-3 border rounded-md flex justify-between items-center bg-muted/50">
                <div>
                  <p className="font-medium">
                    {invite.email ? `Email: ${invite.email}` : `Code: ${invite.shortCode || 'N/A'}`}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Status: {invite.status} | Expires: {new Date(invite.expiresAt).toLocaleString()}
                  </p>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleCancelInvitation(invite.id)}
                >
                  Cancel
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
} 