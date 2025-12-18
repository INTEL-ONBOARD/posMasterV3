/**
 * Settings Service
 *
 * Business logic for user and application settings.
 */

const { UserSettingsRepository, AppSettingsRepository } = require('../repositories/SettingsRepository.cjs');
const UserRepository = require('../repositories/UserRepository.cjs');

class SettingsService {
    constructor() {
        this.userSettingsRepo = new UserSettingsRepository();
        this.appSettingsRepo = new AppSettingsRepository();
        this.userRepo = new UserRepository();
    }

    // ============================================
    // USER SETTINGS METHODS
    // ============================================

    /**
     * Get user settings by user ID
     * @param {string} userId - User ID
     * @returns {Object}
     */
    getUserSettings(userId) {
        try {
            // Get user data
            const user = this.userRepo.findById(userId);
            if (!user) {
                return {
                    status: 'error',
                    message: 'User not found'
                };
            }

            // Get user settings
            let settings = this.userSettingsRepo.findByUserId(userId);
            console.log('[SettingsService] Raw settings for user', userId, ':', settings);
            console.log('[SettingsService] Profile image exists:', !!settings?.profile_image);
            if (settings?.profile_image) {
                console.log('[SettingsService] Profile image length:', settings.profile_image.length);
                console.log('[SettingsService] Profile image starts with:', settings.profile_image.substring(0, 50));
            }

            // Create default settings if none exist
            if (!settings) {
                settings = this.userSettingsRepo.upsert(userId, {
                    permissions: {
                        SaleAccess: true,
                        InventoryAccess: false,
                        ReportAccess: false,
                        UserManagerAccess: false,
                        DtAccess: false
                    }
                });
            }

            return {
                status: 'success',
                data: {
                    user: UserRepository.sanitize(user),
                    settings: settings
                }
            };
        } catch (error) {
            console.error('[SettingsService] Get user settings error:', error);
            return {
                status: 'error',
                message: error.message
            };
        }
    }

    /**
     * Update user profile (username, email, full_name)
     * @param {string} userId - User ID
     * @param {Object} profileData - Profile data
     * @returns {Object}
     */
    updateUserProfile(userId, profileData) {
        try {
            const user = this.userRepo.findById(userId);
            if (!user) {
                return {
                    status: 'error',
                    message: 'User not found'
                };
            }

            // Validate email format if provided
            if (profileData.email) {
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(profileData.email)) {
                    return {
                        status: 'error',
                        message: 'Invalid email format'
                    };
                }

                // Check if email is already in use by another user
                if (this.userRepo.emailExists(profileData.email, userId)) {
                    return {
                        status: 'error',
                        message: 'Email already in use'
                    };
                }
            }

            // Check if username is already in use by another user
            if (profileData.username && this.userRepo.usernameExists(profileData.username, userId)) {
                return {
                    status: 'error',
                    message: 'Username already in use'
                };
            }

            // Update user data
            const updateData = {};
            if (profileData.username) updateData.username = profileData.username;
            if (profileData.email) updateData.email = profileData.email.toLowerCase();
            if (profileData.full_name) updateData.full_name = profileData.full_name;
            if (profileData.roles) updateData.roles = JSON.stringify(
                Array.isArray(profileData.roles) ? profileData.roles : [profileData.roles]
            );

            const updatedUser = this.userRepo.update(userId, updateData);

            return {
                status: 'success',
                message: 'Profile updated successfully',
                data: UserRepository.sanitize(this.userRepo.findById(userId))
            };
        } catch (error) {
            console.error('[SettingsService] Update profile error:', error);
            return {
                status: 'error',
                message: error.message
            };
        }
    }

    /**
     * Update user permissions
     * @param {string} userId - User ID
     * @param {Object} permissions - Permissions object
     * @returns {Object}
     */
    updateUserPermissions(userId, permissions) {
        try {
            const user = this.userRepo.findById(userId);
            if (!user) {
                return {
                    status: 'error',
                    message: 'User not found'
                };
            }

            const settings = this.userSettingsRepo.updatePermissions(userId, permissions);

            return {
                status: 'success',
                message: 'Permissions updated successfully',
                data: settings
            };
        } catch (error) {
            console.error('[SettingsService] Update permissions error:', error);
            return {
                status: 'error',
                message: error.message
            };
        }
    }

    /**
     * Update user profile image
     * @param {string} userId - User ID
     * @param {string} profileImage - Base64 image data
     * @returns {Object}
     */
    updateProfileImage(userId, profileImage) {
        try {
            const user = this.userRepo.findById(userId);
            if (!user) {
                return {
                    status: 'error',
                    message: 'User not found'
                };
            }

            const settings = this.userSettingsRepo.updateProfileImage(userId, profileImage);

            return {
                status: 'success',
                message: 'Profile image updated successfully',
                data: settings
            };
        } catch (error) {
            console.error('[SettingsService] Update profile image error:', error);
            return {
                status: 'error',
                message: error.message
            };
        }
    }

    /**
     * Get current user with settings (for logged in user)
     * @param {string} userId - User ID
     * @returns {Object}
     */
    getCurrentUserWithSettings(userId) {
        try {
            const user = this.userRepo.findById(userId);
            if (!user) {
                return {
                    status: 'error',
                    message: 'User not found'
                };
            }

            let settings = this.userSettingsRepo.findByUserId(userId);
            if (!settings) {
                settings = this.userSettingsRepo.upsert(userId, {});
            }

            return {
                status: 'success',
                data: {
                    ...UserRepository.sanitize(user),
                    settings: settings
                }
            };
        } catch (error) {
            console.error('[SettingsService] Get current user error:', error);
            return {
                status: 'error',
                message: error.message
            };
        }
    }

    // ============================================
    // APP SETTINGS METHODS
    // ============================================

    /**
     * Get all app settings
     * @returns {Object}
     */
    getAppSettings() {
        try {
            const settings = this.appSettingsRepo.getAllAsObject();

            return {
                status: 'success',
                data: settings
            };
        } catch (error) {
            console.error('[SettingsService] Get app settings error:', error);
            return {
                status: 'error',
                message: error.message
            };
        }
    }

    /**
     * Get a single app setting
     * @param {string} key - Setting key
     * @returns {Object}
     */
    getAppSetting(key) {
        try {
            const value = this.appSettingsRepo.get(key);

            return {
                status: 'success',
                data: {
                    key: key,
                    value: value
                }
            };
        } catch (error) {
            console.error('[SettingsService] Get app setting error:', error);
            return {
                status: 'error',
                message: error.message
            };
        }
    }

    /**
     * Update app settings
     * @param {Object} settings - Settings key-value pairs
     * @returns {Object}
     */
    updateAppSettings(settings) {
        try {
            const updated = this.appSettingsRepo.setMany(settings);

            return {
                status: 'success',
                message: 'Settings updated successfully',
                data: updated
            };
        } catch (error) {
            console.error('[SettingsService] Update app settings error:', error);
            return {
                status: 'error',
                message: error.message
            };
        }
    }

    /**
     * Update a single app setting
     * @param {string} key - Setting key
     * @param {any} value - Setting value
     * @returns {Object}
     */
    updateAppSetting(key, value) {
        try {
            const type = typeof value === 'boolean' ? 'boolean' :
                         typeof value === 'number' ? 'number' :
                         typeof value === 'object' ? 'json' : 'string';

            this.appSettingsRepo.set(key, value, type);

            return {
                status: 'success',
                message: 'Setting updated successfully',
                data: {
                    key: key,
                    value: value
                }
            };
        } catch (error) {
            console.error('[SettingsService] Update app setting error:', error);
            return {
                status: 'error',
                message: error.message
            };
        }
    }

    /**
     * Reset app settings to defaults
     * @returns {Object}
     */
    resetAppSettings() {
        try {
            const settings = this.appSettingsRepo.resetToDefaults();

            return {
                status: 'success',
                message: 'Settings reset to defaults',
                data: settings
            };
        } catch (error) {
            console.error('[SettingsService] Reset app settings error:', error);
            return {
                status: 'error',
                message: error.message
            };
        }
    }
}

module.exports = SettingsService;
