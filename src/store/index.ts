import { create } from 'zustand';
import Taro from '@tarojs/taro';
import { Pet, CareRecord, AbnormalReport, Message, DailyStats, VaccineInfo } from '@/types';
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

  updateCareRecord: (petId: string, updates: (record: CareRecord) => CareRecord) => void;
  addCarePhoto: (petId: string, photoUrl: string) => void;

  addAbnormalReport: (report: AbnormalReport) => void;
  updateAbnormalReport: (id: string, updates: Partial<AbnormalReport>) => void;

  addMessage: (message: Message) => void;
  updateMessage: (id: string, updates: Partial<Message>) => void;
  markMessageRead: (id: string) => void;
}

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
    const today = new Date().toISOString().split('T')[0];
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

  updateMessage: (id, updates) => {
    set(state => ({
      messages: state.messages.map(m =>
        m.id === id ? { ...m, ...updates } : m
      )
    }));
    get().saveToStorage();
  },

  markMessageRead: (id) => {
    set(state => ({
      messages: state.messages.map(m =>
        m.id === id ? { ...m, read: true } : m
      )
    }));
    get().saveToStorage();
  }
}));
