'use client';

import React, { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid'; // Optional: if you want time grid views
import listPlugin from '@fullcalendar/list'; // Optional: if you want list views
import { getCalendarEvents } from '../../../services/calendarService';
import type { CalendarEvent } from '../../../types/calendar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { Loader2, AlertTriangle, CalendarDays, ArrowLeft } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import Link from 'next/link';
import { DatesSetArg } from '@fullcalendar/core'; // Corrected typo: DateSetArg -> DatesSetArg
import { PageLoader } from '../../../components/ui/page-loader';

const FullCalendar = dynamic(() => import('@fullcalendar/react'), {
  ssr: false,
  loading: () => <div className="flex justify-center items-center h-[500px]"><PageLoader /></div>,
});

export default function CalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEvents = useCallback(async (fetchInfo: { start: Date; end: Date; }) => {
    setIsLoading(true);
    setError(null);
    console.log('Fetching events for range:', fetchInfo.start.toISOString(), fetchInfo.end.toISOString());
    try {
      const fetchedEvents = await getCalendarEvents({
        startDate: fetchInfo.start.toISOString(),
        endDate: fetchInfo.end.toISOString(),
      });
      console.log('Fetched events:', fetchedEvents);
      setEvents(fetchedEvents);
    } catch (err) {
      console.error('Error fetching calendar events:', err);
      setError('Failed to load calendar events. Please try again later.');
      setEvents([]); // Clear events on error
    }
    setIsLoading(false);
  }, []);
  
  return (
    <div className="container mx-auto px-4 sm:px-6 md:px-8 pb-4 sm:pb-6 md:pb-8 pt-6">
      <header className="mb-8 md:mb-12 pb-6 border-b">
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
                <CalendarDays className="h-10 w-10 text-primary hidden sm:block" />
                <div>
                  <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold">
                      Household Calendar
                  </h1>
                  <p className="text-md sm:text-lg text-muted-foreground">
                      View chores and expenses on a calendar.
                  </p>
                </div>
            </div>
            <Button variant="outline" asChild>
                <Link href="/dashboard"><ArrowLeft className="mr-2 h-4 w-4"/>Back to Dashboard</Link>
            </Button>
        </div>
      </header>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
            <div>
                <CardTitle>Calendar</CardTitle>
                <CardDescription>Chore due dates and expense dates.</CardDescription>
            </div>
            {isLoading && <Loader2 className="h-6 w-6 animate-spin text-primary" />}
        </CardHeader>
        <CardContent>
          {error && (
            <div className="p-4 mb-4 text-sm text-red-700 bg-red-100 rounded-lg dark:bg-red-200 dark:text-red-800" role="alert">
              <span className="font-medium">Error!</span> {error}
            </div>
          )}
          <div className="fc-wrapper"> 
            <FullCalendar
              plugins={[dayGridPlugin, timeGridPlugin, listPlugin]}
              initialView="dayGridMonth"
              headerToolbar={{
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek'
              }}
              events={events}
              datesSet={(dateInfo: DatesSetArg) => {
                fetchEvents({ start: dateInfo.view.activeStart, end: dateInfo.view.activeEnd });
              }}
              height="auto"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 