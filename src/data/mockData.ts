import { Pet, CareRecord, AbnormalReport, Message, DailyStats } from '@/types';

export const mockPets: Pet[] = [
  {
    id: '1',
    name: '豆豆',
    type: 'dog',
    breed: '金毛寻回犬',
    gender: 'male',
    age: '3岁',
    weight: '28kg',
    avatar: 'https://picsum.photos/id/237/200/200',
    ownerName: '张先生',
    ownerPhone: '138****1234',
    checkInDate: '2026-06-10',
    checkOutDate: '2026-06-20',
    roomNumber: 'A-101',
    vaccineInfo: [
      { id: 'v1', name: '狂犬疫苗', date: '2026-03-15', nextDate: '2027-03-15' },
      { id: 'v2', name: '六联疫苗', date: '2026-03-15', nextDate: '2027-03-15' }
    ],
    notes: '喜欢散步，每天需要遛放2次，对鸡肉过敏',
    status: 'checked-in'
  },
  {
    id: '2',
    name: '咪咪',
    type: 'cat',
    breed: '英国短毛猫',
    gender: 'female',
    age: '2岁',
    weight: '4.5kg',
    avatar: 'https://picsum.photos/id/659/200/200',
    ownerName: '李女士',
    ownerPhone: '139****5678',
    checkInDate: '2026-06-12',
    checkOutDate: '2026-06-18',
    roomNumber: 'B-203',
    vaccineInfo: [
      { id: 'v3', name: '狂犬疫苗', date: '2026-02-20', nextDate: '2027-02-20' },
      { id: 'v4', name: '猫三联', date: '2026-02-20', nextDate: '2027-02-20' }
    ],
    notes: '比较胆小，需要安静环境，喜欢吃鱼罐头',
    status: 'checked-in'
  },
  {
    id: '3',
    name: '旺财',
    type: 'dog',
    breed: '柴犬',
    gender: 'male',
    age: '1岁半',
    weight: '10kg',
    avatar: 'https://picsum.photos/id/718/200/200',
    ownerName: '王先生',
    ownerPhone: '137****9012',
    checkInDate: '2026-06-13',
    checkOutDate: '2026-06-25',
    roomNumber: 'A-105',
    vaccineInfo: [
      { id: 'v5', name: '狂犬疫苗', date: '2026-01-10', nextDate: '2027-01-10' },
      { id: 'v6', name: '六联疫苗', date: '2026-01-10', nextDate: '2027-01-10' }
    ],
    notes: '活泼好动，需要大量运动，不喜欢陌生人',
    status: 'checked-in'
  },
  {
    id: '4',
    name: '小白',
    type: 'cat',
    breed: '布偶猫',
    gender: 'female',
    age: '4岁',
    weight: '5kg',
    avatar: 'https://picsum.photos/id/783/200/200',
    ownerName: '赵女士',
    ownerPhone: '136****3456',
    checkInDate: '2026-06-11',
    checkOutDate: '2026-06-16',
    roomNumber: 'B-201',
    vaccineInfo: [
      { id: 'v7', name: '狂犬疫苗', date: '2026-04-05', nextDate: '2027-04-05' },
      { id: 'v8', name: '猫三联', date: '2026-04-05', nextDate: '2027-04-05' }
    ],
    notes: '温顺亲人，喜欢被抚摸，肠胃较弱',
    status: 'checked-in'
  },
  {
    id: '5',
    name: '皮皮',
    type: 'dog',
    breed: '泰迪',
    gender: 'male',
    age: '5岁',
    weight: '6kg',
    avatar: 'https://picsum.photos/id/1025/200/200',
    ownerName: '陈先生',
    ownerPhone: '135****7890',
    checkInDate: '2026-06-14',
    checkOutDate: '2026-06-22',
    roomNumber: 'A-108',
    vaccineInfo: [
      { id: 'v9', name: '狂犬疫苗', date: '2026-05-01', nextDate: '2027-05-01' },
      { id: 'v10', name: '六联疫苗', date: '2026-05-01', nextDate: '2027-05-01' }
    ],
    notes: '聪明粘人，每天需要梳毛，有心脏病需定时服药',
    status: 'checked-in'
  }
];

export const mockCareRecords: CareRecord[] = [
  {
    id: 'c1',
    petId: '1',
    petName: '豆豆',
    date: '2026-06-15',
    feeding: [
      { id: 'f1', time: '08:00', foodType: '狗粮（皇家）', amount: '150g', completed: true },
      { id: 'f2', time: '18:00', foodType: '狗粮（皇家）', amount: '150g', completed: false }
    ],
    watering: [
      { id: 'w1', time: '09:00', amount: '200ml', completed: true },
      { id: 'w2', time: '15:00', amount: '200ml', completed: true }
    ],
    walking: [
      { id: 'wk1', startTime: '07:30', endTime: '08:15', duration: 45, status: 'completed' },
      { id: 'wk2', startTime: '17:00', endTime: undefined, duration: undefined, status: 'pending' }
    ],
    defecation: [
      { id: 'd1', time: '07:50', type: 'normal', notes: '形态正常' }
    ],
    grooming: {
      id: 'g1',
      scheduledTime: '14:00',
      completed: true,
      completedTime: '14:30',
      type: '梳毛+清洁'
    },
    photos: [
      'https://picsum.photos/id/237/300/300',
      'https://picsum.photos/id/1025/300/300'
    ],
    medication: []
  },
  {
    id: 'c2',
    petId: '2',
    petName: '咪咪',
    date: '2026-06-15',
    feeding: [
      { id: 'f3', time: '08:30', foodType: '猫粮+鱼罐头', amount: '80g', completed: true },
      { id: 'f4', time: '18:30', foodType: '猫粮', amount: '60g', completed: false }
    ],
    watering: [
      { id: 'w3', time: '10:00', amount: '100ml', completed: true }
    ],
    walking: [],
    defecation: [
      { id: 'd2', time: '11:20', type: 'normal' }
    ],
    grooming: null,
    photos: [
      'https://picsum.photos/id/659/300/300'
    ],
    medication: []
  },
  {
    id: 'c3',
    petId: '3',
    petName: '旺财',
    date: '2026-06-15',
    feeding: [
      { id: 'f5', time: '08:00', foodType: '狗粮', amount: '100g', completed: true },
      { id: 'f6', time: '18:00', foodType: '狗粮', amount: '100g', completed: false }
    ],
    watering: [
      { id: 'w4', time: '09:30', amount: '150ml', completed: true },
      { id: 'w5', time: '16:00', amount: '150ml', completed: false }
    ],
    walking: [
      { id: 'wk3', startTime: '08:15', endTime: '09:00', duration: 45, status: 'completed' },
      { id: 'wk4', startTime: '15:30', endTime: undefined, duration: undefined, status: 'ongoing' }
    ],
    defecation: [],
    grooming: {
      id: 'g2',
      scheduledTime: '16:00',
      completed: false,
      type: '洗澡'
    },
    photos: [
      'https://picsum.photos/id/718/300/300'
    ],
    medication: []
  },
  {
    id: 'c4',
    petId: '4',
    petName: '小白',
    date: '2026-06-15',
    feeding: [
      { id: 'f7', time: '09:00', foodType: '猫粮（肠道处方粮）', amount: '70g', completed: true },
      { id: 'f8', time: '19:00', foodType: '猫粮（肠道处方粮）', amount: '70g', completed: false }
    ],
    watering: [
      { id: 'w6', time: '10:30', amount: '80ml', completed: true }
    ],
    walking: [],
    defecation: [
      { id: 'd3', time: '12:00', type: 'soft', notes: '略软，需观察' }
    ],
    grooming: null,
    photos: [
      'https://picsum.photos/id/783/300/300'
    ],
    medication: [
      { id: 'm1', name: '益生菌', dosage: '1包', scheduledTime: '09:00', completed: true, completedTime: '09:05' },
      { id: 'm2', name: '益生菌', dosage: '1包', scheduledTime: '21:00', completed: false }
    ]
  },
  {
    id: 'c5',
    petId: '5',
    petName: '皮皮',
    date: '2026-06-15',
    feeding: [
      { id: 'f9', time: '08:30', foodType: '处方狗粮', amount: '60g', completed: true },
      { id: 'f10', time: '18:30', foodType: '处方狗粮', amount: '60g', completed: false }
    ],
    watering: [
      { id: 'w7', time: '09:30', amount: '100ml', completed: true },
      { id: 'w8', time: '15:30', amount: '100ml', completed: true }
    ],
    walking: [
      { id: 'wk5', startTime: '08:00', endTime: '08:30', duration: 30, status: 'completed' }
    ],
    defecation: [
      { id: 'd4', time: '08:20', type: 'normal' }
    ],
    grooming: {
      id: 'g3',
      scheduledTime: '11:00',
      completed: true,
      completedTime: '11:45',
      type: '梳毛+修剪'
    },
    photos: [
      'https://picsum.photos/id/1025/300/300'
    ],
    medication: [
      { id: 'm3', name: '心脏药物', dosage: '半片', scheduledTime: '08:30', completed: true, completedTime: '08:35' },
      { id: 'm4', name: '心脏药物', dosage: '半片', scheduledTime: '20:30', completed: false }
    ]
  }
];

export const mockAbnormalReports: AbnormalReport[] = [
  {
    id: 'r1',
    petId: '4',
    petName: '小白',
    reportTime: '2026-06-15 12:30',
    symptoms: ['食欲不振', '粪便偏软'],
    description: '今天中午小白食欲不佳，粪便偏软，已喂益生菌，持续观察中。',
    photos: [
      'https://picsum.photos/id/783/300/300'
    ],
    status: 'processing',
    handler: '李店员',
    resolution: '已联系宠物医生，建议继续观察，如加重则送医。'
  },
  {
    id: 'r2',
    petId: '5',
    petName: '皮皮',
    reportTime: '2026-06-14 21:00',
    symptoms: ['轻微咳嗽'],
    description: '皮皮晚间有轻微咳嗽，已提醒主人，继续观察。',
    photos: [],
    status: 'resolved',
    handler: '王店员',
    resolution: '次日已恢复正常，无大碍。'
  }
];

export const mockMessages: Message[] = [
  {
    id: 'msg1',
    type: 'care-update',
    title: '豆豆今日照护更新',
    content: '豆豆已完成早餐喂食、上午遛放和排便，状态良好。',
    time: '2026-06-15 09:30',
    petId: '1',
    petName: '豆豆',
    read: true,
    receiptConfirmed: true
  },
  {
    id: 'msg2',
    type: 'abnormal-alert',
    title: '小白异常情况提醒',
    content: '小白出现食欲不振、粪便偏软症状，已处理并观察。',
    time: '2026-06-15 12:35',
    petId: '4',
    petName: '小白',
    read: false
  },
  {
    id: 'msg3',
    type: 'care-update',
    title: '咪咪今日照护更新',
    content: '咪咪已完成早餐喂食和饮水，状态良好。',
    time: '2026-06-15 10:00',
    petId: '2',
    petName: '咪咪',
    read: true,
    receiptConfirmed: false
  },
  {
    id: 'msg4',
    type: 'owner-receipt',
    title: '张先生已确认照护回执',
    content: '豆豆主人确认了昨日照护记录。',
    time: '2026-06-15 08:00',
    petId: '1',
    petName: '豆豆',
    read: true
  },
  {
    id: 'msg5',
    type: 'rating',
    title: '收到新的服务评价',
    content: '王先生对旺财的寄养服务给出了5星好评！',
    time: '2026-06-14 20:00',
    petId: '3',
    petName: '旺财',
    read: true,
    rating: 5,
    ratingComment: '非常专业，照顾得很好！'
  }
];

export const mockDailyStats: DailyStats[] = [
  { date: '2026-06-09', totalPets: 8, checkedInPets: 8, careTasksCompleted: 45, careTasksTotal: 48, abnormalReports: 0, revenue: 1200 },
  { date: '2026-06-10', totalPets: 10, checkedInPets: 10, careTasksCompleted: 55, careTasksTotal: 60, abnormalReports: 1, revenue: 1500 },
  { date: '2026-06-11', totalPets: 12, checkedInPets: 12, careTasksCompleted: 68, careTasksTotal: 72, abnormalReports: 0, revenue: 1800 },
  { date: '2026-06-12', totalPets: 11, checkedInPets: 11, careTasksCompleted: 60, careTasksTotal: 66, abnormalReports: 2, revenue: 1650 },
  { date: '2026-06-13', totalPets: 9, checkedInPets: 9, careTasksCompleted: 52, careTasksTotal: 54, abnormalReports: 0, revenue: 1350 },
  { date: '2026-06-14', totalPets: 7, checkedInPets: 7, careTasksCompleted: 40, careTasksTotal: 42, abnormalReports: 1, revenue: 1050 },
  { date: '2026-06-15', totalPets: 5, checkedInPets: 5, careTasksCompleted: 18, careTasksTotal: 35, abnormalReports: 1, revenue: 750 }
];
