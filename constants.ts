

import { BusinessInfo, JobType } from './types';

export const BUSINESS_INFO: BusinessInfo = {
  name: '젊은인력사무소',
  phone: '054-933-1566',
  address: '경북 성주군 성주순환로2길 69',
  bizNumber: '255-40-00421',
  representative: '손영란',
  email: 'koreajobhunter@naver.com',
  bankAccount: '농협 302-65550038-11'
};

export const ADMIN_EMAIL = 'acehwan69@gmail.com';

export const JOB_TYPES_LIST = [
  { label: '건설/현장', value: JobType.CONSTRUCTION, icon: 'fa-hard-hat' },
  { label: '목수/목공', value: JobType.CARPENTER, icon: 'fa-hammer' },
  { label: '용접', value: JobType.WELDER, icon: 'fa-fire-alt' },
  { label: '전기', value: JobType.ELECTRICIAN, icon: 'fa-bolt' },
  { label: '도장/방수', value: JobType.PAINTING, icon: 'fa-paint-roller' },
  { label: '타일/미장', value: JobType.TILING, icon: 'fa-th-large' },
  { label: '농촌/농업', value: JobType.AGRICULTURE, icon: 'fa-seedling' },
  { label: '공장/생산', value: JobType.FACTORY, icon: 'fa-industry' },
  { label: '청소/미화', value: JobType.CLEANING, icon: 'fa-broom' },
  { label: '이사/운반', value: JobType.MOVING, icon: 'fa-truck-moving' },
  { label: '기타', value: JobType.OTHER, icon: 'fa-ellipsis-h' },
];
