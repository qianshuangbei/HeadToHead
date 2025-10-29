/**
 * Cloud Function: Season Auto-Progression
 * Executes daily at 2 AM to auto-progress season status
 * pending -> active (when start time is reached)
 * active -> ended (when end time is reached)
 */

const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  try {
    const now = Date.now();
    console.log(`[Season Progression] Execution time: ${new Date(now).toLocaleString()}`);

    // 1. pending -> active
    const pendingResult = await db.collection('seasons')
      .where({
        status: 'pending',
        start_date: db.command.lte(now)
      })
      .get();

    for (const season of pendingResult.data) {
      await db.collection('seasons').doc(season._id).update({
        data:{
        status: 'active',
        updated_at: now
        }
      });
      console.log(`[Season Progression] Season "${season.season_name}" transitioned from pending to active`);
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
        data:{
          status: 'ended',
          updated_at: now
        }
      });
      console.log(`[Season Progression] Season "${season.season_name}" transitioned from active to ended`);

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
    console.error('[Season Progression] Error:', error);
    return {
      code: -1,
      message: '赛季推进失败',
      error: error.message
    };
  }
};

/**
 * Calculate Season Awards
 */
async function calculateSeasonAwards(seasonId) {
  try {
    // 获取该赛季所有排名
    const rankings = await db.collection('season_rankings')
      .where({ season_id: seasonId })
      .orderBy('rank', 'asc')
      .get();

    if (rankings.data.length === 0) {
      console.log(`[Awards] Season ${seasonId} has no ranking data, skipping award calculation`);
      return;
    }

    // 1. MVP: Highest score (most wins)
    const mvp = rankings.data[0];
    await addSeasonAward(seasonId, 'mvp', mvp.user_id, mvp.wins);

    // 2. Best Record: Highest win rate (at least 5 matches)
    const qualified = rankings.data.filter(r => r.match_count >= 5);
    if (qualified.length > 0) {
      const bestRecord = qualified.reduce((a, b) =>
        (a.win_rate || 0) > (b.win_rate || 0) ? a : b
      );
      await addSeasonAward(seasonId, 'best_record', bestRecord.user_id, bestRecord.win_rate);
    }

    // 3. Most Active: Most matches played
    const mostActive = rankings.data.reduce((a, b) =>
      (a.match_count || 0) > (b.match_count || 0) ? a : b
    );
    await addSeasonAward(seasonId, 'most_active', mostActive.user_id, mostActive.match_count);

    // 4. Fastest Progress: Most wins
    // (Simplified calculation - ideally should compare season start and end rankings)
    const fastestProgress = rankings.data.reduce((a, b) =>
      (a.wins || 0) > (b.wins || 0) ? a : b
    );
    await addSeasonAward(seasonId, 'fastest_progress', fastestProgress.user_id, fastestProgress.wins);

    console.log(`[Awards] Season ${seasonId} award calculation completed`);
  } catch (error) {
    console.error(`[Awards] Failed to calculate season awards:`, error);
  }
}

/**
 * Add Season Award
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
