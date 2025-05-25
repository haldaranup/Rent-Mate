'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { getActivityLogs } from '../../../services/activityLogService';
import type { ActivityLog, PaginatedActivityLogResponse } from '../../../types/activity-log';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../components/ui/table';
import { Button } from '../../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '../../../components/ui/alert';
import { Loader2, ListChecks, Users, Home, ShoppingCart, UserPlus, UserMinus, Edit3, Trash2, CheckCircle, RotateCcw, Repeat, ArrowLeft, History } from 'lucide-react';
import { format, parseISO } from 'date-fns';

const ITEMS_PER_PAGE = 20;

// Helper to get an icon for an activity type
const getActivityIcon = (activityType: string) => {
  if (activityType.startsWith('CHORE')) return <ListChecks className="h-5 w-5 mr-2 text-blue-500" />;
  if (activityType.startsWith('EXPENSE')) return <ShoppingCart className="h-5 w-5 mr-2 text-green-500" />;
  if (activityType.startsWith('HOUSEHOLD')) return <Home className="h-5 w-5 mr-2 text-purple-500" />;
  if (activityType.includes('JOINED') || activityType.includes('INVITATION')) return <UserPlus className="h-5 w-5 mr-2 text-teal-500" />;
  if (activityType.includes('LEFT')) return <UserMinus className="h-5 w-5 mr-2 text-red-500" />;
  if (activityType.includes('UPDATED')) return <Edit3 className="h-5 w-5 mr-2 text-yellow-500" />;
  if (activityType.includes('DELETED')) return <Trash2 className="h-5 w-5 mr-2 text-red-600" />;
  if (activityType.includes('COMPLETED')) return <CheckCircle className="h-5 w-5 mr-2 text-green-600" />;
  if (activityType.includes('ROTATED')) return <Repeat className="h-5 w-5 mr-2 text-indigo-500" />;
  if (activityType.includes('SETTLED')) return <RotateCcw className="h-5 w-5 mr-2 text-orange-500" />;
  return <ListChecks className="h-5 w-5 mr-2 text-gray-500" />;
};

// Helper to format details (basic version)
const formatActivityDetails = (log: ActivityLog): string => {
  if (typeof log.details === 'string') return log.details;
  if (typeof log.details === 'object' && log.details !== null) {
    // Customize this based on common detail structures
    if (log.details.name) return `${log.entityType} name: ${log.details.name}`;
    if (log.details.amount) return `Amount: ${log.details.amount}`;
    if (log.details.assignedTo) return `Assigned to: ${log.details.assignedTo.name}`;
    if (log.details.changes) {
      const changes = log.details.changes as Array<{ field: string; oldValue: any; newValue: any }>;
      return changes.map(c => `${c.field}: ${c.oldValue} -> ${c.newValue}`).join(', ');
    }
    return JSON.stringify(log.details);
  }
  return 'No additional details';
};

const formatActivityMessage = (log: ActivityLog): string => {
  const actorName = log.actor?.name || 'System';
  let action = log.activityType.toLowerCase().replace(/_/g, ' ');
  let entityInfo = log.entityType ? `${log.entityType.toLowerCase()}` : '';
  
  // More descriptive messages
  switch (log.activityType) {
    case 'CHORE_CREATED':
      action = `created a new chore`;
      entityInfo = (typeof log.details === 'object' && log.details?.name) ? `"${log.details.name}"` : entityInfo;
      break;
    case 'CHORE_UPDATED':
      action = `updated chore`;
      entityInfo = (typeof log.details === 'object' && log.details?.name) ? `"${log.details.name}"` : entityInfo;
      break;
    case 'CHORE_ASSIGNED':
      action = `assigned chore`;
      entityInfo = (typeof log.details === 'object' && log.details?.choreName && log.details?.assignedToName) ? `${log.details.choreName} to ${log.details.assignedToName}` : (typeof log.details === 'object' && log.details?.choreName) ? `${log.details.choreName} to a user` : entityInfo;
      break;
    case 'CHORE_COMPLETED':
      action = `completed chore`;
      entityInfo = (typeof log.details === 'object' && log.details?.name) ? `"${log.details.name}"` : entityInfo;
      break;
    case 'CHORE_ROTATED':
      action = `rotated chore`;
      entityInfo = (typeof log.details === 'object' && log.details?.choreName && log.details?.nextAssigneeName) ? `${log.details.choreName}, next assignee: ${log.details.nextAssigneeName}` : (typeof log.details === 'object' && log.details?.choreName) ? `${log.details.choreName}, next assignee: N/A` : entityInfo;
      break;
    case 'EXPENSE_CREATED':
      action = `added a new expense`;
      entityInfo = (typeof log.details === 'object' && log.details?.description) ? `"${log.details.description}"` : entityInfo;
      break;
    case 'EXPENSE_SHARE_SETTLED':
      action = `settled a share for expense`;
      entityInfo = (typeof log.details === 'object' && log.details?.expenseDescription && log.details?.memberName) ? `${log.details.expenseDescription} (share for ${log.details.memberName})` : (typeof log.details === 'object' && log.details?.expenseDescription) ? `${log.details.expenseDescription} (share for user)` : entityInfo;
      break;
    // Add more cases as needed
    default:
      // Default formatting for other types
      if (typeof log.details === 'object' && log.details !== null) {
        if (log.details.name) {
          action = `${action} "${log.details.name}"`;
        } else if (log.details.description) {
          action = `${action} "${log.details.description}"`;
        }
      }
      break;
  }
  return `${actorName} ${action}${entityInfo ? ' ' + entityInfo : ''}.`;
};

export default function ActivityLogPage() {
  const [activityData, setActivityData] = useState<PaginatedActivityLogResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const fetchLogs = useCallback(async (page: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getActivityLogs({ page, limit: ITEMS_PER_PAGE });
      setActivityData(data);
    } catch (err) {
      console.error('Error fetching activity logs:', err);
      setError('Failed to load activity logs. Please try again later.');
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchLogs(currentPage);
  }, [fetchLogs, currentPage]);

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1);
    }
  };

  const handleNextPage = () => {
    if (activityData && currentPage < activityData.totalPages) {
      setCurrentPage(prev => prev + 1);
    }
  };

  if (isLoading && !activityData) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-8rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-4">
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  // Determine if we should show the "no activity" message or the table
  const showNoActivityMessage = !activityData || activityData.logs.length === 0;

  return (
    <div className="container mx-auto px-4 sm:px-6 md:px-8 pb-4 sm:pb-6 md:pb-8 pt-6">
      <header className="mb-8 md:mb-12 pb-6 border-b">
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
                <History className="h-10 w-10 text-primary hidden sm:block" />
                <div>
                  <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold">
                      Household Activity Log
                  </h1>
                  <p className="text-md sm:text-lg text-muted-foreground">
                      Track recent activities and changes within your household.
                  </p>
                </div>
            </div>
            <Button variant="outline" asChild>
                <Link href="/dashboard"><ArrowLeft className="mr-2 h-4 w-4"/>Back to Dashboard</Link>
            </Button>
        </div>
      </header>

      {showNoActivityMessage ? (
        <Card>
          <CardHeader>
            <CardTitle>Activity Log</CardTitle>
            <CardDescription>No recent activity found for your household.</CardDescription>
          </CardHeader>
          <CardContent>
            <p>It looks like things are quiet around here!</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="sr-only"> {/* Hide default CardHeader if table is shown, title is in main header */}
            <CardTitle>Household Activity Log</CardTitle>
            <CardDescription>
              Track recent activities and changes within your household.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">Actor</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead className="text-right">Date & Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activityData!.logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      <div className="flex items-center">
                        {getActivityIcon(log.activityType)}
                        {log.actor?.name || 'System'}
                      </div>
                    </TableCell>
                    <TableCell>{formatActivityMessage(log)}</TableCell>
                    <TableCell className="text-right">
                      {format(parseISO(log.createdAt), 'MMM d, yyyy, h:mm a')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {isLoading && (
              <div className="flex justify-center items-center py-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            )}
            <div className="flex items-center justify-end space-x-2 py-4">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePreviousPage}
                disabled={currentPage === 1 || isLoading}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleNextPage}
                disabled={!activityData || currentPage === activityData.totalPages || isLoading || activityData.logs.length < ITEMS_PER_PAGE}
              >
                Next
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {activityData?.page || 1} of {activityData?.totalPages || 1} (Total: {activityData?.total || 0} logs)
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 