import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, Image, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import styles from './index.module.scss';
import { mockDailyStats, mockPets } from '@/data/mockData';
import { DailyStats } from '@/types';
import classnames from 'classnames';

const StatsPage: React.FC = () => {
  const [stats] = useState<DailyStats[]>(mockDailyStats);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
      Taro.showToast({ title: '刷新成功', icon: 'success' });
    }, 1000);
  }, []);

  const todayStats = useMemo(() => stats[stats.length - 1], [stats]);

  const weekStats = useMemo(() => {
    const last7 = stats.slice(-7);
    return {
      totalRevenue: last7.reduce((sum, s) => sum + s.revenue, 0),
      totalPets: last7.reduce((sum, s) => sum + s.totalPets, 0),
      totalCareTasks: last7.reduce((sum, s) => sum + s.careTasksCompleted, 0),
      totalAbnormal: last7.reduce((sum, s) => sum + s.abnormalReports, 0),
      avgCompletionRate: last7.length > 0
        ? Math.round(last7.reduce((sum, s) => sum + (s.careTasksTotal > 0 ? s.careTasksCompleted / s.careTasksTotal : 0), 0) / last7.length * 100)
        : 0
    };
  }, [stats]);

  const ratingStats = useMemo(() => ({
    average: 4.7,
    total: 128,
    distribution: [
      { stars: 5, count: 102, percent: 80 },
      { stars: 4, count: 18, percent: 14 },
      { stars: 3, count: 5, percent: 4 },
      { stars: 2, count: 2, percent: 1 },
      { stars: 1, count: 1, percent: 1 }
    ]
  }), []);

  const topPets = useMemo(() => mockPets.slice(0, 3).map((pet, index) => ({
    id: pet.id,
    name: pet.name,
    avatar: pet.avatar,
    owner: pet.ownerName,
    days: index === 0 ? 10 : index === 1 ? 6 : 4,
    rank: index + 1
  })), []);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  const maxRevenue = Math.max(...stats.map(s => s.revenue), 1);
  const maxPets = Math.max(...stats.map(s => s.checkedInPets), 1);

  const renderStars = (count: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Text
        key={i}
        className={classnames(styles.star, i < count && styles.starActive)}
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
        <Text className={styles.title}>经营统计</Text>
        <Text className={styles.dateRange}>近7天数据概览</Text>
      </View>

      <View className={styles.statsOverview}>
        <View className={classnames(styles.overviewCard, styles.overviewCardPrimary)}>
          <Text className={styles.overviewLabel}>本周总收入</Text>
          <Text className={styles.overviewNumber}>¥ {weekStats.totalRevenue.toLocaleString()}</Text>
          <Text className={styles.overviewTrend}>↑ 较上周增长 12.5%</Text>
        </View>

        <View className={styles.overviewCard}>
          <Text className={classnames(styles.overviewLabel, styles.overviewLabelDark)}>今日在护</Text>
          <Text className={classnames(styles.overviewNumber, styles.overviewNumberSmall)}>{todayStats.checkedInPets} 只</Text>
          <Text className={classnames(styles.overviewTrend, styles.overviewTrendDark, styles.trendUp)}>↑ 较昨日 +2</Text>
        </View>

        <View className={styles.overviewCard}>
          <Text className={classnames(styles.overviewLabel, styles.overviewLabelDark)}>照护完成率</Text>
          <Text className={classnames(styles.overviewNumber, styles.overviewNumberSmall)}>{weekStats.avgCompletionRate}%</Text>
          <Text className={classnames(styles.overviewTrend, styles.overviewTrendDark, styles.trendUp)}>↑ 较上周 +3%</Text>
        </View>

        <View className={styles.overviewCard}>
          <Text className={classnames(styles.overviewLabel, styles.overviewLabelDark)}>累计服务宠物</Text>
          <Text className={classnames(styles.overviewNumber, styles.overviewNumberSmall)}>{weekStats.totalPets} 只</Text>
          <Text className={classnames(styles.overviewTrend, styles.overviewTrendDark)}>本周累计</Text>
        </View>

        <View className={styles.overviewCard}>
          <Text className={classnames(styles.overviewLabel, styles.overviewLabelDark)}>异常上报</Text>
          <Text className={classnames(styles.overviewNumber, styles.overviewNumberSmall)}>{weekStats.totalAbnormal} 例</Text>
          <Text className={classnames(styles.overviewTrend, styles.overviewTrendDark, styles.trendDown)}>↓ 较上周 -2</Text>
        </View>
      </View>

      <View className={styles.section}>
        <View className={styles.sectionHeader}>
          <Text className={styles.sectionTitle}>收入趋势</Text>
          <Text className={styles.sectionLink}>查看详情</Text>
        </View>
        <View className={styles.chartCard}>
          <Text className={styles.chartTitle}>近7天收入（元）</Text>
          <View className={styles.barChart}>
            {stats.slice(-7).map((s, index) => (
              <View key={index} className={styles.barGroup}>
                <Text className={styles.barValue}>{s.revenue}</Text>
                <View
                  className={styles.bar}
                  style={{ height: `${(s.revenue / maxRevenue) * 100}%` }}
                />
                <Text className={styles.barLabel}>{formatDate(s.date)}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      <View className={styles.section}>
        <View className={styles.sectionHeader}>
          <Text className={styles.sectionTitle}>在护宠物与照护任务</Text>
        </View>
        <View className={styles.chartCard}>
          <Text className={styles.chartTitle}>近7天数据对比</Text>
          <View className={styles.barChart}>
            {stats.slice(-7).map((s, index) => (
              <View key={index} className={styles.barGroup} style={{ flexDirection: 'row', gap: '4rpx' }}>
                <View style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end', position: 'relative' }}>
                  <View
                    className={styles.bar}
                    style={{ height: `${(s.checkedInPets / maxPets) * 100}%`, width: '24rpx' }}
                  />
                </View>
                <View style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end', position: 'relative' }}>
                  <View
                    className={classnames(styles.bar, styles.barSecondary)}
                    style={{ height: `${(s.careTasksCompleted / Math.max(...stats.map(x => x.careTasksCompleted), 1)) * 100}%`, width: '24rpx' }}
                  />
                </View>
                <Text className={styles.barLabel} style={{ position: 'absolute', bottom: '-40rpx' }}>{formatDate(s.date)}</Text>
              </View>
            ))}
          </View>
          <View className={styles.chartLegend}>
            <View className={styles.legendItem}>
              <View className={classnames(styles.legendDot, styles.legendDotPrimary)} />
              <Text>在护宠物数</Text>
            </View>
            <View className={styles.legendItem}>
              <View className={classnames(styles.legendDot, styles.legendDotSecondary)} />
              <Text>完成照护任务</Text>
            </View>
          </View>
        </View>
      </View>

      <View className={styles.ratingSection}>
        <View className={styles.sectionHeader}>
          <Text className={styles.sectionTitle}>服务评分</Text>
        </View>
        <View className={styles.ratingOverview}>
          <View className={styles.ratingBig}>
            <Text className={styles.ratingNumber}>{ratingStats.average}</Text>
            <View className={styles.ratingStars}>
              {renderStars(Math.round(ratingStats.average))}
            </View>
            <Text className={styles.ratingTotal}>共 {ratingStats.total} 条评价</Text>
          </View>
          <View className={styles.ratingBars}>
            {ratingStats.distribution.map(item => (
              <View key={item.stars} className={styles.ratingBarRow}>
                <Text className={styles.ratingBarLabel}>{item.stars}星</Text>
                <View className={styles.ratingBarTrack}>
                  <View className={styles.ratingBarFill} style={{ width: `${item.percent}%` }} />
                </View>
                <Text className={styles.ratingBarCount}>{item.count}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      <View className={styles.section}>
        <View className={styles.sectionHeader}>
          <Text className={styles.sectionTitle}>寄养时长排行</Text>
        </View>
        <View className={styles.topList}>
          {topPets.map(pet => (
            <View key={pet.id} className={styles.topItem}>
              <Text className={classnames(styles.topRank, pet.rank <= 3 && styles.topRankTop)}>
                {pet.rank}
              </Text>
              <Image className={styles.topAvatar} src={pet.avatar} mode="aspectFill" />
              <View className={styles.topInfo}>
                <Text className={styles.topName}>{pet.name}</Text>
                <Text className={styles.topMeta}>主人：{pet.owner}</Text>
              </View>
              <Text className={styles.topValue}>{pet.days}天</Text>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
};

export default StatsPage;
