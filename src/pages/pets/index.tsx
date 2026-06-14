import React, { useState, useCallback } from 'react';
import { View, Text, Image, ScrollView, Button } from '@tarojs/components';
import Taro from '@tarojs/taro';
import styles from './index.module.scss';
import { mockPets } from '@/data/mockData';
import { Pet } from '@/types';
import classnames from 'classnames';

const PetsPage: React.FC = () => {
  const [pets, setPets] = useState<Pet[]>(mockPets);
  const [refreshing, setRefreshing] = useState(false);

  const checkedInCount = pets.filter(p => p.status === 'checked-in').length;

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
      Taro.showToast({ title: '刷新成功', icon: 'success' });
    }, 1000);
  }, []);

  const goToDetail = (pet: Pet) => {
    console.log('[Pets] Navigate to pet detail:', pet.id, pet.name);
    Taro.navigateTo({
      url: `/pages/pet-detail/index?id=${pet.id}`
    });
  };

  const handleAddPet = () => {
    console.log('[Pets] Add new pet');
    Taro.showToast({ title: '入住登记功能', icon: 'none' });
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
        <Text className={styles.title}>宠物档案</Text>
        <Button className={styles.addButton} onClick={handleAddPet}>
          + 入住登记
        </Button>
      </View>

      <View className={styles.statsRow}>
        <View className={styles.statsCard}>
          <Text className={styles.statsNumber}>{pets.length}</Text>
          <Text className={styles.statsLabel}>在档宠物</Text>
        </View>
        <View className={styles.statsCard}>
          <Text className={styles.statsNumber}>{checkedInCount}</Text>
          <Text className={styles.statsLabel}>已入住</Text>
        </View>
        <View className={styles.statsCard}>
          <Text className={styles.statsNumber}>{pets.length - checkedInCount}</Text>
          <Text className={styles.statsLabel}>已离店</Text>
        </View>
      </View>

      <View className={styles.petList}>
        {pets.map(pet => (
          <View
            key={pet.id}
            className={styles.petCard}
            onClick={() => goToDetail(pet)}
          >
            <View className={styles.petHeader}>
              <Image
                className={styles.petAvatar}
                src={pet.avatar}
                mode="aspectFill"
              />
              <View className={styles.petInfo}>
                <View className={styles.petNameRow}>
                  <Text className={styles.petName}>{pet.name}</Text>
                  <Text className={classnames(styles.petTag, pet.type === 'dog' ? styles.tagDog : styles.tagCat)}>
                    {pet.type === 'dog' ? '🐕 狗狗' : '🐱 猫咪'}
                  </Text>
                  <Text className={classnames(styles.petTag, styles.tagCheckedIn)}>
                    {pet.status === 'checked-in' ? '已入住' : '已离店'}
                  </Text>
                </View>
                <Text className={styles.petMeta}>
                  {pet.breed} · {pet.gender === 'male' ? '♂' : '♀'} {pet.age} · {pet.weight}
                </Text>
              </View>
            </View>

            <View className={styles.petDetailRow}>
              <View className={styles.detailItem}>
                <Text className={styles.detailLabel}>房间号</Text>
                <Text className={styles.detailValue}>{pet.roomNumber}</Text>
              </View>
              <View className={styles.detailItem}>
                <Text className={styles.detailLabel}>入住日期</Text>
                <Text className={styles.detailValue}>{pet.checkInDate}</Text>
              </View>
              <View className={styles.detailItem}>
                <Text className={styles.detailLabel}>预计离店</Text>
                <Text className={styles.detailValue}>{pet.checkOutDate}</Text>
              </View>
            </View>

            <View className={styles.petDetailRow}>
              <View className={styles.detailItem}>
                <Text className={styles.detailLabel}>主人姓名</Text>
                <Text className={styles.detailValue}>{pet.ownerName}</Text>
              </View>
              <View className={styles.detailItem}>
                <Text className={styles.detailLabel}>联系电话</Text>
                <Text className={styles.detailValue}>{pet.ownerPhone}</Text>
              </View>
              <View className={styles.detailItem}>
                <Text className={styles.detailLabel}>疫苗记录</Text>
                <Text className={styles.detailValue}>{pet.vaccineInfo.length} 条</Text>
              </View>
            </View>

            {pet.notes && (
              <View className={styles.petNotes}>
                <Text className={styles.notesLabel}>📝 照护备注</Text>
                <Text className={styles.notesContent}>{pet.notes}</Text>
              </View>
            )}
          </View>
        ))}
      </View>
    </ScrollView>
  );
};

export default PetsPage;
