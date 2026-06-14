import React, { useState, useCallback } from 'react';
import { View, Text, Image, ScrollView, Button, Textarea } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import styles from './index.module.scss';
import { useAppStore } from '@/store';
import { Message, MessageType } from '@/types';
import classnames from 'classnames';

type FilterType = 'all' | MessageType;

const MessagesPage: React.FC = () => {
  const messages = useAppStore(s => s.messages);
  const updateMessage = useAppStore(s => s.updateMessage);
  const markMessageRead = useAppStore(s => s.markMessageRead);
  const addMessage = useAppStore(s => s.addMessage);
  const initFromStorage = useAppStore(s => s.initFromStorage);

  const [filter, setFilter] = useState<FilterType>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [ratingValue, setRatingValue] = useState(0);
  const [ratingComment, setRatingComment] = useState('');

  useDidShow(() => {
    initFromStorage();
  });

  const unreadCount = messages.filter(m => !m.read).length;

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => {
      initFromStorage();
      setRefreshing(false);
      Taro.showToast({ title: '刷新成功', icon: 'success' });
    }, 800);
  }, [initFromStorage]);

  const filteredMessages = messages.filter(m => {
    if (filter === 'all') return true;
    return m.type === filter;
  });

  const getTypeIcon = (type: Message['type']) => {
    switch (type) {
      case 'care-update': return '📋';
      case 'abnormal-alert': return '⚠️';
      case 'owner-receipt': return '✅';
      case 'rating': return '⭐';
    }
  };

  const getTypeStyle = (type: Message['type']) => {
    switch (type) {
      case 'care-update': return styles.typeCare;
      case 'abnormal-alert': return styles.typeAlert;
      case 'owner-receipt': return styles.typeReceipt;
      case 'rating': return styles.typeRating;
    }
  };

  const getFilterLabel = (type: FilterType) => {
    switch (type) {
      case 'all': return '全部';
      case 'care-update': return '照护动态';
      case 'abnormal-alert': return '异常提醒';
      case 'owner-receipt': return '主人回执';
      case 'rating': return '服务评价';
    }
  };

  const refreshSelected = (id: string) => {
    const updated = messages.find(m => m.id === id);
    if (updated) {
      setSelectedMessage(updated);
    }
  };

  const handleMessageClick = (message: Message) => {
    if (!message.read) {
      markMessageRead(message.id);
    }
    const current = messages.find(m => m.id === message.id) || message;
    setSelectedMessage(current);
    setRatingValue(current.rating || 0);
    setRatingComment(current.ratingComment || '');
    setShowDetail(true);
  };

  const handleConfirmReceipt = (messageId: string) => {
    updateMessage(messageId, {
      receiptConfirmed: true,
      confirmed: true
    });
    const current = messages.find(m => m.id === messageId);
    if (current && current.petId && current.petName) {
      const receiptMsg: Message = {
        id: `m_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        type: 'owner-receipt',
        title: `${current.petName} 主人已确认`,
        content: `✅ 主人已确认今日照护完成，感谢您的服务！`,
        petId: current.petId,
        petName: current.petName,
        time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
        date: new Date().toISOString().split('T')[0],
        read: false,
        confirmed: true
      };
      addMessage(receiptMsg);
    }
    Taro.showToast({ title: '已确认照护完成', icon: 'success' });
    setTimeout(() => {
      refreshSelected(messageId);
    }, 300);
    setShowDetail(false);
  };

  const handleSubmitRating = () => {
    if (ratingValue === 0) {
      Taro.showToast({ title: '请选择评分', icon: 'none' });
      return;
    }
    if (selectedMessage) {
      updateMessage(selectedMessage.id, {
        rating: ratingValue,
        ratingComment
      });
      Taro.showToast({ title: '评价提交成功', icon: 'success' });
      setTimeout(() => {
        refreshSelected(selectedMessage.id);
      }, 300);
    }
    setShowDetail(false);
  };

  const renderStars = (count: number, size: 'small' | 'large' = 'small', interactive = false) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Text
        key={i}
        className={classnames(
          size === 'small' ? styles.star : styles.starLarge,
          i < count && (size === 'small' ? styles.starActive : styles.starLargeActive),
          interactive && size === 'large' && styles.starInteractive
        )}
        onClick={interactive ? () => setRatingValue(i + 1) : undefined}
      >
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
        <Text className={styles.title}>消息中心</Text>
        {unreadCount > 0 && (
          <Text className={styles.unreadBadge}>{unreadCount}</Text>
        )}
      </View>

      <View className={styles.filterTabs}>
        {(['all', 'care-update', 'abnormal-alert', 'owner-receipt', 'rating'] as FilterType[]).map(type => (
          <Button
            key={type}
            className={classnames(styles.filterTab, filter === type && styles.filterTabActive)}
            onClick={() => setFilter(type)}
          >
            {getFilterLabel(type)}
          </Button>
        ))}
      </View>

      {filteredMessages.length === 0 ? (
        <View className={styles.emptyTip}>暂无消息</View>
      ) : (
        <View className={styles.messageList}>
          {filteredMessages.map(message => (
            <View
              key={message.id}
              className={styles.messageCard}
              onClick={() => handleMessageClick(message)}
            >
              {!message.read && <View className={styles.unreadDot} />}

              <View className={styles.messageHeader}>
                <View className={classnames(styles.typeIcon, getTypeStyle(message.type))}>
                  <Text>{getTypeIcon(message.type)}</Text>
                </View>
                <View className={styles.messageInfo}>
                  <Text className={styles.messageTitle}>{message.title}</Text>
                  <Text className={styles.messageTime}>{message.time}</Text>
                </View>
              </View>

              <Text className={styles.messageContent}>{message.content}</Text>

              {message.type === 'rating' && message.rating && (
                <>
                  <View className={styles.ratingStars}>
                    {renderStars(message.rating)}
                  </View>
                  {message.ratingComment && (
                    <Text className={styles.ratingComment}>「{message.ratingComment}」</Text>
                  )}
                </>
              )}

              {message.type === 'care-update' && (
                <View className={styles.messageActions}>
                  <Text className={classnames(styles.statusTag, message.receiptConfirmed ? styles.statusConfirmed : styles.statusUnconfirmed)}>
                    {message.receiptConfirmed ? '主人已确认' : '待主人确认'}
                  </Text>
                </View>
              )}

              {((message.type === 'care-update' && !message.receiptConfirmed) || (message.type === 'rating' && !message.rating)) && (
                <View className={styles.messageActions}>
                  {message.type === 'care-update' && !message.receiptConfirmed && (
                    <Button
                      className={classnames(styles.actionButton, styles.primaryBtn)}
                      onClick={(e) => { e.stopPropagation(); handleConfirmReceipt(message.id); }}
                    >
                      确认照护完成
                    </Button>
                  )}
                  {message.type === 'rating' && !message.rating && (
                    <Button
                      className={classnames(styles.actionButton, styles.secondaryBtn)}
                      onClick={(e) => { e.stopPropagation(); handleMessageClick(message); }}
                    >
                      去评价
                    </Button>
                  )}
                </View>
              )}
            </View>
          ))}
        </View>
      )}

      {showDetail && selectedMessage && (
        <View className={styles.detailModal} onClick={() => setShowDetail(false)}>
          <View className={styles.detailContent} onClick={(e) => e.stopPropagation()}>
            <View className={styles.detailHeader}>
              <Text className={styles.detailTitle}>消息详情</Text>
              <Button className={styles.closeBtn} onClick={() => setShowDetail(false)}>
                ×
              </Button>
            </View>

            <View className={styles.detailInfo}>
              <View className={styles.detailRow}>
                <Text className={styles.detailLabel}>消息类型</Text>
                <Text className={styles.detailValue}>{getFilterLabel(selectedMessage.type)}</Text>
              </View>
              {selectedMessage.petName && (
                <View className={styles.detailRow}>
                  <Text className={styles.detailLabel}>关联宠物</Text>
                  <Text className={styles.detailValue}>{selectedMessage.petName}</Text>
                </View>
              )}
              <View className={styles.detailRow}>
                <Text className={styles.detailLabel}>发送时间</Text>
                <Text className={styles.detailValue}>{selectedMessage.time}</Text>
              </View>
              {selectedMessage.type === 'care-update' && (
                <View className={styles.detailRow}>
                  <Text className={styles.detailLabel}>确认状态</Text>
                  <Text className={classnames(styles.detailValue, selectedMessage.receiptConfirmed ? styles.textGreen : styles.textOrange)}>
                    {selectedMessage.receiptConfirmed ? '✓ 已确认' : '待确认'}
                  </Text>
                </View>
              )}
              {selectedMessage.type === 'rating' && selectedMessage.rating && (
                <View className={styles.detailRow}>
                  <Text className={styles.detailLabel}>服务评分</Text>
                  <View style={{ flex: 1 }}>
                    {renderStars(selectedMessage.rating)}
                  </View>
                </View>
              )}
            </View>

            <View className={styles.detailBody}>
              <Text className={styles.detailBodyText}>{selectedMessage.content}</Text>
            </View>

            {selectedMessage.type === 'rating' && !selectedMessage.rating && (
              <View className={styles.ratingSection}>
                <Text className={styles.ratingSectionTitle}>服务评分</Text>
                <View className={styles.ratingStarsLarge}>
                  {renderStars(ratingValue, 'large', true)}
                </View>
                <Text className={styles.ratingHint}>
                  {ratingValue === 1 && '很不满意'}
                  {ratingValue === 2 && '不满意'}
                  {ratingValue === 3 && '一般'}
                  {ratingValue === 4 && '满意'}
                  {ratingValue === 5 && '非常满意'}
                </Text>
                <Textarea
                  className={styles.ratingTextarea}
                  placeholder="请输入您的评价（选填）..."
                  value={ratingComment}
                  onInput={(e) => setRatingComment(e.detail.value)}
                />
              </View>
            )}

            <View className={styles.detailActions}>
              {selectedMessage.type === 'care-update' && !selectedMessage.receiptConfirmed && (
                <Button
                  className={classnames(styles.actionFullBtn, styles.primaryBtn)}
                  onClick={() => handleConfirmReceipt(selectedMessage.id)}
                >
                  确认照护完成
                </Button>
              )}
              {selectedMessage.type === 'rating' && !selectedMessage.rating && (
                <Button
                  className={classnames(styles.actionFullBtn, styles.primaryBtn)}
                  onClick={handleSubmitRating}
                >
                  提交评价
                </Button>
              )}
              {((selectedMessage.type === 'care-update' && selectedMessage.receiptConfirmed) ||
                (selectedMessage.type === 'rating' && selectedMessage.rating) ||
                selectedMessage.type === 'abnormal-alert' ||
                selectedMessage.type === 'owner-receipt') && (
                <Button
                  className={classnames(styles.actionFullBtn, styles.ghostBtn)}
                  onClick={() => setShowDetail(false)}
                >
                  关闭
                </Button>
              )}
            </View>
          </View>
        </View>
      )}
    </ScrollView>
  );
};

export default MessagesPage;
