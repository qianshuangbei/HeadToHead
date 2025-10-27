/**
 * 云函数: 赛季自动推进
 * 每天凌晨2点执行，自动推进赛季状态
 * pending -> active (当到达开始时间)
 * active -> ended (当到达结束时间)
 */

const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  try {
    const now = Date.now();
    console.log(`[赛季推进] 执行时间: ${new Date(now).toLocaleString()}`);

    // 1. pending -> active
    const pendingResult = await db.collection('seasons')
      .where({
        status: 'pending',
        start_date: db.command.lte(now)
      })
      .get();

    for (const season of pendingResult.data) {
      await db.collection('seasons').doc(season._id).update({
        status: 'active',
        updated_at: now
      });
      console.log(`[赛季推进] 赛季 ${season.season_name} 从 pending 切换到 active`);
    }

    // 2. active -> ended
    const activeResult = await db.collection('seasons')
      .where({
        status: 'active',
        end_date: db.command.lte(now)
      })
      .get();

    for (const season of activeResult.data) {
      await db.collection('seasons').doc(season._id).update({
        status: 'ended',
        updated_at: now
      });
      console.log(`[赛季推进] 赛季 ${season.season_name} 从 active 切换到 ended`);

      // 自动计算赛季奖项
      await calculateSeasonAwards(season._id);
    }

    return {
      code: 0,
      message: '赛季推进完成',
      pendingToActive: pendingResult.data.length,
      activeToEnded: activeResult.data.length
    };
  } catch (error) {
    console.error('[赛季推进] 错误:', error);
    return {
      code: -1,
      message: '赛季推进失败',
      error: error.message
    };
  }
};

/**
 * 计算赛季奖项
 */
async function calculateSeasonAwards(seasonId) {
  try {
    // 获取该赛季所有排名
    const rankings = await db.collection('season_rankings')
      .where({ season_id: seasonId })
      .orderBy('rank', 'asc')
      .get();

    if (rankings.data.length === 0) {
      console.log(`赛季 ${seasonId} 无排名数据，无法计算奖项`);
      return;
    }

    // 1. MVP: 积分(胜场数)最高
    const mvp = rankings.data[0];
    await addSeasonAward(seasonId, 'mvp', mvp.user_id, mvp.wins);

    // 2. 最佳战绩: 胜率最高(至少5场比赛)
    const qualified = rankings.data.filter(r => r.match_count >= 5);
    if (qualified.length > 0) {
      const bestRecord = qualified.reduce((a, b) =>
        (a.win_rate || 0) > (b.win_rate || 0) ? a : b
      );
      await addSeasonAward(seasonId, 'best_record', bestRecord.user_id, bestRecord.win_rate);
    }

    // 3. 最活跃: 参赛场数最多
    const mostActive = rankings.data.reduce((a, b) =>
      (a.match_count || 0) > (b.match_count || 0) ? a : b
    );
    await addSeasonAward(seasonId, 'most_active', mostActive.user_id, mostActive.match_count);

    // 4. 进步最快: 积分增长最多
    // (这里简化处理，实际应该比较赛季开始和结束的排名)
    const fastestProgress = rankings.data.reduce((a, b) =>
      (a.wins || 0) > (b.wins || 0) ? a : b
    );
    await addSeasonAward(seasonId, 'fastest_progress', fastestProgress.user_id, fastestProgress.wins);

    console.log(`赛季 ${seasonId} 奖项计算完成`);
  } catch (error) {
    console.error(`计算赛季奖项失败:`, error);
  }
}

/**
 * 添加赛季奖项
 */
async function addSeasonAward(seasonId, awardType, winnerId, awardValue) {
  await db.collection('season_awards').add({
    season_id: seasonId,
    award_type: awardType,
    winner_id: winnerId,
    award_value: awardValue,
    created_at: Date.now()
  });
}
