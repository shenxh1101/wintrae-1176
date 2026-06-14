import React, { useState, useCallback } from 'react';
import { View, Text, Image, ScrollView, Button, Textarea } from '@tarojs/components';
import Taro from '@tarojs/taro';
import styles from './index.module.scss';
import { useAppStore } from '@/store';
import { AbnormalReport, Message } from '@/types';
import classnames from 'classnames';

const SYMPTOM_OPTIONS = [
  '食欲不振', '呕吐', '腹泻', '便秘', '咳嗽', '打喷嚏',
  '精神萎靡', '发热', '皮肤瘙痒', '脱毛', '眼屎增多', '鼻涕',
  '跛行', '抽搐', '呼吸急促', '其他异常'
];

type FilterType = 'all' | 'pending' | 'processing' | 'resolved';

const ReportPage: React.FC = () => {
  const reports = useAppStore(s => s.abnormalReports);
  const pets = useAppStore(s => s.pets);
  const addAbnormalReport = useAppStore(s => s.addAbnormalReport);
  const addMessage = useAppStore(s => s.addMessage);
  const initFromStorage = useAppStore(s => s.initFromStorage);

  const [filter, setFilter] = useState<FilterType>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedPetId, setSelectedPetId] = useState<string>('');
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => {
      initFromStorage();
      setRefreshing(false);
      Taro.showToast({ title: '刷新成功', icon: 'success' });
    }, 800);
  }, [initFromStorage]);

  const filteredReports = reports.filter(r => {
    if (filter === 'all') return true;
    return r.status === filter;
  });

  const getStatusText = (status: AbnormalReport['status']) => {
    switch (status) {
      case 'pending': return '待处理';
      case 'processing': return '处理中';
      case 'resolved': return '已解决';
    }
  };

  const getPetAvatar = (petId: string) => {
    const pet = pets.find(p => p.id === petId);
    return pet?.avatar || '';
  };

  const toggleSymptom = (symptom: string) => {
    setSelectedSymptoms(prev =>
      prev.includes(symptom)
        ? prev.filter(s => s !== symptom)
        : [...prev, symptom]
    );
  };

  const handleAddPhoto = () => {
    const newPhoto = `https://picsum.photos/seed/symptom${Date.now()}/300/300`;
    setPhotos(prev => [...prev, newPhoto]);
  };

  const handleDeletePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const resetForm = () => {
    setSelectedPetId('');
    setSelectedSymptoms([]);
    setDescription('');
    setPhotos([]);
  };

  const handleSubmit = () => {
    if (!selectedPetId) {
      Taro.showToast({ title: '请选择宠物', icon: 'none' });
      return;
    }
    if (selectedSymptoms.length === 0) {
      Taro.showToast({ title: '请选择症状', icon: 'none' });
      return;
    }
    if (!description.trim()) {
      Taro.showToast({ title: '请填写详细说明', icon: 'none' });
      return;
    }

    const pet = pets.find(p => p.id === selectedPetId);
    const newReport: AbnormalReport = {
      id: `r_${Date.now()}`,
      petId: selectedPetId,
      petName: pet?.name || '',
      reportTime: new Date().toLocaleString('zh-CN'),
      symptoms: selectedSymptoms,
      description: description.trim(),
      photos,
      status: 'pending'
    };

    addAbnormalReport(newReport);

    const msg: Message = {
      id: `m_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      type: 'abnormal-alert',
      title: `${pet?.name || '宠物'} 异常提醒`,
      content: `⚠️ ${selectedSymptoms.join('、')} — ${description.trim()}`,
      petId: selectedPetId,
      petName: pet?.name || '',
      time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
      date: new Date().toISOString().split('T')[0],
      read: false,
      confirmed: false,
      reportId: newReport.id
    };
    addMessage(msg);

    Taro.showToast({ title: '上报成功', icon: 'success' });
    setShowModal(false);
    resetForm();
  };

  const handleReportClick = (report: AbnormalReport) => {
    Taro.navigateTo({
      url: `/pages/report-detail/index?id=${report.id}`
    });
  };

  const checkedInPets = pets.filter(p => p.status === 'checked-in');

  return (
    <ScrollView
      className={styles.container}
      scrollY
      refresherEnabled
      refresherTriggered={refreshing}
      onRefresherRefresh={onRefresh}
    >
      <View className={styles.header}>
        <Text className={styles.title}>异常上报</Text>
        <Button className={styles.addButton} onClick={() => setShowModal(true)}>
          + 新增上报
        </Button>
      </View>

      <View className={styles.filterTabs}>
        {[
          { key: 'all' as FilterType, label: '全部' },
          { key: 'pending' as FilterType, label: '待处理' },
          { key: 'processing' as FilterType, label: '处理中' },
          { key: 'resolved' as FilterType, label: '已解决' }
        ].map(tab => (
          <Button
            key={tab.key}
            className={classnames(styles.filterTab, filter === tab.key && styles.filterTabActive)}
            onClick={() => setFilter(tab.key)}
          >
            {tab.label}
          </Button>
        ))}
      </View>

      {filteredReports.length === 0 ? (
        <View className={styles.emptyTip}>暂无异常上报记录</View>
      ) : (
        <View className={styles.reportList}>
          {filteredReports.map(report => (
            <View
              key={report.id}
              className={styles.reportCard}
              onClick={() => handleReportClick(report)}
            >
              <View className={styles.reportHeader}>
                <View className={styles.reportPetInfo}>
                  <Image
                    className={styles.petAvatar}
                    src={getPetAvatar(report.petId)}
                    mode="aspectFill"
                  />
                  <Text className={styles.petName}>{report.petName}</Text>
                </View>
                <Text className={classnames(styles.statusBadge, styles[`status${report.status.charAt(0).toUpperCase() + report.status.slice(1)}`])}>
                  {getStatusText(report.status)}
                </Text>
              </View>

              <Text className={styles.reportTime}>上报时间：{report.reportTime}</Text>

              <View className={styles.symptomsRow}>
                {report.symptoms.map((symptom, index) => (
                  <Text key={index} className={styles.symptomTag}>
                    {symptom}
                  </Text>
                ))}
              </View>

              <Text className={styles.reportDescription}>{report.description}</Text>

              {report.photos.length > 0 && (
                <View className={styles.photoList}>
                  {report.photos.map((photo, index) => (
                    <Image
                      key={index}
                      className={styles.photoItem}
                      src={photo}
                      mode="aspectFill"
                    />
                  ))}
                </View>
              )}

              {(report.handler || report.resolution) && (
                <View className={styles.reportFooter}>
                  {report.handler && (
                    <Text className={styles.handlerInfo}>处理人：{report.handler}</Text>
                  )}
                  {report.resolution && (
                    <Text className={styles.resolution}>处理结果：{report.resolution}</Text>
                  )}
                </View>
              )}
            </View>
          ))}
        </View>
      )}

      {showModal && (
        <View className={styles.modalOverlay} onClick={() => setShowModal(false)}>
          <ScrollView className={styles.modalContent} scrollY onClick={(e) => e.stopPropagation()}>
            <View className={styles.modalHeader}>
              <Text className={styles.modalTitle}>新增异常上报</Text>
              <Button className={styles.closeBtn} onClick={() => setShowModal(false)}>
                ×
              </Button>
            </View>

            <View className={styles.formSection}>
              <Text className={styles.formLabel}>选择宠物</Text>
              {checkedInPets.length === 0 ? (
                <Text className={styles.emptySubTip}>暂无入住宠物，请先在「宠物档案」登记</Text>
              ) : (
                <View className={styles.petSelector}>
                  {checkedInPets.map(pet => (
                    <Button
                      key={pet.id}
                      className={classnames(styles.petOption, selectedPetId === pet.id && styles.petOptionActive)}
                      onClick={() => setSelectedPetId(pet.id)}
                    >
                      <Image className={styles.petOptionAvatar} src={pet.avatar} mode="aspectFill" />
                      <Text className={styles.petOptionName}>{pet.name}</Text>
                    </Button>
                  ))}
                </View>
              )}
            </View>

            <View className={styles.formSection}>
              <Text className={styles.formLabel}>异常症状（可多选）</Text>
              <View className={styles.symptomSelector}>
                {SYMPTOM_OPTIONS.map(symptom => (
                  <Button
                    key={symptom}
                    className={classnames(styles.symptomOption, selectedSymptoms.includes(symptom) && styles.symptomOptionActive)}
                    onClick={() => toggleSymptom(symptom)}
                  >
                    {symptom}
                  </Button>
                ))}
              </View>
            </View>

            <View className={styles.formSection}>
              <Text className={styles.formLabel}>详细说明</Text>
              <Textarea
                className={styles.textarea}
                placeholder="请详细描述异常情况..."
                value={description}
                onInput={(e) => setDescription(e.detail.value)}
              />
            </View>

            <View className={styles.formSection}>
              <Text className={styles.formLabel}>上传照片（可选）</Text>
              <View className={styles.photoUploader}>
                {photos.map((photo, index) => (
                  <View key={index} className={styles.uploadedPhoto}>
                    <Image src={photo} mode="aspectFill" style={{ width: '100%', height: '100%' }} />
                    <View className={styles.deletePhoto} onClick={() => handleDeletePhoto(index)}>
                      ×
                    </View>
                  </View>
                ))}
                {photos.length < 9 && (
                  <View className={styles.uploadBtn} onClick={handleAddPhoto}>
                    <Text className={styles.uploadIcon}>+</Text>
                    <Text className={styles.uploadText}>添加照片</Text>
                  </View>
                )}
              </View>
            </View>

            <Button className={styles.submitBtn} onClick={handleSubmit}>
              提交上报
            </Button>
          </ScrollView>
        </View>
      )}
    </ScrollView>
  );
};

export default ReportPage;
