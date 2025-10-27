/**
 * 云函数: 计算排名
 * 每30分钟执行一次，计算所有活跃赛季的排名
 * 触发方式: 定时触发或手动调用
 */

const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

/**
 * 计算最近5场胜率
 */
const getRecent5WinRate = (recentMatches) => {
  if (recentMatches.length === 0) return 0;
  const wins = recentMatches.filter(m => m.isWin).length;
  return wins / recentMatches.length;
};

/**
 * 主函数
 */
exports.main = async (event, context) => {
  try {
    // 1. 获取所有活跃赛季
    const seasonResult = await db.collection('seasons')
      .where({
        status: db.command.in(['pending', 'active', 'ended'])
      })
      .get();

    const seasons = seasonResult.data;
    console.log(`发现 ${seasons.length} 个赛季需要更新排名`);

    for (const season of seasons) {
      console.log(`\n开始计算赛季 ${season.season_name} (${season._id}) 的排名`);

      // 2. 获取该赛季所有approved的比赛
      const matchResult = await db.collection('matches')
        .where({
          season_id: season._id,
          status: 'approved'
        })
        .get();

      const matches = matchResult.data;
      console.log(`该赛季共有 ${matches.length} 场approved的比赛`);

      // 3. 获取该赛季所有成员(从group_members中获取)
      const memberResult = await db.collection('group_members')
        .where({
          group_id: season.group_id,
          is_active: true
        })
        .get();

      const members = memberResult.data;
      console.log(`该Group共有 ${members.length} 个成员`);

      // 4. 初始化玩家统计对象
      const playerStats = {};
      members.forEach(m => {
        playerStats[m.user_id] = {
          wins: 0,
          losses: 0,
          matches: [],
          joinedAt: m.joined_at
        };
      });

      // 5. 遍历所有比赛，统计胜负
      matches.forEach(match => {
        if (match.match_type === 'singles') {
          const winner = match.winning_player_id;
          const loser = match.player_a_id === winner ? match.player_b_id : match.player_a_id;

          if (playerStats[winner]) {
            playerStats[winner].wins++;
            playerStats[winner].matches.push({ winner: true, matchId: match._id, createdAt: match.created_at });
          }
          if (playerStats[loser]) {
            playerStats[loser].losses++;
            playerStats[loser].matches.push({ winner: false, matchId: match._id, createdAt: match.created_at });
          }
        } else if (match.match_type === 'doubles') {
          // 双打: 赢的4个人都加1分
          if (match.winning_team === 'team_a') {
            if (playerStats[match.team_a.player1]) playerStats[match.team_a.player1].wins++;
            if (playerStats[match.team_a.player2]) playerStats[match.team_a.player2].wins++;
            if (playerStats[match.team_b.player1]) playerStats[match.team_b.player1].losses++;
            if (playerStats[match.team_b.player2]) playerStats[match.team_b.player2].losses++;
          } else {
            if (playerStats[match.team_b.player1]) playerStats[match.team_b.player1].wins++;
            if (playerStats[match.team_b.player2]) playerStats[match.team_b.player2].wins++;
            if (playerStats[match.team_a.player1]) playerStats[match.team_a.player1].losses++;
            if (playerStats[match.team_a.player2]) playerStats[match.team_a.player2].losses++;
          }
        }
      });

      // 6. 按规则排序: 胜场数 > 最近5场胜率 > 加入时间
      const ranked = Object.entries(playerStats)
        .map(([userId, stats]) => {
          // 计算最近5场
          const recent5Matches = stats.matches.slice(-5);
          const recent5Wins = recent5Matches.filter(m => m.winner).length;

          return {
            userId,
            wins: stats.wins,
            losses: stats.losses,
            total: stats.wins + stats.losses,
            winRate: stats.total > 0 ? stats.wins / stats.total : 0,
            recent5Wins,
            recent5Rate: recent5Matches.length > 0 ? recent5Wins / recent5Matches.length : 0,
            joinedAt: stats.joinedAt
          };
        })
        .sort((a, b) => {
          // Primary: 胜场数
          if (a.wins !== b.wins) return b.wins - a.wins;
          // Secondary: 最近5场胜率
          if (a.recent5Rate !== b.recent5Rate) return b.recent5Rate - a.recent5Rate;
          // Tertiary: 加入时间
          return a.joinedAt - b.joinedAt;
        });

      // 7. 删除旧的排名记录
      await db.collection('season_rankings')
        .where({ season_id: season._id })
        .remove();

      // 8. 批量添加新排名
      for (let i = 0; i < ranked.length; i++) {
        const player = ranked[i];
        await db.collection('season_rankings').add({
          season_id: season._id,
          user_id: player.userId,
          rank: i + 1,
          wins: player.wins,
          losses: player.losses,
          win_rate: player.winRate,
          recent_5_wins: player.recent5Wins,
          match_count: player.total,
          updated_at: Date.now()
        });
      }

      console.log(`赛季 ${season.season_name} 排名更新完成，共 ${ranked.length} 个玩家`);
    }

    return {
      code: 0,
      message: '排名计算完成',
      processedSeasons: seasons.length
    };
  } catch (error) {
    console.error('排名计算失败:', error);
    return {
      code: -1,
      message: '排名计算失败',
      error: error.message
    };
  }
};
