import React, { useState, useEffect } from 'react';
import { View, Text, Image, ScrollView, Button } from '@tarojs/components';
import Taro, { useRouter, useDidShow } from '@tarojs/taro';
import styles from './index.module.scss';
import { useAppStore } from '@/store';
import { Pet, CareRecord, AbnormalReport } from '@/types';
import classnames from 'classnames';

type DetailTab = 'info' | 'timeline' | 'abnormal';

const PetDetailPage: React.FC = () => {
  const router = useRouter();
  const pets = useAppStore(s => s.pets);
  const careRecords = useAppStore(s => s.careRecords);
  const abnormalReports = useAppStore(s => s.abnormalReports);
  const messages = useAppStore(s => s.messages);
  const checkoutPet = useAppStore(s => s.checkoutPet);
  const initFromStorage = useAppStore(s => s.initFromStorage);
  const [pet, setPet] = useState<Pet | null>(null);
  const [activeTab, setActiveTab] = useState<DetailTab>('timeline');
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

  if (!pet) {
    return (
      <ScrollView className={styles.container}>
        <View style={{ textAlign: 'center', padding: '80rpx 0', color: '#86909C' }}>
          加载中...
        </View>
      </ScrollView>
    );
  }

  const petCareRecords = careRecords
    .filter(r => r.petId === pet.id)
    .sort((a, b) => b.date.localeCompare(a.date));

  const petReports = abnormalReports
    .filter(r => r.petId === pet.id)
    .sort((a, b) => b.reportTime.localeCompare(a.reportTime));

  const petRating = pet.ratingId
    ? messages.find(m => m.id === pet.ratingId && m.type === 'rating')
    : null;

  const handleCallOwner = () => {
    if (pet.ownerPhone) {
      Taro.makePhoneCall({ phoneNumber: pet.ownerPhone }).catch(() => {});
    } else {
      Taro.showToast({ title: '暂无联系电话', icon: 'none' });
    }
  };

  const handleGoCare = () => {
    if (pet.status !== 'checked-in') {
      Taro.showToast({ title: '宠物已离店', icon: 'none' });
      return;
    }
    Taro.switchTab({ url: '/pages/care/index' });
  };

  const handleCheckout = () => {
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

  interface TimelineEvent {
    id: string;
    time: string;
    icon: string;
    type: string;
    content: string;
    photoUrl?: string;
  }

  const getTimelineForRecord = (record: CareRecord): TimelineEvent[] => {
    const events: TimelineEvent[] = [];
    record.feeding.filter(f => f.completed).forEach(f => {
      events.push({
        id: `f_${f.id}`,
        time: f.time,
        icon: '🍚',
        type: '喂食',
        content: `${f.foodType} · ${f.amount}`
      });
    });
    record.watering.filter(w => w.completed).forEach(w => {
      events.push({
        id: `w_${w.id}`,
        time: w.time,
        icon: '💧',
        type: '饮水',
        content: `补充 ${w.amount}`
      });
    });
    record.walking.filter(w => w.status === 'completed').forEach(w => {
      events.push({
        id: `wk_${w.id}`,
        time: w.endTime || w.startTime || '',
        icon: '🐾',
        type: '遛放',
        content: `时长 ${w.duration || 0} 分钟`
      });
    });
    record.defecation.forEach(d => {
      const typeMap: Record<string, string> = {
        normal: '形态正常', soft: '偏软', diarrhea: '腹泻', constipation: '便秘'
      };
      events.push({
        id: `d_${d.id}`,
        time: d.time,
        icon: '💩',
        type: '排便',
        content: typeMap[d.type] || d.type
      });
    });
    if (record.grooming && record.grooming.completed) {
      events.push({
        id: `g_${record.grooming.id}`,
        time: record.grooming.completedTime || record.grooming.scheduledTime,
        icon: '✂️',
        type: '洗护',
        content: record.grooming.type
      });
    }
    record.medication.filter(m => m.completed).forEach(m => {
      events.push({
        id: `m_${m.id}`,
        time: m.completedTime || m.scheduledTime,
        icon: '💊',
        type: '用药',
        content: `${m.name} · ${m.dosage}`
      });
    });
    record.photos.forEach((p, idx) => {
      events.push({
        id: `ph_${idx}_${Date.now()}`,
        time: '--:--',
        icon: '📷',
        type: '照片',
        content: '上传照片',
        photoUrl: p
      });
    });
    return events.sort((a, b) => (b.time || '').localeCompare(a.time || ''));
  };

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
        {petRating && petRating.rating && petRating.rating > 0 && (
          <View className={styles.ratingSummary}>
            <Text className={styles.ratingSummaryLabel}>服务评价</Text>
            <View className={styles.ratingSummaryRow}>
              {renderRatingStars(petRating.rating, true)}
              <Text className={styles.ratingSummaryScore}>{petRating.rating}.0</Text>
            </View>
            {petRating.ratingComment && (
              <Text className={styles.ratingSummaryComment}>"{petRating.ratingComment}"</Text>
            )}
          </View>
        )}
      </View>

      <View className={styles.tabBar}>
        {[
          { key: 'info' as DetailTab, label: '📄 档案信息' },
          { key: 'timeline' as DetailTab, label: `📅 照护时间线 (${petCareRecords.length}天)` },
          { key: 'abnormal' as DetailTab, label: `⚠️ 异常记录 (${petReports.length})` }
        ].map(tab => (
          <View
            key={tab.key}
            className={classnames(styles.tabItem, activeTab === tab.key ? styles.tabActive : '')}
            onClick={() => setActiveTab(tab.key)}
          >
            <Text className={styles.tabText}>{tab.label}</Text>
          </View>
        ))}
      </View>

      {activeTab === 'info' && (
        <>
          <View className={styles.infoSection}>
            <Text className={styles.sectionTitle}>基本信息</Text>
            <View className={styles.infoGrid}>
              <View className={styles.infoItem}>
                <Text className={styles.infoLabel}>年龄</Text>
                <Text className={styles.infoValue}>{pet.age}</Text>
              </View>
              <View className={styles.infoItem}>
                <Text className={styles.infoLabel}>体重</Text>
                <Text className={styles.infoValue}>{pet.weight}</Text>
              </View>
              <View className={styles.infoItem}>
                <Text className={styles.infoLabel}>房间号</Text>
                <Text className={styles.infoValue}>{pet.roomNumber}</Text>
              </View>
              <View className={styles.infoItem}>
                <Text className={styles.infoLabel}>疫苗记录</Text>
                <Text className={styles.infoValue}>{pet.vaccineInfo.length} 条</Text>
              </View>
            </View>
          </View>

          <View className={styles.infoSection}>
            <Text className={styles.sectionTitle}>主人信息</Text>
            <View className={styles.infoGrid}>
              <View className={styles.infoItem}>
                <Text className={styles.infoLabel}>姓名</Text>
                <Text className={styles.infoValue}>{pet.ownerName}</Text>
              </View>
              <View className={styles.infoItem}>
                <Text className={styles.infoLabel}>联系电话</Text>
                <Text className={styles.infoValue}>{pet.ownerPhone}</Text>
              </View>
            </View>
          </View>

          <View className={styles.infoSection}>
            <Text className={styles.sectionTitle}>疫苗信息</Text>
            {pet.vaccineInfo.length > 0 ? (
              <View className={styles.vaccineList}>
                {pet.vaccineInfo.map(vaccine => (
                  <View key={vaccine.id} className={styles.vaccineItem}>
                    <View className={styles.vaccineInfoBox}>
                      <Text className={styles.vaccineName}>💉 {vaccine.name}</Text>
                      <Text className={styles.vaccineDate}>
                        接种日期：{vaccine.date}
                        {vaccine.nextDate && ` · 下次：${vaccine.nextDate}`}
                      </Text>
                    </View>
                    <Text className={classnames(styles.vaccineStatus)}>
                      有效
                    </Text>
                  </View>
                ))}
              </View>
            ) : (
              <View className={styles.emptyVaccine}>暂无疫苗记录</View>
            )}
          </View>

          {pet.notes && (
            <View className={styles.infoSection}>
              <Text className={styles.sectionTitle}>照护备注</Text>
              <View className={styles.notesBox}>
                <Text className={styles.notesText}>{pet.notes}</Text>
              </View>
            </View>
          )}
        </>
      )}

      {activeTab === 'timeline' && (
        <View className={styles.timelineContainer}>
          {petCareRecords.length === 0 ? (
            <View className={styles.emptyTimeline}>
              <Text className={styles.emptyTimelineText}>暂无照护记录</Text>
            </View>
          ) : (
            petCareRecords.map(record => {
              const events = getTimelineForRecord(record);
              const hasPhotos = record.photos.length > 0;
              return (
                <View key={record.id} className={styles.timelineDay}>
                  <View className={styles.dayHeader}>
                    <View className={styles.dayDate}>
                      <Text className={styles.dayDateText}>{record.date}</Text>
                    </View>
                    <View className={styles.dayStats}>
                      <Text className={styles.dayStat}>🍚 {record.feeding.filter(f=>f.completed).length}</Text>
                      <Text className={styles.dayStat}>💧 {record.watering.filter(w=>w.completed).length}</Text>
                      <Text className={styles.dayStat}>🐾 {record.walking.filter(w=>w.status==='completed').length}</Text>
                      <Text className={styles.dayStat}>💩 {record.defecation.length}</Text>
                      <Text className={styles.dayStat}>📷 {record.photos.length}</Text>
                    </View>
                  </View>

                  {hasPhotos && (
                    <View className={styles.dayPhotoRow}>
                      {record.photos.slice(0, 6).map((p, idx) => (
                        <Image key={idx} src={p} mode="aspectFill" className={styles.dayPhoto} />
                      ))}
                    </View>
                  )}

                  {events.length === 0 ? (
                    <View className={styles.dayEmptyEvents}>
                      <Text className={styles.dayEmptyText}>当日暂无照护打卡</Text>
                    </View>
                  ) : (
                    <View className={styles.eventsList}>
                      {events.map(ev => (
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
                          </View>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              );
            })
          )}
        </View>
      )}

      {activeTab === 'abnormal' && (
        <View className={styles.reportsContainer}>
          {petReports.length === 0 ? (
            <View className={styles.emptyReports}>
              <Text className={styles.emptyReportsText}>暂无异常记录</Text>
            </View>
          ) : (
            petReports.map(report => (
              <View
                key={report.id}
                className={styles.reportItem}
                onClick={() => Taro.navigateTo({ url: `/pages/report-detail/index?id=${report.id}` })}
              >
                <View className={styles.reportTopRow}>
                  <View className={classnames(
                    styles.reportStatus,
                    report.status === 'resolved' && styles.statusResolved,
                    report.status === 'processing' && styles.statusProcessing,
                    report.status === 'pending' && styles.statusPending
                  )}>
                    {report.status === 'pending' && '待处理'}
                    {report.status === 'processing' && '处理中'}
                    {report.status === 'resolved' && '已解决'}
                  </View>
                  <Text className={styles.reportTimeText}>{report.reportTime}</Text>
                </View>
                <View className={styles.symptomsRow}>
                  {report.symptoms.map((s, i) => (
                    <Text key={i} className={styles.symptomTagSmall}>{s}</Text>
                  ))}
                </View>
                <Text className={styles.reportDesc}>{report.description}</Text>
                {report.photos.length > 0 && (
                  <View className={styles.reportPhotoRow}>
                    {report.photos.slice(0, 3).map((p, idx) => (
                      <Image key={idx} src={p} mode="aspectFill" className={styles.reportPhoto} />
                    ))}
                  </View>
                )}
                {report.resolution && (
                  <View className={styles.resolutionBox}>
                    <Text className={styles.resolutionLabel}>处理结果：</Text>
                    <Text className={styles.resolutionText}>{report.resolution}</Text>
                  </View>
                )}
              </View>
            ))
          )}
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
