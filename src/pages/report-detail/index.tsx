import React, { useState, useEffect } from 'react';
import { View, Text, Image, ScrollView, Button } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';
import styles from './index.module.scss';
import { mockAbnormalReports, mockPets } from '@/data/mockData';
import { AbnormalReport } from '@/types';
import classnames from 'classnames';

const ReportDetailPage: React.FC = () => {
  const router = useRouter();
  const [report, setReport] = useState<AbnormalReport | null>(null);

  useEffect(() => {
    const reportId = router.params.id;
    console.log('[ReportDetail] Report ID:', reportId);
    const foundReport = mockAbnormalReports.find(r => r.id === reportId);
    if (foundReport) {
      setReport(foundReport);
    } else {
      Taro.showToast({ title: '上报记录不存在', icon: 'none' });
    }
  }, [router.params.id]);

  if (!report) {
    return (
      <ScrollView className={styles.container}>
        <View style={{ textAlign: 'center', padding: '80rpx 0', color: '#86909C' }}>
          加载中...
        </View>
      </ScrollView>
    );
  }

  const getStatusText = (status: AbnormalReport['status']) => {
    switch (status) {
      case 'pending': return '待处理';
      case 'processing': return '处理中';
      case 'resolved': return '已解决';
    }
  };

  const getPetAvatar = (petId: string) => {
    const pet = mockPets.find(p => p.id === petId);
    return pet?.avatar || '';
  };

  const handleContactOwner = () => {
    console.log('[ReportDetail] Contact owner for pet:', report.petId);
    Taro.showToast({ title: '联系主人功能', icon: 'none' });
  };

  const handleMarkResolved = () => {
    console.log('[ReportDetail] Mark resolved:', report.id);
    Taro.showModal({
      title: '确认处理',
      content: '确认标记此异常已解决？',
      success: (res) => {
        if (res.confirm) {
          Taro.showToast({ title: '已标记为已解决', icon: 'success' });
        }
      }
    });
  };

  return (
    <ScrollView className={styles.container}>
      <View className={styles.statusHeader}>
        <View className={styles.petInfo}>
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

      <View className={styles.infoSection}>
        <Text className={styles.sectionTitle}>基本信息</Text>
        <View className={styles.infoRow}>
          <Text className={styles.infoLabel}>上报时间</Text>
          <Text className={styles.infoValue}>{report.reportTime}</Text>
        </View>
        <View className={styles.infoRow}>
          <Text className={styles.infoLabel}>异常症状</Text>
          <View className={styles.symptomsList}>
            {report.symptoms.map((symptom, index) => (
              <Text key={index} className={styles.symptomTag}>
                {symptom}
              </Text>
            ))}
          </View>
        </View>
      </View>

      <View className={styles.infoSection}>
        <Text className={styles.sectionTitle}>详细说明</Text>
        <View className={styles.descriptionBox}>
          <Text className={styles.descriptionText}>{report.description}</Text>
        </View>
      </View>

      <View className={styles.infoSection}>
        <Text className={styles.sectionTitle}>现场照片</Text>
        {report.photos.length > 0 ? (
          <View className={styles.photoGrid}>
            {report.photos.map((photo, index) => (
              <Image
                key={index}
                className={styles.photoItem}
                src={photo}
                mode="aspectFill"
              />
            ))}
          </View>
        ) : (
          <View className={styles.emptyPhotos}>暂无照片</View>
        )}
      </View>

      {(report.handler || report.resolution) && (
        <View className={styles.handlerSection}>
          <Text className={styles.handlerTitle}>处理信息</Text>
          {report.handler && (
            <View className={styles.handlerInfo}>
              <Text className={styles.handlerLabel}>处理人</Text>
              <Text className={styles.handlerValue}>{report.handler}</Text>
            </View>
          )}
          {report.resolution && (
            <Text className={styles.resolutionText}>{report.resolution}</Text>
          )}
        </View>
      )}

      <View className={styles.actionButtons}>
        <Button
          className={classnames(styles.actionBtn, styles.secondaryBtn)}
          onClick={handleContactOwner}
        >
          📞 联系主人
        </Button>
        {report.status !== 'resolved' && (
          <Button
            className={classnames(styles.actionBtn, styles.primaryBtn)}
            onClick={handleMarkResolved}
          >
            ✅ 标记已解决
          </Button>
        )}
      </View>
    </ScrollView>
  );
};

export default ReportDetailPage;
