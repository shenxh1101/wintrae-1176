import { create } from 'zustand';
import Taro from '@tarojs/taro';
import { Pet, CareRecord, AbnormalReport, Message, DailyStats, VaccineInfo, CareDetailItem, StayGroup, FollowUpRecord, RatingStatus } from '@/types';
import { mockPets, mockCareRecords, mockAbnormalReports, mockMessages, mockDailyStats } from '@/data/mockData';

const STORAGE_KEY = 'pet_fostering_store_v2';

interface AppState {
  pets: Pet[];
  careRecords: CareRecord[];
  abnormalReports: AbnormalReport[];
  messages: Message[];
  dailyStats: DailyStats[];
  staysExpanded: Record<string, boolean>;

  initFromStorage: () => void;
  saveToStorage: () => void;

  getStayKey: (petId: string) => string;
  getStayGroups: () => StayGroup[];
  toggleStayExpand: (stayKey: string) => void;
  markStayRead: (stayKey: string) => void;

  addPet: (pet: Pet) => void;
  updatePet: (id: string, updates: Partial<Pet>) => void;
  checkoutPet: (petId: string) => void;

  updateCareRecord: (petId: string, date: string, updates: (record: CareRecord) => CareRecord) => void;
  getOrCreateCareRecord: (petId: string, petName: string, date: string) => CareRecord;
  addCarePhoto: (petId: string, date: string, photoUrl: string) => void;
  getCareRecordsByPet: (petId: string) => CareRecord[];

  addAbnormalReport: (report: AbnormalReport) => void;
  updateAbnormalReport: (id: string, updates: Partial<AbnormalReport>) => void;

  addMessage: (message: Message) => void;
  addCareMessage: (petId: string, petName: string, item: CareDetailItem, date?: string) => void;
  updateMessage: (id: string, updates: Partial<Message>) => void;
  markMessageRead: (id: string) => void;
  toggleSummaryExpand: (id: string) => void;

  addFollowUp: (ratingMessageId: string, record: Omit<FollowUpRecord, 'id'>) => void;
  updateRatingStatus: (ratingMessageId: string, status: RatingStatus) => void;
}

const genId = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

const getToday = () => new Date().toISOString().split('T')[0];
const getNow = () => new Date().toISOString();
const formatTime = (iso: string) => {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

const getInitialState = () => ({
  pets: mockPets,
  careRecords: mockCareRecords,
  abnormalReports: mockAbnormalReports,
  messages: mockMessages,
  dailyStats: mockDailyStats,
  staysExpanded: {} as Record<string, boolean>
});

const CARE_LABELS: Record<string, string> = {
  feeding: '喂食', watering: '饮水', walking: '遛放',
  defecation: '排便', grooming: '洗护', medication: '用药', photo: '照片'
};

export const useAppStore = create<AppState>((set, get) => ({
  ...getInitialState(),

  initFromStorage: () => {
    try {
      const stored = Taro.getStorageSync(STORAGE_KEY);
      if (stored && typeof stored === 'object') {
        console.log('[Store] Loaded from storage');
        set({
          pets: stored.pets || mockPets,
          careRecords: stored.careRecords || mockCareRecords,
          abnormalReports: stored.abnormalReports || mockAbnormalReports,
          messages: stored.messages || mockMessages,
          dailyStats: stored.dailyStats || mockDailyStats,
          staysExpanded: stored.staysExpanded || {}
        });
      } else {
        console.log('[Store] No stored data, using defaults and saving');
        get().saveToStorage();
      }
    } catch (err) {
      console.error('[Store] Failed to load from storage:', err);
    }
  },

  saveToStorage: () => {
    try {
      const state = get();
      Taro.setStorageSync(STORAGE_KEY, {
        pets: state.pets,
        careRecords: state.careRecords,
        abnormalReports: state.abnormalReports,
        messages: state.messages,
        dailyStats: state.dailyStats,
        staysExpanded: state.staysExpanded
      });
      console.log('[Store] Saved to storage');
    } catch (err) {
      console.error('[Store] Failed to save to storage:', err);
    }
  },

  getStayKey: (petId) => {
    const pet = get().pets.find(p => p.id === petId);
    return pet ? `${petId}_${pet.checkInDate}` : petId;
  },

  getStayGroups: () => {
    const state = get();
    const groupMap = new Map<string, StayGroup>();

    state.pets.forEach(pet => {
      const stayKey = `${pet.id}_${pet.checkInDate}`;
      const petMessages = state.messages.filter(m => m.petId === pet.id && m.stayKey === stayKey);
      const unreadCount = petMessages.filter(m => !m.read).length;
      const latestTime = petMessages.length > 0
        ? petMessages.reduce((a, b) => new Date(a.time) > new Date(b.time) ? a : b).time
        : pet.checkInDate;

      const abnormalCount = state.abnormalReports.filter(
        r => r.petId === pet.id && new Date(r.reportTime) >= new Date(pet.checkInDate)
      ).length;

      const careDays = state.careRecords.filter(r => r.petId === pet.id).length;

      const statusText = pet.status === 'checked-out' ? '已离店' : '入住在住';
      const summaryText = petMessages.length > 0
        ? `${statusText} · ${careDays}天记录 · ${abnormalCount}条异常`
        : `${statusText} · 暂无动态`;

      groupMap.set(stayKey, {
        stayKey,
        petId: pet.id,
        petName: pet.name,
        petAvatar: pet.avatar,
        checkInDate: pet.checkInDate,
        checkOutDate: pet.actualCheckOutDate || pet.checkOutDate,
        status: pet.status,
        messages: petMessages.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()),
        unreadCount,
        latestTime,
        summaryText,
        expanded: false
      });
    });

    return Array.from(groupMap.values())
      .sort((a, b) => new Date(b.latestTime).getTime() - new Date(a.latestTime).getTime());
  },

  toggleStayExpand: (stayKey) => {
    set(state => ({
      staysExpanded: {
        ...state.staysExpanded,
        [stayKey]: !state.staysExpanded[stayKey]
      }
    }));
    get().saveToStorage();
  },

  markStayRead: (stayKey) => {
    const state = get();
    const stayGroup = state.messages.filter(m => m.stayKey === stayKey);
    if (stayGroup.length === 0) return;
    const petId = stayGroup[0].petId;
    set(s => ({
      messages: s.messages.map(m =>
        m.stayKey === stayKey ? { ...m, read: true } : m
      )
    }));
    get().saveToStorage();
  },

  addPet: (pet) => {
    set(state => ({ pets: [pet, ...state.pets] }));
    const today = getToday();
    const stayKey = `${pet.id}_${pet.checkInDate}`;
    const newCareRecord: CareRecord = {
      id: `c_${pet.id}_${today}`,
      petId: pet.id,
      petName: pet.name,
      date: today,
      feeding: [],
      watering: [],
      walking: [],
      defecation: [],
      grooming: null,
      photos: [],
      medication: []
    };
    set(state => ({ careRecords: [newCareRecord, ...state.careRecords] }));

    const welcomeMsg: Message = {
      id: `checkin_${pet.id}_${today}`,
      type: 'care-update',
      title: `${pet.name} 入住啦`,
      content: `${pet.ownerName} 送 ${pet.name} 入住 ${pet.roomNumber}，请多关照~`,
      time: getNow(),
      date: today,
      petId: pet.id,
      petName: pet.name,
      read: false,
      stayKey
    };
    set(s => ({ messages: [welcomeMsg, ...s.messages] }));

    get().saveToStorage();
    console.log('[Store] Added pet:', pet.name);
  },

  updatePet: (id, updates) => {
    set(state => ({
      pets: state.pets.map(p => p.id === id ? { ...p, ...updates } : p)
    }));
    get().saveToStorage();
  },

  checkoutPet: (petId) => {
    const pet = get().pets.find(p => p.id === petId);
    if (!pet) return;
    const stayKey = `${pet.id}_${pet.checkInDate}`;
    const today = getToday();
    const now = getNow();

    set(state => ({
      pets: state.pets.map(p =>
        p.id === petId ? { ...p, status: 'checked-out' as const, actualCheckOutDate: today } : p
      )
    }));

    const petRecords = get().careRecords.filter(r => r.petId === petId);
    const totalDays = petRecords.length;
    let totalFeeding = 0, totalWatering = 0, totalWalking = 0, totalDefecation = 0, totalPhotos = 0;
    petRecords.forEach(r => {
      totalFeeding += r.feeding.filter(f => f.completed).length;
      totalWatering += r.watering.filter(w => w.completed).length;
      totalWalking += r.walking.filter(w => w.status === 'completed').length;
      totalDefecation += r.defecation.length;
      totalPhotos += r.photos.length;
    });

    const receiptSummary: Message = {
      id: `rcpt_${petId}_${today}`,
      type: 'owner-receipt',
      title: `${pet.name} 寄养回执`,
      content: `共寄养${totalDays}天，完成喂食${totalFeeding}次、饮水${totalWatering}次、遛放${totalWalking}次、排便记录${totalDefecation}条、上传照片${totalPhotos}张`,
      time: now,
      date: today,
      petId: pet.id,
      petName: pet.name,
      read: false,
      receiptConfirmed: false,
      stayKey,
      totalCareDays: totalDays
    };
    set(state => ({ messages: [receiptSummary, ...state.messages] }));

    const ratingId = `rating_${petId}_${today}`;
    const ratingMsg: Message = {
      id: ratingId,
      type: 'rating',
      title: `请为 ${pet.name} 的本次寄养服务评价`,
      content: '您的反馈是我们改进的动力，感谢您的支持！',
      time: now,
      date: today,
      petId: pet.id,
      petName: pet.name,
      read: false,
      rating: 0,
      ratingComment: '',
      ratingStatus: 'pending',
      stayKey,
      followUps: []
    };
    set(state => ({ messages: [ratingMsg, ...state.messages] }));

    set(state => ({
      pets: state.pets.map(p => p.id === petId ? { ...p, ratingId } : p)
    }));

    get().saveToStorage();
    console.log('[Store] Checked out pet:', pet.name);
  },

  getOrCreateCareRecord: (petId, petName, date) => {
    const state = get();
    let record = state.careRecords.find(r => r.petId === petId && r.date === date);
    if (!record) {
      record = {
        id: `c_${petId}_${date}`,
        petId,
        petName,
        date,
        feeding: [],
        watering: [],
        walking: [],
        defecation: [],
        grooming: null,
        photos: [],
        medication: []
      };
      set(s => ({ careRecords: [record!, ...s.careRecords] }));
    }
    return record;
  },

  updateCareRecord: (petId, date, updater) => {
    get().getOrCreateCareRecord(petId, '', date);
    set(state => ({
      careRecords: state.careRecords.map(r =>
        r.petId === petId && r.date === date ? updater(r) : r
      )
    }));
    get().saveToStorage();
  },

  addCarePhoto: (petId, date, photoUrl) => {
    const pet = get().pets.find(p => p.id === petId);
    if (!pet) return;
    get().getOrCreateCareRecord(petId, pet.name, date);
    set(state => ({
      careRecords: state.careRecords.map(r =>
        r.petId === petId && r.date === date ? { ...r, photos: [...r.photos, photoUrl] } : r
      )
    }));
    get().saveToStorage();
  },

  getCareRecordsByPet: (petId) => {
    return get().careRecords
      .filter(r => r.petId === petId)
      .sort((a, b) => b.date.localeCompare(a.date));
  },

  addAbnormalReport: (report) => {
    const pet = get().pets.find(p => p.id === report.petId);
    const stayKey = pet ? `${pet.id}_${pet.checkInDate}` : report.petId;

    set(state => ({ abnormalReports: [report, ...state.abnormalReports] }));

    const alertMsg: Message = {
      id: `abn_${report.id}`,
      type: 'abnormal-alert',
      title: `${report.petName} 异常提醒`,
      content: `${report.symptoms.join('、')}，请及时处理`,
      time: report.reportTime,
      date: report.reportTime.split('T')[0],
      petId: report.petId,
      petName: report.petName,
      read: false,
      reportId: report.id,
      stayKey
    };
    set(s => ({ messages: [alertMsg, ...s.messages] }));

    get().saveToStorage();
    console.log('[Store] Added abnormal report for:', report.petName);
  },

  updateAbnormalReport: (id, updates) => {
    set(state => ({
      abnormalReports: state.abnormalReports.map(r =>
        r.id === id ? { ...r, ...updates } : r
      )
    }));

    if (updates.status === 'resolved') {
      const report = get().abnormalReports.find(r => r.id === id);
      if (report) {
        const pet = get().pets.find(p => p.id === report.petId);
        const stayKey = pet ? `${pet.id}_${pet.checkInDate}` : report.petId;
        const resolvedMsg: Message = {
          id: `abn_res_${id}`,
          type: 'abnormal-resolved',
          title: `${report.petName} 异常已处理`,
          content: updates.resolution || '异常已处理完成',
          time: getNow(),
          date: getToday(),
          petId: report.petId,
          petName: report.petName,
          read: false,
          reportId: id,
          stayKey
        };
        set(s => ({ messages: [resolvedMsg, ...s.messages] }));
      }
    }

    get().saveToStorage();
  },

  addMessage: (message) => {
    set(state => ({ messages: [message, ...state.messages] }));
    get().saveToStorage();
    console.log('[Store] Added message:', message.title);
  },

  addCareMessage: (petId, petName, item, date) => {
    const targetDate = date || getToday();
    const pet = get().pets.find(p => p.id === petId);
    const stayKey = pet ? `${pet.id}_${pet.checkInDate}` : petId;
    const summaryId = `sum_${petId}_${targetDate}`;

    const state = get();
    let existingSummary = state.messages.find(m => m.id === summaryId);

    if (existingSummary) {
      const details = [...(existingSummary.careDetails || []), item];
      const counts: Record<string, number> = {};
      details.forEach(d => { counts[d.type] = (counts[d.type] || 0) + 1; });
      const summaryText = Object.entries(counts)
        .map(([k, v]) => `${CARE_LABELS[k]}${v}${k === 'defecation' ? '条' : '次'}`)
        .join('、');
      set(s => ({
        messages: s.messages.map(m =>
          m.id === summaryId
            ? {
                ...m,
                careDetails: details,
                summaryCount: details.length,
                content: summaryText,
                time: getNow(),
                read: false,
                stayKey
              }
            : m
        )
      }));
    } else {
      const newSummary: Message = {
        id: summaryId,
        type: 'care-summary',
        title: `${petName} ${targetDate} 照护动态`,
        content: `${CARE_LABELS[item.type]}1${item.type === 'defecation' ? '条' : '次'}`,
        time: getNow(),
        date: targetDate,
        petId,
        petName,
        read: false,
        isSummary: true,
        summaryCount: 1,
        careDetails: [item],
        expanded: false,
        stayKey
      };
      set(s => ({ messages: [newSummary, ...s.messages] }));
    }
    get().saveToStorage();
  },

  updateMessage: (id, updates) => {
    set(state => ({
      messages: state.messages.map(m =>
        m.id === id ? { ...m, ...updates } : m
      )
    }));
    if (updates.rating && updates.rating > 0) {
      const msg = get().messages.find(m => m.id === id);
      if (msg && msg.petId) {
        set(s => ({
          pets: s.pets.map(p => p.id === msg.petId ? { ...p, ratingId: id } : p),
          messages: s.messages.map(m =>
            m.id === id ? { ...m, ratingStatus: 'rated' } : m
          )
        }));
      }
    }
    get().saveToStorage();
  },

  markMessageRead: (id) => {
    set(state => ({
      messages: state.messages.map(m =>
        m.id === id ? { ...m, read: true } : m
      )
    }));
    get().saveToStorage();
  },

  toggleSummaryExpand: (id) => {
    set(state => ({
      messages: state.messages.map(m =>
        m.id === id ? { ...m, expanded: !m.expanded } : m
      )
    }));
    get().saveToStorage();
  },

  addFollowUp: (ratingMessageId, record) => {
    const state = get();
    const msg = state.messages.find(m => m.id === ratingMessageId);
    if (!msg) return;
    const newRecord: FollowUpRecord = {
      id: `fu_${genId()}`,
      ...record
    };
    const followUps = [...(msg.followUps || []), newRecord];
    set(s => ({
      messages: s.messages.map(m =>
        m.id === ratingMessageId ? { ...m, followUps, ratingStatus: 'visited' } : m
      )
    }));
    get().saveToStorage();
  },

  updateRatingStatus: (ratingMessageId, status) => {
    set(state => ({
      messages: state.messages.map(m =>
        m.id === ratingMessageId ? { ...m, ratingStatus: status } : m
      )
    }));
    get().saveToStorage();
  }
}));
