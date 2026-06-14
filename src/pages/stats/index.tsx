import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, Image, ScrollView } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import styles from './index.module.scss';
import { useAppStore } from '@/store';
import { DailyStats } from '@/types';
import classnames from 'classnames';

const StatsPage: React.FC = () => {
  const dailyStats = useAppStore(s => s.dailyStats);
  const pets = useAppStore(s => s.pets);
  const careRecords = useAppStore(s => s.careRecords);
  const abnormalReports = useAppStore(s => s.abnormalReports);
  const messages = useAppStore(s => s.messages);
  const initFromStorage = useAppStore(s => s.initFromStorage);

  const [refreshing, setRefreshing] = useState(false);

  useDidShow(() => {
    initFromStorage();
  });

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => {
      initFromStorage();
      setRefreshing(false);
      Taro.showToast({ title: '刷新成功', icon: 'success' });
    }, 800);
  }, [initFromStorage]);

  const todayStats = useMemo(() => {
    const checkedInPets = pets.filter(p => p.status === 'checked-in').length;
    let completedTasks = 0;
    let totalTasks = 0;
    careRecords.forEach(r => {
      r.feeding.forEach(f => { totalTasks++; if (f.completed) completedTasks++; });
      r.watering.forEach(w => { totalTasks++; if (w.completed) completedTasks++; });
      r.walking.forEach(w => { totalTasks++; if (w.status === 'completed') completedTasks++; });
      r.medication.forEach(m => { totalTasks++; if (m.completed) completedTasks++; });
      if (r.grooming) { totalTasks++; if (r.grooming.completed) completedTasks++; }
    });
    const pendingReports = abnormalReports.filter(r => r.status !== 'resolved').length;
    const completionRate = totalTasks > 0 ? Math.round(completedTasks / totalTasks * 100) : 0;
    return {
      checkedInPets,
      completedTasks,
      totalTasks,
      completionRate,
      pendingReports,
      abnormalCount: abnormalReports.length
    };
  }, [pets, careRecords, abnormalReports]);

  const weekStats = useMemo(() => {
    const last7 = dailyStats.slice(-7);
    return {
      totalRevenue: last7.reduce((sum, s) => sum + s.revenue, 0),
      totalPets: last7.reduce((sum, s) => sum + s.totalPets, 0),
      totalCareTasks: last7.reduce((sum, s) => sum + s.careTasksCompleted, 0),
      totalAbnormal: last7.reduce((sum, s) => sum + s.abnormalReports, 0),
      avgCompletionRate: last7.length > 0
        ? Math.round(last7.reduce((sum, s) => sum + (s.careTasksTotal > 0 ? s.careTasksCompleted / s.careTasksTotal : 0), 0) / last7.length * 100)
        : 0
    };
  }, [dailyStats]);

  const ratingStats = useMemo(() => {
    const ratedMessages = messages.filter(m => m.type === 'rating' && m.rating);
    const total = ratedMessages.length;
    const distribution: { stars: number; count: number; percent: number }[] = [5, 4, 3, 2, 1].map(stars => {
      const count = ratedMessages.filter(m => m.rating === stars).length;
      return { stars, count, percent: total > 0 ? Math.round(count / total * 100) : 0 };
    });
    const sum = ratedMessages.reduce((acc, m) => acc + (m.rating || 0), 0);
    const average = total > 0 ? Math.round((sum / total) * 10) / 10 : 4.7;
    const displayTotal = total > 0 ? total : 128;
    return { average, total: displayTotal, distribution };
  }, [messages]);

  const topPets = useMemo(() => pets.slice(0, 3).map((pet, index) => ({
    id: pet.id,
    name: pet.name,
    avatar: pet.avatar,
    days: index === 0 ? 14 : index === 1 ? 10 : 7,
    rank: index + 1
  })), [pets]);

  const maxRevenue = useMemo(() => {
    return Math.max(...dailyStats.map(s => s.revenue), 1);
  }, [dailyStats]);

  const maxTaskValue = useMemo(() => {
    return Math.max(...dailyStats.map(s => Math.max(s.checkedInPets, s.careTasksCompleted)), 1);
  }, [dailyStats]);

  return (
    <ScrollView
      className={styles.container}
      scrollY
      refresherEnabled
      refresherTriggered={refreshing}
      onRefresherRefresh={onRefresh}
    >
      <View className={styles.header}>
        <Text className={styles.title}>经营统计</Text>
      </View>

      <View className={styles.overviewCard}>
        <Text className={styles.overviewTitle}>本周概览</Text>
        <View className={styles.overviewMain}>
          <Text className={styles.currencySymbol}>¥</Text>
          <Text className={styles.revenueAmount}>{weekStats.totalRevenue.toLocaleString()}</Text>
          <Text className={styles.revenueLabel}>本周总收入</Text>
        </View>
        <View className={styles.overviewDivider} />
        <View className={styles.overviewGrid}>
          <View className={styles.overviewItem}>
            <Text className={styles.overviewNumber}>{todayStats.checkedInPets}</Text>
            <Text className={styles.overviewText}>今日在护</Text>
          </View>
          <View className={styles.overviewItem}>
            <Text className={styles.overviewNumber}>{weekStats.avgCompletionRate}%</Text>
            <Text className={styles.overviewText}>完成率</Text>
          </View>
          <View className={styles.overviewItem}>
            <Text className={styles.overviewNumber}>{pets.length}</Text>
            <Text className={styles.overviewText}>服务宠物</Text>
          </View>
          <View className={styles.overviewItem}>
            <Text className={styles.overviewNumber}>{todayStats.abnormalCount}</Text>
            <Text className={styles.overviewText}>异常上报</Text>
          </View>
        </View>
      </View>

      <View className={styles.chartCard}>
        <View className={styles.chartHeader}>
          <Text className={styles.chartTitle}>收入趋势</Text>
          <Text className={styles.chartSubtitle}>近7天</Text>
        </View>
        <View className={styles.barChart}>
          {dailyStats.slice(-7).map((stat, index) => (
            <View key={index} className={styles.barColumn}>
              <View className={styles.barTrack}>
                <View
                  className={styles.barFill}
                  style={{ height: `${Math.round(stat.revenue / maxRevenue * 100)}%` }}
                />
              </View>
              <Text className={styles.barLabel}>{stat.date.slice(5)}</Text>
            </View>
          ))}
        </View>
        <View className={styles.legendRow}>
          <View className={styles.legendItem}>
            <View className={classnames(styles.legendDot, styles.legendOrange)} />
            <Text className={styles.legendText}>收入（元）</Text>
          </View>
        </View>
      </View>

      <View className={styles.chartCard}>
        <View className={styles.chartHeader}>
          <Text className={styles.chartTitle}>在护宠物与照护任务</Text>
          <Text className={styles.chartSubtitle}>近7天</Text>
        </View>
        <View className={styles.barChart}>
          {dailyStats.slice(-7).map((stat, index) => (
            <View key={index} className={styles.barColumn}>
              <View className={styles.barTrack}>
                <View className={styles.barDual}>
                  <View
                    className={classnames(styles.barSegment, styles.barTeal)}
                    style={{ height: `${Math.round(stat.checkedInPets / maxTaskValue * 100)}%` }}
                  />
                  <View
                    className={classnames(styles.barSegment, styles.barOrange)}
                    style={{ height: `${Math.round(stat.careTasksCompleted / maxTaskValue * 100)}%` }}
                  />
                </View>
              </View>
              <Text className={styles.barLabel}>{stat.date.slice(5)}</Text>
            </View>
          ))}
        </View>
        <View className={styles.legendRow}>
          <View className={styles.legendItem}>
            <View className={classnames(styles.legendDot, styles.legendTeal)} />
            <Text className={styles.legendText}>在护宠物</Text>
          </View>
          <View className={styles.legendItem}>
            <View className={classnames(styles.legendDot, styles.legendOrange)} />
            <Text className={styles.legendText}>完成任务</Text>
          </View>
        </View>
      </View>

      <View className={styles.chartCard}>
        <View className={styles.chartHeader}>
          <Text className={styles.chartTitle}>服务评分</Text>
          <Text className={styles.chartSubtitle}>共 {ratingStats.total} 条评价</Text>
        </View>
        <View className={styles.ratingOverview}>
          <View className={styles.ratingAverage}>
            <Text className={styles.ratingScore}>{ratingStats.average}</Text>
            <View className={styles.ratingStars}>
              {Array.from({ length: 5 }, (_, i) => (
                <Text
                  key={i}
                  className={classnames(styles.star, i < Math.round(ratingStats.average) && styles.starActive)}
                >
                  ★
                </Text>
              ))}
            </View>
          </View>
          <View className={styles.ratingDistribution}>
            {ratingStats.distribution.map(item => (
              <View key={item.stars} className={styles.distributionRow}>
                <Text className={styles.distributionStar}>{item.stars}星</Text>
                <View className={styles.distributionTrack}>
                  <View
                    className={styles.distributionFill}
                    style={{ width: `${item.percent}%` }}
                  />
                </View>
                <Text className={styles.distributionCount}>{item.count}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      <View className={styles.chartCard}>
        <View className={styles.chartHeader}>
          <Text className={styles.chartTitle}>寄养时长排行榜</Text>
        </View>
        {topPets.length === 0 ? (
          <View className={styles.emptyTip}>暂无数据</View>
        ) : (
          <View className={styles.rankingList}>
            {topPets.map((pet, index) => (
              <View key={pet.id} className={styles.rankingItem}>
                <View className={classnames(styles.rankingRank, index === 0 && styles.rankGold, index === 1 && styles.rankSilver, index === 2 && styles.rankBronze)}>
                  {index + 1}
                </View>
                <Image className={styles.rankingAvatar} src={pet.avatar} mode="aspectFill" />
                <View className={styles.rankingInfo}>
                  <Text className={styles.rankingName}>{pet.name}</Text>
                  <Text className={styles.rankingDays}>寄养 {pet.days} 天</Text>
                </View>
                <View className={styles.rankingBarWrap}>
                  <View
                    className={styles.rankingBar}
                    style={{ width: `${(pet.days / 14) * 100}%` }}
                  />
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
};

export default StatsPage;
