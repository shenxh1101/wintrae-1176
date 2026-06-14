import React, { useState, useEffect } from 'react';
import { View, Text, Image, ScrollView, Button } from '@tarojs/components';
import Taro, { useRouter, useDidShow } from '@tarojs/taro';
import styles from './index.module.scss';
import { useAppStore } from '@/store';
import { Pet } from '@/types';
import classnames from 'classnames';

const PetDetailPage: React.FC = () => {
  const router = useRouter();
  const pets = useAppStore(s => s.pets);
  const initFromStorage = useAppStore(s => s.initFromStorage);
  const [pet, setPet] = useState<Pet | null>(null);

  const loadPet = () => {
    const petId = router.params.id;
    const foundPet = pets.find(p => p.id === petId);
    if (foundPet) {
      setPet(foundPet);
    } else {
      Taro.showToast({ title: '宠物不存在', icon: 'none' });
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

  const handleCallOwner = () => {
    if (pet.ownerPhone) {
      Taro.makePhoneCall({ phoneNumber: pet.ownerPhone }).catch(() => {});
    } else {
      Taro.showToast({ title: '暂无联系电话', icon: 'none' });
    }
  };

  const handleGoCare = () => {
    Taro.switchTab({ url: '/pages/care/index' });
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
            <Text className={styles.petBreed}>{pet.breed}</Text>
          </View>
        </View>
      </View>

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
            <Text className={styles.infoLabel}>入住日期</Text>
            <Text className={styles.infoValue}>{pet.checkInDate}</Text>
          </View>
          <View className={styles.infoItem}>
            <Text className={styles.infoLabel}>预计离店</Text>
            <Text className={styles.infoValue}>{pet.checkOutDate}</Text>
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
                <View className={styles.vaccineInfo}>
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

      <View className={styles.actionButtons}>
        <Button
          className={classnames(styles.actionBtn, styles.secondaryBtn)}
          onClick={handleCallOwner}
        >
          📞 联系主人
        </Button>
        <Button
          className={classnames(styles.actionBtn, styles.primaryBtn)}
          onClick={handleGoCare}
        >
          📋 查看照护
        </Button>
      </View>
    </ScrollView>
  );
};

export default PetDetailPage;
