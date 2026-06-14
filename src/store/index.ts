import { create } from 'zustand';
import Taro from '@tarojs/taro';
import { Pet, CareRecord, AbnormalReport, Message, DailyStats, VaccineInfo, CareDetailItem } from '@/types';
import { mockPets, mockCareRecords, mockAbnormalReports, mockMessages, mockDailyStats } from '@/data/mockData';

const STORAGE_KEY = 'pet_fostering_store_v1';

interface AppState {
  pets: Pet[];
  careRecords: CareRecord[];
  abnormalReports: AbnormalReport[];
  messages: Message[];
  dailyStats: DailyStats[];

  initFromStorage: () => void;
  saveToStorage: () => void;

  addPet: (pet: Pet) => void;
  updatePet: (id: string, updates: Partial<Pet>) => void;
  checkoutPet: (petId: string) => void;

  updateCareRecord: (petId: string, updates: (record: CareRecord) => CareRecord) => void;
  addCarePhoto: (petId: string, photoUrl: string) => void;
  getCareRecordsByPet: (petId: string) => CareRecord[];

  addAbnormalReport: (report: AbnormalReport) => void;
  updateAbnormalReport: (id: string, updates: Partial<AbnormalReport>) => void;

  addMessage: (message: Message) => void;
  addCareMessage: (petId: string, petName: string, item: CareDetailItem) => void;
  updateMessage: (id: string, updates: Partial<Message>) => void;
  markMessageRead: (id: string) => void;
  toggleSummaryExpand: (id: string) => void;
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
  dailyStats: mockDailyStats
});

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
          dailyStats: stored.dailyStats || mockDailyStats
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
        dailyStats: state.dailyStats
      });
      console.log('[Store] Saved to storage');
    } catch (err) {
      console.error('[Store] Failed to save to storage:', err);
    }
  },

  addPet: (pet) => {
    set(state => ({ pets: [pet, ...state.pets] }));
    const today = getToday();
    const newCareRecord: CareRecord = {
      id: `c_${pet.id}`,
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
    const today = getToday();
    const now = getNow();
    set(state => ({
      pets: state.pets.map(p =>
        p.id === petId ? { ...p, status: 'checked-out' as const, actualCheckOutDate: today } : p
      )
    }));
    const summaryId = `sum_rcpt_${petId}_${today}`;
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
      id: summaryId,
      type: 'owner-receipt',
      title: `${pet.name} 寄养回执`,
      content: `共寄养${totalDays}天，完成喂食${totalFeeding}次、饮水${totalWatering}次、遛放${totalWalking}次、排便记录${totalDefecation}条、上传照片${totalPhotos}张`,
      time: now,
      date: today,
      petId: pet.id,
      petName: pet.name,
      read: false,
      receiptConfirmed: false
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
      ratingComment: ''
    };
    set(state => ({ messages: [ratingMsg, ...state.messages] }));
    set(state => ({
      pets: state.pets.map(p => p.id === petId ? { ...p, ratingId } : p)
    }));
    get().saveToStorage();
    console.log('[Store] Checked out pet:', pet.name);
  },

  updateCareRecord: (petId, updater) => {
    set(state => ({
      careRecords: state.careRecords.map(r =>
        r.petId === petId ? updater(r) : r
      )
    }));
    get().saveToStorage();
  },

  addCarePhoto: (petId, photoUrl) => {
    set(state => ({
      careRecords: state.careRecords.map(r =>
        r.petId === petId ? { ...r, photos: [...r.photos, photoUrl] } : r
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
    set(state => ({ abnormalReports: [report, ...state.abnormalReports] }));
    get().saveToStorage();
    console.log('[Store] Added abnormal report for:', report.petName);
  },

  updateAbnormalReport: (id, updates) => {
    set(state => ({
      abnormalReports: state.abnormalReports.map(r =>
        r.id === id ? { ...r, ...updates } : r
      )
    }));
    get().saveToStorage();
  },

  addMessage: (message) => {
    set(state => ({ messages: [message, ...state.messages] }));
    get().saveToStorage();
    console.log('[Store] Added message:', message.title);
  },

  addCareMessage: (petId, petName, item) => {
    const today = getToday();
    const state = get();
    const summaryId = `sum_${petId}_${today}`;
    let existingSummary = state.messages.find(m => m.id === summaryId);
    if (existingSummary) {
      const details = existingSummary.careDetails || [];
      details.push(item);
      const counts: Record<string, number> = {};
      details.forEach(d => { counts[d.type] = (counts[d.type] || 0) + 1; });
      const labels: Record<string, string> = {
        feeding: '喂食', watering: '饮水', walking: '遛放',
        defecation: '排便', grooming: '洗护', medication: '用药', photo: '照片'
      };
      const summaryText = Object.entries(counts)
        .map(([k, v]) => `${labels[k]}${v}次`)
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
                read: false
              }
            : m
        )
      }));
    } else {
      const newSummary: Message = {
        id: summaryId,
        type: 'care-summary',
        title: `${petName} ${today} 照护动态`,
        content: '',
        time: getNow(),
        date: today,
        petId,
        petName,
        read: false,
        isSummary: true,
        summaryCount: 1,
        careDetails: [item],
        expanded: false
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
          pets: s.pets.map(p => p.id === msg.petId ? { ...p, ratingId: id } : p)
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
  }
}));
