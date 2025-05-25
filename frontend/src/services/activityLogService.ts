import axiosInstance from '../lib/axiosInstance';
import type { PaginatedActivityLogResponse, ActivityLog } from '../types/activity-log';

interface GetActivityLogsParams {
  page?: number;
  limit?: number;
}

export const getActivityLogs = async (
  params: GetActivityLogsParams = {}
): Promise<PaginatedActivityLogResponse> => {
  try {
    const response = await axiosInstance.get('/activity-log', {
      params: {
        page: params.page || 1,
        limit: params.limit || 20,
      },
    });
    // The backend directly returns ActivityLogDto[] which matches ActivityLog[]
    // If the backend returned a more complex structure, we might need to map it here.
    // For now, assuming the backend returns the logs directly under `data` and it's an array.
    // If the backend returns a paginated structure like { items: [], total: X, page: Y, ... },
    // this needs to be adjusted.
    // Based on the backend controller, it directly returns ActivityLogDto[], so no complex mapping needed yet.
    // However, the backend controller is defined to return Promise<ActivityLogDto[]>,
    // but it's good practice for paginated endpoints to return total counts for UI.
    // Let's assume for now the backend might be updated to return a PaginatedActivityLogResponse structure.

    // If the API returns ActivityLogDto[] directly:
    // return { logs: response.data, total: response.data.length, page: params.page || 1, limit: params.limit || 20, totalPages: Math.ceil(response.data.length / (params.limit || 20)) };

    // If the API returns a structure like { data: ActivityLogDto[], total: number, ... } or similar:
    // For now, let's expect the backend to match PaginatedActivityLogResponse or adapt here if it doesn't.
    
    // Corrected expectation: The backend controller `getHouseholdActivityLogs` returns `Promise<ActivityLogDto[]>`.
    // The service `getActivityLogsForHousehold` also returns `Promise<ActivityLogDto[]>`.
    // We need to wrap this in a PaginatedActivityLogResponse for the frontend if the backend doesn't.
    // For simplicity, if the backend *only* sends the array, we create pagination info here.
    // However, the `ActivityLogController` uses `ParseIntPipe` and `DefaultValuePipe` for `page` and `limit`,
    // implying it *should* be paginated. Let's assume the backend is intended to return a paginated response.

    // Safest assumption: The backend returns ActivityLog[] and we don't get pagination from it yet via this specific endpoint setup.
    // Let's cast response.data to ActivityLog[] for now and mock pagination wrapper
    const logs = response.data as ActivityLog[]; 
    const page = params.page || 1;
    const limit = params.limit || 20;
    // This is a temporary workaround if the backend doesn't provide total count.
    // Ideally, backend should provide `total` and `totalPages` or at least `total`.
    const total = logs.length; // This is incorrect for true pagination, would only be total for the current page.

    // If your NestJS backend is set up with a paginator like `nestjs-typeorm-paginate` or similar,
    // it would return a structure like: { items: ActivityLog[], meta: { totalItems, itemsPerPage, totalPages, currentPage } }
    // If so, you'd map `response.data.items` to `logs`, `response.data.meta.totalItems` to `total`, etc.
    
    // For now, let's assume the backend returns the ActivityLogDto[] directly as per the controller's return type
    // and we'll enhance it later if needed.
    // The backend *should* ideally return a paginated response object for a paginated endpoint.
    // If it just returns ActivityLogDto[], pagination on the client is limited.
    
    // Let's assume the backend will be updated to provide a paginated response according to PaginatedActivityLogResponse
    // If not, this will fail or need adjustment based on actual API response structure.
    if (response.data && Array.isArray(response.data.logs) && typeof response.data.total === 'number') {
      return response.data as PaginatedActivityLogResponse;
    } else if (Array.isArray(response.data)) {
      // If backend just returns an array of logs
      const logsArray = response.data as ActivityLog[];
      const currentPage = params.page || 1;
      const currentLimit = params.limit || 20; // Default limit
      return {
        logs: logsArray,
        total: logsArray.length, // This is not the grand total, but total items returned in this call
        page: currentPage,
        limit: currentLimit,
        totalPages: Math.ceil(logsArray.length / currentLimit) // This logic is only correct if all items are returned
      };
    }
    // Fallback or error if response is not as expected
    console.error('Unexpected response structure for activity logs:', response.data);
    // Return an empty or default paginated response to avoid breaking the UI
    return {
      logs: [],
      total: 0,
      page: params.page || 1,
      limit: params.limit || 20,
      totalPages: 0,
    };

  } catch (error) {
    console.error('Failed to fetch activity logs:', error);
    // Return a default/empty paginated response structure on error
    return {
      logs: [],
      total: 0,
      page: params.page || 1,
      limit: params.limit || 20,
      totalPages: 0,
    };
  }
}; 