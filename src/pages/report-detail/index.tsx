import React, { useState, useEffect } from 'react';
import { View, Text, Image, ScrollView, Button } from '@tarojs/components';
import Taro, { useRouter, useDidShow } from '@tarojs/taro';
import styles from './index.module.scss';
import { useAppStore } from '@/store';
import { AbnormalReport } from '@/types';
import classnames from 'classnames';

const ReportDetailPage: React.FC = () => {
  const router = useRouter();
  const reports = useAppStore(s => s.abnormalReports);
  const pets = useAppStore(s => s.pets);
  const updateAbnormalReport = useAppStore(s => s.updateAbnormalReport);
  const initFromStorage = useAppStore(s => s.initFromStorage);

  const [report, setReport] = useState<AbnormalReport | null>(null);

  const loadReport = () => {
    const reportId = router.params.id;
    const foundReport = reports.find(r => r.id === reportId);
    if (foundReport) {
      setReport(foundReport);
    } else {
      Taro.showToast({ title: '上报记录不存在', icon: 'none' });
    }
  };

  useEffect(() => {
    loadReport();
  }, [router.params.id, reports]);

  useDidShow(() => {
    initFromStorage();
    loadReport();
  });

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
    const pet = pets.find(p => p.id === petId);
    return pet?.avatar || '';
  };

  const getPetPhone = (petId: string) => {
    const pet = pets.find(p => p.id === petId);
    return pet?.ownerPhone || '';
  };

  const handleContactOwner = () => {
    const phone = getPetPhone(report.petId);
    if (phone) {
      Taro.makePhoneCall({ phoneNumber: phone }).catch(() => {});
    } else {
      Taro.showToast({ title: '暂无联系电话', icon: 'none' });
    }
  };

  const handleMarkResolved = () => {
    Taro.showModal({
      title: '确认处理',
      content: '确认标记此异常已解决？',
      confirmText: '确认解决',
      success: (res) => {
        if (res.confirm) {
          Taro.showModal({
            title: '处理说明',
            editable: true,
            placeholderText: '请输入处理结果说明...',
            success: (editRes) => {
              const resolution = editRes.content || '已处理完成，宠物状态恢复正常';
              updateAbnormalReport(report.id, {
                status: 'resolved',
                handler: '店员',
                resolution,
                resolvedTime: new Date().toISOString()
              });
              Taro.showToast({ title: '已标记为已解决', icon: 'success' });
              setTimeout(() => {
                loadReport();
              }, 500);
            }
          });
        }
      }
    });
  };

  const handleMarkProcessing = () => {
    updateAbnormalReport(report.id, {
      status: 'processing',
      handler: '店员'
    });
    Taro.showToast({ title: '已标记为处理中', icon: 'success' });
    setTimeout(() => {
      loadReport();
    }, 500);
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

      {(report.handler || report.resolution || report.resolvedTime) && (
        <View className={styles.handlerSection}>
          <Text className={styles.handlerTitle}>处理信息</Text>
          {report.handler && (
            <View className={styles.handlerInfo}>
              <Text className={styles.handlerLabel}>处理人</Text>
              <Text className={styles.handlerValue}>{report.handler}</Text>
            </View>
          )}
          {report.resolvedTime && (
            <View className={styles.handlerInfo}>
              <Text className={styles.handlerLabel}>解决时间</Text>
              <Text className={styles.handlerValue}>{report.resolvedTime}</Text>
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
        {report.status === 'pending' && (
          <Button
            className={classnames(styles.actionBtn, styles.warningBtn)}
            onClick={handleMarkProcessing}
          >
            🔄 开始处理
          </Button>
        )}
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
