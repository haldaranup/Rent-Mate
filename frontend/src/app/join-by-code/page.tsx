'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { api } from '@/services/api';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';

interface InvitationDetails {
  householdId: string;
  householdName?: string; // Backend should provide this for a better UX
  expiresAt: string;
  status: string;
}

export default function JoinByCodePage() {
  const { toast } = useToast();
  const router = useRouter();
  const { user, token, isLoading: authLoading } = useAuth();
  const [shortCode, setShortCode] = useState('');
  const [invitationDetails, setInvitationDetails] = useState<InvitationDetails | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFetchDetails = async () => {
    if (shortCode.length !== 6) {
      setError('Invitation code must be 6 characters long.');
      setInvitationDetails(null);
      return;
    }
    setIsLoadingDetails(true);
    setError(null);
    setInvitationDetails(null);
    try {
      const response = await api.get(`/invitations/details-by-code/${shortCode}`);
      if (response.data.status !== 'PENDING') {
        setError(`This invitation is no longer valid (Status: ${response.data.status}).`);
      } else if (new Date(response.data.expiresAt) < new Date()) {
        setError('This invitation code has expired.');
      } else {
        setInvitationDetails(response.data);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid or expired invitation code.');
      setInvitationDetails(null);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const handleJoinHousehold = async () => {
    if (!shortCode || !token) {
      toast({ title: 'Error', description: 'Short code and authentication are required.', variant: 'destructive' });
      return;
    }
    setIsJoining(true);
    try {
      await api.post(
        '/invitations/join-by-code',
        { shortCode },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      toast({ title: 'Success!', description: 'You have successfully joined the household.' });
      // TODO: Invalidate user session cache if householdId is part of it, or refetch user
      router.push('/dashboard'); // Redirect to dashboard or the household page
    } catch (err: any) {
      toast({
        title: 'Failed to join household',
        description: err.response?.data?.message || 'An error occurred.',
        variant: 'destructive',
      });
    } finally {
      setIsJoining(false);
    }
  };

  if (authLoading) {
    return <div className="container mx-auto p-4 text-center">Loading authentication status...</div>;
  }

  return (
    <div className="container mx-auto p-4 flex flex-col items-center justify-center min-h-screen">
      <div className="w-full max-w-md space-y-6 bg-card p-8 border rounded-lg shadow-lg">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Join Household by Code</h1>
          <p className="text-muted-foreground">
            Enter the 6-character invitation code given to you.
          </p>
        </div>

        <div className="flex gap-2">
          <Input
            type="text"
            placeholder="XXXXXX"
            value={shortCode}
            onChange={(e) => setShortCode(e.target.value.toUpperCase().trim())}
            maxLength={6}
            className="flex-grow text-center text-lg tracking-widest"
            disabled={!!invitationDetails || isLoadingDetails}
          />
          <Button onClick={handleFetchDetails} disabled={shortCode.length !== 6 || isLoadingDetails || !!invitationDetails}>
            {isLoadingDetails ? 'Verifying...' : 'Verify Code'}
          </Button>
        </div>

        {error && (
          <p className="text-red-500 text-sm text-center">{error}</p>
        )}

        {invitationDetails && (
          <div className="p-4 border rounded-md bg-muted">
            <h2 className="text-xl font-semibold mb-2">Invitation Details</h2>
            {invitationDetails.householdName ? (
                <p>You are invited to join: <strong>{invitationDetails.householdName}</strong></p>
            ): (
                <p>You are invited to join a household.</p>
            )}
            <p className="text-sm text-muted-foreground">
              Expires: {new Date(invitationDetails.expiresAt).toLocaleString()}
            </p>

            {!user && (
              <div className="mt-4 text-center space-y-2">
                <p>You need to be logged in to join.</p>
                <Button asChild className="w-full">
                  <Link href={`/login?redirect=/join-by-code&code=${shortCode}`}>Log In to Join</Link>
                </Button>
                <Button variant="outline" asChild className="w-full">
                  <Link href={`/signup?redirect=/join-by-code&code=${shortCode}`}>Sign Up to Join</Link>
                </Button>
              </div>
            )}

            {user && (
              <Button onClick={handleJoinHousehold} disabled={isJoining} className="w-full mt-4">
                {isJoining ? 'Joining...' : 'Join Household'}
              </Button>
            )}
          </div>
        )}

         {invitationDetails && shortCode && !error && (
            <Button 
                variant="outline" 
                onClick={() => {
                    setShortCode('');
                    setInvitationDetails(null);
                    setError(null);
                }}
                className="w-full mt-2"
            >
                Enter a different code
            </Button>
         )}
      </div>
    </div>
  );
} 