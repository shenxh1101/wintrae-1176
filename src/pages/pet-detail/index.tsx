import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, Image, ScrollView, Button } from '@tarojs/components';
import Taro, { useRouter, useDidShow } from '@tarojs/taro';
import styles from './index.module.scss';
import { useAppStore } from '@/store';
import { Pet, CareRecord, AbnormalReport, FollowUpRecord } from '@/types';
import classnames from 'classnames';

interface TimelineEvent {
  id: string;
  time: string;
  icon: string;
  type: string;
  content: string;
  category: 'care' | 'photo' | 'abnormal' | 'abnormal-resolved';
  photoUrl?: string;
  status?: string;
}

const PetDetailPage: React.FC = () => {
  const router = useRouter();
  const pets = useAppStore(s => s.pets);
  const getCareRecordsByPet = useAppStore(s => s.getCareRecordsByPet);
  const abnormalReports = useAppStore(s => s.abnormalReports);
  const messages = useAppStore(s => s.messages);
  const checkoutPet = useAppStore(s => s.checkoutPet);
  const initFromStorage = useAppStore(s => s.initFromStorage);
  const updateCareRecord = useAppStore(s => s.updateCareRecord);
  const addCareMessage = useAppStore(s => s.addCareMessage);
  const addCarePhoto = useAppStore(s => s.addCarePhoto);
  const addFollowUp = useAppStore(s => s.addFollowUp);
  const [pet, setPet] = useState<Pet | null>(null);
  const [currentDate, setCurrentDate] = useState<string>('');
  const [refreshing, setRefreshing] = useState(false);

  const loadPet = () => {
    const petId = router.params.id;
    const foundPet = pets.find(p => p.id === petId);
    if (foundPet) {
      setPet(foundPet);
    }
  };

  useEffect(() => {
    loadPet();
  }, [router.params.id, pets]);

  useDidShow(() => {
    initFromStorage();
    loadPet();
  });

  const dateRange = useMemo(() => {
    if (!pet) return { start: '', end: '', allDates: [] as string[] };
    const startDate = pet.checkInDate;
    const endDate = pet.status === 'checked-out'
      ? (pet.actualCheckOutDate || pet.checkOutDate)
      : new Date().toISOString().split('T')[0];

    const allDates: string[] = [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    const cur = new Date(start);
    while (cur <= end) {
      allDates.push(cur.toISOString().split('T')[0]);
      cur.setDate(cur.getDate() + 1);
    }
    return { start: startDate, end: endDate, allDates };
  }, [pet]);

  useEffect(() => {
    if (pet && !currentDate) {
      setCurrentDate(dateRange.end || pet.checkInDate);
    }
  }, [pet, dateRange.end, currentDate]);

  const petCareRecords = useMemo(() => {
    if (!pet) return [];
    return getCareRecordsByPet(pet.id);
  }, [pet, getCareRecordsByPet]);

  const currentRecord = useMemo(() => {
    if (!petCareRecords.length || !currentDate) return null;
    return petCareRecords.find(r => r.date === currentDate) || null;
  }, [petCareRecords, currentDate]);

  const dayAbnormalReports = useMemo(() => {
    if (!pet || !currentDate) return [] as AbnormalReport[];
    return abnormalReports
      .filter(r => r.petId === pet.id && r.reportTime.startsWith(currentDate))
      .sort((a, b) => b.reportTime.localeCompare(a.reportTime));
  }, [pet, currentDate, abnormalReports]);

  const petRating = useMemo(() => {
    if (!pet || !pet.ratingId) return null;
    return messages.find(m => m.id === pet.ratingId && m.type === 'rating') || null;
  }, [pet, messages]);

  const timelineEvents = useMemo((): TimelineEvent[] => {
    const events: TimelineEvent[] = [];

    if (currentRecord) {
      currentRecord.feeding.filter(f => f.completed).forEach(f => {
        events.push({
          id: `f_${f.id}`,
          time: f.time,
          icon: '🍚',
          type: '喂食',
          content: `${f.foodType} · ${f.amount}`,
          category: 'care'
        });
      });
      currentRecord.watering.filter(w => w.completed).forEach(w => {
        events.push({
          id: `w_${w.id}`,
          time: w.time,
          icon: '💧',
          type: '饮水',
          content: `补充 ${w.amount}`,
          category: 'care'
        });
      });
      currentRecord.walking.filter(w => w.status === 'completed').forEach(w => {
        events.push({
          id: `wk_${w.id}`,
          time: w.endTime || w.startTime || '',
          icon: '🐾',
          type: '遛放',
          content: `时长 ${w.duration || 0}分钟`,
          category: 'care'
        });
      });
      currentRecord.defecation.forEach(d => {
        const typeMap: Record<string, string> = {
          normal: '正常', soft: '偏软', diarrhea: '腹泻', constipation: '便秘'
        };
        events.push({
          id: `d_${d.id}`,
          time: d.time,
          icon: '💩',
          type: '排便',
          content: typeMap[d.type] || d.type,
          category: 'care'
        });
      });
      if (currentRecord.grooming && currentRecord.grooming.completed) {
        events.push({
          id: `g_${currentRecord.grooming.id}`,
          time: currentRecord.grooming.completedTime || currentRecord.grooming.scheduledTime,
          icon: '✂️',
          type: '洗护',
          content: currentRecord.grooming.type,
          category: 'care'
        });
      }
      currentRecord.medication.filter(m => m.completed).forEach(m => {
        events.push({
          id: `m_${m.id}`,
          time: m.completedTime || m.scheduledTime,
          icon: '💊',
          type: '用药',
          content: `${m.name} · ${m.dosage}`,
          category: 'care'
        });
      });
      currentRecord.photos.forEach((p, idx) => {
        events.push({
          id: `ph_${idx}_${currentRecord.id}`,
          time: '--:--',
          icon: '📷',
          type: '照片',
          content: '上传照片',
          category: 'photo',
          photoUrl: p
        });
      });
    }

    dayAbnormalReports.forEach(report => {
      const timeStr = report.reportTime.split(' ')[1] || '--:--';
      events.push({
        id: `abn_${report.id}`,
        time: timeStr,
        icon: '⚠️',
        type: '异常上报',
        content: report.symptoms.join('、'),
        category: 'abnormal',
        status: report.status
      });
      if (report.status === 'resolved' && report.resolvedTime?.startsWith(currentDate)) {
        const resolvedTimeStr = report.resolvedTime.split(' ')[1] || '--:--';
        events.push({
          id: `abn_res_${report.id}`,
          time: resolvedTimeStr,
          icon: '✅',
          type: '异常已处理',
          content: report.resolution || '已处理完成',
          category: 'abnormal-resolved',
          status: 'resolved'
        });
      }
    });

    return events.sort((a, b) => {
      const timeA = a.time || '00:00';
      const timeB = b.time || '00:00';
      return timeB.localeCompare(timeA);
    });
  }, [currentRecord, dayAbnormalReports, currentDate]);

  const dayStats = useMemo(() => {
    const feeding = currentRecord?.feeding.filter(f => f.completed).length || 0;
    const watering = currentRecord?.watering.filter(w => w.completed).length || 0;
    const walking = currentRecord?.walking.filter(w => w.status === 'completed').length || 0;
    const defecation = currentRecord?.defecation.length || 0;
    const photos = currentRecord?.photos.length || 0;
    const abnormal = dayAbnormalReports.length;
    return { feeding, watering, walking, defecation, photos, abnormal };
  }, [currentRecord, dayAbnormalReports]);

  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const weekDay = weekDays[date.getDay()];
    return `${month}月${day}日 ${weekDay}`;
  };

  const isFirstDay = currentDate === dateRange.start;
  const isLastDay = currentDate === dateRange.end;

  const handlePrevDay = () => {
    if (isFirstDay) return;
    const idx = dateRange.allDates.indexOf(currentDate);
    if (idx > 0) {
      setCurrentDate(dateRange.allDates[idx - 1]);
    }
  };

  const handleNextDay = () => {
    if (isLastDay) return;
    const idx = dateRange.allDates.indexOf(currentDate);
    if (idx < dateRange.allDates.length - 1) {
      setCurrentDate(dateRange.allDates[idx + 1]);
    }
  };

  const handleSupplement = () => {
    if (!pet) return;
    Taro.showActionSheet({
      itemList: ['🍚 补录喂食', '💧 补录饮水', '🐾 补录遛放', '💩 补录排便', '📷 补录照片', '📝 补录说明'],
      success: (res) => {
        switch (res.tapIndex) {
          case 0:
            supplementFeeding();
            break;
          case 1:
            supplementWatering();
            break;
          case 2:
            supplementWalking();
            break;
          case 3:
            supplementDefecation();
            break;
          case 4:
            supplementPhoto();
            break;
          case 5:
            supplementNote();
            break;
        }
      }
    });
  };

  const getSupplementTime = () => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  };

  const supplementFeeding = () => {
    if (!pet) return;
    Taro.showActionSheet({
      itemList: ['狗粮', '猫粮', '罐头', '零食', '其他'],
      success: (foodRes) => {
        const foodTypes = ['狗粮', '猫粮', '罐头', '零食', '其他'];
        const foodType = foodTypes[foodRes.tapIndex];
        Taro.showModal({
          title: '喂食量',
          editable: true,
          placeholderText: '如：100g',
          success: (amountRes) => {
            const amount = amountRes.content || '适量';
            const time = getSupplementTime();
            updateCareRecord(pet.id, currentDate, (record) => ({
              ...record,
              feeding: [...record.feeding, {
                id: `f_supp_${Date.now()}`,
                time,
                foodType: `补录-${foodType}`,
                amount,
                completed: true
              }]
            }));
            addCareMessage(pet.id, pet.name, {
              type: 'feeding',
              time,
              desc: `补录喂食：${foodType} ${amount}`
            }, currentDate);
            Taro.showToast({ title: '补录成功', icon: 'success' });
          }
        });
      }
    });
  };

  const supplementWatering = () => {
    if (!pet) return;
    const time = getSupplementTime();
    updateCareRecord(pet.id, currentDate, (record) => ({
      ...record,
      watering: [...record.watering, {
        id: `w_supp_${Date.now()}`,
        time,
        amount: '200ml',
        completed: true
      }]
    }));
    addCareMessage(pet.id, pet.name, {
      type: 'watering',
      time,
      desc: '补录饮水：200ml'
    }, currentDate);
    Taro.showToast({ title: '补录成功', icon: 'success' });
  };

  const supplementWalking = () => {
    if (!pet) return;
    Taro.showModal({
      title: '遛放时长（分钟）',
      editable: true,
      placeholderText: '如：15',
      success: (durRes) => {
        const duration = parseInt(durRes.content) || 15;
        const time = getSupplementTime();
        updateCareRecord(pet.id, currentDate, (record) => ({
          ...record,
          walking: [...record.walking, {
            id: `wk_supp_${Date.now()}`,
            scheduledTime: time,
            startTime: time,
            endTime: time,
            duration,
            status: 'completed' as const
          }]
        }));
        addCareMessage(pet.id, pet.name, {
          type: 'walking',
          time,
          desc: `补录遛放：${duration}分钟`
        }, currentDate);
        Taro.showToast({ title: '补录成功', icon: 'success' });
      }
    });
  };

  const supplementDefecation = () => {
    if (!pet) return;
    Taro.showActionSheet({
      itemList: ['正常', '偏软', '腹泻', '便秘'],
      success: (defRes) => {
        const types: Array<'normal' | 'soft' | 'diarrhea' | 'constipation'> = ['normal', 'soft', 'diarrhea', 'constipation'];
        const typeLabels = ['正常', '偏软', '腹泻', '便秘'];
        const time = getSupplementTime();
        updateCareRecord(pet.id, currentDate, (record) => ({
          ...record,
          defecation: [...record.defecation, {
            id: `d_supp_${Date.now()}`,
            time,
            type: types[defRes.tapIndex]
          }]
        }));
        addCareMessage(pet.id, pet.name, {
          type: 'defecation',
          time,
          desc: `补录排便：${typeLabels[defRes.tapIndex]}`
        }, currentDate);
        Taro.showToast({ title: '补录成功', icon: 'success' });
      }
    });
  };

  const supplementPhoto = () => {
    if (!pet) return;
    const seeds = ['care', 'supp', 'record', 'pet', 'daily'];
    const seed = seeds[Math.floor(Math.random() * seeds.length)] + Date.now();
    const photoUrl = `https://picsum.photos/seed/${seed}/400/400`;
    addCarePhoto(pet.id, currentDate, photoUrl);
    addCareMessage(pet.id, pet.name, {
      type: 'photo',
      time: getSupplementTime(),
      desc: '补录照片',
      photoUrl
    }, currentDate);
    Taro.showToast({ title: '照片已补录', icon: 'success' });
  };

  const supplementNote = () => {
    if (!pet) return;
    Taro.showModal({
      title: '补录说明',
      editable: true,
      placeholderText: '请输入补充说明...',
      success: (noteRes) => {
        if (noteRes.content) {
          addCareMessage(pet.id, pet.name, {
            type: 'feeding',
            time: getSupplementTime(),
            desc: `📝 补录说明：${noteRes.content}`
          }, currentDate);
          Taro.showToast({ title: '说明已补录', icon: 'success' });
        }
      }
    });
  };

  const handleAddFollowUp = () => {
    if (!pet || !petRating) return;
    Taro.showActionSheet({
      itemList: ['📞 电话回访', '🏠 到店回访', '💰 补偿处理', '📝 其他'],
      success: (res) => {
        const types: Array<'phone' | 'onsite' | 'compensation' | 'other'> = ['phone', 'onsite', 'compensation', 'other'];
        const typeLabels = ['电话回访', '到店回访', '补偿处理', '其他'];
        const selectedType = types[res.tapIndex];

        Taro.showModal({
          title: `${typeLabels[res.tapIndex]}说明`,
          editable: true,
          placeholderText: '请输入回访/处理内容...',
          success: (contentRes) => {
            const content = contentRes.content || '已处理';
            if (selectedType === 'compensation') {
              Taro.showModal({
                title: '补偿金额',
                editable: true,
                placeholderText: '如：50',
                success: (amountRes) => {
                  const amount = parseFloat(amountRes.content) || 0;
                  addFollowUp(petRating.id, {
                    type: selectedType,
                    handler: '店员',
                    content,
                    time: new Date().toISOString(),
                    amount
                  });
                  Taro.showToast({ title: '回访已登记', icon: 'success' });
                  loadPet();
                }
              });
            } else {
              addFollowUp(petRating.id, {
                type: selectedType,
                handler: '店员',
                content,
                time: new Date().toISOString()
              });
              Taro.showToast({ title: '回访已登记', icon: 'success' });
              loadPet();
            }
          }
        });
      }
    });
  };

  const handleCallOwner = () => {
    if (pet?.ownerPhone) {
      Taro.makePhoneCall({ phoneNumber: pet.ownerPhone }).catch(() => {});
    } else {
      Taro.showToast({ title: '暂无联系电话', icon: 'none' });
    }
  };

  const handleGoCare = () => {
    if (pet?.status !== 'checked-in') {
      Taro.showToast({ title: '宠物已离店', icon: 'none' });
      return;
    }
    Taro.switchTab({ url: '/pages/care/index' });
  };

  const handleCheckout = () => {
    if (!pet) return;
    Taro.showModal({
      title: '确认离店',
      content: `确定要为 ${pet.name} 办理离店吗？`,
      confirmText: '确认离店',
      confirmColor: '#FF7A45',
      success: (res) => {
        if (res.confirm) {
          checkoutPet(pet.id);
          Taro.showToast({ title: '已办理离店', icon: 'success' });
          loadPet();
        }
      }
    });
  };

  const renderRatingStars = (rating: number, small = false) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Text
        key={i}
        className={classnames(
          small ? styles.starSmall : styles.star,
          i < rating ? styles.starActive : ''
        )}
      >
        ★
      </Text>
    ));
  };

  const getRatingStatusLabel = (status?: string) => {
    switch (status) {
      case 'pending': return '待评价';
      case 'rated': return '已评价';
      case 'visited': return '已回访';
      default: return '待评价';
    }
  };

  const getFollowUpTypeLabel = (type: string) => {
    switch (type) {
      case 'phone': return '电话回访';
      case 'onsite': return '到店回访';
      case 'compensation': return '补偿';
      case 'other': return '其他';
      default: return type;
    }
  };

  if (!pet) {
    return (
      <ScrollView className={styles.container}>
        <View style={{ textAlign: 'center', padding: '80rpx 0', color: '#86909C' }}>
          加载中...
        </View>
      </ScrollView>
    );
  }

  const dayPhotos = currentRecord?.photos || [];

  return (
    <ScrollView className={styles.container}>
      <View className={styles.petHeader}>
        <View className={styles.petInfo}>
          <Image
            className={styles.petAvatar}
            src={pet.avatar}
            mode="aspectFill"
          />
          <View className={styles.petBasic}>
            <Text className={styles.petName}>{pet.name}</Text>
            <View className={styles.petTags}>
              <Text className={styles.petTag}>
                {pet.type === 'dog' ? '🐕 狗狗' : pet.type === 'cat' ? '🐱 猫咪' : '🐾 其他'}
              </Text>
              <Text className={styles.petTag}>
                {pet.gender === 'male' ? '♂ 公' : '♀ 母'}
              </Text>
              <Text className={classnames(styles.petTag, pet.status === 'checked-in' ? styles.tagGreen : styles.tagGray)}>
                {pet.status === 'checked-in' ? '已入住' : '已离店'}
              </Text>
            </View>
            <Text className={styles.petBreed}>{pet.breed} · {pet.age} · {pet.weight}</Text>
          </View>
        </View>
        <View className={styles.stayDates}>
          <View className={styles.dateItem}>
            <Text className={styles.dateLabel}>入住</Text>
            <Text className={styles.dateValue}>{pet.checkInDate}</Text>
          </View>
          <View className={styles.dateArrow}>→</View>
          <View className={styles.dateItem}>
            <Text className={styles.dateLabel}>{pet.status === 'checked-out' ? '实际离店' : '预计离店'}</Text>
            <Text className={styles.dateValue}>
              {pet.status === 'checked-out' ? pet.actualCheckOutDate || pet.checkOutDate : pet.checkOutDate}
            </Text>
          </View>
        </View>
      </View>

      <View className={styles.dateNav}>
        <View
          className={classnames(styles.dateNavBtn, isFirstDay ? styles.disabled : '')}
          onClick={handlePrevDay}
        >
          <Text>‹ 上一天</Text>
        </View>
        <View className={styles.dateNavCurrent}>
          <Text>{formatDateDisplay(currentDate)}</Text>
        </View>
        <View
          className={classnames(styles.dateNavBtn, isLastDay ? styles.disabled : '')}
          onClick={handleNextDay}
        >
          <Text>下一天 ›</Text>
        </View>
      </View>

      <View className={styles.timelineDay}>
        <View className={styles.dayHeader}>
          <View className={styles.dayDate}>
            <Text className={styles.dayDateText}>{currentDate}</Text>
          </View>
          <View className={styles.dayStats}>
            <Text className={styles.dayStat}>🍚{dayStats.feeding}</Text>
            <Text className={styles.dayStat}>💧{dayStats.watering}</Text>
            <Text className={styles.dayStat}>🐾{dayStats.walking}</Text>
            <Text className={styles.dayStat}>💩{dayStats.defecation}</Text>
            <Text className={styles.dayStat}>📷{dayStats.photos}</Text>
            <Text className={styles.dayStat}>⚠️{dayStats.abnormal}</Text>
          </View>
        </View>

        {dayPhotos.length > 0 && (
          <View className={styles.dayPhotoRow}>
            {dayPhotos.slice(0, 6).map((p, idx) => (
              <Image key={idx} src={p} mode="aspectFill" className={styles.dayPhoto} />
            ))}
          </View>
        )}

        {!currentRecord && timelineEvents.length === 0 ? (
          <View className={styles.dayEmptyEvents}>
            <Text className={styles.dayEmptyText}>当日暂无照护记录</Text>
            <Button
              className={classnames(styles.actionBtn, styles.primaryBtn)}
              style={{ marginTop: '20rpx' }}
              onClick={handleSupplement}
            >
              📝 补录记录
            </Button>
          </View>
        ) : (
          <View className={styles.eventsList}>
            {timelineEvents.length === 0 ? (
              <View className={styles.dayEmptyEvents}>
                <Text className={styles.dayEmptyText}>当日暂无照护打卡</Text>
              </View>
            ) : (
              timelineEvents.map(ev => (
                <View key={ev.id} className={styles.eventItem}>
                  <View className={styles.eventIcon}>{ev.icon}</View>
                  <View className={styles.eventTime}>
                    <Text className={styles.eventTimeText}>{ev.time}</Text>
                  </View>
                  <View className={styles.eventContent}>
                    <Text className={styles.eventType}>{ev.type}</Text>
                    <Text className={styles.eventDesc}>{ev.content}</Text>
                    {ev.photoUrl && (
                      <Image src={ev.photoUrl} mode="aspectFill" className={styles.eventPhoto} />
                    )}
                    {ev.category === 'abnormal' && ev.status && (
                      <View style={{ marginTop: '8rpx' }}>
                        <Text className={classnames(
                          styles.reportStatus,
                          ev.status === 'resolved' && styles.statusResolved,
                          ev.status === 'processing' && styles.statusProcessing,
                          ev.status === 'pending' && styles.statusPending
                        )}>
                          {ev.status === 'pending' && '待处理'}
                          {ev.status === 'processing' && '处理中'}
                          {ev.status === 'resolved' && '已解决'}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              ))
            )}
            <Button
              className={styles.supplementBtn}
              onClick={handleSupplement}
            >
              📝 补录当天记录
            </Button>
          </View>
        )}
      </View>

      {petRating && (
        <View className={styles.ratingFollowUp}>
          <Text className={styles.sectionTitle}>服务评价与回访</Text>

          <View style={{ marginBottom: '20rpx' }}>
            <Text className={classnames(
              styles.reportStatus,
              petRating.ratingStatus === 'pending' && styles.statusProcessing,
              petRating.ratingStatus === 'rated' && styles.statusResolved,
              petRating.ratingStatus === 'visited' && styles.statusPending
            )}>
              {getRatingStatusLabel(petRating.ratingStatus)}
            </Text>
          </View>

          {petRating.rating !== undefined && petRating.rating > 0 && (
            <View style={{ display: 'flex', alignItems: 'center', gap: '12rpx', marginBottom: '16rpx' }}>
              {renderRatingStars(petRating.rating, true)}
              <Text style={{ fontSize: '28rpx', fontWeight: 'bold', color: '#FFB800' }}>
                {petRating.rating}.0
              </Text>
            </View>
          )}

          {petRating.ratingComment && (
            <View style={{
              padding: '20rpx',
              background: '#F7F8FA',
              borderRadius: '12rpx',
              marginBottom: '24rpx'
            }}>
              <Text style={{ fontSize: '26rpx', color: '#4E5969', lineHeight: 1.6 }}>
                "{petRating.ratingComment}"
              </Text>
            </View>
          )}

          {petRating.followUps && petRating.followUps.length > 0 && (
            <View>
              <Text style={{
                fontSize: '28rpx',
                fontWeight: '600',
                color: '#1D2129',
                marginBottom: '16rpx',
                display: 'block'
              }}>
                回访记录
              </Text>
              {petRating.followUps.map((fu: FollowUpRecord) => (
                <View key={fu.id} className={styles.followUpItem}>
                  <View className={styles.followUpHeader}>
                    <Text style={{
                      fontSize: '24rpx',
                      fontWeight: '600',
                      color: '#165DFF',
                      background: '#E8F3FF',
                      padding: '4rpx 12rpx',
                      borderRadius: '8rpx'
                    }}>
                      {getFollowUpTypeLabel(fu.type)}
                    </Text>
                    <Text style={{ fontSize: '22rpx', color: '#86909C' }}>
                      {fu.handler}
                    </Text>
                    <Text style={{ fontSize: '22rpx', color: '#86909C' }}>
                      {fu.time}
                    </Text>
                  </View>
                  <View className={styles.followUpContent}>
                    <Text style={{ fontSize: '26rpx', color: '#4E5969', lineHeight: 1.6 }}>
                      {fu.content}
                    </Text>
                    {fu.type === 'compensation' && fu.amount !== undefined && (
                      <Text style={{
                        fontSize: '24rpx',
                        color: '#F53F3F',
                        fontWeight: '600',
                        marginTop: '8rpx',
                        display: 'block'
                      }}>
                        补偿金额：¥{fu.amount}
                      </Text>
                    )}
                  </View>
                </View>
              ))}
            </View>
          )}

          <Button
            className={styles.supplementBtn}
            style={{ marginTop: '24rpx' }}
            onClick={handleAddFollowUp}
          >
            📞 登记回访
          </Button>
        </View>
      )}

      <View className={styles.actionButtons}>
        <Button
          className={classnames(styles.actionBtn, styles.secondaryBtn)}
          onClick={handleCallOwner}
        >
          📞 联系主人
        </Button>
        {pet.status === 'checked-in' ? (
          <>
            <Button
              className={classnames(styles.actionBtn, styles.primaryBtn)}
              onClick={handleGoCare}
            >
              📋 照护打卡
            </Button>
            <Button
              className={classnames(styles.actionBtn, styles.dangerBtn)}
              onClick={handleCheckout}
            >
              🏠 办理离店
            </Button>
          </>
        ) : (
          <Button
            className={classnames(styles.actionBtn, styles.grayBtn)}
            disabled
          >
            📦 已离店
          </Button>
        )}
      </View>

      <View className={styles.pageBottom} />
    </ScrollView>
  );
};

export default PetDetailPage;
