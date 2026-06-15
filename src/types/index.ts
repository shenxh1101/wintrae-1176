export interface Pet {
  id: string;
  name: string;
  type: 'dog' | 'cat' | 'other';
  breed: string;
  gender: 'male' | 'female';
  age: string;
  weight: string;
  avatar: string;
  ownerName: string;
  ownerPhone: string;
  checkInDate: string;
  checkOutDate: string;
  actualCheckOutDate?: string;
  roomNumber: string;
  vaccineInfo: VaccineInfo[];
  notes?: string;
  status: 'checked-in' | 'checked-out';
  ratingId?: string;
}

export interface VaccineInfo {
  id: string;
  name: string;
  date: string;
  nextDate?: string;
}

export interface CareRecord {
  id: string;
  petId: string;
  petName: string;
  date: string;
  feeding: FeedingRecord[];
  watering: WateringRecord[];
  walking: WalkingRecord[];
  defecation: DefecationRecord[];
  grooming: GroomingRecord | null;
  photos: string[];
  medication: MedicationRecord[];
}

export interface FeedingRecord {
  id: string;
  time: string;
  foodType: string;
  amount: string;
  completed: boolean;
}

export interface WateringRecord {
  id: string;
  time: string;
  amount: string;
  completed: boolean;
}

export interface WalkingRecord {
  id: string;
  startTime?: string;
  endTime?: string;
  duration?: number;
  status: 'pending' | 'ongoing' | 'completed';
}

export interface DefecationRecord {
  id: string;
  time: string;
  type: 'normal' | 'soft' | 'diarrhea' | 'constipation';
  notes?: string;
}

export interface GroomingRecord {
  id: string;
  scheduledTime: string;
  completed: boolean;
  completedTime?: string;
  type: string;
}

export interface MedicationRecord {
  id: string;
  name: string;
  dosage: string;
  scheduledTime: string;
  completed: boolean;
  completedTime?: string;
}

export interface AbnormalReport {
  id: string;
  petId: string;
  petName: string;
  reportTime: string;
  symptoms: string[];
  description: string;
  photos: string[];
  status: 'pending' | 'processing' | 'resolved';
  handler?: string;
  resolution?: string;
  resolvedTime?: string;
}

export type MessageType = 'care-update' | 'abnormal-alert' | 'owner-receipt' | 'rating' | 'care-summary' | 'follow-up' | 'abnormal-resolved';

export type RatingStatus = 'pending' | 'rated' | 'visited';

export interface CareDetailItem {
  type: 'feeding' | 'watering' | 'walking' | 'defecation' | 'grooming' | 'medication' | 'photo';
  time: string;
  desc: string;
  photoUrl?: string;
}

export interface FollowUpRecord {
  id: string;
  type: 'phone' | 'onsite' | 'compensation' | 'other';
  handler: string;
  content: string;
  time: string;
  amount?: number;
}

export interface Message {
  id: string;
  type: MessageType;
  title: string;
  content: string;
  time: string;
  date?: string;
  petId?: string;
  petName?: string;
  read: boolean;
  confirmed?: boolean;
  receiptConfirmed?: boolean;
  rating?: number;
  ratingComment?: string;
  ratingStatus?: RatingStatus;
  reportId?: string;
  careDetails?: CareDetailItem[];
  isSummary?: boolean;
  summaryCount?: number;
  expanded?: boolean;
  stayKey?: string;
  followUps?: FollowUpRecord[];
  abnormalCount?: number;
  totalCareDays?: number;
}

export interface StayGroup {
  stayKey: string;
  petId: string;
  petName: string;
  petAvatar?: string;
  checkInDate: string;
  checkOutDate?: string;
  status: 'checked-in' | 'checked-out';
  messages: Message[];
  unreadCount: number;
  latestTime: string;
  summaryText: string;
  expanded?: boolean;
}

export interface DailyStats {
  date: string;
  totalPets: number;
  checkedInPets: number;
  careTasksCompleted: number;
  careTasksTotal: number;
  abnormalReports: number;
  revenue: number;
}
