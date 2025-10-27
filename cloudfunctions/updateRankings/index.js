/**
 * Cloud Function: Calculate Rankings
 * Executes every 30 minutes to calculate rankings for all active seasons
 * Triggers: Scheduled trigger or manual invocation
 */

const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

/**
 * Calculate win rate from recent 5 matches
 */
const getRecent5WinRate = (recentMatches) => {
  if (recentMatches.length === 0) return 0;
  const wins = recentMatches.filter(m => m.isWin).length;
  return wins / recentMatches.length;
};

/**
 * Main function
 */
exports.main = async (event, context) => {
  try {
    // 1. Fetch all active seasons
    const seasonResult = await db.collection('seasons')
      .where({
        status: db.command.in(['pending', 'active', 'ended'])
      })
      .get();

    const seasons = seasonResult.data;
    console.log(`[Rankings] Found ${seasons.length} seasons requiring ranking updates`);

    for (const season of seasons) {
      console.log(`\n[Rankings] Starting to calculate rankings for season "${season.season_name}" (${season._id})`);

      // 2. Fetch all approved matches for this season
      const matchResult = await db.collection('matches')
        .where({
          season_id: season._id,
          status: 'approved'
        })
        .get();

      const matches = matchResult.data;
      console.log(`[Rankings] Season has ${matches.length} approved matches`);

      // 3. Fetch all members for this season (from group_members)
      const memberResult = await db.collection('group_members')
        .where({
          group_id: season.group_id,
          is_active: true
        })
        .get();

      const members = memberResult.data;
      console.log(`[Rankings] Group has ${members.length} active members`);

      // 4. Initialize player statistics object
      const playerStats = {};
      members.forEach(m => {
        playerStats[m.user_id] = {
          wins: 0,
          losses: 0,
          matches: [],
          joinedAt: m.joined_at
        };
      });

      // 5. Iterate through all matches and calculate win/loss records
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
          // Doubles: All 4 players on winning team get 1 point
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

      // 6. Sort by rules: wins > recent 5-match win rate > join time
      const ranked = Object.entries(playerStats)
        .map(([userId, stats]) => {
          // Calculate recent 5 matches
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
          // Primary: Total wins
          if (a.wins !== b.wins) return b.wins - a.wins;
          // Secondary: Recent 5-match win rate
          if (a.recent5Rate !== b.recent5Rate) return b.recent5Rate - a.recent5Rate;
          // Tertiary: Join time
          return a.joinedAt - b.joinedAt;
        });

      // 7. Delete old ranking records
      await db.collection('season_rankings')
        .where({ season_id: season._id })
        .remove();

      // 8. Batch insert new rankings
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

      console.log(`[Rankings] Season "${season.season_name}" ranking update completed with ${ranked.length} players`);
    }

    return {
      code: 0,
      message: '排名计算完成',
      processedSeasons: seasons.length
    };
  } catch (error) {
    console.error('[Rankings] Ranking calculation failed:', error);
    return {
      code: -1,
      message: '排名计算失败',
      error: error.message
    };
  }
};
