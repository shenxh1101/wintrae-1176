import React, { useState, useMemo } from 'react';
import { View, Text, Image, ScrollView, Button, Textarea } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import styles from './index.module.scss';
import { useAppStore } from '@/store';
import { Message, CareDetailItem, StayGroup, FollowUpRecord } from '@/types';
import classnames from 'classnames';

const CARE_ICONS: Record<CareDetailItem['type'], string> = {
  feeding: '🍚',
  watering: '💧',
  walking: '🐾',
  defecation: '💩',
  grooming: '✂️',
  medication: '💊',
  photo: '📷'
};

const CARE_LABELS: Record<CareDetailItem['type'], string> = {
  feeding: '喂食',
  watering: '饮水',
  walking: '遛放',
  defecation: '排便',
  grooming: '洗护',
  medication: '用药',
  photo: '照片'
};

const TYPE_ICONS: Record<Message['type'], string> = {
  'care-summary': '📋',
  'care-update': '📌',
  'abnormal-alert': '⚠️',
  'abnormal-resolved': '✅',
  'owner-receipt': '📮',
  'rating': '⭐',
  'follow-up': '📌'
};

const formatTime = (iso: string) => {
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  } catch {
    return iso;
  }
};

const formatDate = (iso: string) => {
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return `${d.getMonth() + 1}月${d.getDate()}日`;
  } catch {
    return iso;
  }
};

const formatDateRange = (checkIn: string, checkOut?: string) => {
  if (!checkOut) return `${formatDate(checkIn)} → 进行中`;
  return `${formatDate(checkIn)} → ${formatDate(checkOut)}`;
};

const MessagesPage: React.FC = () => {
  const getStayGroups = useAppStore(s => s.getStayGroups);
  const toggleStayExpand = useAppStore(s => s.toggleStayExpand);
  const markStayRead = useAppStore(s => s.markStayRead);
  const markMessageRead = useAppStore(s => s.markMessageRead);
  const toggleSummaryExpand = useAppStore(s => s.toggleSummaryExpand);
  const updateMessage = useAppStore(s => s.updateMessage);
  const addFollowUp = useAppStore(s => s.addFollowUp);
  const initFromStorage = useAppStore(s => s.initFromStorage);
  const staysExpanded = useAppStore(s => (s as any).staysExpanded || {});

  const [refreshing, setRefreshing] = useState(false);
  const [ratingInputs, setRatingInputs] = useState<Record<string, { rating: number; comment: string }>>({});

  useDidShow(() => {
    initFromStorage();
  });

  const stayGroups = useMemo(() => getStayGroups(), [getStayGroups]);

  const totalUnread = useMemo(() => {
    return stayGroups.reduce((sum, group) => sum + group.unreadCount, 0);
  }, [stayGroups]);

  const isGroupExpanded = (stayKey: string) => {
    return staysExpanded[stayKey] || false;
  };

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      initFromStorage();
      setRefreshing(false);
      Taro.showToast({ title: '刷新成功', icon: 'success' });
    }, 800);
  };

  const handleGroupClick = (stayKey: string) => {
    toggleStayExpand(stayKey);
    markStayRead(stayKey);
  };

  const handleMessageClick = (message: Message) => {
    if (!message.read) {
      markMessageRead(message.id);
    }
  };

  const handleToggleExpand = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    toggleSummaryExpand(id);
  };

  const handleConfirmReceipt = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    updateMessage(id, { receiptConfirmed: true });
    Taro.showToast({ title: '已确认', icon: 'success' });
  };

  const getRatingInput = (id: string) => {
    return ratingInputs[id] || { rating: 0, comment: '' };
  };

  const handleRatingChange = (id: string, rating: number) => {
    setRatingInputs(prev => ({
      ...prev,
      [id]: { ...(prev[id] || { rating: 0, comment: '' }), rating }
    }));
  };

  const handleRatingCommentChange = (id: string, comment: string) => {
    setRatingInputs(prev => ({
      ...prev,
      [id]: { ...(prev[id] || { rating: 0, comment: '' }), comment }
    }));
  };

  const handleSubmitRating = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const input = getRatingInput(id);
    if (input.rating === 0) {
      Taro.showToast({ title: '请选择评分', icon: 'none' });
      return;
    }
    updateMessage(id, {
      rating: input.rating,
      ratingComment: input.comment
    });
    setRatingInputs(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    Taro.showToast({ title: '评价提交成功', icon: 'success' });
  };

  const renderStars = (count: number, interactive = false, messageId?: string) => {
    const displayCount = interactive ? getRatingInput(messageId!).rating : count;
    return Array.from({ length: 5 }, (_, i) => (
      <Text
        key={i}
        className={classnames(
          styles.star,
          i < displayCount && styles.starActive,
          interactive && styles.starInteractive
        )}
        onClick={interactive ? (e) => {
          e.stopPropagation();
          handleRatingChange(messageId!, i + 1);
        } : undefined}
      >
        ★
      </Text>
    ));
  };

  const renderCareDetails = (details?: CareDetailItem[]) => {
    if (!details || details.length === 0) return null;
    const sortedDetails = [...details].sort((a, b) => {
      const timeA = new Date(a.time).getTime();
      const timeB = new Date(b.time).getTime();
      return timeB - timeA;
    });
    return (
      <View className={styles.careDetails}>
        {sortedDetails.map((item, index) => (
          <View key={index} className={styles.careDetailItem}>
            <Text className={styles.careDetailTime}>{formatTime(item.time)}</Text>
            <Text className={styles.careDetailIcon}>{CARE_ICONS[item.type]}</Text>
            <Text className={styles.careDetailDesc}>{item.desc}</Text>
            {item.type === 'photo' && item.photoUrl && (
              <Image
                className={styles.careDetailPhoto}
                src={item.photoUrl}
                mode="aspectFill"
              />
            )}
          </View>
        ))}
      </View>
    );
  };

  const renderCareSummary = (message: Message) => {
    const summaryText = message.content || '';
    return (
      <View
        key={message.id}
        className={classnames(styles.messageCard, styles.careSummaryCard)}
        onClick={() => handleMessageClick(message)}
      >
        {!message.read && <View className={styles.unreadDot} />}
        <View className={styles.summaryHeader}>
          <View className={styles.summaryLeft}>
            <View className={classnames(styles.typeIcon, styles.typeCare)}>
              <Text>{TYPE_ICONS[message.type]}</Text>
            </View>
            <View className={styles.summaryInfo}>
              <Text className={styles.petName}>{message.title || `${formatDate(message.time)} 照护动态`}</Text>
              <Text className={styles.summaryDate}>{formatTime(message.time)}</Text>
            </View>
          </View>
          <Button
            className={classnames(styles.expandBtn, message.expanded && styles.expandBtnActive)}
            onClick={(e) => handleToggleExpand(e, message.id)}
          >
            <Text className={styles.expandIcon}>{message.expanded ? '▲' : '▼'}</Text>
          </Button>
        </View>
        <View className={styles.summaryContent}>
          <Text className={styles.summaryText}>{summaryText}</Text>
        </View>
        {message.expanded && renderCareDetails(message.careDetails)}
      </View>
    );
  };

  const renderAbnormalAlert = (message: Message) => {
    return (
      <View
        key={message.id}
        className={classnames(styles.messageCard, styles.alertCard)}
        onClick={() => handleMessageClick(message)}
      >
        {!message.read && <View className={styles.unreadDot} />}
        <View className={styles.messageHeader}>
          <View className={classnames(styles.typeIcon, styles.typeAlert)}>
            <Text>{TYPE_ICONS[message.type]}</Text>
          </View>
          <View className={styles.messageInfo}>
            <Text className={styles.messageTitle}>{message.title}</Text>
            <Text className={styles.messageTime}>{formatTime(message.time)}</Text>
          </View>
        </View>
        <Text className={styles.messageContent}>{message.content}</Text>
      </View>
    );
  };

  const renderAbnormalResolved = (message: Message) => {
    return (
      <View
        key={message.id}
        className={classnames(styles.messageCard, styles.receiptCard)}
        onClick={() => handleMessageClick(message)}
      >
        {!message.read && <View className={styles.unreadDot} />}
        <View className={styles.messageHeader}>
          <View className={classnames(styles.typeIcon, styles.typeReceipt)}>
            <Text>{TYPE_ICONS[message.type]}</Text>
          </View>
          <View className={styles.messageInfo}>
            <Text className={styles.messageTitle}>{message.title}</Text>
            <Text className={styles.messageTime}>{formatTime(message.time)}</Text>
          </View>
        </View>
        <Text className={styles.messageContent}>{message.content}</Text>
      </View>
    );
  };

  const renderOwnerReceipt = (message: Message) => {
    return (
      <View
        key={message.id}
        className={classnames(styles.messageCard, styles.receiptCard)}
        onClick={() => handleMessageClick(message)}
      >
        {!message.read && <View className={styles.unreadDot} />}
        <View className={styles.messageHeader}>
          <View className={classnames(styles.typeIcon, styles.typeReceipt)}>
            <Text>{TYPE_ICONS[message.type]}</Text>
          </View>
          <View className={styles.messageInfo}>
            <Text className={styles.messageTitle}>{message.title}</Text>
            <Text className={styles.messageTime}>{formatTime(message.time)}</Text>
          </View>
        </View>
        <Text className={styles.messageContent}>{message.content}</Text>
        <View className={styles.messageActions}>
          {message.receiptConfirmed ? (
            <Text className={classnames(styles.statusTag, styles.statusConfirmed)}>
              已确认
            </Text>
          ) : (
            <Button
              className={classnames(styles.actionButton, styles.primaryBtn)}
              onClick={(e) => handleConfirmReceipt(e, message.id)}
            >
              确认回执
            </Button>
          )}
        </View>
      </View>
    );
  };

  const renderFollowUps = (followUps?: FollowUpRecord[]) => {
    if (!followUps || followUps.length === 0) return null;
    return (
      <View className={styles.careDetails}>
        {followUps.map((item) => (
          <View key={item.id} className={styles.careDetailItem}>
            <Text className={styles.careDetailTime}>{formatDate(item.time)}</Text>
            <Text className={styles.careDetailIcon}>📌</Text>
            <View className={styles.careDetailDesc}>
              <Text style={{ fontWeight: 500 }}>{item.handler} · {item.type === 'phone' ? '电话回访' : item.type === 'onsite' ? '上门回访' : item.type === 'compensation' ? '赔偿处理' : '其他'}</Text>
              <Text style={{ display: 'block', marginTop: 4 }}>{item.content}</Text>
              {item.amount !== undefined && (
                <Text style={{ display: 'block', marginTop: 4, color: '#FFB800' }}>赔偿金额：¥{item.amount}</Text>
              )}
            </View>
          </View>
        ))}
      </View>
    );
  };

  const renderRating = (message: Message) => {
    const hasRated = message.rating && message.rating > 0;
    const input = getRatingInput(message.id);
    return (
      <View
        key={message.id}
        className={classnames(styles.messageCard, styles.ratingCard)}
        onClick={() => handleMessageClick(message)}
      >
        {!message.read && <View className={styles.unreadDot} />}
        <View className={styles.messageHeader}>
          <View className={classnames(styles.typeIcon, styles.typeRating)}>
            <Text>{TYPE_ICONS[message.type]}</Text>
          </View>
          <View className={styles.messageInfo}>
            <Text className={styles.messageTitle}>{message.title}</Text>
            <Text className={styles.messageTime}>{formatTime(message.time)}</Text>
          </View>
        </View>
        <Text className={styles.messageContent}>{message.content}</Text>

        {hasRated ? (
          <View className={styles.ratingResult}>
            <View className={styles.ratingStars}>
              {renderStars(message.rating!)}
              <Text className={styles.ratingScore}>{message.rating}.0</Text>
            </View>
            {message.ratingComment && (
              <Text className={styles.ratingCommentDisplay}>「{message.ratingComment}」</Text>
            )}
            <Text className={classnames(styles.statusTag, styles.statusConfirmed)}>
              已评价
            </Text>
            {renderFollowUps(message.followUps)}
          </View>
        ) : (
          <View className={styles.ratingForm} onClick={(e) => e.stopPropagation()}>
          <View className={styles.ratingStarsInteractive}>
            {renderStars(0, true, message.id)}
          </View>
          <Text className={styles.ratingHint}>
            {input.rating === 1 && '很不满意'}
            {input.rating === 2 && '不满意'}
            {input.rating === 3 && '一般'}
            {input.rating === 4 && '满意'}
            {input.rating === 5 && '非常满意'}
            {input.rating === 0 && '点击星星进行评分'}
          </Text>
          <Textarea
            className={styles.ratingTextarea}
            placeholder="请输入您的评价（选填）..."
            value={input.comment}
            onInput={(e) => handleRatingCommentChange(message.id, e.detail.value)}
          />
          <Button
            className={classnames(styles.actionButton, styles.primaryBtn, styles.submitRatingBtn)}
            onClick={(e) => handleSubmitRating(e, message.id)}
          >
            提交评价
          </Button>
        </View>
        )}
      </View>
    );
  };

  const renderCareUpdate = (message: Message) => {
    return (
      <View
        key={message.id}
        className={classnames(styles.messageCard, styles.careSummaryCard)}
        onClick={() => handleMessageClick(message)}
      >
        {!message.read && <View className={styles.unreadDot} />}
        <View className={styles.messageHeader}>
          <View className={classnames(styles.typeIcon, styles.typeCare)}>
            <Text>{TYPE_ICONS[message.type]}</Text>
          </View>
          <View className={styles.messageInfo}>
            <Text className={styles.messageTitle}>{message.title}</Text>
            <Text className={styles.messageTime}>{formatTime(message.time)}</Text>
          </View>
        </View>
        <Text className={styles.messageContent}>{message.content}</Text>
      </View>
    );
  };

  const renderFollowUp = (message: Message) => {
    return (
      <View
        key={message.id}
        className={classnames(styles.messageCard, styles.careSummaryCard)}
        onClick={() => handleMessageClick(message)}
      >
        {!message.read && <View className={styles.unreadDot} />}
        <View className={styles.messageHeader}>
          <View className={classnames(styles.typeIcon, styles.typeCare)}>
            <Text>{TYPE_ICONS[message.type]}</Text>
          </View>
          <View className={styles.messageInfo}>
            <Text className={styles.messageTitle}>{message.title}</Text>
            <Text className={styles.messageTime}>{formatTime(message.time)}</Text>
          </View>
        </View>
        <Text className={styles.messageContent}>{message.content}</Text>
      </View>
    );
  };

  const renderMessage = (message: Message) => {
    switch (message.type) {
      case 'care-summary':
        return renderCareSummary(message);
      case 'care-update':
        return renderCareUpdate(message);
      case 'abnormal-alert':
        return renderAbnormalAlert(message);
      case 'abnormal-resolved':
        return renderAbnormalResolved(message);
      case 'owner-receipt':
        return renderOwnerReceipt(message);
      case 'rating':
        return renderRating(message);
      case 'follow-up':
        return renderFollowUp(message);
      default:
        return null;
    }
  };

  const getLatestMessage = (group: StayGroup) => {
    if (group.messages.length === 0) return null;
    return group.messages[0];
  };

  const renderStayGroup = (group: StayGroup) => {
    const expanded = isGroupExpanded(group.stayKey);
    const latestMsg = getLatestMessage(group);

    return (
      <View key={group.stayKey} className={styles.stayGroupCard}>
        <View className={styles.stayGroupHeader} onClick={() => handleGroupClick(group.stayKey)}>
          <View className={styles.stayPetInfo}>
            {group.petAvatar ? (
              <Image
                className={styles.petAvatar}
                src={group.petAvatar}
                mode="aspectFill"
              />
            ) : (
              <View className={classnames(styles.typeIcon, styles.typeCare)}>
                <Text>🐾</Text>
              </View>
            )}
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text className={styles.petName}>{group.petName}</Text>
              <View className={styles.stayDates}>
                <Text>{formatDateRange(group.checkInDate, group.checkOutDate)}</Text>
              </View>
            </View>
          </View>
          <View style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Text
              className={classnames(
                styles.stayStatus,
                group.status === 'checked-in' ? styles.statusUnconfirmed : styles.statusConfirmed
              )}
            >
              {group.status === 'checked-in' ? '在住' : '已离店'}
            </Text>
            {group.unreadCount > 0 && (
              <Text className={styles.unreadBadge}>{group.unreadCount}</Text>
            )}
          </View>
        </View>

        <View className={styles.staySummary} onClick={() => handleGroupClick(group.stayKey)}>
          <Text className={styles.summaryText}>{group.summaryText}</Text>
        </View>

        {latestMsg && (
          <View className={styles.stayPreview} onClick={() => handleGroupClick(group.stayKey)}>
            <Text className={styles.careDetailIcon}>{TYPE_ICONS[latestMsg.type]}</Text>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text className={styles.messageTitle} numberOfLines={1}>{latestMsg.title}</Text>
            </View>
            <Text className={styles.messageTime}>{formatTime(group.latestTime)}</Text>
          </View>
        )}

        <View className={styles.stayExpandBtn} onClick={() => handleGroupClick(group.stayKey)}>
          <Text className={styles.expandIcon}>{expanded ? '▲' : '▼'}</Text>
          <Text style={{ fontSize: 22, color: '#999', marginLeft: 8 }}>
            {expanded ? '收起' : `展开全部${group.messages.length}条`}
          </Text>
        </View>

        {expanded && group.messages.length > 0 && (
          <View className={styles.stayMessageList}>
            {group.messages.map(msg => renderMessage(msg))}
          </View>
        )}
      </View>
    );
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
        {totalUnread > 0 && (
          <Text className={styles.unreadBadge}>{totalUnread}</Text>
        )}
      </View>

      {stayGroups.length === 0 ? (
        <View className={styles.emptyTip}>暂无消息</View>
      ) : (
        <View className={styles.messageList}>
          {stayGroups.map(group => renderStayGroup(group))}
        </View>
      )}
    </ScrollView>
  );
};

export default MessagesPage;
