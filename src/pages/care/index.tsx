import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, Image, ScrollView, Button } from '@tarojs/components';
import Taro from '@tarojs/taro';
import styles from './index.module.scss';
import { mockCareRecords, mockPets } from '@/data/mockData';
import { CareRecord, FeedingRecord, WateringRecord, WalkingRecord, MedicationRecord, GroomingRecord } from '@/types';
import classnames from 'classnames';

const CarePage: React.FC = () => {
  const [careRecords, setCareRecords] = useState<CareRecord[]>(mockCareRecords);
  const [refreshing, setRefreshing] = useState(false);
  const [walkingTimers, setWalkingTimers] = useState<Record<string, number>>({});

  const today = new Date().toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long'
  });

  useEffect(() => {
    const timers: Record<string, ReturnType<typeof setInterval>> = {};
    careRecords.forEach(record => {
      record.walking.forEach(walk => {
        if (walk.status === 'ongoing') {
          timers[walk.id] = setInterval(() => {
            setWalkingTimers(prev => ({
              ...prev,
              [walk.id]: (prev[walk.id] || 0) + 1
            }));
          }, 1000);
        }
      });
    });
    return () => {
      Object.values(timers).forEach(timer => clearInterval(timer));
    };
  }, [careRecords]);

  const getTotalStats = () => {
    let completed = 0;
    let total = 0;
    careRecords.forEach(record => {
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
      setRefreshing(false);
      Taro.showToast({ title: '刷新成功', icon: 'success' });
    }, 1000);
  }, []);

  const toggleFeeding = (recordId: string, feeding: FeedingRecord) => {
    console.log('[Care] Toggle feeding:', recordId, feeding.id, feeding.completed);
    setCareRecords(prev => prev.map(r => {
      if (r.id !== recordId) return r;
      return {
        ...r,
        feeding: r.feeding.map(f => f.id === feeding.id ? { ...f, completed: !f.completed } : f)
      };
    }));
    Taro.showToast({ title: feeding.completed ? '已取消打卡' : '打卡成功', icon: 'success' });
  };

  const toggleWatering = (recordId: string, watering: WateringRecord) => {
    console.log('[Care] Toggle watering:', recordId, watering.id, watering.completed);
    setCareRecords(prev => prev.map(r => {
      if (r.id !== recordId) return r;
      return {
        ...r,
        watering: r.watering.map(w => w.id === watering.id ? { ...w, completed: !w.completed } : w)
      };
    }));
    Taro.showToast({ title: watering.completed ? '已取消打卡' : '打卡成功', icon: 'success' });
  };

  const toggleMedication = (recordId: string, medication: MedicationRecord) => {
    console.log('[Care] Toggle medication:', recordId, medication.id, medication.completed);
    setCareRecords(prev => prev.map(r => {
      if (r.id !== recordId) return r;
      return {
        ...r,
        medication: r.medication.map(m => m.id === medication.id ? { ...m, completed: !m.completed, completedTime: !m.completed ? new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) : undefined } : m)
      };
    }));
    Taro.showToast({ title: medication.completed ? '已取消' : '用药已记录', icon: 'success' });
  };

  const toggleGrooming = (recordId: string, grooming: GroomingRecord) => {
    console.log('[Care] Toggle grooming:', recordId, grooming.id, grooming.completed);
    setCareRecords(prev => prev.map(r => {
      if (r.id !== recordId) return r;
      return {
        ...r,
        grooming: grooming ? { ...grooming, completed: !grooming.completed, completedTime: !grooming.completed ? new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) : undefined } : null
      };
    }));
    Taro.showToast({ title: grooming.completed ? '已取消' : '洗护已完成', icon: 'success' });
  };

  const handleWalking = (recordId: string, walking: WalkingRecord) => {
    console.log('[Care] Handle walking:', recordId, walking.id, walking.status);
    if (walking.status === 'pending') {
      setCareRecords(prev => prev.map(r => {
        if (r.id !== recordId) return r;
        return {
          ...r,
          walking: r.walking.map(w => w.id === walking.id ? { ...w, status: 'ongoing' as const, startTime: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) } : w)
        };
      }));
      setWalkingTimers(prev => ({ ...prev, [walking.id]: 0 }));
      Taro.showToast({ title: '遛放已开始', icon: 'success' });
    } else if (walking.status === 'ongoing') {
      const duration = walkingTimers[walking.id] || 0;
      setCareRecords(prev => prev.map(r => {
        if (r.id !== recordId) return r;
        return {
          ...r,
          walking: r.walking.map(w => w.id === walking.id ? { ...w, status: 'completed' as const, endTime: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }), duration: Math.floor(duration / 60) || 1 } : w)
        };
      }));
      Taro.showToast({ title: '遛放已结束', icon: 'success' });
    }
  };

  const handleAddDefecation = (recordId: string, petName: string) => {
    console.log('[Care] Add defecation:', recordId, petName);
    Taro.showActionSheet({
      itemList: ['正常', '偏软', '腹泻', '便秘'],
      success: (res) => {
        const types: Array<'normal' | 'soft' | 'diarrhea' | 'constipation'> = ['normal', 'soft', 'diarrhea', 'constipation'];
        const typeLabels = ['正常', '偏软', '腹泻', '便秘'];
        setCareRecords(prev => prev.map(r => {
          if (r.id !== recordId) return r;
          return {
            ...r,
            defecation: [...r.defecation, {
              id: `d_${Date.now()}`,
              time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
              type: types[res.tapIndex]
            }]
          };
        }));
        Taro.showToast({ title: `已记录：${typeLabels[res.tapIndex]}`, icon: 'success' });
      }
    });
  };

  const handleAddPhoto = (recordId: string, petName: string) => {
    console.log('[Care] Add photo:', recordId, petName);
    Taro.showToast({ title: '选择照片功能', icon: 'none' });
  };

  const formatWalkingTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getPetAvatar = (petId: string) => {
    const pet = mockPets.find(p => p.id === petId);
    return pet?.avatar || '';
  };

  const getPetRoom = (petId: string) => {
    const pet = mockPets.find(p => p.id === petId);
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
            <Text className={styles.overviewNumber}>{careRecords.length}</Text>
            <Text className={styles.overviewLabel}>在护宠物</Text>
          </View>
          <View className={styles.overviewDivider} />
          <View className={styles.overviewItem}>
            <Text className={styles.overviewNumber}>{stats.completed}</Text>
            <Text className={styles.overviewLabel}>已完成任务</Text>
          </View>
          <View className={styles.overviewDivider} />
          <View className={styles.overviewItem}>
            <Text className={styles.overviewNumber}>{stats.total - stats.completed}</Text>
            <Text className={styles.overviewLabel}>待完成</Text>
          </View>
        </View>
        <View className={styles.progressBar}>
          <View className={styles.progressFill} style={{ width: `${stats.percent}%` }} />
        </View>
        <Text className={styles.progressText}>完成进度 {stats.percent}%</Text>
      </View>

      {careRecords.length === 0 ? (
        <View className={styles.emptyTip}>暂无今日照护记录</View>
      ) : (
        <View className={styles.petList}>
          {careRecords.map(record => (
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
                            onClick={() => toggleFeeding(record.id, f)}
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
                            onClick={() => toggleWatering(record.id, w)}
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
                            {w.startTime} 开始
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
                            <Button className={classnames(styles.actionButton, styles.primaryBtn)} onClick={() => handleWalking(record.id, w)}>
                              开始遛放
                            </Button>
                          )}
                          {w.status === 'ongoing' && (
                            <Button className={classnames(styles.actionButton, styles.dangerBtn)} onClick={() => handleWalking(record.id, w)}>
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
                    onClick={() => handleAddDefecation(record.id, record.petName)}
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
                          onClick={() => toggleGrooming(record.id, record.grooming!)}
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
                            onClick={() => toggleMedication(record.id, m)}
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
                  <View className={styles.addPhotoBtn} onClick={() => handleAddPhoto(record.id, record.petName)}>
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
