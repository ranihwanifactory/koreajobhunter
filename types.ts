
export enum JobType {
  CONSTRUCTION = '건설/현장',
  AGRICULTURE = '농촌/농업',
  FACTORY = '공장/생산',
  CLEANING = '청소/미화',
  MOVING = '이사/운반',
  OTHER = '기타'
}

export interface WorkerProfile {
  id?: string; // Firestore Document ID
  email?: string;
  updatedAt?: string;
  
  name: string;
  phone: string;
  bankName: string;
  accountNumber: string;
  desiredJobs: JobType[];
  location: {
    latitude: number | null;
    longitude: number | null;
    addressString: string;
  };
  introduction: string;
  
  // Image URLs
  idCardImageUrl?: string;
  safetyCertImageUrl?: string;
  
  isAgreed: boolean;
}

export interface BusinessInfo {
  name: string;
  phone: string;
  address: string;
  bizNumber: string;
}

export interface JobPosting {
  id?: string;
  companyName: string;    // 업체명
  address: string;        // 현장 주소
  content: string;        // 업무 내용 (간단 설명)
  pay: string;            // 일당/급여
  date: string;           // 날짜/기간
  contact: string;        // 연락처
  isUrgent?: boolean;     // 긴급 여부
  createdAt: string;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  createdAt: string;
  type: 'job' | 'notice';
  linkId?: string;
}
