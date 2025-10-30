/**
 * Shared model type definitions & builders.
 * Migratable to TypeScript later.
 */

/**
 * @typedef {Object} User
 * @property {string} [_id]
 * @property {string} nickname
 * @property {string} avatar
 * @property {string} display_avatar
 * @property {boolean} completed_profile
 * @property {string} phone
 * @property {string} bio
 * @property {string} handedness        // 'left' | 'right' | ''
 * @property {string} racket_primary
 * @property {string[]} tags
 * @property {number} first_login_at
 * @property {number} last_login_at
 * @property {number} created_at
 * @property {number} updated_at
 */

/**
 * @typedef {Object} Group
 * @property {string} [_id]
 * @property {string} name
 * @property {string} description
 * @property {string} creator_id
 * @property {string} access_code
 * @property {number} member_count
 * @property {boolean} season_enabled
 * @property {string} current_season_id
 * @property {{ match_type: ('singles'|'doubles')[], points_system: 'simple_count' }} rules
 * @property {number} created_at
 * @property {number} updated_at
 */

/**
 * @param {string} nickname
 * @param {string} avatar
 * @returns {User}
 */
function buildUser(nickname, avatar) {
  const now = Date.now();
  return {
    nickname: nickname || '未命名用户',
    avatar: avatar || '',
    display_avatar: avatar || '',
    completed_profile: false,
    phone: '',
    bio: '',
    handedness: '',
    racket_primary: '',
    tags: [],
    first_login_at: now,
    last_login_at: now,
    created_at: now,
    updated_at: now
  };
}

/**
 * @param {string} name
 * @param {string} description
 * @param {string} creatorId  Internal field stored as creator_id
 * @param {boolean} seasonEnabled
 * @param {string} [accessCode]
 * @returns {Group}
 */
function buildGroup(name, description, creatorId, seasonEnabled, accessCode) {
  const now = Date.now();
  return {
    name,
    description: description || '',
    creator_id: creatorId,
    access_code: accessCode || generateAccessCodePlaceholder(),
    member_count: 1,
    season_enabled: !!seasonEnabled,
    current_season_id: '',
    rules: {
      match_type: ['singles', 'doubles'],
      points_system: 'simple_count'
    },
    created_at: now,
    updated_at: now
  };
}

// Placeholder; real function lives in api.js. Reassigned after require if needed.
function generateAccessCodePlaceholder() {
  return 'XXXXXX';
}

const USER_FIELD_KEYS = Object.freeze([
  '_id',
  'nickname',
  'avatar',
  'display_avatar',
  'completed_profile',
  'phone',
  'bio',
  'handedness',
  'racket_primary',
  'tags',
  'first_login_at',
  'last_login_at',
  'created_at',
  'updated_at'
]);

const GROUP_FIELD_KEYS = Object.freeze([
  '_id',
  'name',
  'description',
  'creator_id',
  'access_code',
  'member_count',
  'season_enabled',
  'current_season_id',
  'rules',
  'created_at',
  'updated_at'
]);

module.exports = {
  buildUser,
  buildGroup,
  USER_FIELD_KEYS,
  GROUP_FIELD_KEYS,
  generateAccessCodePlaceholder
};
