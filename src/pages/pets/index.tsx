import React, { useState, useCallback } from 'react';
import { View, Text, Image, ScrollView, Button, Input, Picker } from '@tarojs/components';
import Taro from '@tarojs/taro';
import styles from './index.module.scss';
import { useAppStore } from '@/store';
import { Pet, VaccineInfo } from '@/types';
import classnames from 'classnames';

const PetTypes = [
  { label: '🐕 狗狗', value: 'dog' },
  { label: '🐱 猫咪', value: 'cat' }
];

const Genders = [
  { label: '♂ 公', value: 'male' },
  { label: '♀ 母', value: 'female' }
];

const Vaccines = ['狂犬疫苗', '三联疫苗', '四联疫苗', '六联疫苗', '八联疫苗', '猫三联', '猫瘟'];

type FilterTab = 'all' | 'checked-in' | 'checked-out';

const PetsPage: React.FC = () => {
  const pets = useAppStore(s => s.pets);
  const messages = useAppStore(s => s.messages);
  const addPet = useAppStore(s => s.addPet);
  const checkoutPet = useAppStore(s => s.checkoutPet);
  const addFollowUp = useAppStore(s => s.addFollowUp);
  const initFromStorage = useAppStore(s => s.initFromStorage);

  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [filterTab, setFilterTab] = useState<FilterTab>('all');

  const [form, setForm] = useState({
    name: '',
    type: 'dog',
    breed: '',
    gender: 'male',
    age: '',
    weight: '',
    avatar: '',
    roomNumber: '',
    checkInDate: '',
    checkOutDate: '',
    ownerName: '',
    ownerPhone: '',
    notes: '',
    vaccineName: '',
    vaccineDate: ''
  });
  const [vaccines, setVaccines] = useState<VaccineInfo[]>([]);

  const filteredPets = pets.filter(p => {
    if (filterTab === 'all') return true;
    return p.status === filterTab;
  });
  const checkedInCount = pets.filter(p => p.status === 'checked-in').length;
  const checkedOutCount = pets.filter(p => p.status === 'checked-out').length;

  const getPetRating = (pet: Pet) => {
    if (!pet.ratingId) return null;
    return messages.find(m => m.id === pet.ratingId && m.type === 'rating');
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => {
      initFromStorage();
      setRefreshing(false);
      Taro.showToast({ title: '刷新成功', icon: 'success' });
    }, 800);
  }, [initFromStorage]);

  const goToDetail = (pet: Pet) => {
    Taro.navigateTo({
      url: `/pages/pet-detail/index?id=${pet.id}`
    });
  };

  const handleCheckout = (e: React.MouseEvent, pet: Pet) => {
    e.stopPropagation();
    Taro.showModal({
      title: '确认离店',
      content: `确定要为 ${pet.name} 办理离店吗？办理后将生成寄养回执和评价邀请。`,
      confirmText: '确认离店',
      confirmColor: '#FF7A45',
      success: (res) => {
        if (res.confirm) {
          checkoutPet(pet.id);
          Taro.showToast({ title: '已办理离店', icon: 'success' });
        }
      }
    });
  };

  const handleAddFollowUpFromPets = (ratingMsgId: string) => {
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
                  addFollowUp(ratingMsgId, {
                    type: selectedType,
                    handler: '店员',
                    content,
                    time: new Date().toISOString(),
                    amount
                  });
                  Taro.showToast({ title: '回访已登记', icon: 'success' });
                }
              });
            } else {
              addFollowUp(ratingMsgId, {
                type: selectedType,
                handler: '店员',
                content,
                time: new Date().toISOString()
              });
              Taro.showToast({ title: '回访已登记', icon: 'success' });
            }
          }
        });
      }
    });
  };

  const resetForm = () => {
    setForm({
      name: '',
      type: 'dog',
      breed: '',
      gender: 'male',
      age: '',
      weight: '',
      avatar: '',
      roomNumber: '',
      checkInDate: '',
      checkOutDate: '',
      ownerName: '',
      ownerPhone: '',
      notes: '',
      vaccineName: '',
      vaccineDate: ''
    });
    setVaccines([]);
  };

  const openForm = () => {
    resetForm();
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    setForm(prev => ({ ...prev, checkInDate: today, checkOutDate: tomorrow }));
    setShowForm(true);
  };

  const addVaccine = () => {
    if (!form.vaccineName || !form.vaccineDate) {
      Taro.showToast({ title: '请填写疫苗信息', icon: 'none' });
      return;
    }
    const v: VaccineInfo = {
      id: `v_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: form.vaccineName,
      date: form.vaccineDate
    };
    setVaccines([...vaccines, v]);
    setForm(prev => ({ ...prev, vaccineName: '', vaccineDate: '' }));
  };

  const removeVaccine = (id: string) => {
    setVaccines(vaccines.filter(v => v.id !== id));
  };

  const handleSubmit = () => {
    if (!form.name.trim()) {
      Taro.showToast({ title: '请输入宠物名称', icon: 'none' });
      return;
    }
    if (!form.breed.trim()) {
      Taro.showToast({ title: '请输入品种', icon: 'none' });
      return;
    }
    if (!form.roomNumber.trim()) {
      Taro.showToast({ title: '请输入房间号', icon: 'none' });
      return;
    }
    if (!form.ownerName.trim()) {
      Taro.showToast({ title: '请输入主人姓名', icon: 'none' });
      return;
    }
    if (!form.ownerPhone.trim()) {
      Taro.showToast({ title: '请输入联系电话', icon: 'none' });
      return;
    }

    const avatarUrl = form.avatar.trim() || (
      form.type === 'dog'
        ? 'https://picsum.photos/seed/dog' + Date.now() + '/200/200'
        : 'https://picsum.photos/seed/cat' + Date.now() + '/200/200'
    );

    const newPet: Pet = {
      id: `p_${Date.now()}`,
      name: form.name.trim(),
      type: form.type as 'dog' | 'cat',
      breed: form.breed.trim(),
      gender: form.gender as 'male' | 'female',
      age: form.age || '1岁',
      weight: form.weight || '5kg',
      avatar: avatarUrl,
      status: 'checked-in',
      roomNumber: form.roomNumber.trim(),
      checkInDate: form.checkInDate,
      checkOutDate: form.checkOutDate,
      ownerName: form.ownerName.trim(),
      ownerPhone: form.ownerPhone.trim(),
      vaccineInfo: vaccines,
      notes: form.notes.trim() || undefined
    };

    addPet(newPet);
    setShowForm(false);
    resetForm();
    Taro.showToast({ title: '登记成功', icon: 'success' });
  };

  const renderRatingStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Text key={i} className={classnames(styles.starSmall, i < rating ? styles.starActive : '')}>
        ★
      </Text>
    ));
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
        <Button className={styles.addButton} onClick={openForm}>
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
          <Text className={styles.statsNumber}>{checkedOutCount}</Text>
          <Text className={styles.statsLabel}>已离店</Text>
        </View>
      </View>

      <View className={styles.filterTabs}>
        <View
          className={classnames(styles.filterTab, filterTab === 'all' ? styles.filterTabActive : '')}
          onClick={() => setFilterTab('all')}
        >
          <Text className={styles.filterTabText}>全部</Text>
        </View>
        <View
          className={classnames(styles.filterTab, filterTab === 'checked-in' ? styles.filterTabActive : '')}
          onClick={() => setFilterTab('checked-in')}
        >
          <Text className={styles.filterTabText}>已入住</Text>
          {checkedInCount > 0 && <View className={styles.filterBadge}>{checkedInCount}</View>}
        </View>
        <View
          className={classnames(styles.filterTab, filterTab === 'checked-out' ? styles.filterTabActive : '')}
          onClick={() => setFilterTab('checked-out')}
        >
          <Text className={styles.filterTabText}>已离店</Text>
          {checkedOutCount > 0 && <View className={styles.filterBadge}>{checkedOutCount}</View>}
        </View>
      </View>

      <View className={styles.petList}>
        {filteredPets.length === 0 ? (
          <View className={styles.emptyList}>
            <Text className={styles.emptyListText}>暂无宠物档案</Text>
          </View>
        ) : (
          filteredPets.map(pet => {
            const ratingMsg = getPetRating(pet);
            const ratingStatus = ratingMsg?.ratingStatus || (ratingMsg?.rating && ratingMsg.rating > 0 ? 'rated' : 'pending');
            const hasRatingMsg = !!ratingMsg;
            const hasFollowUps = ratingMsg?.followUps && ratingMsg.followUps.length > 0;
            return (
              <View
                key={pet.id}
                className={classnames(styles.petCard, pet.status === 'checked-out' ? styles.petCardCheckedOut : '')}
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
                      <Text className={classnames(
                        styles.petTag,
                        pet.status === 'checked-in' ? styles.tagCheckedIn : styles.tagCheckedOut
                      )}>
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
                    <Text className={styles.detailLabel}>入住</Text>
                    <Text className={styles.detailValue}>{pet.checkInDate}</Text>
                  </View>
                  <View className={styles.detailItem}>
                    <Text className={styles.detailLabel}>{pet.status === 'checked-out' ? '实际离店' : '预计离店'}</Text>
                    <Text className={styles.detailValue}>
                      {pet.status === 'checked-out' ? pet.actualCheckOutDate || pet.checkOutDate : pet.checkOutDate}
                    </Text>
                  </View>
                </View>

                <View className={styles.petDetailRow}>
                  <View className={styles.detailItem}>
                    <Text className={styles.detailLabel}>主人</Text>
                    <Text className={styles.detailValue}>{pet.ownerName}</Text>
                  </View>
                  <View className={styles.detailItem}>
                    <Text className={styles.detailLabel}>电话</Text>
                    <Text className={styles.detailValue}>{pet.ownerPhone}</Text>
                  </View>
                  <View className={styles.detailItem}>
                    <Text className={styles.detailLabel}>疫苗</Text>
                    <Text className={styles.detailValue}>{pet.vaccineInfo.length} 条</Text>
                  </View>
                </View>

                {pet.notes && (
                  <View className={styles.petNotes}>
                    <Text className={styles.notesLabel}>📝 照护备注</Text>
                    <Text className={styles.notesContent}>{pet.notes}</Text>
                  </View>
                )}

                {hasRatingMsg && (
                  <View className={styles.ratingBox}>
                    <View className={styles.ratingBoxHeader}>
                      <Text className={styles.ratingBoxLabel}>⭐ 服务评价</Text>
                      <Text className={classnames(
                        styles.ratingStatusTag,
                        ratingStatus === 'pending' && styles.ratingStatusPending,
                        ratingStatus === 'rated' && styles.ratingStatusRated,
                        ratingStatus === 'visited' && styles.ratingStatusVisited
                      )}>
                        {ratingStatus === 'pending' ? '待评价' : ratingStatus === 'rated' ? '已评价' : '已回访'}
                      </Text>
                    </View>
                    {(ratingStatus === 'rated' || ratingStatus === 'visited') && ratingMsg?.rating ? (
                      <View className={styles.ratingBoxContent}>
                        <View className={styles.ratingBoxStars}>
                          {renderRatingStars(ratingMsg.rating)}
                          <Text className={styles.ratingBoxScore}>{ratingMsg.rating}.0</Text>
                        </View>
                        {ratingMsg.ratingComment && (
                          <Text className={styles.ratingBoxComment}>"{ratingMsg.ratingComment}"</Text>
                        )}
                        {hasFollowUps && (
                          <Text className={styles.followUpHint}>📞 已回访 {ratingMsg!.followUps!.length} 次</Text>
                        )}
                        <Button
                          className={styles.followUpBtn}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAddFollowUpFromPets(ratingMsg!.id);
                          }}
                        >
                          📞 登记回访
                        </Button>
                      </View>
                    ) : (
                      <Text className={styles.ratingPendingHint}>主人尚未评价，离店后可跟进回访</Text>
                    )}
                  </View>
                )}

                <View className={styles.petCardFooter}>
                  {pet.status === 'checked-in' ? (
                    <>
                      <Button
                        className={styles.btnSecondary}
                        onClick={(e) => { e.stopPropagation(); goToDetail(pet); }}
                      >
                        查看详情
                      </Button>
                      <Button
                        className={styles.btnDanger}
                        onClick={(e) => handleCheckout(e, pet)}
                      >
                        办理离店
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        className={styles.btnSecondary}
                        onClick={(e) => { e.stopPropagation(); goToDetail(pet); }}
                      >
                        查看历史档案
                      </Button>
                    </>
                  )}
                </View>
              </View>
            );
          })
        )}
      </View>

      {showForm && (
        <View className={styles.modalOverlay} onClick={() => setShowForm(false)}>
          <View className={styles.modalSheet} onClick={e => e.stopPropagation()}>
            <View className={styles.sheetHeader}>
              <Text className={styles.sheetTitle}>🐾 入住登记</Text>
              <Text className={styles.sheetClose} onClick={() => setShowForm(false)}>✕</Text>
            </View>

            <ScrollView className={styles.sheetScroll} scrollY>
              <Text className={styles.formSection}>宠物基本信息</Text>

              <View className={styles.formRow}>
                <Text className={styles.formLabel}>宠物名称 *</Text>
                <Input
                  className={styles.formInput}
                  placeholder="请输入宠物名称"
                  value={form.name}
                  onInput={e => setForm({ ...form, name: e.detail.value })}
                />
              </View>

              <View className={styles.formRow}>
                <Text className={styles.formLabel}>类型</Text>
                <View className={styles.pickerWrap}>
                  <Picker
                    mode="selector"
                    range={PetTypes.map(p => p.label)}
                    value={PetTypes.findIndex(p => p.value === form.type)}
                    onChange={e => setForm({ ...form, type: PetTypes[+e.detail.value].value })}
                  >
                    <View className={styles.pickerText}>
                      {PetTypes.find(p => p.value === form.type)?.label}
                    </View>
                  </Picker>
                </View>
              </View>

              <View className={styles.formRow}>
                <Text className={styles.formLabel}>品种 *</Text>
                <Input
                  className={styles.formInput}
                  placeholder="如：金毛、布偶、英短"
                  value={form.breed}
                  onInput={e => setForm({ ...form, breed: e.detail.value })}
                />
              </View>

              <View className={styles.formRow2}>
                <View className={styles.formRowFlex}>
                  <Text className={styles.formLabel}>性别</Text>
                  <View className={styles.pickerWrap}>
                    <Picker
                      mode="selector"
                      range={Genders.map(g => g.label)}
                      value={Genders.findIndex(g => g.value === form.gender)}
                      onChange={e => setForm({ ...form, gender: Genders[+e.detail.value].value })}
                    >
                      <View className={styles.pickerText}>
                        {Genders.find(g => g.value === form.gender)?.label}
                      </View>
                    </Picker>
                  </View>
                </View>
                <View className={styles.formRowFlex}>
                  <Text className={styles.formLabel}>年龄</Text>
                  <Input
                    className={styles.formInput}
                    placeholder="如：2岁"
                    value={form.age}
                    onInput={e => setForm({ ...form, age: e.detail.value })}
                  />
                </View>
              </View>

              <View className={styles.formRow2}>
                <View className={styles.formRowFlex}>
                  <Text className={styles.formLabel}>体重</Text>
                  <Input
                    className={styles.formInput}
                    placeholder="如：6kg"
                    value={form.weight}
                    onInput={e => setForm({ ...form, weight: e.detail.value })}
                  />
                </View>
                <View className={styles.formRowFlex}>
                  <Text className={styles.formLabel}>头像URL</Text>
                  <Input
                    className={styles.formInput}
                    placeholder="选填，留空自动生成"
                    value={form.avatar}
                    onInput={e => setForm({ ...form, avatar: e.detail.value })}
                  />
                </View>
              </View>

              <Text className={styles.formSection}>入住信息</Text>

              <View className={styles.formRow}>
                <Text className={styles.formLabel}>房间号 *</Text>
                <Input
                  className={styles.formInput}
                  placeholder="如：A101"
                  value={form.roomNumber}
                  onInput={e => setForm({ ...form, roomNumber: e.detail.value })}
                />
              </View>

              <View className={styles.formRow2}>
                <View className={styles.formRowFlex}>
                  <Text className={styles.formLabel}>入住日期</Text>
                  <Picker
                    mode="date"
                    value={form.checkInDate}
                    onChange={e => setForm({ ...form, checkInDate: e.detail.value })}
                  >
                    <View className={styles.pickerText}>{form.checkInDate}</View>
                  </Picker>
                </View>
                <View className={styles.formRowFlex}>
                  <Text className={styles.formLabel}>离店日期</Text>
                  <Picker
                    mode="date"
                    value={form.checkOutDate}
                    onChange={e => setForm({ ...form, checkOutDate: e.detail.value })}
                  >
                    <View className={styles.pickerText}>{form.checkOutDate}</View>
                  </Picker>
                </View>
              </View>

              <Text className={styles.formSection}>主人信息</Text>

              <View className={styles.formRow}>
                <Text className={styles.formLabel}>主人姓名 *</Text>
                <Input
                  className={styles.formInput}
                  placeholder="请输入主人姓名"
                  value={form.ownerName}
                  onInput={e => setForm({ ...form, ownerName: e.detail.value })}
                />
              </View>

              <View className={styles.formRow}>
                <Text className={styles.formLabel}>联系电话 *</Text>
                <Input
                  className={styles.formInput}
                  type="number"
                  placeholder="请输入联系电话"
                  value={form.ownerPhone}
                  onInput={e => setForm({ ...form, ownerPhone: e.detail.value })}
                />
              </View>

              <Text className={styles.formSection}>疫苗信息（可添加多条）</Text>

              {vaccines.length > 0 && (
                <View className={styles.vaccineList}>
                  {vaccines.map(v => (
                    <View key={v.id} className={styles.vaccineItem}>
                      <Text className={styles.vaccineText}>💉 {v.name} ({v.date})</Text>
                      <Text className={styles.vaccineDel} onClick={() => removeVaccine(v.id)}>删除</Text>
                    </View>
                  ))}
                </View>
              )}

              <View className={styles.formRow2}>
                <View className={styles.formRowFlex}>
                  <Text className={styles.formLabel}>疫苗名称</Text>
                  <View className={styles.pickerWrap}>
                    <Picker
                      mode="selector"
                      range={Vaccines}
                      value={Vaccines.indexOf(form.vaccineName)}
                      onChange={e => setForm({ ...form, vaccineName: Vaccines[+e.detail.value] })}
                    >
                      <View className={styles.pickerText}>
                        {form.vaccineName || '选择疫苗'}
                      </View>
                    </Picker>
                  </View>
                </View>
                <View className={styles.formRowFlex}>
                  <Text className={styles.formLabel}>接种日期</Text>
                  <Picker
                    mode="date"
                    value={form.vaccineDate}
                    onChange={e => setForm({ ...form, vaccineDate: e.detail.value })}
                  >
                    <View className={styles.pickerText}>{form.vaccineDate || '选择日期'}</View>
                  </Picker>
                </View>
              </View>
              <Button className={styles.addVaccineBtn} onClick={addVaccine}>
                + 添加一条疫苗记录
              </Button>

              <Text className={styles.formSection}>照护备注（选填）</Text>
              <View className={styles.formRow}>
                <Input
                  className={styles.formInput}
                  placeholder="如：怕打雷、需喂药等"
                  value={form.notes}
                  onInput={e => setForm({ ...form, notes: e.detail.value })}
                />
              </View>

              <View className={styles.formSpacer} />
            </ScrollView>

            <View className={styles.sheetFooter}>
              <Button className={styles.cancelBtn} onClick={() => setShowForm(false)}>取消</Button>
              <Button className={styles.confirmBtn} onClick={handleSubmit}>确认登记</Button>
            </View>
          </View>
        </View>
      )}
    </ScrollView>
  );
};

export default PetsPage;
