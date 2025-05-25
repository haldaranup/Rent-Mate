"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Chore, CreateChoreData, UpdateChoreData } from '@/types/chore';
import { User } from '@/types/user';
import axiosInstance from '@/lib/axiosInstance';
import { PlusCircle, Edit, Trash2, CheckCircle, Circle, MoreVertical, UserPlus, CalendarDays, Info, Repeat } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import ChoreForm from './ChoreForm'; // We will create this next
import { Household } from '@/types/household'; // Assuming you have this type for members
import { ChoreRecurrence } from '@/types/chore'; // Assuming you have this type for recurrence

interface ChoresSectionProps {
  household: Household | null; // Pass the full household object with members
  currentUser: User | null;
}

const ChoresSection: React.FC<ChoresSectionProps> = ({ household, currentUser }) => {
  const [chores, setChores] = useState<Chore[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingChore, setEditingChore] = useState<Chore | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  const fetchChores = useCallback(async () => {
    if (!household?.id) return;
    setIsLoading(true);
    try {
      const response = await axiosInstance.get(`/chores`); // Fetches for current user's household
      setChores(response.data);
    } catch (error) {
      console.error('Error fetching chores:', error);
      toast({
        title: 'Error fetching chores',
        description: 'Could not load chores for your household.',
        variant: 'destructive',
      });
    }
    setIsLoading(false);
  }, [household?.id, toast]);

  useEffect(() => {
    fetchChores();
  }, [fetchChores]);

  const handleFormSubmit = async (data: CreateChoreData | UpdateChoreData) => {
    try {
      let response;
      if (editingChore) {
        response = await axiosInstance.patch(`/chores/${editingChore.id}`, data as UpdateChoreData);
        toast({ title: 'Chore Updated', description: `"${response.data.description}" was successfully updated.` });
      } else {
        response = await axiosInstance.post('/chores', data as CreateChoreData);
        toast({ title: 'Chore Added', description: `"${response.data.description}" was successfully added.` });
      }
      fetchChores(); // Refetch chores after add/edit
      setIsDialogOpen(false);
      setEditingChore(null);
    } catch (error: any) {
      console.error('Error submitting chore:', error);
      toast({
        title: 'Error submitting chore',
        description: error.response?.data?.message || 'An unexpected error occurred.',
        variant: 'destructive',
      });
    }
  };

  const handleToggleComplete = async (choreId: string, currentIsComplete: boolean) => {
    const chore = chores.find(c => c.id === choreId);
    if (!chore) return; // Should not happen

    try {
      await axiosInstance.patch(`/chores/${choreId}/toggle-complete`);
      
      let toastMessage = '';
      if (currentIsComplete) { // Chore was complete, now marking incomplete
        toastMessage = 'Chore marked as incomplete.';
      } else { // Chore was incomplete, now marking complete
        if (chore.recurrence && chore.recurrence !== ChoreRecurrence.NONE) {
          toastMessage = 'Chore completed and rotated for next occurrence.';
        } else {
          toastMessage = 'Chore marked as complete.';
        }
      }
      toast({
        title: toastMessage,
      });
      fetchChores();
    } catch (error: any) {
      console.error('Error toggling chore completion:', error);
      toast({
        title: 'Error updating chore status',
        description: error.response?.data?.message || 'Could not update chore.',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteChore = async (choreId: string) => {
    setIsDeleting(true);
    try {
      await axiosInstance.delete(`/chores/${choreId}`);
      toast({ title: 'Chore Deleted', description: 'The chore was successfully deleted.' });
      fetchChores();
    } catch (error: any) {
      console.error('Error deleting chore:', error);
      toast({
        title: 'Error deleting chore',
        description: error.response?.data?.message || 'Could not delete chore.',
        variant: 'destructive',
      });
    }
    setIsDeleting(false);
  };

  if (isLoading && !chores.length) {
    return <p>Loading chores...</p>; // Replace with a proper skeleton loader later
  }
  
  if (!household) {
    return (
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Chores</CardTitle>
          <CardDescription>Manage your household chores once you are part of a household.</CardDescription>
        </CardHeader>
        <CardContent>
          <p>You need to be in a household to manage chores.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Chores</CardTitle>
          <CardDescription>Manage and track household chores.</CardDescription>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) setEditingChore(null); }}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingChore(null)}> 
              <PlusCircle className="mr-2 h-4 w-4" /> Add Chore
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>{editingChore ? 'Edit Chore' : 'Add New Chore'}</DialogTitle>
            </DialogHeader>
            <ChoreForm 
              onSubmit={handleFormSubmit} 
              initialData={editingChore}
              householdMembers={household.members || []} 
            />
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {chores.length === 0 && !isLoading ? (
          <div className="text-center text-gray-500 py-8">
            <Circle className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium">No chores yet!</h3>
            <p className="mt-1 text-sm">Get started by adding a new chore.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {chores.map((chore) => (
              <Card key={chore.id} className={`flex items-center justify-between p-4 ${chore.isComplete ? 'bg-muted/50' : ''}`}>
                <div className="flex items-center space-x-3">
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleToggleComplete(chore.id, chore.isComplete)}
                        className={chore.isComplete ? 'text-green-500 hover:text-green-600' : 'text-gray-400 hover:text-gray-600'}
                    >
                        {chore.isComplete ? <CheckCircle className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
                    </Button>
                    <div>
                        <p className={`font-medium ${chore.isComplete ? 'line-through text-muted-foreground' : ''}`}>{chore.description}</p>
                        <div className="text-xs text-muted-foreground space-x-2 flex flex-wrap items-center">
                            {chore.assignedTo && (
                                <span className="flex items-center"><UserPlus className="mr-1 h-3 w-3" /> {chore.assignedTo.name}</span>
                            )}
                            {chore.dueDate && (
                                <span className="flex items-center"><CalendarDays className="mr-1 h-3 w-3" /> {new Date(chore.dueDate).toLocaleDateString()}</span>
                            )}
                            {chore.recurrence && chore.recurrence !== ChoreRecurrence.NONE && (
                                <span className="flex items-center"><Repeat className="mr-1 h-3 w-3" /> {chore.recurrence.charAt(0).toUpperCase() + chore.recurrence.slice(1).replace('-',' ')}</span>
                            )}
                            {chore.notes && (
                                <span className="flex items-center pt-1"><Info className="mr-1 h-3 w-3 flex-shrink-0" /> <span className="truncate">{chore.notes.substring(0,30)}{chore.notes.length > 30 && '...'}</span></span>
                            )}
                        </div>
                    </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => { setEditingChore(chore); setIsDialogOpen(true); }}>
                      <Edit className="mr-2 h-4 w-4" /> Edit
                    </DropdownMenuItem>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-red-600 hover:!text-red-700">
                                <Trash2 className="mr-2 h-4 w-4" /> Delete
                            </DropdownMenuItem>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This action cannot be undone. This will permanently delete the chore "{chore.description}".
                            </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteChore(chore.id)} disabled={isDeleting} className="bg-red-600 hover:bg-red-700">
                                {isDeleting ? 'Deleting...' : 'Delete'}
                            </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                  </DropdownMenuContent>
                </DropdownMenu>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ChoresSection;
