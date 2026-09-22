/**
 * 本地存储管理
 *
 * 引导状态以这里读取到的记录为准。localStorage 是主存储，cookie 作为
 * 同浏览器清理 localStorage 后的兜底；跨设备或清空站点数据时，可通过
 * 恢复链接中的状态令牌恢复。
 */
const Storage = {
    GUIDE_KEY: CONFIG.STORAGE_KEYS.GUIDE_COMPLETED,
    GUIDE_VERSION: 1,
    GUIDE_COMPLETED_STEP: 4,
    GUIDE_COOKIE_MAX_AGE: 10 * 365 * 24 * 60 * 60,

    /**
     * 获取默认引导状态
     */
    getDefaultGuideState() {
        return {
            version: this.GUIDE_VERSION,
            completed: false,
            currentStep: 0,
            updatedAt: null
        };
    },

    /**
     * 规范化引导状态，兼容旧版本保存的字符串 true
     */
    normalizeGuideState(value) {
        if (value === true || value === 'true') {
            return {
                version: this.GUIDE_VERSION,
                completed: true,
                currentStep: this.GUIDE_COMPLETED_STEP,
                updatedAt: null
            };
        }

        if (!value || typeof value !== 'object') {
            return null;
        }

        const completed = value.completed === true;
        let currentStep = Number.parseInt(value.currentStep, 10);

        if (!Number.isInteger(currentStep)) {
            currentStep = completed ? this.GUIDE_COMPLETED_STEP : 0;
        }

        const maxStep = completed ? this.GUIDE_COMPLETED_STEP : this.GUIDE_COMPLETED_STEP - 1;
        currentStep = Math.min(Math.max(currentStep, 0), maxStep);

        if (completed && currentStep < this.GUIDE_COMPLETED_STEP) {
            currentStep = this.GUIDE_COMPLETED_STEP;
        }

        let updatedAt = null;
        if (value.updatedAt && !Number.isNaN(new Date(value.updatedAt).getTime())) {
            updatedAt = new Date(value.updatedAt).toISOString();
        }

        return {
            version: this.GUIDE_VERSION,
            completed,
            currentStep,
            updatedAt
        };
    },

    /**
     * 读取引导状态。优先级：本地存储 -> cookie 兜底 -> 恢复链接
     */
    getGuideState() {
        const localState = this.readGuideFromLocalStorage();
        if (localState) {
            if (!this.readGuideFromCookie()) {
                this.writeGuideCookie(localState);
            }
            return localState;
        }

        const cookieState = this.readGuideFromCookie();
        if (cookieState) {
            this.writeGuideLocalStorage(cookieState);
            return cookieState;
        }

        const recoveryState = this.readGuideStateFromUrl();
        if (recoveryState) {
            return this.saveGuideState(recoveryState);
        }

        return this.getDefaultGuideState();
    },

    /**
     * 检查引导是否完成
     */
    isGuideCompleted() {
        return this.getGuideState().completed;
    },

    /**
     * 保存当前引导步骤，但不会把已完成状态回退成未完成
     */
    saveGuideProgress(step) {
        const currentState = this.getGuideState();
        if (currentState.completed) {
            return currentState;
        }

        const currentStep = Math.min(
            Math.max(Number.parseInt(step, 10) || 0, 0),
            this.GUIDE_COMPLETED_STEP - 1
        );

        return this.saveGuideState({
            ...currentState,
            currentStep
        });
    },

    /**
     * 标记引导完成
     */
    setGuideCompleted() {
        return this.saveGuideState({
            ...this.getGuideState(),
            completed: true,
            currentStep: this.GUIDE_COMPLETED_STEP
        });
    },

    /**
     * 持久化引导状态到 localStorage 和 cookie
     */
    saveGuideState(state) {
        const normalized = this.normalizeGuideState(state);
        if (!normalized) {
            return this.getDefaultGuideState();
        }

        const record = {
            ...normalized,
            updatedAt: normalized.updatedAt || new Date().toISOString()
        };

        this.writeGuideLocalStorage(record);
        this.writeGuideCookie(record);

        return record;
    },

    /**
     * 重置引导状态。仅由用户明确点击“重置引导”时调用
     */
    resetGuide() {
        try {
            window.localStorage.removeItem(this.GUIDE_KEY);
        } catch (e) {
            // 忽略存储错误，继续清理其他位置的记录
        }

        this.removeGuideCookie();
        this.clearGuideRecoveryToken();

        return this.getDefaultGuideState();
    },

    /**
     * 从 localStorage 读取状态
     */
    readGuideFromLocalStorage() {
        try {
            const raw = window.localStorage.getItem(this.GUIDE_KEY);
            if (raw === null) {
                return null;
            }

            if (raw === 'true') {
                const legacyState = this.normalizeGuideState(true);
                return this.saveGuideState(legacyState);
            }

            try {
                return this.normalizeGuideState(JSON.parse(raw));
            } catch (parseError) {
                window.localStorage.removeItem(this.GUIDE_KEY);
                return null;
            }
        } catch (e) {
            return null;
        }
    },

    /**
     * 写入 localStorage
     */
    writeGuideLocalStorage(state) {
        try {
            window.localStorage.setItem(this.GUIDE_KEY, JSON.stringify(state));
        } catch (e) {
            // cookie 仍可作为当前浏览器内的兜底存储
        }
    },

    /**
     * 从 cookie 读取状态
     */
    readGuideFromCookie() {
        try {
            const cookies = document.cookie ? document.cookie.split('; ') : [];
            const match = cookies.find(item => item.startsWith(`${this.GUIDE_KEY}=`));
            if (!match) {
                return null;
            }

            const raw = decodeURIComponent(match.slice(this.GUIDE_KEY.length + 1));
            if (raw === 'true') {
                return this.normalizeGuideState(true);
            }

            return this.normalizeGuideState(JSON.parse(raw));
        } catch (e) {
            return null;
        }
    },

    /**
     * 写入 cookie 兜底记录
     */
    writeGuideCookie(state) {
        try {
            const secure = window.location.protocol === 'https:' ? '; Secure' : '';
            const value = encodeURIComponent(JSON.stringify(state));
            document.cookie =
                `${this.GUIDE_KEY}=${value}; path=/; max-age=${this.GUIDE_COOKIE_MAX_AGE}; ` +
                `SameSite=Lax${secure}`;
        } catch (e) {
            // localStorage 已保存时忽略 cookie 写入失败
        }
    },

    /**
     * 删除 cookie 兜底记录
     */
    removeGuideCookie() {
        try {
            document.cookie =
                `${this.GUIDE_KEY}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; ` +
                'max-age=0; SameSite=Lax';
        } catch (e) {
            // 忽略 cookie 删除失败
        }
    },

    /**
     * 生成跨设备/清空站点数据后使用的恢复链接
     */
    createGuideRecoveryUrl(state = this.getGuideState()) {
        const normalized = this.normalizeGuideState(state);
        if (!normalized) {
            return window.location.href;
        }

        const token = this.encodeRecoveryToken(normalized);
        const url = new URL(window.location.href);
        url.hash = `#guide=${token}`;
        return url.toString();
    },

    /**
     * 从用户粘贴的恢复链接或令牌导入状态
     */
    importGuideRecoveryCode(input) {
        const state = this.decodeRecoveryToken(input);
        return state ? this.saveGuideState(state) : null;
    },

    /**
     * 从当前 URL 读取恢复状态
     */
    readGuideStateFromUrl() {
        const token = this.getRecoveryTokenFromLocation(window.location.hash);
        return token ? this.decodeRecoveryToken(token) : null;
    },

    /**
     * 移除当前网址中的恢复令牌；不会影响用户已经另存的链接
     */
    clearGuideRecoveryToken() {
        try {
            if (!window.location.hash) {
                return;
            }

            const url = new URL(window.location.href);
            url.hash = '';
            window.history.replaceState(null, '', url.toString());
        } catch (e) {
            // 地址栏清理失败不影响本地重置
        }
    },

    /**
     * 从 hash 中提取恢复令牌
     */
    getRecoveryTokenFromLocation(hash) {
        if (!hash || !hash.includes('guide=')) {
            return null;
        }

        const hashText = hash.startsWith('#') ? hash.slice(1) : hash;
        return new URLSearchParams(hashText).get('guide');
    },

    /**
     * 编码恢复令牌
     */
    encodeRecoveryToken(state) {
        const json = JSON.stringify(state);
        const bytes = new TextEncoder().encode(json);
        const binary = Array.from(bytes, byte => String.fromCharCode(byte)).join('');
        return btoa(binary)
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');
    },

    /**
     * 解码恢复链接或令牌
     */
    decodeRecoveryToken(input) {
        if (typeof input !== 'string') {
            return null;
        }

        let token = input.trim();
        if (!token) {
            return null;
        }

        try {
            const url = new URL(token, window.location.origin);
            const tokenFromUrl = this.getRecoveryTokenFromLocation(url.hash);
            if (tokenFromUrl) {
                token = tokenFromUrl;
            }
        } catch (e) {
            // 输入可能本身就是令牌
        }

        const hashIndex = token.indexOf('#guide=');
        if (hashIndex !== -1) {
            token = token.slice(hashIndex + '#guide='.length);
        }

        try {
            const base64 = token
                .replace(/-/g, '+')
                .replace(/_/g, '/')
                .padEnd(Math.ceil(token.length / 4) * 4, '=');
            const binary = atob(base64);
            const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
            const json = new TextDecoder().decode(bytes);
            return this.normalizeGuideState(JSON.parse(json));
        } catch (e) {
            return null;
        }
    }
};
