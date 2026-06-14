import React, { useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, Image, ScrollView, Button } from '@tarojs/components';
import Taro from '@tarojs/taro';
import styles from './index.module.scss';
import { useAppStore } from '@/store';
import { CareRecord, FeedingRecord, WateringRecord, WalkingRecord, MedicationRecord, GroomingRecord, Message } from '@/types';
import classnames from 'classnames';

const CarePage: React.FC = () => {
  const careRecords = useAppStore(s => s.careRecords);
  const pets = useAppStore(s => s.pets);
  const updateCareRecord = useAppStore(s => s.updateCareRecord);
  const addCarePhoto = useAppStore(s => s.addCarePhoto);
  const addCareMessage = useAppStore(s => s.addCareMessage);
  const initFromStorage = useAppStore(s => s.initFromStorage);

  const checkedInIds = pets.filter(p => p.status === 'checked-in').map(p => p.id);
  const todayStr = new Date().toISOString().split('T')[0];
  const activeCareRecords = careRecords.filter(
    r => checkedInIds.includes(r.petId) && r.date === todayStr
  ).sort((a, b) => {
    const aIdx = checkedInIds.indexOf(a.petId);
    const bIdx = checkedInIds.indexOf(b.petId);
    return aIdx - bIdx;
  });

  const [refreshing, setRefreshing] = useState(false);
  const [walkingTimers, setWalkingTimers] = useState<Record<string, number>>({});
  const intervalRefs = useRef<Record<string, ReturnType<typeof setInterval>>>({});

  const today = new Date().toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long'
  });

  useEffect(() => {
    careRecords.forEach(record => {
      record.walking.forEach(walk => {
        if (walk.status === 'ongoing' && !intervalRefs.current[walk.id]) {
          intervalRefs.current[walk.id] = setInterval(() => {
            setWalkingTimers(prev => ({
              ...prev,
              [walk.id]: (prev[walk.id] || 0) + 1
            }));
          }, 1000);
        }
      });
    });
    return () => {
      Object.values(intervalRefs.current).forEach(timer => clearInterval(timer));
      intervalRefs.current = {};
    };
  }, [careRecords]);

  const getTotalStats = () => {
    let completed = 0;
    let total = 0;
    activeCareRecords.forEach(record => {
      record.feeding.forEach(f => { total++; if (f.completed) completed++; });
      record.watering.forEach(w => { total++; if (w.completed) completed++; });
      record.walking.forEach(w => { total++; if (w.status === 'completed') completed++; });
      record.medication.forEach(m => { total++; if (m.completed) completed++; });
      if (record.grooming) { total++; if (record.grooming.completed) completed++; }
    });
    return { completed, total, percent: total > 0 ? Math.round(completed / total * 100) : 0 };
  };

  const stats = getTotalStats();

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => {
      initFromStorage();
      setRefreshing(false);
      Taro.showToast({ title: '刷新成功', icon: 'success' });
    }, 800);
  }, [initFromStorage]);

  const nowTime = () => new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });

  const toggleFeeding = (petId: string, petName: string, feeding: FeedingRecord) => {
    const newCompleted = !feeding.completed;
    updateCareRecord(petId, r => ({
      ...r,
      feeding: r.feeding.map(f => f.id === feeding.id ? { ...f, completed: newCompleted } : f)
    }));
    if (newCompleted) {
      addCareMessage(petId, petName, {
        type: 'feeding',
        time: nowTime(),
        desc: `${feeding.time} 喂食完成（${feeding.foodType} ${feeding.amount}）`
      });
    }
    Taro.showToast({ title: newCompleted ? '打卡成功' : '已取消打卡', icon: 'success' });
  };

  const toggleWatering = (petId: string, petName: string, watering: WateringRecord) => {
    const newCompleted = !watering.completed;
    updateCareRecord(petId, r => ({
      ...r,
      watering: r.watering.map(w => w.id === watering.id ? { ...w, completed: newCompleted } : w)
    }));
    if (newCompleted) {
      addCareMessage(petId, petName, {
        type: 'watering',
        time: nowTime(),
        desc: `${watering.time} 饮水补充完成（${watering.amount}）`
      });
    }
    Taro.showToast({ title: newCompleted ? '打卡成功' : '已取消打卡', icon: 'success' });
  };

  const toggleMedication = (petId: string, petName: string, medication: MedicationRecord) => {
    const newCompleted = !medication.completed;
    updateCareRecord(petId, r => ({
      ...r,
      medication: r.medication.map(m => m.id === medication.id ? {
        ...m,
        completed: newCompleted,
        completedTime: newCompleted ? nowTime() : undefined
      } : m)
    }));
    if (newCompleted) {
      addCareMessage(petId, petName, {
        type: 'medication',
        time: nowTime(),
        desc: `${medication.scheduledTime} 用药完成（${medication.name} ${medication.dosage}）`
      });
    }
    Taro.showToast({ title: newCompleted ? '用药已记录' : '已取消', icon: 'success' });
  };

  const toggleGrooming = (petId: string, petName: string, grooming: GroomingRecord) => {
    const newCompleted = !grooming.completed;
    updateCareRecord(petId, r => ({
      ...r,
      grooming: grooming ? {
        ...grooming,
        completed: newCompleted,
        completedTime: newCompleted ? nowTime() : undefined
      } : null
    }));
    if (newCompleted) {
      addCareMessage(petId, petName, {
        type: 'grooming',
        time: nowTime(),
        desc: `${grooming.scheduledTime} 洗护完成（${grooming.type}）`
      });
    }
    Taro.showToast({ title: newCompleted ? '洗护已完成' : '已取消', icon: 'success' });
  };

  const handleWalking = (petId: string, petName: string, walking: WalkingRecord) => {
    if (walking.status === 'pending') {
      updateCareRecord(petId, r => ({
        ...r,
        walking: r.walking.map(w => w.id === walking.id ? {
          ...w,
          status: 'ongoing' as const,
          startTime: nowTime()
        } : w)
      }));
      setWalkingTimers(prev => ({ ...prev, [walking.id]: 0 }));
      intervalRefs.current[walking.id] = setInterval(() => {
        setWalkingTimers(prev => ({
          ...prev,
          [walking.id]: (prev[walking.id] || 0) + 1
        }));
      }, 1000);
      Taro.showToast({ title: '遛放已开始', icon: 'success' });
    } else if (walking.status === 'ongoing') {
      const duration = walkingTimers[walking.id] || 0;
      const durationMinutes = Math.floor(duration / 60) || 1;
      if (intervalRefs.current[walking.id]) {
        clearInterval(intervalRefs.current[walking.id]);
        delete intervalRefs.current[walking.id];
      }
      updateCareRecord(petId, r => ({
        ...r,
        walking: r.walking.map(w => w.id === walking.id ? {
          ...w,
          status: 'completed' as const,
          endTime: nowTime(),
          duration: durationMinutes
        } : w)
      }));
      addCareMessage(petId, petName, {
        type: 'walking',
        time: nowTime(),
        desc: `遛放完成，时长 ${durationMinutes} 分钟`
      });
      Taro.showToast({ title: '遛放已结束', icon: 'success' });
    }
  };

  const handleAddDefecation = (petId: string, petName: string) => {
    Taro.showActionSheet({
      itemList: ['正常', '偏软', '腹泻', '便秘'],
      success: (res) => {
        const types: Array<'normal' | 'soft' | 'diarrhea' | 'constipation'> = ['normal', 'soft', 'diarrhea', 'constipation'];
        const typeLabels = ['正常', '偏软', '腹泻', '便秘'];
        const selectedType = types[res.tapIndex];
        updateCareRecord(petId, r => ({
          ...r,
          defecation: [...r.defecation, {
            id: `d_${Date.now()}`,
            time: nowTime(),
            type: selectedType
          }]
        }));
        addCareMessage(petId, petName, {
          type: 'defecation',
          time: nowTime(),
          desc: `排便记录：${typeLabels[res.tapIndex]}`
        });
        Taro.showToast({ title: `已记录：${typeLabels[res.tapIndex]}`, icon: 'success' });
      }
    });
  };

  const handleAddPhoto = (petId: string, petName: string) => {
    const seeds = ['cute', 'pet', 'dog', 'cat', 'puppy', 'kitten', 'animal', 'furry'];
    const seed = seeds[Math.floor(Math.random() * seeds.length)] + Date.now();
    const photoUrl = `https://picsum.photos/seed/${seed}/400/400`;
    addCarePhoto(petId, photoUrl);
    addCareMessage(petId, petName, {
      type: 'photo',
      time: nowTime(),
      desc: '新增一张今日照片',
      photoUrl
    });
    Taro.showToast({ title: '照片已添加', icon: 'success' });
  };

  const formatWalkingTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getPetAvatar = (petId: string) => {
    const pet = pets.find(p => p.id === petId);
    return pet?.avatar || '';
  };

  const getPetRoom = (petId: string) => {
    const pet = pets.find(p => p.id === petId);
    return pet?.roomNumber || '';
  };

  return (
    <ScrollView
      className={styles.container}
      scrollY
      refresherEnabled
      refresherTriggered={refreshing}
      onRefresherRefresh={onRefresh}
    >
      <View className={styles.header}>
        <Text className={styles.title}>今日照护</Text>
        <Text className={styles.dateText}>{today}</Text>
      </View>

      <View className={styles.overviewCard}>
        <View className={styles.overviewRow}>
          <View className={styles.overviewItem}>
            <Text className={styles.overviewNumber}>{activeCareRecords.length}</Text>
            <Text className={styles.overviewLabel}>在护宠物</Text>
          </View>
          <View className={styles.overviewDivider} />
          <View className={styles.overviewItem}>
            <Text className={styles.overviewNumber}>{stats.completed}</Text>
            <Text className={styles.overviewLabel}>已完成任务</Text>
          </View>
          <View className={styles.overviewDivider} />
          <View className={styles.overviewItem}>
            <Text className={styles.overviewNumber}>{Math.max(0, stats.total - stats.completed)}</Text>
            <Text className={styles.overviewLabel}>待完成</Text>
          </View>
        </View>
        <View className={styles.progressBar}>
          <View className={styles.progressFill} style={{ width: `${stats.percent}%` }} />
        </View>
        <Text className={styles.progressText}>完成进度 {stats.percent}%</Text>
      </View>

      {activeCareRecords.length === 0 ? (
        <View className={styles.emptyTip}>暂无今日照护记录，请先在「宠物档案」进行入住登记</View>
      ) : (
        <View className={styles.petList}>
          {activeCareRecords.map(record => (
            <View key={record.id} className={styles.petCareCard}>
              <View className={styles.petHeader}>
                <Image
                  className={styles.petAvatar}
                  src={getPetAvatar(record.petId)}
                  mode="aspectFill"
                />
                <View className={styles.petInfo}>
                  <Text className={styles.petName}>{record.petName}</Text>
                  <Text className={styles.petSubInfo}>房间 {getPetRoom(record.petId)} · 今日照护</Text>
                </View>
              </View>

              {record.feeding.length > 0 && (
                <View className={styles.taskSection}>
                  <Text className={styles.sectionTitle}>🍚 喂食记录</Text>
                  <View className={styles.taskList}>
                    {record.feeding.map(f => (
                      <View key={f.id} className={styles.taskItem}>
                        <View className={styles.taskInfo}>
                          <Text className={styles.taskName}>{f.time} · {f.foodType}</Text>
                          <Text className={styles.taskDetail}>份量：{f.amount}</Text>
                        </View>
                        <View className={styles.taskStatus}>
                          <Button
                            className={classnames(styles.checkButton, f.completed && styles.checked)}
                            onClick={() => toggleFeeding(record.petId, record.petName, f)}
                          >
                            {f.completed && <Text className={styles.checkIcon}>✓</Text>}
                          </Button>
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {record.watering.length > 0 && (
                <View className={styles.taskSection}>
                  <Text className={styles.sectionTitle}>💧 饮水记录</Text>
                  <View className={styles.taskList}>
                    {record.watering.map(w => (
                      <View key={w.id} className={styles.taskItem}>
                        <View className={styles.taskInfo}>
                          <Text className={styles.taskName}>{w.time} · 补充饮水</Text>
                          <Text className={styles.taskDetail}>水量：{w.amount}</Text>
                        </View>
                        <View className={styles.taskStatus}>
                          <Button
                            className={classnames(styles.checkButton, w.completed && styles.checked)}
                            onClick={() => toggleWatering(record.petId, record.petName, w)}
                          >
                            {w.completed && <Text className={styles.checkIcon}>✓</Text>}
                          </Button>
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {record.walking.length > 0 && (
                <View className={styles.taskSection}>
                  <Text className={styles.sectionTitle}>🐾 遛放计时</Text>
                  <View className={styles.taskList}>
                    {record.walking.map(w => (
                      <View key={w.id} className={styles.taskItem}>
                        <View className={styles.taskInfo}>
                          <Text className={styles.taskName}>
                            {w.startTime || '待开始'}
                            {w.status === 'completed' && w.duration ? ` · 时长 ${w.duration}分钟` : ''}
                            {w.status === 'ongoing' && ` · 进行中 ${formatWalkingTime(walkingTimers[w.id] || 0)}`}
                          </Text>
                          <Text className={styles.taskDetail}>
                            {w.status === 'pending' && '待开始'}
                            {w.status === 'completed' && `结束时间：${w.endTime}`}
                            {w.status === 'ongoing' && '遛放进行中...'}
                          </Text>
                        </View>
                        <View className={styles.taskStatus}>
                          {w.status === 'pending' && (
                            <Button className={classnames(styles.actionButton, styles.primaryBtn)} onClick={() => handleWalking(record.petId, record.petName, w)}>
                              开始遛放
                            </Button>
                          )}
                          {w.status === 'ongoing' && (
                            <Button className={classnames(styles.actionButton, styles.dangerBtn)} onClick={() => handleWalking(record.petId, record.petName, w)}>
                              结束
                            </Button>
                          )}
                          {w.status === 'completed' && (
                            <Text className={classnames(styles.checkButton, styles.checked)}>
                              <Text className={styles.checkIcon}>✓</Text>
                            </Text>
                          )}
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              <View className={styles.taskSection}>
                <Text className={styles.sectionTitle}>💩 排便记录</Text>
                <View className={styles.taskList}>
                  {record.defecation.map(d => (
                    <View key={d.id} className={styles.taskItem}>
                      <View className={styles.taskInfo}>
                        <Text className={styles.taskName}>{d.time} · 已记录</Text>
                        <Text className={styles.taskDetail}>
                          {d.type === 'normal' && '形态正常'}
                          {d.type === 'soft' && '偏软'}
                          {d.type === 'diarrhea' && '腹泻'}
                          {d.type === 'constipation' && '便秘'}
                          {d.notes && ` · ${d.notes}`}
                        </Text>
                      </View>
                      <View className={styles.taskStatus}>
                        <Text className={classnames(styles.checkButton, styles.checked)}>
                          <Text className={styles.checkIcon}>✓</Text>
                        </Text>
                      </View>
                    </View>
                  ))}
                  <Button
                    className={classnames(styles.actionButton, styles.secondaryBtn)}
                    onClick={() => handleAddDefecation(record.petId, record.petName)}
                  >
                    + 添加排便记录
                  </Button>
                </View>
              </View>

              {record.grooming && (
                <View className={styles.taskSection}>
                  <Text className={styles.sectionTitle}>✂️ 洗护安排</Text>
                  <View className={styles.taskList}>
                    <View className={styles.taskItem}>
                      <View className={styles.taskInfo}>
                        <Text className={styles.taskName}>{record.grooming.scheduledTime} · {record.grooming.type}</Text>
                        <Text className={styles.taskDetail}>
                          {record.grooming.completed ? `完成时间：${record.grooming.completedTime}` : '待完成'}
                        </Text>
                      </View>
                      <View className={styles.taskStatus}>
                        <Button
                          className={classnames(styles.checkButton, record.grooming.completed && styles.checked)}
                          onClick={() => toggleGrooming(record.petId, record.petName, record.grooming!)}
                        >
                          {record.grooming.completed && <Text className={styles.checkIcon}>✓</Text>}
                        </Button>
                      </View>
                    </View>
                  </View>
                </View>
              )}

              {record.medication.length > 0 && (
                <View className={styles.taskSection}>
                  <Text className={styles.sectionTitle}>💊 用药提醒</Text>
                  <View className={styles.taskList}>
                    {record.medication.map(m => (
                      <View key={m.id} className={styles.taskItem}>
                        <View className={styles.taskInfo}>
                          <Text className={styles.taskName}>{m.scheduledTime} · {m.name}</Text>
                          <Text className={styles.taskDetail}>
                            剂量：{m.dosage}
                            {m.completed && m.completedTime && ` · 已服用 ${m.completedTime}`}
                          </Text>
                        </View>
                        <View className={styles.taskStatus}>
                          <Button
                            className={classnames(styles.checkButton, m.completed && styles.checked)}
                            onClick={() => toggleMedication(record.petId, record.petName, m)}
                          >
                            {m.completed && <Text className={styles.checkIcon}>✓</Text>}
                          </Button>
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              <View className={classnames(styles.taskSection, styles.photoSection)}>
                <Text className={styles.sectionTitle}>📷 照片更新</Text>
                <View className={styles.photoList}>
                  {record.photos.map((photo, index) => (
                    <Image
                      key={index}
                      className={styles.photoItem}
                      src={photo}
                      mode="aspectFill"
                    />
                  ))}
                  <View className={styles.addPhotoBtn} onClick={() => handleAddPhoto(record.petId, record.petName)}>
                    <Text className={styles.addPhotoIcon}>+</Text>
                    <Text className={styles.addPhotoText}>添加照片</Text>
                  </View>
                </View>
              </View>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
};

export default CarePage;
