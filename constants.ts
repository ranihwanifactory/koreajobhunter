import { BusinessInfo, JobType } from './types';

export const BUSINESS_INFO: BusinessInfo = {
  name: '젊은인력',
  phone: '054-933-1566',
  address: '경북 성주군 성주순환로2길 69',
  bizNumber: '255-40-00421'
};

export const JOB_TYPES_LIST = [
  { label: '건설/현장', value: JobType.CONSTRUCTION, icon: 'fa-hammer' },
  { label: '농촌/농업', value: JobType.AGRICULTURE, icon: 'fa-seedling' },
  { label: '공장/생산', value: JobType.FACTORY, icon: 'fa-industry' },
  { label: '청소/미화', value: JobType.CLEANING, icon: 'fa-broom' },
  { label: '이사/운반', value: JobType.MOVING, icon: 'fa-box' },
  { label: '기타', value: JobType.OTHER, icon: 'fa-ellipsis-h' },
];