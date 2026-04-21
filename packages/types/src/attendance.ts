export interface Attendance {
  id: string;
  storeId: string;
  staffId: string;
  scheduleId?: string;
  clockIn: string;
  clockOut?: string;
  lat?: number;
  lng?: number;
}
