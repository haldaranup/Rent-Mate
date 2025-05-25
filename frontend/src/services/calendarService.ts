import axiosInstance from '../lib/axiosInstance';
import type { CalendarEvent } from '../types/calendar';

interface GetCalendarEventsParams {
  startDate: string; // ISO string
  endDate: string;   // ISO string
}

export const getCalendarEvents = async (
  params: GetCalendarEventsParams
): Promise<CalendarEvent[]> => {
  try {
    const response = await axiosInstance.get('/calendar/events', {
      params: {
        startDate: params.startDate,
        endDate: params.endDate,
      },
    });
    return response.data as CalendarEvent[]; // Assuming backend returns CalendarEventDto[] directly
  } catch (error) {
    console.error('Failed to fetch calendar events:', error);
    // Depending on how you want to handle errors, you might throw or return an empty array
    // For a calendar, returning an empty array might be preferable to breaking the UI
    return []; 
  }
}; 